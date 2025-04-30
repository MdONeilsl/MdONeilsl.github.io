const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const toolbar = document.querySelector('.toolbar');
const uploadImage = document.getElementById('upload-image');
const exportObj = document.getElementById('export-mesh');

let currentTool = 'circle';
let shapes = [];
let selectedShape = null;
let textureImage = null;
let textureFilename = 'texture.png'; // Default filename for texture
let textureFileData = null; // Store raw file data for ZIP
let isDragging = false;
let startX, startY;
let isScaling = false;
let isRotating = false;
let dragMode = 'none'; // 'none', 'draw', 'move', 'scale', 'rotate'
let copiedShape = null; // Store copied shape properties

// Shape class to store properties
class Shape {
    constructor(type, x, y, width, height, rotation = 0) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rotation = rotation; // Rotation in radians
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.beginPath();
        if (this.type === 'circle') {
            ctx.arc(0, 0, Math.abs(this.width / 2), 0, Math.PI * 2);
        } else if (this.type === 'rectangle') {
            ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            const sides = this.type === 'triangle' ? 3 : this.type === 'pentagon' ? 5 : 6;
            const radius = Math.abs(this.width / 2);
            ctx.moveTo(radius * Math.cos(0), radius * Math.sin(0));
            for (let i = 1; i <= sides; i++) {
                const angle = (i * 2 * Math.PI) / sides;
                ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
            }
            ctx.closePath();
        }
        ctx.strokeStyle = selectedShape === this ? 'red' : 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    isPointInside(x, y) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.beginPath();
        if (this.type === 'circle') {
            const radius = Math.abs(this.width / 2);
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
        } else if (this.type === 'rectangle') {
            ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            const sides = this.type === 'triangle' ? 3 : this.type === 'pentagon' ? 5 : 6;
            const radius = Math.abs(this.width / 2);
            ctx.moveTo(radius * Math.cos(0), radius * Math.sin(0));
            for (let i = 1; i <= sides; i++) {
                const angle = (i * 2 * Math.PI) / sides;
                ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
            }
            ctx.closePath();
        }
        ctx.restore();
        return ctx.isPointInPath(x, y);
    }
}

// Redraw canvas with texture and shapes
function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (textureImage) {
        ctx.drawImage(textureImage, 0, 0, canvas.width, canvas.height);
    }
    shapes.forEach(shape => shape.draw(ctx));
}

// Handle file upload (for both drag-and-drop and click)
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }

    textureFilename = file.name; // Set texture filename for OBJ export
    textureFileData = file; // Store raw file for ZIP
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            textureImage = img;
            redraw();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Toolbar button handling
toolbar.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        toolbar.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.shape;
        selectedShape = null;
        redraw();
    });
});

// Image upload handling (click and drag-and-drop)
uploadImage.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files && files[0]) {
        handleFile(files[0]);
    }
});

uploadImage.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.stopPropagation();
    uploadImage.classList.add('dragover');
});

uploadImage.addEventListener('dragleave', (event) => {
    event.preventDefault();
    event.stopPropagation();
    uploadImage.classList.remove('dragover');
});

uploadImage.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    uploadImage.classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (files && files[0]) {
        handleFile(files[0]);
    }
});

// Key handling for scale, rotate, copy, and paste
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 's') {
        isScaling = true;
    } else if (e.key.toLowerCase() === 'r') {
        isRotating = true;
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c' && selectedShape) {
        // Copy selected shape
        copiedShape = {
            type: selectedShape.type,
            x: selectedShape.x,
            y: selectedShape.y,
            width: selectedShape.width,
            height: selectedShape.height,
            rotation: selectedShape.rotation
        };
    } else if (e.ctrlKey && e.key.toLowerCase() === 'v' && copiedShape) {
        // Paste copied shape with offset
        const newShape = new Shape(
            copiedShape.type,
            copiedShape.x + 10, // Offset by 10 pixels
            copiedShape.y + 10,
            copiedShape.width,
            copiedShape.height,
            copiedShape.rotation
        );
        shapes.push(newShape);
        selectedShape = newShape; // Select the pasted shape
        redraw();
    } else if (e.key === 'Delete' && selectedShape) {
        shapes = shapes.filter(shape => shape !== selectedShape);
        selectedShape = null;
        redraw();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 's') {
        isScaling = false;
    } else if (e.key.toLowerCase() === 'r') {
        isRotating = false;
    }
});

