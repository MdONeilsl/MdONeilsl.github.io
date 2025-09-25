/*
    Fragmented Frame: Create unique fragmented frame designs for Second Life with custom textures.
    Copyright (C) 2025  MdONeil 

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    secondlife:///app/agent/ae929a12-297c-45be-9748-562ee17e937e/about
*/

/**
 * @type {HTMLCanvasElement}
 */
const canvas = document.getElementById('canvas');
/**
 * @type {CanvasRenderingContext2D}
 */
const ctx = canvas.getContext('2d');
const toolbar = document.querySelector('.toolbar');
const upload_image = document.getElementById('upload-image');
const export_mesh = document.getElementById('export-mesh');

let current_tool = 'circle';
let shapes = [];
let selected_shape = null;
let texture_image = null;
let texture_filename = 'texture.png';
let texture_file_data = null;
let is_dragging = false;
let start_x, start_y;
let is_scaling = false;
let is_rotating = false;
let drag_mode = 'none';
let copied_shape = null;

let initial_scale_distance;
let initial_width;
let initial_height;
let initial_center_x;
let initial_center_y;
let initial_angle;
let initial_rotation;

/**
 * Represents a geometric shape with position, dimensions, and rotation.
 */
class Shape {
    /**
     * @param {string} type - The type of shape ('circle', 'rectangle', 'triangle', 'pentagon', 'hexagon')
     * @param {number} x - The x-coordinate of the shape's position
     * @param {number} y - The y-coordinate of the shape's position
     * @param {number} width - The width of the shape
     * @param {number} height - The height of the shape
     * @param {number} [rotation=0] - The rotation angle in radians
     */
    constructor(type, x, y, width, height, rotation = 0) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this._cos_r = 0;
        this._sin_r = 0;
        this._update_trigonometry();
    }

    /**
     * Updates cached trigonometric values for rotation.
     */
    _update_trigonometry() {
        this._cos_r = Math.cos(this.rotation);
        this._sin_r = Math.sin(this.rotation);
    }

    /**
     * Draws the shape on the canvas context.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    draw(ctx) {
        ctx.save();
        const half_width = this.width * 0.5;
        const half_height = this.height * 0.5;
        ctx.translate(this.x + half_width, this.y + half_height);
        ctx.rotate(this.rotation);
        ctx.beginPath();
        
        if (this.type === 'circle') {
            ctx.arc(0, 0, Math.abs(half_width), 0, Math.PI * 2);
        } else if (this.type === 'rectangle') {
            ctx.rect(-half_width, -half_height, this.width, this.height);
        } else {
            const sides = this.type === 'triangle' ? 3 : this.type === 'pentagon' ? 5 : 6;
            const radius = Math.abs(half_width);
            let angle = 0;
            ctx.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
            for (let i = 1; i <= sides; i++) {
                angle = (i * 2 * Math.PI) / sides;
                ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
            }
            ctx.closePath();
        }
        
        ctx.strokeStyle = selected_shape === this ? 'red' : 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Checks if a point is inside the shape.
     * @param {number} x - The x-coordinate of the point
     * @param {number} y - The y-coordinate of the point
     * @returns {boolean} True if the point is inside the shape
     */
    is_point_inside(x, y) {
        ctx.save();
        const half_width = this.width * 0.5;
        const half_height = this.height * 0.5;
        ctx.translate(this.x + half_width, this.y + half_height);
        ctx.rotate(this.rotation);
        ctx.beginPath();
        
        if (this.type === 'circle') {
            ctx.arc(0, 0, Math.abs(half_width), 0, Math.PI * 2);
        } else if (this.type === 'rectangle') {
            ctx.rect(-half_width, -half_height, this.width, this.height);
        } else {
            const sides = this.type === 'triangle' ? 3 : this.type === 'pentagon' ? 5 : 6;
            const radius = Math.abs(half_width);
            let angle = 0;
            ctx.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
            for (let i = 1; i <= sides; i++) {
                angle = (i * 2 * Math.PI) / sides;
                ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
            }
            ctx.closePath();
        }
        
        const result = ctx.isPointInPath(x, y);
        ctx.restore();
        return result;
    }

    /**
     * Sets the rotation angle and updates trigonometric cache.
     * @param {number} rotation - The new rotation angle in radians
     */
    set rotation(rotation) {
        this._rotation = rotation;
        this._update_trigonometry();
    }

    /**
     * Gets the rotation angle.
     * @returns {number} The rotation angle in radians
     */
    get rotation() {
        return this._rotation;
    }
}

