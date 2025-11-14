// Cached UI elements
import { export_to_gltf } from "./exporter.js";

// State variables
let elems = null;

let shapes = [];
let selected_shape = null;
let copied_shape = null;

let history = [];
let history_index = -1;

let current_tool = 'circle';
let texture_image = null;
let texture_file = null;

let is_dragging = false;
let drag_mode = null;
let start_x = 0;
let start_y = 0;
let is_scaling = false;
let is_rotating = false;
let temp_shape = null;

let initial_scale_distance = 0;
let initial_width = 0;
let initial_height = 0;
let initial_center_x = 0;
let initial_center_y = 0;
let initial_angle = 0;
let initial_rotation = 0;

let redraw_requested = false;

/**
 * Custom error for export operations
 */
class GeometryExportError extends Error {
    constructor(message, error_code) {
        super(message);
        this.name = 'GeometryExportError';
        this.error_code = error_code;
    }
}

/**
 * Sets the current drawing tool.
 * @param {string} tool - The tool type to set.
 */
const set_current_tool = (tool) => {
    current_tool = tool;

    elems.tool_buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    selected_shape = null;
    update_ui();
}

/**
 * Handles upload of texture image file.
 * @param {File} file - The uploaded file.
 */
const handle_texture_upload = (file) => {
    if (!file || !file.type.startsWith('image/')) {
        show_notification('Please select a valid image file', 'error');
        return;
    }

    texture_file = file;
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            texture_image = img;
            queue_redraw();
            show_notification('Texture loaded successfully', 'success');
        };
        img.onerror = () => {
            show_notification('Failed to load image', 'error');
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

/**
 * Handles mouse down event on canvas.
 * @param {MouseEvent} event - The mouse event.
 */
const handle_mouse_down = (event) => {
    const rect = elems.main_canvas.getBoundingClientRect();
    const scaleX = elems.main_canvas.width / rect.width;
    const scaleY = elems.main_canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    start_x = x;
    start_y = y;

    const clicked_shape = find_shape_at(x, y);

    if (clicked_shape) {
        selected_shape = clicked_shape;
        drag_mode = is_scaling ? 'scale' : is_rotating ? 'rotate' : 'move';
        is_dragging = true;

        if (drag_mode === 'scale') {
            setup_scaling(clicked_shape);
        }
        else if (drag_mode === 'rotate') {
            setup_rotation(clicked_shape);
        }
    }
    else {
        selected_shape = null;
        if (current_tool !== 'select') {
            drag_mode = 'draw';
            is_dragging = true;
            temp_shape = create_shape(current_tool, x, y, 0, 0);
            shapes.push(temp_shape);
        }
    }

    update_ui();
    queue_redraw();
}

/**
 * Handles mouse move event on canvas.
 * @param {MouseEvent} event - The mouse event.
 */
const handle_mouse_move = (event) => {
    const rect = elems.main_canvas.getBoundingClientRect();
    const scaleX = elems.main_canvas.width / rect.width;
    const scaleY = elems.main_canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    update_cursor_position(x, y);

    if (!is_dragging) return;

    if (drag_mode === 'draw' && temp_shape) {
        const width = x - start_x;
        const height = y - start_y;
        update_temp_shape(width, height);
    }
    else if (selected_shape) {
        switch (drag_mode) {
            case 'move':
                move_shape(x, y);
                break;
            case 'scale':
                scale_shape(x, y);
                break;
            case 'rotate':
                rotate_shape(x, y);
                break;
        }
    }

    queue_redraw();
}

/**
 * Handles mouse up event on canvas.
 */
const handle_mouse_up = () => {
    if (is_dragging) {
        is_dragging = false;

        if (drag_mode === 'draw' && temp_shape) {
            if (Math.abs(temp_shape.width) > 5 && Math.abs(temp_shape.height) > 5) {
                temp_shape.is_temp = false;
                save_state();
                show_notification(`Created ${temp_shape.type} shape`, 'success');
            }
            else {
                shapes.pop();
            }
            temp_shape = null;
        }
        else if (drag_mode !== 'draw') {
            save_state();
        }

        drag_mode = null;
        update_ui();
        queue_redraw();
    }
}

/**
 * Handles key down event.
 * @param {KeyboardEvent} event - The keyboard event.
 */
const handle_key_down = (event) => {
    if (event.target.tagName === 'INPUT') return;

    switch (event.key.toLowerCase()) {
        case 's':
            is_scaling = true;
            break;
        case 'r':
            is_rotating = true;
            break;
        case 'delete':
            if (selected_shape) {
                delete_selected_shape();
            }
            break;
        case 'z':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                if (event.shiftKey) {
                    redo();
                }
                else {
                    undo();
                }
            }
            break;
        case 'y':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                redo();
            }
            break;
        case 'c':
            if ((event.ctrlKey || event.metaKey) && selected_shape) {
                copy_shape();
            }
            break;
        case 'v':
            if ((event.ctrlKey || event.metaKey) && copied_shape) {
                paste_shape();
            }
            break;
    }
}