// Canvas interaction
canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
        const rect = canvas.getBoundingClientRect();
        startX = (event.clientX - rect.left) * (canvas.width / rect.width);
        startY = (event.clientY - rect.top) * (canvas.height / rect.height);

        // Check if a shape is clicked
        selectedShape = shapes.find(shape => shape.isPointInside(startX, startY));

        if (selectedShape) {
            dragMode = isScaling ? 'scale' : isRotating ? 'rotate' : 'move';
            isDragging = true;
        } else {
            dragMode = 'draw';
            isDragging = true;
        }
        redraw();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        if (dragMode === 'draw') {
            // Drawing a new shape
            if (shapes.length && shapes[shapes.length - 1].isTemp) {
                shapes.pop();
            }
            const width = x - startX;
            const height = y - startY;
            const shape = new Shape(currentTool, startX, startY, width, height);
            shape.isTemp = true;
            shapes.push(shape);
        } else if (selectedShape) {
            if (dragMode === 'move') {
                // Move shape
                const dx = x - startX;
                const dy = y - startY;
                selectedShape.x += dx;
                selectedShape.y += dy;
                startX = x;
                startY = y;
            } else if (dragMode === 'scale') {
                // Scale shape
                const centerX = selectedShape.x + selectedShape.width / 2;
                const centerY = selectedShape.y + selectedShape.height / 2;
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                const scale = distance / (Math.abs(selectedShape.width) / 2);
                selectedShape.width *= scale;
                selectedShape.height *= scale;
                // Reset start point to prevent abrupt jumps
                startX = x;
                startY = y;
            } else if (dragMode === 'rotate') {
                // Rotate shape
                const centerX = selectedShape.x + selectedShape.width / 2;
                const centerY = selectedShape.y + selectedShape.height / 2;
                const angle = Math.atan2(y - centerY, x - centerX);
                selectedShape.rotation = angle;
            }
        }
        redraw();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        if (dragMode === 'draw' && shapes.length && shapes[shapes.length - 1].isTemp) {
            shapes[shapes.length - 1].isTemp = false;
        }
        dragMode = 'none';
        redraw();
    }
});

