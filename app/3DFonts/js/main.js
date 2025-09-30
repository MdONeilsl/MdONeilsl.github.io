import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const font_upload = document.getElementById('font-upload');
const styles_container = document.getElementById('styles-container');
const text_input = document.getElementById('text-input');
const generate_btn = document.getElementById('generate-btn');
const save_btn = document.getElementById('save-btn');
const reset_btn = document.getElementById('reset-btn');
const error_div = document.getElementById('error');
const progress = document.getElementById('progress');
const preview_div = document.getElementById('preview');
const char_select = document.getElementById('char_sel');

const bevel_enabled = document.getElementById('bevelEnabled');
const bevel_thickness = document.getElementById('bevelThickness');
const bevel_size = document.getElementById('bevelSize');
const bevel_offset = document.getElementById('bevelOffset');
const bevel_segments = document.getElementById('bevelSegments');

const curve_segments = document.getElementById('curveSegments');
const steps = document.getElementById('steps');
const depth = document.getElementById('depth');

let font = null;
let font_name = '';
let gltf_files = [];
let selected_style = null;
let selected_weight = null;

const preview_width = 800;
const preview_height = 600;

let scene = null;
let camera = null;
let controls = null;
let animation_id = null;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(preview_width, preview_height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
preview_div.appendChild(renderer.domElement);

/**
 * Initialize WebGL context and scene
 */
const init_gl = () => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    camera = new THREE.PerspectiveCamera(75, preview_width / preview_height, 0.1, 1000);
    camera.position.set(0, 2.5, 5);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    const ambient_light = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambient_light);
    
    const directional_light = new THREE.DirectionalLight(0xffffff, 1);
    directional_light.position.set(1, 1, 1);
    scene.add(directional_light);

    renderer.setAnimationLoop(update_gl);
};

/**
 * Update WebGL rendering
 */
const update_gl = () => {
    controls.update();
    renderer.render(scene, camera);
};

/**
 * Clean up WebGL resources
 */
const clear_gl = () => {
    if (animation_id) {
        cancelAnimationFrame(animation_id);
        animation_id = null;
    }

    if (scene) {
        scene.traverse(object => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(dispose_material);
                } else {
                    dispose_material(object.material);
                }
            }
        });
        scene.clear();
    }

    if (controls) {
        controls.dispose();
        controls = null;
    }
};

/**
 * Dispose material and its textures
 * @param {THREE.Material} material - Material to dispose
 */
const dispose_material = (material) => {
    const texture_keys = ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap'];
    texture_keys.forEach(key => {
        if (material[key]) {
            material[key].dispose();
        }
    });
    material.dispose();
};

/**
 * Populate font style and weight options
 */
const populate_styles = () => {
    styles_container.innerHTML = '';
    const names = font.names;
    const style_options = new Set([names.fontSubfamily?.en || 'Regular']);
    const weight_options = new Set([font.tables.os2?.usWeightClass || 400]);

    if (style_options.size > 1) {
        styles_container.appendChild(create_checkboxes('Styles', style_options, (val) => selected_style = val));
    }
    if (weight_options.size > 1) {
        styles_container.appendChild(create_checkboxes('Weights', weight_options, (val) => selected_weight = val));
    }
};

/**
 * Create checkbox group for options
 * @param {string} label - Group label
 * @param {Set} options - Available options
 * @param {Function} on_change - Change callback
 * @returns {HTMLDivElement} Checkbox container
 */
const create_checkboxes = (label, options, on_change) => {
    const container = document.createElement('div');
    container.textContent = `${label}: `;
    
    options.forEach(option => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = option;
        checkbox.addEventListener('change', () => {
            container.querySelectorAll('input').forEach(input => {
                input.checked = input === checkbox;
            });
            on_change(checkbox.checked ? option : null);
        });
        container.appendChild(checkbox);
        container.appendChild(document.createTextNode(option + ' '));
    });
    return container;
};

/**
 * Parse glyph contours into shapes with correct winding order
 * @param {Object} glyph - Font glyph
 * @returns {Array} Array of shapes with hole information
 */