/**
 * Handles key up event.
 * @param {KeyboardEvent} event - The keyboard event.
 */
const handle_key_up = (event) => {
    switch (event.key.toLowerCase()) {
        case 's':
            is_scaling = false;
            break;
        case 'r':
            is_rotating = false;
            break;
    }
}

/**
 * Creates a new shape object.
 * @param {string} type - The shape type.
 * @param {number} x - The x position.
 * @param {number} y - The y position.
 * @param {number} width - The width.
 * @param {number} height - The height.
 * @param {number} [rotation=0] - The rotation angle.
 * @returns {Object} The shape object.
 */
const create_shape = (type, x, y, width, height, rotation = 0) => {
    return {
        id: Date.now() + Math.random(),
        type,
        x,
        y,
        width,
        height,
        rotation,
        is_temp: true
    };
}

/**
 * Finds shape at given coordinates.
 * @param {number} x - The x coordinate.
 * @param {number} y - The y coordinate.
 * @returns {Object|null} The found shape or null.
 */
const find_shape_at = (x, y) => {
    for (let i = shapes.length - 1; i >= 0; i--) {
        const shape = shapes[i];
        if (is_point_in_shape(x, y, shape)) {
            return shape;
        }
    }
    return null;
}

/**
 * Checks if point is inside shape.
 * @param {number} x - The x coordinate.
 * @param {number} y - The y coordinate.
 * @param {Object} shape - The shape object.
 * @returns {boolean} True if point is inside.
 */
const is_point_in_shape = (x, y, shape) => {
    const center_x = shape.x + shape.width / 2;
    const center_y = shape.y + shape.height / 2;

    const cos = Math.cos(-shape.rotation);
    const sin = Math.sin(-shape.rotation);
    const local_x = (x - center_x) * cos - (y - center_y) * sin;
    const local_y = (x - center_x) * sin + (y - center_y) * cos;

    const half_width = Math.abs(shape.width) / 2;
    const half_height = Math.abs(shape.height) / 2;

    switch (shape.type) {
        case 'rectangle':
            return Math.abs(local_x) <= half_width && Math.abs(local_y) <= half_height;
        case 'circle':
            return local_x * local_x + local_y * local_y <= half_width * half_width;
        default:
            const distance = Math.sqrt(local_x * local_x + local_y * local_y);
            return distance <= half_width;
    }
}

/**
 * Updates temporary shape dimensions.
 * @param {number} width - The new width.
 * @param {number} height - The new height.
 */
const update_temp_shape = (width, height) => {
    if (temp_shape) {
        temp_shape.width = width;
        temp_shape.height = height;

        if (elems.snap_to_grid_checkbox?.checked) {
            const grid = 20;
            const left = Math.round(temp_shape.x / grid) * grid;
            const top = Math.round(temp_shape.y / grid) * grid;
            const right = Math.round((temp_shape.x + temp_shape.width) / grid) * grid;
            const bottom = Math.round((temp_shape.y + temp_shape.height) / grid) * grid;

            temp_shape.x = left;
            temp_shape.y = top;
            temp_shape.width = right - left;
            temp_shape.height = bottom - top;
        }
    }
};