/**
 * Pre-calculated trigonometric constants for performance.
 */
const math_constants = {
    two_pi: Math.PI * 2,
    half_pi: Math.PI * 0.5
};

/**
 * Cached canvas dimensions to avoid frequent DOM queries.
 */
const canvas_dimensions = {
    width: canvas.width,
    height: canvas.height,
    inverse_width: 1 / canvas.width,
    inverse_height: 1 / canvas.height
};

/**
 * Redraws the canvas with texture and shapes.
 */
function redraw() {
    ctx.clearRect(0, 0, canvas_dimensions.width, canvas_dimensions.height);
    if (texture_image) {
        ctx.drawImage(texture_image, 0, 0, canvas_dimensions.width, canvas_dimensions.height);
    }
    for (let i = 0; i < shapes.length; i++) {
        shapes[i].draw(ctx);
    }
}

/**
 * Handles file upload and processes the image.
 * @param {File} file - The image file to process
 */
function handle_file(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }

    texture_filename = file.name;
    texture_file_data = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            texture_image = img;
            redraw();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * Updates canvas dimensions cache and redraws.
 */
function update_canvas_dimensions() {
    canvas_dimensions.width = canvas.width;
    canvas_dimensions.height = canvas.height;
    canvas_dimensions.inverse_width = 1 / canvas.width;
    canvas_dimensions.inverse_height = 1 / canvas.height;
    redraw();
}

// Initialize canvas dimensions
update_canvas_dimensions();

// Toolbar button handling with event delegation
toolbar.addEventListener('click', (event) => {
    const target = event.target.closest('.tool-btn');
    if (target) {
        toolbar.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        current_tool = target.dataset.shape;
        selected_shape = null;
        redraw();
    }
});

// Image upload handling
upload_image.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files && files[0]) {
        handle_file(files[0]);
    }
});

upload_image.addEventListener('dragover', (event) => {
    event.preventDefault();
    upload_image.classList.add('dragover');
});

upload_image.addEventListener('dragleave', (event) => {
    event.preventDefault();
    upload_image.classList.remove('dragover');
});

upload_image.addEventListener('drop', (event) => {
    event.preventDefault();
    upload_image.classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (files && files[0]) {
        handle_file(files[0]);
    }
});

/**
 * Handles keyboard input for shape manipulation.
 * @param {KeyboardEvent} e - The keyboard event
 */
function handle_keydown(e) {
    const key = e.key.toLowerCase();
    if (key === 's') {
        is_scaling = true;
    } else if (key === 'r') {
        is_rotating = true;
    } else if (e.ctrlKey) {
        if (key === 'c' && selected_shape) {
            copied_shape = {
                type: selected_shape.type,
                x: selected_shape.x,
                y: selected_shape.y,
                width: selected_shape.width,
                height: selected_shape.height,
                rotation: selected_shape.rotation
            };
        } else if (key === 'v' && copied_shape) {
            const new_shape = new Shape(
                copied_shape.type,
                copied_shape.x + 10,
                copied_shape.y + 10,
                copied_shape.width,
                copied_shape.height,
                copied_shape.rotation
            );
            shapes.push(new_shape);
            selected_shape = new_shape;
            redraw();
        }
    } else if (key === 'delete' && selected_shape) {
        const index = shapes.indexOf(selected_shape);
        if (index > -1) {
            shapes.splice(index, 1);
            selected_shape = null;
            redraw();
        }
    }
}

/**
 * Handles keyboard key release events.
 * @param {KeyboardEvent} e - The keyboard event
 */
function handle_keyup(e) {
    const key = e.key.toLowerCase();
    if (key === 's') {
        is_scaling = false;
    } else if (key === 'r') {
        is_rotating = false;
    }
}

document.addEventListener('keydown', handle_keydown);
document.addEventListener('keyup', handle_keyup);

/**
 * Gets normalized canvas coordinates from mouse event.
 * @param {MouseEvent} event - The mouse event
 * @returns {Object} Normalized x and y coordinates
 */
