
/**
 * Normal Map Scaler.
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

import { get_file_name_from_url, save_file } from "../../../lib/module/files.js";
import { canvas_to_blob, get_image_data, load_image } from "../../../lib/module/image.js";
import { init_workers_pool, scale_normal_map } from "../../../lib/module/worker.js";

// DOM element cache
let drop_zone,
    file_input,
    width_select,
    height_select,
    process_button,
    progress_bar,
    error_message,
    preview_container,
    download_button,
    reset_button;

// Application state
let files = [];
let zip_file_name = "";
let uid = 0;

// Reusable objects to minimize GC
const canvas_pool = [];
const ctx_options = { willReadFrequently: false };

/**
 * Generates output file name.
 * @param {File} file - original file
 * @param {number} target_width - target width
 * @param {number} target_height - target height
 * @param {boolean} should_scale - whether scaling was performed
 * @returns {string} output file name
 */
const generate_output_name = (file, target_width, target_height, should_scale) => {
    const base_name = get_file_name_from_url(file.name);
    let result = should_scale
        ? `${base_name}_scaled_${target_width || 'orig'}x${target_height || 'orig'}.png`
        : file.name;
    
    // Early return for short names
    if (result.length <= 20) return `${++uid}${result}`;
    
    // Optimized truncation logic
    const ext = '.png';
    const allowed_base_len = 20 - ext.length;
    const truncated_name = should_scale 
        ? result.substring(0, allowed_base_len) + ext
        : result.substring(0, 20);
    
    return `${++uid}${truncated_name}`;
};

/**
 * Gets or creates canvas from pool.
 * @param {number} width - canvas width
 * @param {number} height - canvas height
 * @returns {HTMLCanvasElement} canvas element
 */