/**
 * Moves selected shape.
 * @param {number} x - The new x.
 * @param {number} y - The new y.
 */
const move_shape = (x, y) => {
    const dx = x - start_x;
    const dy = y - start_y;

    selected_shape.x += dx;
    selected_shape.y += dy;

    if (elems.snap_to_grid_checkbox?.checked) {
        const grid = 20;
        selected_shape.x = Math.round(selected_shape.x / grid) * grid;
        selected_shape.y = Math.round(selected_shape.y / grid) * grid;
    }

    start_x = x;
    start_y = y;
};

/**
 * Sets up scaling for shape.
 * @param {Object} shape - The shape to scale.
 */
const setup_scaling = (shape) => {
    initial_scale_distance = distance_to_center(shape, start_x, start_y);
    initial_width = shape.width;
    initial_height = shape.height;
    initial_center_x = shape.x + shape.width / 2;
    initial_center_y = shape.y + shape.height / 2;
}

/**
 * Scales selected shape.
 * @param {number} x - The new x.
 * @param {number} y - The new y.
 */
const scale_shape = (x, y) => {
    const new_distance = distance_to_center(selected_shape, x, y);
    const scale_factor = new_distance / initial_scale_distance;

    const new_width = initial_width * scale_factor;
    const new_height = initial_height * scale_factor;

    selected_shape.x = initial_center_x - new_width / 2;
    selected_shape.y = initial_center_y - new_height / 2;
    selected_shape.width = new_width;
    selected_shape.height = new_height;
}

/**
 * Sets up rotation for shape.
 * @param {Object} shape - The shape to rotate.
 */
const setup_rotation = (shape) => {
    initial_angle = Math.atan2(
        start_y - (shape.y + shape.height / 2),
        start_x - (shape.x + shape.width / 2)
    );
    initial_rotation = shape.rotation;
}

/**
 * Rotates selected shape.
 * @param {number} x - The new x.
 * @param {number} y - The new y.
 */
const rotate_shape = (x, y) => {
    const center_x = selected_shape.x + selected_shape.width / 2;
    const center_y = selected_shape.y + selected_shape.height / 2;
    const current_angle = Math.atan2(y - center_y, x - center_x);
    const delta_angle = current_angle - initial_angle;

    selected_shape.rotation = initial_rotation + delta_angle;
}

/**
 * Calculates distance to shape center.
 * @param {Object} shape - The shape.
 * @param {number} x - The x.
 * @param {number} y - The y.
 * @returns {number} The distance.
 */
const distance_to_center = (shape, x, y) => {
    const center_x = shape.x + shape.width / 2;
    const center_y = shape.y + shape.height / 2;
    return Math.sqrt((x - center_x) ** 2 + (y - center_y) ** 2);
}

/**
 * Saves current state to history.
 */
const save_state = () => {
    if (history_index < history.length - 1) {
        history = history.slice(0, history_index + 1);
    }

    history.push(structuredClone(shapes));
    history_index++;

    if (history.length > 50) {
        history.shift();
        history_index--;
    }

    update_undo_redo_buttons();
}

/**
 * Undoes last action.
 */
const undo = () => {
    if (history_index > 0) {
        history_index--;
        shapes = structuredClone(history[history_index]);
        selected_shape = null;
        update_ui();
        queue_redraw();
    }
}

/**
 * Redoes undone action.
 */
const redo = () => {
    if (history_index < history.length - 1) {
        history_index++;
        shapes = structuredClone(history[history_index]);
        selected_shape = null;
        update_ui();
        queue_redraw();
    }
}

/**
 * Updates UI elements.
 */
const update_ui = () => {
    elems.shape_count_element.textContent = `${shapes.filter(s => !s.is_temp).length} shapes`;

    elems.selected_info_element.textContent = selected_shape ? `Selected: ${selected_shape.type}` : '';

    update_properties_panel();
}

