
/**
 * Normal Map Merger: A tool for merging two normal maps.
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

import { save_file } from "../../../lib/module/files.js";
import {
    blank_image_data,
    canvas_to_blob,
    get_image_data,
    has_transparency,
    load_image
} from "../../../lib/module/image.js";
import { init_workers_pool, merge_normal_map } from "../../../lib/module/worker.js";

// Optimized state management
const state = {
    datas: { base: null, add: null, mask: null },
    is_processing: false,
    result_image_data: null,
    canvas_ctx: null
};

// DOM cache with null initialization
let dom_cache = null;

// Reusable objects pool
const object_pool = {
    canvas: [],
    image_data: [],
    event_handlers: new Map()
};

// Constants for better performance
const CTX_OPTIONS = { willReadFrequently: false };
const DRAG_EVENTS = ['dragenter', 'dragover', 'dragleave', 'drop'];
const MAX_PREVIEW_SIZE = 100;

/**
 * Initialize DOM cache for fast access.
 */
const init_dom_cache = () => {
    if (dom_cache) return dom_cache;

    dom_cache = {
        base_input: document.getElementById('baseInput'),
        add_input: document.getElementById('addInput'),
        intensity_input: document.getElementById('intensity'),
        fallback_alpha_input: document.getElementById('fallbackAlpha'),
        merge_button: document.getElementById('process-btn'),
        preview_canvas: document.getElementById('preview'),
        error_message: document.getElementById('error-message'),
        download_button: document.getElementById('download')
    };

    state.canvas_ctx = dom_cache.preview_canvas.getContext('2d', CTX_OPTIONS);
    return dom_cache;
};

/**
 * Display error message to user.
 * @param {string} message - error message to display
 */
const show_error = (message) => {
    const { error_message } = init_dom_cache();
    error_message.textContent = message;
    error_message.style.display = 'block';
};

/**
 * Clear any displayed error messages.
 */
const clear_error = () => {
    const { error_message } = init_dom_cache();
    error_message.textContent = '';
    error_message.style.display = 'none';
};

/**
 * Get canvas from pool or create new one.
 * @param {number} width - canvas width
 * @param {number} height - canvas height
 * @returns {HTMLCanvasElement} canvas element
 */