const parse_glyph_contours = async (glyph) => {
    const path = glyph.getPath(0, 0, 72);
    const shape_path = new THREE.ShapePath();
    
    const command_handlers = {
        'M': (cmd) => shape_path.moveTo(cmd.x, cmd.y),
        'L': (cmd) => shape_path.lineTo(cmd.x, cmd.y),
        'Q': (cmd) => shape_path.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y),
        'C': (cmd) => shape_path.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y),
        'Z': () => shape_path.currentPath.autoClose = true
    };

    for (let i = 0; i < path.commands.length; i++) {
        const cmd = path.commands[i];
        const handler = command_handlers[cmd.type];
        if (handler) handler(cmd);
    }

    const is_truetype = !!font.tables.glyf;
    
    // Use proper winding detection for shape extraction
    const shapes = shape_path.toShapes(true);
    
    return shapes.map(shape => ({
        shape,
        is_hole: false
    }));
};

/**
 * Fix face winding order in geometry
 * @param {THREE.BufferGeometry} geometry - Geometry to fix
 */
const fix_face_winding = (geometry) => {
    const index = geometry.index;
    const position = geometry.attributes.position;
    
    if (!index) return;

    let inverted_faces = 0;
    let total_faces = 0;

    // Count inverted faces by checking normal direction
    for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i);
        const b = index.getX(i + 1);
        const c = index.getX(i + 2);
        
        const v0 = new THREE.Vector3(position.getX(a), position.getY(a), position.getZ(a));
        const v1 = new THREE.Vector3(position.getX(b), position.getY(b), position.getZ(b));
        const v2 = new THREE.Vector3(position.getX(c), position.getY(c), position.getZ(c));
        
        const normal = new THREE.Vector3()
            .crossVectors(
                new THREE.Vector3().subVectors(v1, v0),
                new THREE.Vector3().subVectors(v2, v0)
            );

        // For front-facing geometry, normals should point outward (positive Z)
        if (normal.z < 0) {
            inverted_faces++;
        }
        total_faces++;
    }

    // If more than 30% of faces are inverted, flip all faces
    if (inverted_faces > total_faces * 0.3) {
        for (let i = 0; i < index.count; i += 3) {
            const tmp = index.getX(i);
            index.setX(i, index.getX(i + 2));
            index.setX(i + 2, tmp);
        }
        index.needsUpdate = true;
    }
};

/**
 * Extrude shapes into 3D geometries with proper face orientation
 * @param {Array} shapes - Array of shapes to extrude
 * @returns {Array} Array of geometry data
 */
const extrude_shapes = (shapes) => {
    const geometries = [];
    const extrude_settings = {
        curveSegments: parseInt(curve_segments.value),
        steps: parseInt(steps.value),
        depth: parseInt(depth.value),
        bevelEnabled: bevel_enabled.checked,
        bevelThickness: bevel_enabled.checked ? parseFloat(bevel_thickness.value) : 0,
        bevelSize: bevel_enabled.checked ? parseFloat(bevel_size.value) : 0,
        bevelOffset: bevel_enabled.checked ? parseFloat(bevel_offset.value) : 0,
        bevelSegments: bevel_enabled.checked ? parseFloat(bevel_segments.value) : 0
    };

    for (let i = 0; i < shapes.length; i++) {
        const { shape } = shapes[i];
        const geometry = new THREE.ExtrudeGeometry(shape, extrude_settings);
        
        // Ensure proper face orientation
        geometry.computeVertexNormals();
        fix_face_winding(geometry);
        geometry.computeVertexNormals(); // Recompute after fixing
        
        geometry.rotateX(-Math.PI / 2);
        geometries.push({ geometry, is_hole: false });
    }
    
    return geometries;
};

/**
 * Apply UV mapping to geometry
 * @param {THREE.BufferGeometry} geometry - Geometry to map
 * @returns {THREE.Box3} Bounding box
 */