/**
 * Updates properties panel for selected shape.
 */
const update_properties_panel = () => {
    if (!selected_shape) {
        elems.shape_properties_div.innerHTML = '<p class="no-selection">No shape selected</p>';
        return;
    }

    const shape = selected_shape;
    elems.shape_properties_div.innerHTML = `
        <div class="property-item">
            <label>Type:</label>
            <span>${shape.type}</span>
        </div>
        <div class="property-item">
            <label>Position:</label>
            <span>${Math.round(shape.x)}, ${Math.round(shape.y)}</span>
        </div>
        <div class="property-item">
            <label>Size:</label>
            <span>${Math.round(shape.width)} × ${Math.round(shape.height)}</span>
        </div>
        <div class="property-item">
            <label>Rotation:</label>
            <span>${Math.round(shape.rotation * 180 / Math.PI)}°</span>
        </div>
    `;
}

/**
 * Updates cursor position display.
 * @param {number} x - The x position.
 * @param {number} y - The y position.
 */
const update_cursor_position = (x, y) => {
    elems.cursor_position_element.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
}

/**
 * Updates undo and redo button states.
 */
const update_undo_redo_buttons = () => {
    elems.undo_button.disabled = history_index <= 0;
    elems.redo_button.disabled = history_index >= history.length - 1;
}

const snap_selected_to_grid = () => {
    if (!selected_shape) return;

    const grid = 20;
    const center_x = selected_shape.x + selected_shape.width / 2;
    const center_y = selected_shape.y + selected_shape.height / 2;

    const snapped_cx = Math.round(center_x / grid) * grid;
    const snapped_cy = Math.round(center_y / grid) * grid;

    const snapped_w = Math.round(selected_shape.width / grid) * grid;
    const snapped_h = Math.round(selected_shape.height / grid) * grid;

    selected_shape.x = snapped_cx - snapped_w / 2;
    selected_shape.y = snapped_cy - snapped_h / 2;
    selected_shape.width = snapped_w;
    selected_shape.height = snapped_h;

    save_state();
    queue_redraw();
    show_notification('Shape snapped to grid', 'success');
};

/**
 * Queues a redraw using requestAnimationFrame.
 */
const queue_redraw = () => {
    if (!redraw_requested) {
        redraw_requested = true;
        requestAnimationFrame(() => {
            redraw();
            redraw_requested = false;
        });
    }
}

/**
 * Redraws the canvas content.
 */
const redraw = () => {
    elems.ctx.clearRect(0, 0, elems.main_canvas.width, elems.main_canvas.height);

    if (texture_image) {
        elems.ctx.drawImage(texture_image, 0, 0, elems.main_canvas.width, elems.main_canvas.height);
    }

    if (elems.show_grid_checkbox?.checked) {
        draw_grid();
    }

    shapes.forEach(shape => {
        draw_shape(shape, shape === selected_shape);
    });
}

/**
 * Draws grid on canvas.
 */
const draw_grid = () => {
    const grid_size = 20;
    elems.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    elems.ctx.lineWidth = 1;

    for (let x = 0; x <= elems.main_canvas.width; x += grid_size) {
        elems.ctx.beginPath();
        elems.ctx.moveTo(x, 0);
        elems.ctx.lineTo(x, elems.main_canvas.height);
        elems.ctx.stroke();
    }

    for (let y = 0; y <= elems.main_canvas.height; y += grid_size) {
        elems.ctx.beginPath();
        elems.ctx.moveTo(0, y);
        elems.ctx.lineTo(elems.main_canvas.width, y);
        elems.ctx.stroke();
    }
}

/**
 * Draws a shape on canvas.
 * @param {Object} shape - The shape to draw.
 * @param {boolean} [is_selected=false] - If shape is selected.
 */