const get_canvas_from_pool = (width, height) => {
    for (let i = 0; i < object_pool.canvas.length; i++) {
        const canvas = object_pool.canvas[i];
        if (canvas.width === width && canvas.height === height) {
            return object_pool.canvas.splice(i, 1)[0];
        }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

/**
 * Return canvas to pool for reuse.
 * @param {HTMLCanvasElement} canvas - canvas to recycle
 */
const return_canvas_to_pool = (canvas) => {
    const ctx = canvas.getContext('2d', CTX_OPTIONS);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    object_pool.canvas.push(canvas);
};

/**
 * Create optimized canvas preview.
 * @param {HTMLImageElement} image - loaded image for preview
 * @param {number} max_size - maximum dimension for preview
 * @returns {HTMLCanvasElement} canvas element with preview
 */
const create_canvas_preview = (image, max_size = MAX_PREVIEW_SIZE) => {
    const canvas = get_canvas_from_pool(
        Math.min(image.width, max_size),
        Math.min(image.height, max_size)
    );
    const ctx = canvas.getContext('2d', CTX_OPTIONS);

    let { width, height } = image;

    // Fast dimension calculation
    if (width > max_size || height > max_size) {
        const ratio = width / height;
        if (ratio > 1) {
            width = max_size;
            height = Math.round(max_size / ratio);
        } else {
            height = max_size;
            width = Math.round(max_size * ratio);
        }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    return canvas;
};

/**
 * Update dropzone preview with selected image.
 * @param {string} dropzone_id - ID of the dropzone element
 * @param {HTMLImageElement} image - loaded image for preview
 * @param {string} file_name - name of the selected file
 */
const update_dropzone_preview = (dropzone_id, image, file_name) => {
    const dropzone = document.getElementById(dropzone_id);
    const existing_preview = dropzone.querySelector('.dropzone-preview');
    const existing_text = dropzone.querySelector('.dropzone-text');

    // Create canvas preview (avoids blob URL memory leaks)
    const canvas_preview = create_canvas_preview(image);
    const data_url = canvas_preview.toDataURL();

    if (existing_preview) {
        existing_preview.src = data_url;
        existing_preview.style.display = 'block';
        existing_preview.alt = file_name;
    } else {
        const preview_img = document.createElement('img');
        preview_img.className = 'dropzone-preview';
        preview_img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;display:block;';
        preview_img.src = data_url;
        preview_img.alt = file_name;
        dropzone.appendChild(preview_img);
    }

    if (existing_text) {
        existing_text.style.display = 'none';
    }

    // Return canvas to pool after brief delay
    setTimeout(() => return_canvas_to_pool(canvas_preview), 100);
};


/**
 * Handle file loading with optimized error handling.
 * @param {File} file - file to load
 * @param {string} file_var_name - key name in datas object
 * @param {string} dropzone_id - ID of the dropzone element
 */
const handle_file_load = async (file, file_var_name, dropzone_id) => {
    try {
        const image = await load_image(file);
        state.datas[file_var_name] = image;
        update_dropzone_preview(dropzone_id, image, file.name);
        clear_error();
    } catch (error) {
        show_error(`Failed to load ${file_var_name} image: ${error.message}`);
    }
};

/**
 * Prevent default behavior for drag events.
 * @param {Event} e - drag event
 */
const prevent_default = (e) => e.preventDefault();

/**
 * Set up drag and drop zone for file input.
 * @param {string} dropzone_id - ID of the dropzone element
 * @param {string} input_id - ID of the file input element
 * @param {string} file_var_name - key name in datas object
 */
const setup_dropzone = (dropzone_id, input_id, file_var_name) => {
    const dropzone = document.getElementById(dropzone_id);
    const input = document.getElementById(input_id);

    // Batch DOM creation
    const text_element = document.createElement('div');
    text_element.className = 'dropzone-text';
    text_element.textContent = dropzone.getAttribute('title') || 'Drop or click to select image';
    dropzone.appendChild(text_element);

    const preview_img = document.createElement('img');
    preview_img.className = 'dropzone-preview';
    preview_img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;display:none;';
    dropzone.appendChild(preview_img);

    // Optimized event handlers
    const click_handler = () => input.click();

    const change_handler = async () => {
        if (input.files.length > 0) {
            await handle_file_load(input.files[0], file_var_name, dropzone_id);
        }
    };

    const drag_over_handler = () => dropzone.classList.add('drag-over');
    const drag_leave_handler = () => dropzone.classList.remove('drag-over');

    const drop_handler = async (e) => {
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            await handle_file_load(e.dataTransfer.files[0], file_var_name, dropzone_id);
        }
    };

    // Register event listeners
    dropzone.addEventListener('click', click_handler);
    input.addEventListener('change', change_handler);
    DRAG_EVENTS.forEach(event_name => {
        dropzone.addEventListener(event_name, prevent_default);
    });
    dropzone.addEventListener('dragover', drag_over_handler);
    dropzone.addEventListener('dragleave', drag_leave_handler);
    dropzone.addEventListener('drop', drop_handler);

    // Cache for cleanup
    object_pool.event_handlers.set(`${dropzone_id}_click`, click_handler);
    object_pool.event_handlers.set(`${input_id}_change`, change_handler);
    object_pool.event_handlers.set(`${dropzone_id}_dragover`, drag_over_handler);
    object_pool.event_handlers.set(`${dropzone_id}_dragleave`, drag_leave_handler);
    object_pool.event_handlers.set(`${dropzone_id}_drop`, drop_handler);
};

/**
 * Validate required inputs before processing.
 * @throws {Error} when required inputs are missing
 */
const validate_inputs = () => {
    if (!state.datas.base) throw new Error('Please select a base normal map');
    if (!state.datas.add) throw new Error('Please select an add normal map');
};

/**
 * Load and prepare image data for processing.
 * @returns {Object} processed image data and dimensions
 */
const load_image_data = () => {
    const { datas } = state;
    const { intensity_input } = init_dom_cache();

    // Convert Image objects to ImageData with direct access
    if (datas.base instanceof Image) {
        datas.base = new ImageData(
            get_image_data(datas.base, 0, 0, datas.base.width, datas.base.height),
            datas.base.width, datas.base.height
        );
    }

    if (datas.add instanceof Image) {
        datas.add = new ImageData(
            get_image_data(datas.add, 0, 0, datas.add.width, datas.add.height),
            datas.add.width, datas.add.height
        );
    }

    // Create mask data if not provided
    if (!datas.mask) {
        const intensity = parseFloat(intensity_input.value) * 255;
        datas.mask = new ImageData(
            blank_image_data(datas.base.width, datas.base.height, intensity),
            datas.base.width, datas.base.height
        );
    } else if (datas.mask instanceof Image) {
        datas.mask = new ImageData(
            get_image_data(datas.mask, 0, 0, datas.mask.width, datas.mask.height),
            datas.mask.width, datas.mask.height
        );
    }

    // Return sliced data for immutability
    return {
        base: {
            data: datas.base.data.slice(0),
            width: datas.base.width,
            height: datas.base.height
        },
        add: {
            data: datas.add.data.slice(0),
            width: datas.add.width,
            height: datas.add.height
        },
        mask: {
            data: datas.mask.data.slice(0),
            width: datas.mask.width,
            height: datas.mask.height
        }
    };
};

/**
 * Apply fallback alpha values to merged data if no transparency exists.
 * @param {Uint8ClampedArray} merged_data - the merged image data
 */
const apply_fallback_alpha = (merged_data) => {
    if (!has_transparency(merged_data)) {
        const { fallback_alpha_input } = init_dom_cache();
        const fallback_alpha = parseInt(fallback_alpha_input.value);
        const data_length = merged_data.length;

        // Optimized loop with pre-calculation
        for (let i = 3; i < data_length; i += 4) {
            merged_data[i] = fallback_alpha;
        }
    }
};

/**
 * Merge normal maps with performance optimizations.
 */
const merge_normal_maps = async () => {
    if (state.is_processing) return;

    const { merge_button, preview_canvas, download_button } = init_dom_cache();

    try {
        state.is_processing = true;
        clear_error();

        // Batch DOM updates
        merge_button.classList.add('loading');
        merge_button.textContent = 'Processing...';
        preview_canvas.style.display = 'none';
        download_button.style.display = 'none';

        // Validate inputs
        validate_inputs();

        // Load and process image data
        const { base, add, mask } = load_image_data();

        // Merge normal maps using worker
        const merged_data = await merge_normal_map(
            { data: base.data, width: base.width, height: base.height },
            { data: add.data, width: add.width, height: add.height },
            { data: mask.data, width: mask.width, height: mask.height }
        );

        // Apply fallback alpha if no transparency
        apply_fallback_alpha(merged_data);

        // Display result with optimized canvas operations
        preview_canvas.width = base.width;
        preview_canvas.height = base.height;

        const image_data = state.canvas_ctx.createImageData(base.width, base.height);
        image_data.data.set(merged_data);
        state.canvas_ctx.putImageData(image_data, 0, 0);

        state.result_image_data = image_data;
        preview_canvas.style.display = 'block';
        download_button.style.display = 'block';

    } catch (error) {
        show_error(error.message);
        console.error('Error merging normal maps:', error);
    } finally {
        state.is_processing = false;
        merge_button.classList.remove('loading');
        merge_button.textContent = 'Merge Normal Maps';
    }
};

/**
 * Download the merged result as PNG file.
 */
const download_result = async () => {
    if (!state.result_image_data) {
        show_error('No result to download. Please merge normal maps first.');
        return;
    }

    const { base_input, add_input, preview_canvas } = init_dom_cache();

    try {
        const blob = await canvas_to_blob(preview_canvas);
        const base_name = base_input.files[0].name.split('.')[0];
        const add_name = add_input.files[0].name.split('.')[0];

        save_file(blob, `${base_name}_${add_name}.png`);
    } catch (error) {
        show_error(`Failed to download result: ${error.message}`);
    }
};



// Initialize the application when DOM is loaded
window.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing...');

    const { merge_button, download_button, preview_canvas } = init_dom_cache();

    setup_dropzone('baseDropzone', 'baseInput', 'base');
    setup_dropzone('addDropzone', 'addInput', 'add');
    setup_dropzone('maskDropzone', 'maskInput', 'mask');

    merge_button.addEventListener('click', merge_normal_maps);
    download_button.addEventListener('click', download_result);

    // Initial UI state
    download_button.style.display = 'none';
    preview_canvas.style.display = 'none';

    // Initialize worker pool
    init_workers_pool([{
        url: "../../../lib/worker/normal_map_ww.js",
        type: "module"
    }]);
});