const get_canvas_from_pool = (width, height) => {
    for (let i = 0; i < canvas_pool.length; i++) {
        const canvas = canvas_pool[i];
        if (canvas.width === width && canvas.height === height) {
            return canvas_pool.splice(i, 1)[0];
        }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

/**
 * Returns canvas to pool.
 * @param {HTMLCanvasElement} canvas - canvas to recycle
 */
const return_canvas_to_pool = (canvas) => {
    const ctx = canvas.getContext('2d', ctx_options);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas_pool.push(canvas);
};

/**
 * Calculates display dimensions with maximum size constraint.
 * @param {number} width - original width
 * @param {number} height - original height
 * @param {number} max_size - maximum display size
 * @returns {Object} display dimensions
 */
const calculate_display_dimensions = (width, height, max_size = 128) => {
    if (width <= max_size && height <= max_size) {
        return { display_width: width, display_height: height };
    }
    
    const ratio = width / height;
    let display_width, display_height;
    
    if (ratio > 1) {
        display_width = max_size;
        display_height = Math.round(max_size / ratio);
    } else {
        display_height = max_size;
        display_width = Math.round(max_size * ratio);
    }
    
    return { display_width, display_height };
};

/**
 * Displays preview of original and scaled images.
 * @param {string} file_name - name of the file
 * @param {HTMLImageElement} original_img - original image
 * @param {HTMLCanvasElement} scaled_canvas - scaled image canvas
 */
const display_preview = (file_name, original_img, scaled_canvas) => {
    const original_width = original_img.naturalWidth || original_img.width;
    const original_height = original_img.naturalHeight || original_img.height;
    const scaled_width = scaled_canvas.width;
    const scaled_height = scaled_canvas.height;

    // Calculate display dimensions in single pass
    const original_dims = calculate_display_dimensions(original_width, original_height);
    const scaled_dims = calculate_display_dimensions(scaled_width, scaled_height);

    // Batch DOM creation
    const preview = document.createElement('div');
    preview.className = 'preview';
    preview.innerHTML = `
        <h3 class="truncated-text" title="${file_name}">${file_name}</h3>
        <p>Original (${original_width}x${original_height})</p>
        <canvas width="${original_dims.display_width}" height="${original_dims.display_height}"></canvas>
        <p>Scaled (${scaled_width}x${scaled_height})</p>
        <canvas class="scaled" width="${scaled_dims.display_width}" height="${scaled_dims.display_height}"></canvas>
    `;

    // Batch canvas operations
    const original_canvas = preview.querySelector('canvas:not(.scaled)');
    const original_ctx = original_canvas.getContext('2d', ctx_options);
    original_ctx.imageSmoothingEnabled = false;
    original_ctx.drawImage(original_img, 0, 0, original_dims.display_width, original_dims.display_height);

    const scaled_canvas_preview = preview.querySelector('canvas.scaled');
    const scaled_ctx = scaled_canvas_preview.getContext('2d', ctx_options);
    scaled_ctx.imageSmoothingEnabled = false;
    scaled_ctx.drawImage(scaled_canvas, 0, 0, scaled_dims.display_width, scaled_dims.display_height);

    preview_container.appendChild(preview);
};

/**
 * Updates the file selection status display.
 */
const update_file_status = () => {
    drop_zone.textContent = files.length 
        ? `${files.length} file(s) selected` 
        : 'Drag and drop normal maps here or click to select';
    process_button.disabled = files.length === 0;
};

/**
 * Initializes UI for processing.
 */
const initialize_ui = () => {
    error_message.textContent = '';
    preview_container.innerHTML = '';
    progress_bar.style.display = 'block';
    progress_bar.value = 0;
    download_button.style.display = 'none';
};

/**
 * Determines if scaling is needed.
 * @param {HTMLImageElement} img - source image
 * @param {number} target_width - target width
 * @param {number} target_height - target height
 * @returns {boolean} whether scaling is required
 */
const should_scale_image = (img, target_width, target_height) => {
    const natural_width = img.naturalWidth || img.width;
    const natural_height = img.naturalHeight || img.height;

    if (target_width === 0 && target_height === 0) return false;
    if (target_width === 0) return natural_height !== target_height;
    if (target_height === 0) return natural_width !== target_width;
    return natural_width !== target_width || natural_height !== target_height;
};

/**
 * Creates canvas from scaled data using pool.
 * @param {Uint8ClampedArray|HTMLImageElement} scaled_data - scaled image data
 * @param {number} target_width - target width
 * @param {number} target_height - target height
 * @returns {HTMLCanvasElement} scaled image canvas
 */
const create_scaled_canvas = (scaled_data, target_width, target_height) => {
    const canvas = get_canvas_from_pool(target_width, target_height);
    const ctx = canvas.getContext('2d', ctx_options);
    
    if (scaled_data instanceof Uint8ClampedArray) {
        ctx.putImageData(new ImageData(scaled_data, target_width, target_height), 0, 0);
    } else if (scaled_data instanceof Image) {
        ctx.drawImage(scaled_data, 0, 0);
    }
    
    return canvas;
};

/**
 * Processes an image file asynchronously.
 * @param {File} file - the input image file
 * @param {number} target_width - desired width for scaling
 * @param {number} target_height - desired height for scaling
 * @param {JSZip} zip - the JSZip instance to store the processed file
 * @returns {Promise<boolean>} resolves to true on success, false on failure
 */
const process_file = async (file, target_width, target_height, zip) => {
    try {
        const img = await load_image(file);
        const natural_width = img.naturalWidth || img.width;
        const natural_height = img.naturalHeight || img.height;
        const should_scale = should_scale_image(img, target_width, target_height);

        let scaled_canvas;
        if (should_scale) {
            const scale_width = target_width > 0 ? target_width : natural_width;
            const scale_height = target_height > 0 ? target_height : natural_height;
            const src_data = get_image_data(img, 0, 0, natural_width, natural_height);

            const scaled_data = await scale_normal_map(src_data, natural_width, natural_height, scale_width, scale_height);
            scaled_canvas = create_scaled_canvas(scaled_data, scale_width, scale_height);
        } else {
            scaled_canvas = create_scaled_canvas(img, natural_width, natural_height);
        }

        const blob = await canvas_to_blob(scaled_canvas);
        const output_name = generate_output_name(file, target_width, target_height, should_scale);
        
        zip.file(output_name, blob);
        display_preview(file.name, img, scaled_canvas);
        
        // Return canvas to pool after display
        setTimeout(() => return_canvas_to_pool(scaled_canvas), 1000);
        
        return true;
    } catch (err) {
        error_message.textContent = `Error processing ${file.name}: ${err.message}. Continuing with other files.`;
        return false;
    }
};

/**
 * Finalizes processing and prepares download.
 * @param {JSZip} zip - ZIP archive instance
 * @param {File[]} files - processed files
 * @param {number} target_width - target width used
 * @param {number} target_height - target height used
 * @param {boolean} has_valid_normal_map - whether valid maps were processed
 */
const finalize_processing = async (zip, files, target_width, target_height, has_valid_normal_map) => {
    if (!has_valid_normal_map || Object.keys(zip.files).length === 0) {
        error_message.textContent = 'No valid normal maps were processed.';
        return;
    }

    const zip_blob = await zip.generateAsync({ type: 'blob' });
    const size_label = `${target_width || 'orig'}x${target_height || 'orig'}`;
    const base_name = get_file_name_from_url(files[0].name);
    zip_file_name = `${base_name}_scaled_normal_maps_${size_label}.zip`;

    download_button.textContent = `Download ${zip_file_name}`;
    download_button.style.display = "block";
    download_button.onclick = () => save_file(zip_blob, zip_file_name);
};

/**
 * Resets the application to initial state.
 */
const reset_app = () => {
    files = [];
    zip_file_name = "";
    drop_zone.innerHTML = `<div class="icon">📁</div><p>Drag and drop normal maps here or click to select</p>`;
    process_button.disabled = true;
    progress_bar.style.display = 'none';
    progress_bar.value = 0;
    error_message.textContent = '';
    preview_container.innerHTML = '';
    download_button.style.display = 'none';
    file_input.value = '';
    width_select.value = "512";
    height_select.value = "512";
    
    // Clear canvas pool on reset
    canvas_pool.length = 0;
};

// Event handler optimizations
const handle_dragover = (e) => {
    e.preventDefault();
    drop_zone.classList.add('dragover');
};

const handle_dragleave = () => {
    drop_zone.classList.remove('dragover');
};

const handle_drop = (e) => {
    e.preventDefault();
    drop_zone.classList.remove('dragover');
    files = Array.from(e.dataTransfer.files);
    update_file_status();
};

const handle_file_input_change = () => {
    files = Array.from(file_input.files);
    update_file_status();
};

const handle_process_click = async () => {
    if (files.length === 0) return;

    initialize_ui();

    const target_width = parseInt(width_select.value) || 0;
    const target_height = parseInt(height_select.value) || 0;
    const zip = new JSZip();
    let has_valid_normal_map = false;
    const total_files = files.length;

    // Process files in batches to avoid blocking
    const batch_size = 3;
    for (let i = 0; i < total_files; i += batch_size) {
        const batch = files.slice(i, i + batch_size);
        const results = await Promise.all(
            batch.map(file => 
                process_file(file, target_width, target_height, zip)
                    .then(success => {
                        if (success) has_valid_normal_map = true;
                        progress_bar.value = ((i + batch.indexOf(file) + 1) / total_files) * 100;
                        return success;
                    })
            )
        );
        
        // Small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 16));
    }

    await finalize_processing(zip, files, target_width, target_height, has_valid_normal_map);
    progress_bar.style.display = 'none';
};

window.addEventListener('DOMContentLoaded', async () => {
    // Cache DOM elements
    drop_zone = document.getElementById('dropZone');
    file_input = document.getElementById('fileInput');
    width_select = document.getElementById('widthSelect');
    height_select = document.getElementById('heightSelect');
    process_button = document.getElementById('processButton');
    progress_bar = document.getElementById('progressBar');
    error_message = document.getElementById('errorMessage');
    preview_container = document.getElementById('previewContainer');
    download_button = document.getElementById('downloadButton');
    reset_button = document.getElementById('resetButton');

    // Event listeners with optimized handlers
    drop_zone.addEventListener('click', () => file_input.click());
    drop_zone.addEventListener('dragover', handle_dragover);
    drop_zone.addEventListener('dragleave', handle_dragleave);
    drop_zone.addEventListener('drop', handle_drop);
    file_input.addEventListener('change', handle_file_input_change);
    process_button.addEventListener('click', handle_process_click);
    reset_button.addEventListener('click', reset_app);

    // Initialize worker pool
    await init_workers_pool([{
        url: "../../../lib/worker/normal_map_ww.js",
        type: "module"
    }]);
});