const draw_shape = (shape, is_selected = false) => {
    elems.ctx.save();

    const center_x = shape.x + shape.width / 2;
    const center_y = shape.y + shape.height / 2;

    elems.ctx.translate(center_x, center_y);
    elems.ctx.rotate(shape.rotation);

    elems.ctx.strokeStyle = is_selected ? '#ef4444' : '#000000';
    elems.ctx.lineWidth = is_selected ? 3 : 2;
    elems.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';

    switch (shape.type) {
        case 'rectangle':
            draw_rectangle(shape);
            break;
        case 'circle':
            draw_circle(shape);
            break;
        case 'triangle':
            draw_polygon(shape, 3);
            break;
        case 'pentagon':
            draw_polygon(shape, 5);
            break;
        case 'hexagon':
            draw_polygon(shape, 6);
            break;
    }

    if (is_selected) {
        draw_selection_handles(shape);
    }

    elems.ctx.restore();
}

/**
 * Draws a rectangle shape.
 * @param {Object} shape - The shape.
 */
const draw_rectangle = (shape) => {
    const half_width = shape.width / 2;
    const half_height = shape.height / 2;

    elems.ctx.fillRect(-half_width, -half_height, shape.width, shape.height);
    elems.ctx.strokeRect(-half_width, -half_height, shape.width, shape.height);
}

/**
 * Draws a circle shape.
 * @param {Object} shape - The shape.
 */
const draw_circle = (shape) => {
    const radius = Math.abs(shape.width) / 2;

    elems.ctx.beginPath();
    elems.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    elems.ctx.fill();
    elems.ctx.stroke();
}

/**
 * Draws a polygon shape.
 * @param {Object} shape - The shape.
 * @param {number} sides - Number of sides.
 */
const draw_polygon = (shape, sides) => {
    const radius = Math.abs(shape.width) / 2;

    elems.ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        if (i === 0) {
            elems.ctx.moveTo(x, y);
        }
        else {
            elems.ctx.lineTo(x, y);
        }
    }
    elems.ctx.closePath();
    elems.ctx.fill();
    elems.ctx.stroke();
}

/**
 * Draws selection handles for shape.
 * @param {Object} shape - The shape.
 */
const draw_selection_handles = (shape) => {
    const half_width = shape.width / 2;
    const half_height = shape.height / 2;
    const handle_size = 6;

    elems.ctx.fillStyle = '#3b82f6';

    elems.ctx.fillRect(-half_width - handle_size / 2, -half_height - handle_size / 2, handle_size, handle_size);
    elems.ctx.fillRect(half_width - handle_size / 2, -half_height - handle_size / 2, handle_size, handle_size);
    elems.ctx.fillRect(-half_width - handle_size / 2, half_height - handle_size / 2, handle_size, handle_size);
    elems.ctx.fillRect(half_width - handle_size / 2, half_height - handle_size / 2, handle_size, handle_size);
}

/**
 * Clears all shapes.
 */
const clear_all = () => {
    if (shapes.length === 0) return;

    if (confirm('Are you sure you want to clear all shapes?')) {
        shapes = [];
        selected_shape = null;
        save_state();
        update_ui();
        queue_redraw();
        show_notification('All shapes cleared', 'success');
    }
}

/**
 * Deletes selected shape.
 */
const delete_selected_shape = () => {
    if (selected_shape) {
        const index = shapes.indexOf(selected_shape);
        if (index > -1) {
            shapes.splice(index, 1);
            selected_shape = null;
            save_state();
            update_ui();
            queue_redraw();
            show_notification('Shape deleted', 'success');
        }
    }
}

/**
 * Copies selected shape.
 */
const copy_shape = () => {
    if (selected_shape) {
        copied_shape = structuredClone(selected_shape);
        show_notification('Shape copied to clipboard', 'success');
    }
}

/**
 * Pastes copied shape.
 */