const apply_uv_mapping = (geometry) => {
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    let index = geometry.index;

    if (!index) {
        const indices = new Uint32Array(position.count);
        for (let i = 0; i < position.count; i++) {
            indices[i] = i;
        }
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        index = geometry.index;
    }

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const uv = new Float32Array(position.count * 2);

    // Simple planar projection based on face normals
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        const nx = normal.getX(i);
        const ny = normal.getY(i);
        const nz = normal.getZ(i);

        let u, v;
        
        // Determine dominant normal axis for projection
        const abs_nx = Math.abs(nx);
        const abs_ny = Math.abs(ny);
        const abs_nz = Math.abs(nz);
        
        if (abs_nz >= abs_nx && abs_nz >= abs_ny) {
            // Front/back faces
            u = (x - bbox.min.x) / (bbox.max.x - bbox.min.x);
            v = (y - bbox.min.y) / (bbox.max.y - bbox.min.y);
        } else if (abs_ny >= abs_nx && abs_ny >= abs_nz) {
            // Top/bottom faces
            u = (x - bbox.min.x) / (bbox.max.x - bbox.min.x);
            v = (z - bbox.min.z) / (bbox.max.z - bbox.min.z);
        } else {
            // Left/right faces
            u = (y - bbox.min.y) / (bbox.max.y - bbox.min.y);
            v = (z - bbox.min.z) / (bbox.max.z - bbox.min.z);
        }

        uv[i * 2] = u;
        uv[i * 2 + 1] = 1.0 - v;
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return bbox;
};

/**
 * Normalize mesh scale and position
 * @param {THREE.BufferGeometry} geometry - Geometry to normalize
 * @returns {THREE.Box3} Bounding box
 */
const normalize_mesh = (geometry) => {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    const max_dim = Math.max(size.x, size.y, size.z);
    const scale_factor = 1 / max_dim;
    geometry.scale(scale_factor, scale_factor, scale_factor);

    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    return bbox;
};

/**
 * Create mesh from glyph character with proper face orientation
 * @param {string} char - Character to convert
 * @returns {THREE.Mesh|null} Mesh or null if failed
 */
const create_glyph_mesh = async (char) => {
    const glyph = font.charToGlyph(char);
    if (!glyph) return null;

    const shapes = await parse_glyph_contours(glyph);
    const geometries_data = extrude_shapes(shapes);

    if (geometries_data.length === 0) return null;

    const geometries = geometries_data.map(data => data.geometry);
    let merged_geometry = BufferGeometryUtils.mergeGeometries(geometries, true);

    // Final face winding check and fix
    fix_face_winding(merged_geometry);
    merged_geometry.computeVertexNormals();

    normalize_mesh(merged_geometry);
    apply_uv_mapping(merged_geometry);

    const material = new THREE.MeshPhongMaterial({ 
        color: 0x2194ce,
        specular: 0x111111,
        shininess: 30,
        flatShading: false
    });

    return new THREE.Mesh(merged_geometry, material);
};

/**
 * Export mesh to GLTF format
 * @param {THREE.Mesh} mesh - Mesh to export
 * @returns {string} GLTF JSON string
 */
const export_to_gltf = async (mesh) => {
    const exporter = new GLTFExporter();
    const result = await exporter.parseAsync(mesh, { 
        binary: false,
        trs: false,
        onlyVisible: true,
        truncateDrawRange: true
    });
    return JSON.stringify(result);
};

/**
 * Generate 3D models from text input
 */
const generate = async () => {
    if (!font) {
        error_div.textContent = 'No font loaded.';
        return;
    }
    
    const text = text_input.value.trim();
    if (!text) {
        error_div.textContent = 'Enter some text.';
        return;
    }

    const unique_chars = [...new Set(text)].filter(char => {
        const glyph = font.charToGlyph(char);
        return glyph && glyph.unicode !== undefined;
    });

    if (unique_chars.length === 0) {
        error_div.textContent = 'No supported characters in the font.';
        return;
    }

    progress.style.display = 'block';
    progress.value = 0;
    progress.max = unique_chars.length;

    char_select.value = 0;
    char_select.max = Math.max(0, unique_chars.length - 1);

    gltf_files = [];
    dispose_mesh();
    save_btn.disabled = true;
    error_div.textContent = '';

    for (let i = 0; i < unique_chars.length; i++) {
        const char = unique_chars[i];
        try {
            const mesh = await create_glyph_mesh(char);
            if (mesh) {
                const gltf = await export_to_gltf(mesh);
                const file_name = `${font_name}_${char.charCodeAt(0)}.gltf`;
                gltf_files.push({ name: file_name, data: gltf });
                
                mesh.geometry.dispose();
                mesh.material.dispose();
            }
        } catch (err) {
            error_div.textContent += `Error processing '${char}': ${err.message}\n`;
            console.error(err);
        }
        progress.value = i + 1;
        
        if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    progress.style.display = 'none';
    if (gltf_files.length > 0) {
        set_preview_model();
        save_btn.disabled = false;
    }
};

/**
 * Remove all meshes from scene
 */
const dispose_mesh = () => {
    const meshes = [];
    scene.traverse(obj => {
        if (obj.isMesh) meshes.push(obj);
    });

    for (let i = 0; i < meshes.length; i++) {
        const mesh = meshes[i];
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(dispose_material);
            } else {
                dispose_material(mesh.material);
            }
        }
        if (mesh.parent) mesh.parent.remove(mesh);
    }
};