function get_canvas_coordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const scale_x = canvas_dimensions.width / rect.width;
    const scale_y = canvas_dimensions.height / rect.height;
    return {
        x: (event.clientX - rect.left) * scale_x,
        y: (event.clientY - rect.top) * scale_y
    };
}

canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
        const coords = get_canvas_coordinates(event);
        start_x = coords.x;
        start_y = coords.y;

        // Find clicked shape using reverse iteration for better selection of top shapes
        for (let i = shapes.length - 1; i >= 0; i--) {
            if (shapes[i].is_point_inside(start_x, start_y)) {
                selected_shape = shapes[i];
                break;
            }
        }

        if (selected_shape) {
            drag_mode = is_scaling ? 'scale' : is_rotating ? 'rotate' : 'move';
            is_dragging = true;

            const center_x = selected_shape.x + selected_shape.width * 0.5;
            const center_y = selected_shape.y + selected_shape.height * 0.5;

            if (drag_mode === 'scale') {
                initial_scale_distance = Math.hypot(start_x - center_x, start_y - center_y);
                initial_width = selected_shape.width;
                initial_height = selected_shape.height;
                initial_center_x = center_x;
                initial_center_y = center_y;
            } else if (drag_mode === 'rotate') {
                initial_angle = Math.atan2(start_y - center_y, start_x - center_x);
                initial_rotation = selected_shape.rotation;
            }
        } else {
            drag_mode = 'draw';
            is_dragging = true;
        }
        redraw();
    }
});

canvas.addEventListener('mousemove', (event) => {
    if (!is_dragging) return;

    const coords = get_canvas_coordinates(event);
    const x = coords.x;
    const y = coords.y;

    if (drag_mode === 'draw') {
        if (shapes.length && shapes[shapes.length - 1].is_temp) {
            shapes.pop();
        }
        const width = x - start_x;
        const height = y - start_y;
        const shape = new Shape(current_tool, start_x, start_y, width, height);
        shape.is_temp = true;
        shapes.push(shape);
    } else if (selected_shape) {
        if (drag_mode === 'move') {
            const dx = x - start_x;
            const dy = y - start_y;
            selected_shape.x += dx;
            selected_shape.y += dy;
            start_x = x;
            start_y = y;
        } else if (drag_mode === 'scale') {
            const new_distance = Math.hypot(x - initial_center_x, y - initial_center_y);
            if (initial_scale_distance > 0) {
                const scale_factor = new_distance / initial_scale_distance;
                const new_width = initial_width * scale_factor;
                const new_height = initial_height * scale_factor;
                selected_shape.x = initial_center_x - new_width * 0.5;
                selected_shape.y = initial_center_y - new_height * 0.5;
                selected_shape.width = new_width;
                selected_shape.height = new_height;
            }
        } else if (drag_mode === 'rotate') {
            const center_x = selected_shape.x + selected_shape.width * 0.5;
            const center_y = selected_shape.y + selected_shape.height * 0.5;
            const current_angle = Math.atan2(y - center_y, x - center_x);
            const delta_angle = current_angle - initial_angle;
            selected_shape.rotation = initial_rotation + delta_angle;
        }
    }
    redraw();
});

canvas.addEventListener('mouseup', () => {
    if (is_dragging) {
        is_dragging = false;
        if (drag_mode === 'draw' && shapes.length && shapes[shapes.length - 1].is_temp) {
            shapes[shapes.length - 1].is_temp = false;
        }
        drag_mode = 'none';
        redraw();
    }
});