const paste_shape = () => {
    if (copied_shape) {
        const new_shape = structuredClone(copied_shape);
        new_shape.id = Date.now() + Math.random();
        new_shape.x += 20;
        new_shape.y += 20;

        if (elems.snap_to_grid_checkbox?.checked) {
            const grid = 20;
            new_shape.x = Math.round(new_shape.x / grid) * grid;
            new_shape.y = Math.round(new_shape.y / grid) * grid;
        }

        shapes.push(new_shape);
        selected_shape = new_shape;
        save_state();
        update_ui();
        queue_redraw();
        show_notification('Shape pasted', 'success');
    }
};

/**
 * Exports mesh data.
 */
const export_mesh = async () => {
    if (shapes.length === 0) {
        console.warn('No shapes provided for export workflow');
        return;
    }

    const export_options = {
        file_name: `frame_model.glb`,
        frame_width: elems.main_canvas.width,
        frame_height: elems.main_canvas.height,
        binary: true
    };

    console.log(`Starting export workflow for ${shapes.length} shapes...`);

    const success = await export_and_save_gltf(shapes, export_options);

    if (success) {
        console.log('Export workflow completed successfully');
    } 
    else {
        console.log('Export workflow failed');
    }

}

/**
 * Save GLTF data to a file for download
 * @param {ArrayBuffer|Object} gltf_data - The GLTF data to save
 * @param {string} file_name - The name for the output file
 * @returns {boolean} True if save was successful, false otherwise
 */
const save_gltf_data = (gltf_data, file_name = 'exported_model.glb') => {
    if (!gltf_data) {
        console.error('No GLTF data provided for saving');
        return false;
    }

    try {
        let data_blob;
        let final_file_name = file_name;

        // Handle both binary and JSON GLTF formats
        if (gltf_data instanceof ArrayBuffer) {
            data_blob = new Blob([gltf_data], { type: 'model/gltf-binary' });
            if (!final_file_name.endsWith('.glb')) {
                final_file_name = final_file_name.replace(/\.\w+$/, '') + '.glb';
            }
        } else if (typeof gltf_data === 'object' && gltf_data !== null) {
            const json_string = JSON.stringify(gltf_data);
            data_blob = new Blob([json_string], { type: 'model/gltf+json' });
            if (!final_file_name.endsWith('.gltf')) {
                final_file_name = final_file_name.replace(/\.\w+$/, '') + '.gltf';
            }
        } else {
            throw new Error('Unsupported GLTF data format');
        }

        // Create download link and trigger click
        const download_url = URL.createObjectURL(data_blob);
        const download_link = document.createElement('a');

        download_link.href = download_url;
        download_link.download = final_file_name;
        download_link.style.display = 'none';

        document.body.appendChild(download_link);
        download_link.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(download_link);
            URL.revokeObjectURL(download_url);
        }, 1000);

        console.log(`GLTF file saved successfully: ${final_file_name}`);
        return true;

    } catch (error) {
        console.error('Error saving GLTF file:', error);
        return false;
    }
};

/**
 * Export shapes to GLTF and automatically save the file
 * @param {Object[]} shape_list - Array of shapes to export
 * @param {Object} export_options - Export configuration options
 * @param {string} [export_options.file_name='exported_model.glb'] - Output file name
 * @param {number} [export_options.frame_width=800] - The frame width
 * @param {number} [export_options.frame_height=600] - The frame height
 * @param {boolean} [export_options.binary=true] - Export as binary GLTF
 * @returns {Promise<boolean>} True if export and save were successful
 */
const export_and_save_gltf = async (shape_list, export_options = {}) => {
    const {
        file_name = 'exported_model.glb',
        ...gltf_export_options
    } = export_options;

    try {
        const gltf_data = await export_to_gltf(shape_list, gltf_export_options);

        if (!gltf_data) {
            console.warn('No GLTF data generated from shapes');
            return false;
        }

        const save_success = save_gltf_data(gltf_data, file_name);
        return save_success;

    } catch (error) {
        if (error instanceof GeometryExportError) {
            console.error(`Export failed: ${error.message} (code: ${error.error_code})`);
        } else {
            console.error('Unexpected error during export and save:', error);
        }
        return false;
    }
};