// Export mesh as Collada with texture in a ZIP
exportObj.addEventListener('click', () => {
    if (shapes.length === 0) {
        alert('Please draw at least one shape before exporting.');
        return;
    }

    // Generate Collada file
    let daeContent = `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
    <asset>
        <created>${new Date().toISOString()}</created>
        <modified>${new Date().toISOString()}</modified>
        <unit name="meter" meter="1"/>
        <up_axis>Z_UP</up_axis>
    </asset>
    <library_images>
        <image id="texture_image" name="texture_image">
            <init_from>${textureFilename}</init_from>
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
                    <float_array id="mesh_positions_array" count="${shapes.reduce((sum, s) => sum + 2 * (s.type === 'circle' ? 32 : s.type === 'rectangle' ? 4 : s.type === 'triangle' ? 3 : s.type === 'pentagon' ? 5 : 6) * 3, 0)}">`;

    let positions = '';
    let uvs = '';
    let normals = '';
    let texturedPolylist = '';
    let blankPolylist = '';
    let vertexCount = 0;
    let uvCount = 0;
    let texturedVcount = '';
    let blankVcount = '';
    let totalSides = 0;

    shapes.forEach(shape => {
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        const cosR = Math.cos(shape.rotation);
        const sinR = Math.sin(shape.rotation);

        // Determine vertices based on shape type
        let vertices = [];
        let sides = 4; // Default for rectangle
        if (shape.type === 'circle') {
            sides = 32; // Approximate circle with 32 segments
            const radius = Math.abs(shape.width / 2);
            for (let j = 0; j < sides; j++) {
                const angle = (j * 2 * Math.PI) / sides;
                vertices.push({
                    x: cx + radius * Math.cos(angle),
                    y: cy + radius * Math.sin(angle)
                });
            }
        } else if (shape.type === 'rectangle') {
            vertices = [
                { x: shape.x, y: shape.y },
                { x: shape.x + shape.width, y: shape.y },
                { x: shape.x + shape.width, y: shape.y + shape.height },
                { x: shape.x, y: shape.y + shape.height }
            ];
        } else {
            sides = shape.type === 'triangle' ? 3 : shape.type === 'pentagon' ? 5 : 6;
            const radius = Math.abs(shape.width / 2);
            for (let j = 0; j < sides; j++) {
                const angle = (j * 2 * Math.PI) / sides;
                vertices.push({
                    x: cx + radius * Math.cos(angle),
                    y: cy + radius * Math.sin(angle)
                });
            }
        }

        // Apply rotation and clamp to canvas bounds (0,0 to 800,600)
        const rotated = vertices.map(v => {
            const dx = v.x - cx;
            const dy = v.y - cy;
            const x = cx + dx * cosR - dy * sinR;
            const y = cy + dx * sinR + dy * cosR;
            return {
                x: Math.max(0, Math.min(800, x)),
                y: Math.max(0, Math.min(600, y))
            };
        });

        // UVs: use unrotated vertices to keep texture upright
        let uvVertices = [];
        if (shape.type === 'circle') {
            const radius = Math.abs(shape.width / 2);
            for (let j = 0; j < sides; j++) {
                const angle = (j * 2 * Math.PI) / sides;
                uvVertices.push({
                    x: cx + radius * Math.cos(angle),
                    y: cy + radius * Math.sin(angle)
                });
            }
        } else if (shape.type === 'rectangle') {
            uvVertices = [
                { x: shape.x, y: shape.y },
                { x: shape.x + shape.width, y: shape.y },
                { x: shape.x + shape.width, y: shape.y + shape.height },
                { x: shape.x, y: shape.y + shape.height }
            ];
        } else {
            const radius = Math.abs(shape.width / 2);
            for (let j = 0; j < sides; j++) {
                const angle = (j * 2 * Math.PI) / sides;
                uvVertices.push({
                    x: cx + radius * Math.cos(angle),
                    y: cy + radius * Math.sin(angle)
                });
            }
        }

        // Vertex positions (bottom and top)
        rotated.forEach(v => {
            positions += `${v.x / 800} ${1 - v.y / 600} 0 `;
        });
        rotated.forEach(v => {
            positions += `${v.x / 800} ${1 - v.y / 600} 1 `;
        });

        // UVs (clamped and normalized)
        uvVertices.forEach(v => {
            const x = Math.max(0, Math.min(800, v.x));
            const y = Math.max(0, Math.min(600, v.y));
            uvs += `${x / 800} ${1 - y / 600} `;
        });

        // Normals: top, bottom, and sides
        let shapeNormals = [];
        // Top face normals (point up, outward)
        for (let j = 0; j < sides; j++) {
            shapeNormals.push(`0 0 1`);
        }
        // Bottom face normals (point up, inward)
        for (let j = 0; j < sides; j++) {
            shapeNormals.push(`0 0 1`);
        }
        // Side face normals (point outward)
        for (let j = 0; j < sides; j++) {
            const jNext = (j + 1) % sides;
            const v0 = rotated[j];
            const v1 = rotated[jNext];
            // Compute normal using cross product
            const dx = v1.x - v0.x;
            const dy = v1.y - v0.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                const nx = dy / len; // Outward direction
                const ny = -dx / len;
                shapeNormals.push(`${nx} ${ny} 0`);
                shapeNormals.push(`${nx} ${ny} 0`); // Two vertices per side
            } else {
                shapeNormals.push(`0 0 0`);
                shapeNormals.push(`0 0 0`);
            }
        }
        normals += shapeNormals.join(' ') + ' ';

        // Polylist entries
        texturedVcount += `${sides} ${sides} `;
        blankVcount += `${Array(sides).fill(4).join(' ')} `;

        // Textured polylist: top and bottom faces
        // Top face (counter-clockwise, outward)
        for (let j = sides - 1; j >= 0; j--) {
            texturedPolylist += `${vertexCount + sides + j} ${uvCount + j} `;
        }
        // Bottom face (clockwise, inward)
        for (let j = sides - 1; j >= 0; j--) {
            texturedPolylist += `${vertexCount + j} ${uvCount + j} `;
        }

        // Blank polylist: side faces (counter-clockwise, outward)
        for (let j = 0; j < sides; j++) {
            const jNext = (j + 1) % sides;
            blankPolylist += `${vertexCount + sides + j} ${uvCount + j} ${vertexCount + sides + jNext} ${uvCount + jNext} ${vertexCount + jNext} ${uvCount + jNext} ${vertexCount + j} ${uvCount + j} `;
        }

        vertexCount += 2 * sides;
        uvCount += sides;
        totalSides += sides;
    });

    daeContent += `${positions.trim()}</float_array>
                    <technique_common>
                        <accessor source="#mesh_positions_array" count="${vertexCount}" stride="3">
                            <param name="X" type="float"/>
                            <param name="Y" type="float"/>
                            <param name="Z" type="float"/>
                        </accessor>
                    </technique_common>
                </source>
                <source id="mesh_uvs">
                    <float_array id="mesh_uvs_array" count="${2 * totalSides}">${uvs.trim()}</float_array>
                    <technique_common>
                        <accessor source="#mesh_uvs_array" count="${totalSides}" stride="2">
                            <param name="S" type="float"/>
                            <param name="T" type="float"/>
                        </accessor>
                    </technique_common>
                </source>
                <source id="mesh_normals">
                    <float_array id="mesh_normals_array" count="${shapes.reduce((sum, s) => sum + (s.type === 'circle' ? 32 : s.type === 'rectangle' ? 4 : s.type === 'triangle' ? 3 : s.type === 'pentagon' ? 5 : 6) * (2 + 2 * (s.type === 'circle' ? 32 : s.type === 'rectangle' ? 4 : s.type === 'triangle' ? 3 : s.type === 'pentagon' ? 5 : 6)) * 3, 0)}">${normals.trim()}</float_array>
                    <technique_common>
                        <accessor source="#mesh_normals_array" count="${shapes.reduce((sum, s) => sum + (s.type === 'circle' ? 32 : s.type === 'rectangle' ? 4 : s.type === 'triangle' ? 3 : s.type === 'pentagon' ? 5 : 6) * (2 + 2 * (s.type === 'circle' ? 32 : s.type === 'rectangle' ? 4 : s.type === 'triangle' ? 3 : s.type === 'pentagon' ? 5 : 6)), 0)}" stride="3">
                            <param name="X" type="float"/>
                            <param name="Y" type="float"/>
                            <param name="Z" type="float"/>
                        </accessor>
                    </technique_common>
                </source>
                <vertices id="mesh_vertices">
                    <input semantic="POSITION" source="#mesh_positions"/>
                </vertices>
                <polylist material="texture_material" count="${shapes.reduce((sum, s) => sum + 2, 0)}">
                    <input semantic="VERTEX" source="#mesh_vertices" offset="0"/>
                    <input semantic="TEXCOORD" source="#mesh_uvs" offset="1" set="0"/>
                    <vcount>${texturedVcount.trim()}</vcount>
                    <p>${texturedPolylist}</p>
                </polylist>
                <polylist material="blank_material" count="${shapes.reduce((sum, s) => sum + (s.type === 'circle' ? 32 : s.type === 'rectangle' ? 4 : s.type === 'triangle' ? 3 : s.type === 'pentagon' ? 5 : 6), 0)}">
                    <input semantic="VERTEX" source="#mesh_vertices" offset="0"/>
                    <input semantic="TEXCOORD" source="#mesh_uvs" offset="1" set="0"/>
                    <vcount>${blankVcount.trim()}</vcount>
                    <p>${blankPolylist}</p>
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

    // Create ZIP file
    const zip = new JSZip();
    zip.file('mesh.dae', daeContent);
    if (textureFileData) {
        zip.file(textureFilename, textureFileData);
    }

    // Download ZIP
    zip.generateAsync({ type: 'blob' }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mesh.zip';
        a.click();
        URL.revokeObjectURL(url);
    });
});

// Initial draw
redraw();