// Optimized export function with pre-allocated arrays
export_mesh.addEventListener('click', () => {
    if (shapes.length === 0) {
        alert('Please draw at least one shape before exporting.');
        return;
    }

    // Pre-calculate total vertices and sides for array pre-allocation
    let total_vertices = 0;
    let total_sides = 0;
    const shape_data = [];

    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        const sides = shape.type === 'circle' ? 32 : shape.type === 'rectangle' ? 4 : 
                     shape.type === 'triangle' ? 3 : shape.type === 'pentagon' ? 5 : 6;
        
        shape_data.push({ shape, sides });
        total_vertices += sides * 2; // Top and bottom vertices
        total_sides += sides;
    }

    // Pre-allocate arrays for better performance
    const positions = new Float32Array(total_vertices * 3);
    const uvs = new Float32Array(total_sides * 2);
    let pos_index = 0;
    let uv_index = 0;
    let vertex_count = 0;

    // Process shapes and fill arrays
    for (let i = 0; i < shape_data.length; i++) {
        const { shape, sides } = shape_data[i];
        const cx = shape.x + shape.width * 0.5;
        const cy = shape.y + shape.height * 0.5;
        const radius = Math.abs(shape.width * 0.5);

        // Generate vertices
        for (let j = 0; j < sides; j++) {
            const angle = (j * math_constants.two_pi) / sides;
            const cos_angle = Math.cos(angle);
            const sin_angle = Math.sin(angle);
            
            // Apply rotation
            const dx = radius * cos_angle;
            const dy = radius * sin_angle;
            const rotated_x = cx + dx * shape._cos_r - dy * shape._sin_r;
            const rotated_y = cy + dx * shape._sin_r + dy * shape._cos_r;

            // Clamp to canvas bounds
            const x = Math.max(0, Math.min(800, rotated_x));
            const y = Math.max(0, Math.min(600, rotated_y));

            // Bottom vertex
            positions[pos_index++] = x * canvas_dimensions.inverse_width;
            positions[pos_index++] = 1 - y * canvas_dimensions.inverse_height;
            positions[pos_index++] = 0;

            // Top vertex
            positions[pos_index++] = x * canvas_dimensions.inverse_width;
            positions[pos_index++] = 1 - y * canvas_dimensions.inverse_height;
            positions[pos_index++] = 1;

            // UV coordinates (unrotated)
            const uv_x = Math.max(0, Math.min(800, cx + radius * cos_angle));
            const uv_y = Math.max(0, Math.min(600, cy + radius * sin_angle));
            uvs[uv_index++] = uv_x * canvas_dimensions.inverse_width;
            uvs[uv_index++] = 1 - uv_y * canvas_dimensions.inverse_height;
        }
        vertex_count += sides * 2;
    }

    // Generate optimized Collada content
    const dae_content = generate_collada_content(positions, uvs, vertex_count, total_sides, shape_data);
    
    // Create and download ZIP
    create_zip_file(dae_content);
});

/**
 * Generates Collada XML content for the mesh.
 * @param {Float32Array} positions - Vertex position data
 * @param {Float32Array} uvs - UV coordinate data
 * @param {number} vertex_count - Total number of vertices
 * @param {number} total_sides - Total number of sides across all shapes
 * @param {Array} shape_data - Array containing shape information
 * @returns {string} The Collada XML content
 */