/**
 * Shows a notification.
 * @param {string} message - The message.
 * @param {string} [type='info'] - The type.
 */
const show_notification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    elems.notifications_element.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

/**
 * Shows or hides loading overlay.
 * @param {boolean} show - If to show.
 */
const show_loading = (show) => {
    elems.loading_overlay.classList.toggle('hidden', !show);
}

/**
 * Toggles theme.
 */
const toggle_theme = () => {
    const current_theme = document.documentElement.getAttribute('data-theme');
    const new_theme = current_theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', new_theme);

    elems.theme_icon.textContent = new_theme === 'dark' ? '☀️' : '🌙';
}

/**
 * Toggles tutorial visibility.
 */
const toggle_tutorial = () => {
    elems.tutorial_content.style.display = elems.tutorial_content.style.display === 'none' ? 'block' : 'none';
    elems.toggle_tutorial_button.textContent = elems.tutorial_content.style.display === 'none' ? '+' : '−';
}

/**
 * Configures the canvas element.
 */
const setup_canvas = () => {
    elems.main_canvas.width = 800;
    elems.main_canvas.height = 600;
    elems.ctx.imageSmoothingEnabled = true;
    elems.ctx.imageSmoothingQuality = 'high';
}

/**
 * Sets up event listeners for UI elements.
 */
const setup_event_listeners = () => {
    elems.tool_buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            set_current_tool(e.currentTarget.dataset.tool);
        });
    });

    elems.clear_all_button.addEventListener('click', () => clear_all());
    elems.undo_button.addEventListener('click', () => undo());
    elems.redo_button.addEventListener('click', () => redo());
    elems.export_mesh_button.addEventListener('click', () => export_mesh());

    elems.upload_texture_input.addEventListener('change', (e) => {
        handle_texture_upload(e.target.files[0]);
    });

    elems.main_canvas.addEventListener('mousedown', (e) => handle_mouse_down(e));
    elems.main_canvas.addEventListener('mousemove', (e) => handle_mouse_move(e));
    document.addEventListener('mouseup', () => handle_mouse_up());

    document.addEventListener('keydown', (e) => handle_key_down(e));
    document.addEventListener('keyup', (e) => handle_key_up(e));

    elems.snap_to_grid_button.addEventListener('click', snap_selected_to_grid);

    elems.toggle_theme_button.addEventListener('click', () => toggle_theme());

    elems.toggle_tutorial_button.addEventListener('click', () => toggle_tutorial());

    elems.show_grid_checkbox.addEventListener('change', () => queue_redraw());
}

const cache_elements = () => {
    elems = {
        main_canvas: document.getElementById('main-canvas'),
        tool_buttons: document.querySelectorAll('[data-tool]'),
        clear_all_button: document.getElementById('clear-all'),
        undo_button: document.getElementById('undo'),
        redo_button: document.getElementById('redo'),
        export_mesh_button: document.getElementById('export-mesh'),
        upload_texture_input: document.getElementById('upload-texture'),
        shape_count_element: document.getElementById('shape-count'),
        selected_info_element: document.getElementById('selected-info'),
        shape_properties_div: document.getElementById('shape-properties'),
        cursor_position_element: document.getElementById('cursor-position'),
        notifications_element: document.getElementById('notifications'),
        loading_overlay: document.getElementById('loading-overlay'),
        toggle_theme_button: document.getElementById('toggle-theme'),
        toggle_tutorial_button: document.getElementById('toggle-tutorial'),
        tutorial_content: document.querySelector('.tutorial-content'),
        show_grid_checkbox: document.getElementById('show-grid'),
        snap_to_grid_button: document.getElementById('snap-to-grid'),
        theme_icon: document.querySelector('.theme-icon'),
    };

    elems.ctx = elems.main_canvas.getContext('2d');
};

/**
 * Initializes the application.
 */
const init = () => {
    cache_elements();
    setup_event_listeners();
    setup_canvas();
    update_ui();
    redraw();
    show_notification('Fragmented Frame Tool Ready', 'success');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
}
else init();







/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/