/**
 * Set preview model from generated files
 */
const set_preview_model = () => {
    dispose_mesh();

    if (gltf_files.length > 0) {
        const loader = new GLTFLoader();
        const data = gltf_files[char_select.value].data;

        if (!data) return;

        loader.parse(
            data,
            '',
            (gltf) => {                
                scene.add(gltf.scene);
                
                const box = new THREE.Box3().setFromObject(gltf.scene);
                const center = new THREE.Vector3();
                box.getCenter(center);
                const size = new THREE.Vector3();
                box.getSize(size);
                
                const max_dim = Math.max(size.x, size.y, size.z);
                const camera_distance = max_dim * 1.5;
                
                camera.position.set(camera_distance, camera_distance, camera_distance);
                camera.lookAt(center);
                controls.target.copy(center);
                controls.update();
            },
            (error) => console.error('GLTF parsing error:', error)
        );
    }
};

window.addEventListener('DOMContentLoaded', () => {
    font_upload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        if (!['ttf', 'otf', 'woff'].includes(ext)) {
            error_div.textContent = 'Invalid font format. Only TTF, OTF, WOFF allowed.';
            return;
        }

        font_name = file.name.replace(/\.[^/.]+$/, "");
        try {
            const array_buffer = await file.arrayBuffer();
            font = opentype.parse(array_buffer);
            error_div.textContent = '';
            populate_styles();
        } catch (err) {
            error_div.textContent = 'Error parsing font file: ' + err.message;
            console.error(err);
        }
    });

    generate_btn.addEventListener('click', generate);

    save_btn.addEventListener('click', async () => {
        if (!window.JSZip) {
            error_div.textContent = 'JSZip library not loaded.';
            return;
        }

        const zip = new JSZip();
        gltf_files.forEach(file => zip.file(file.name, file.data));

        const manifest = `Font: ${font_name}\nProcessed characters: ${gltf_files.map(f => f.name).join(', ')}\nTimestamp: ${new Date().toISOString()}\n`;
        zip.file('manifest.txt', manifest);

        try {
            const content = await zip.generateAsync({ 
                type: 'blob', 
                compression: 'DEFLATE', 
                compressionOptions: { level: 6 } 
            });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${font_name}_meshes.zip`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            error_div.textContent = 'Error creating zip file: ' + err.message;
        }
    });

    reset_btn.addEventListener('click', () => {
        font = null;
        gltf_files = [];
        dispose_mesh();
        text_input.value = '';
        font_upload.value = '';
        styles_container.innerHTML = '';
        save_btn.disabled = true;
        error_div.textContent = '';
        progress.style.display = 'none';
    });

    /**
     * Update range input value display
     * @param {string} input_id - Input element ID
     * @param {string} value_id - Value display element ID
     */
    const update_range_value = (input_id, value_id) => {
        const input = document.getElementById(input_id);
        const value_display = document.getElementById(value_id);

        input.addEventListener('input', function() {
            value_display.textContent = parseFloat(this.value).toFixed(2);
        });
    };

    update_range_value('depth', 'depth-value');
    update_range_value('curveSegments', 'curveSegments-value');
    update_range_value('steps', 'steps-value');
    update_range_value('bevelThickness', 'bevelThickness-value');
    update_range_value('bevelSize', 'bevelSize-value');
    update_range_value('bevelOffset', 'bevelOffset-value');
    update_range_value('bevelSegments', 'bevelSegments-value');

    char_select.addEventListener('change', set_preview_model);

    init_gl();
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        clear_gl();
    } else if (document.visibilityState === 'visible') {
        init_gl();
        if (gltf_files.length > 0) {
            set_preview_model();
        }
    }
});