function generate_collada_content(positions, uvs, vertex_count, total_sides, shape_data) {
    const timestamp = new Date().toISOString();
    
    // Build polylist data efficiently
    let textured_vcount = '';
    let blank_vcount = '';
    let textured_polylist = '';
    let blank_polylist = '';
    let vertex_offset = 0;
    let uv_offset = 0;

    for (let i = 0; i < shape_data.length; i++) {
        const { sides } = shape_data[i];
        
        textured_vcount += sides + ' ' + sides + ' ';
        
        // Top face (counter-clockwise)
        for (let j = sides - 1; j >= 0; j--) {
            textured_polylist += (vertex_offset + sides + j) + ' ' + (uv_offset + j) + ' ';
        }
        // Bottom face (clockwise)
        for (let j = sides - 1; j >= 0; j--) {
            textured_polylist += (vertex_offset + j) + ' ' + (uv_offset + j) + ' ';
        }

        // Side faces
        blank_vcount += Array(sides).fill(4).join(' ') + ' ';
        for (let j = 0; j < sides; j++) {
            const j_next = (j + 1) % sides;
            blank_polylist += 
                (vertex_offset + sides + j) + ' ' + (uv_offset + j) + ' ' +
                (vertex_offset + sides + j_next) + ' ' + (uv_offset + j_next) + ' ' +
                (vertex_offset + j_next) + ' ' + (uv_offset + j_next) + ' ' +
                (vertex_offset + j) + ' ' + (uv_offset + j) + ' ';
        }

        vertex_offset += sides * 2;
        uv_offset += sides;
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
    <asset>
        <created>${timestamp}</created>
        <modified>${timestamp}</modified>
        <unit name="meter" meter="1"/>
        <up_axis>Z_UP</up_axis>
    </asset>
    <library_images>
        <image id="texture_image" name="texture_image">
            <init_from>${texture_filename}</init_from>
        </image>
    </library_images>
    <library_materials>
        <material id="texture_material" name="texture_material">
            <instance_effect url="#texture_effect"/>
        </material>
        <material id="blank_material" name="blank_material">
            <instance_effect url="#blank_effect"/>
        </material>
    </library_materials>
    <library_effects>
        <effect id="texture_effect">
            <profile_COMMON>
                <newparam sid="surface">
                    <surface type="2D">
                        <init_from>texture_image</init_from>
                    </surface>
                </newparam>
                <newparam sid="sampler">
                    <sampler2D>
                        <source>surface</source>
                    </sampler2D>
                </newparam>
                <technique sid="common">
                    <phong>
                        <diffuse>
                            <texture texture="sampler" texcoord="UVMap"/>
                        </diffuse>
                    </phong>
                </technique>
            </profile_COMMON>
        </effect>
        <effect id="blank_effect">
            <profile_COMMON>
                <technique sid="common">
                    <phong>
                        <diffuse>
                            <color sid="diffuse">0.5 0.5 0.5 1</color>
                        </diffuse>
                    </phong>
                </technique>
            </profile_COMMON>
        </effect>
    </library_effects>
    <library_geometries>
        <geometry id="mesh_geom" name="mesh">
            <mesh>
                <source id="mesh_positions">
                    <float_array id="mesh_positions_array" count="${positions.length}">${positions.join(' ')}</float_array>
                    <technique_common>
                        <accessor source="#mesh_positions_array" count="${vertex_count}" stride="3">
                            <param name="X" type="float"/>
                            <param name="Y" type="float"/>
                            <param name="Z" type="float"/>
                        </accessor>
                    </technique_common>
                </source>
                <source id="mesh_uvs">
                    <float_array id="mesh_uvs_array" count="${uvs.length}">${uvs.join(' ')}</float_array>
                    <technique_common>
                        <accessor source="#mesh_uvs_array" count="${total_sides}" stride="2">
                            <param name="S" type="float"/>
                            <param name="T" type="float"/>
                        </accessor>
                    </technique_common>
                </source>
                <vertices id="mesh_vertices">
                    <input semantic="POSITION" source="#mesh_positions"/>
                </vertices>
                <polylist material="texture_material" count="${shape_data.length * 2}">
                    <input semantic="VERTEX" source="#mesh_vertices" offset="0"/>
                    <input semantic="TEXCOORD" source="#mesh_uvs" offset="1" set="0"/>
                    <vcount>${textured_vcount.trim()}</vcount>
                    <p>${textured_polylist.trim()}</p>
                </polylist>
                <polylist material="blank_material" count="${total_sides}">
                    <input semantic="VERTEX" source="#mesh_vertices" offset="0"/>
                    <input semantic="TEXCOORD" source="#mesh_uvs" offset="1" set="0"/>
                    <vcount>${blank_vcount.trim()}</vcount>
                    <p>${blank_polylist.trim()}</p>
                </polylist>
            </mesh>
        </geometry>
    </library_geometries>
    <library_visual_scenes>
        <visual_scene id="Scene" name="Scene">
            <node id="mesh" name="mesh">
                <instance_geometry url="#mesh_geom">
                    <bind_material>
                        <technique_common>
                            <instance_material symbol="texture_material" target="#texture_material">
                                <bind_vertex_input semantic="UVMap" input_semantic="TEXCOORD" input_set="0"/>
                            </instance_material>
                            <instance_material symbol="blank_material" target="#blank_material">
                                <bind_vertex_input semantic="UVMap" input_semantic="TEXCOORD" input_set="0"/>
                            </instance_material>
                        </technique_common>
                    </bind_material>
                </instance_geometry>
            </node>
        </visual_scene>
    </library_visual_scenes>
    <scene>
        <instance_visual_scene url="#Scene"/>
    </scene>
</COLLADA>`;
}

/**
 * Creates and downloads a ZIP file containing the mesh and texture.
 * @param {string} dae_content - The Collada XML content
 */
function create_zip_file(dae_content) {
    const zip = new JSZip();
    zip.file('mesh.dae', dae_content);
    if (texture_file_data) {
        zip.file(texture_filename, texture_file_data);
    }

    zip.generateAsync({ type: 'blob' }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mesh.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// Initial draw
redraw();