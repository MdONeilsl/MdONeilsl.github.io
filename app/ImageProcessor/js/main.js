/**
 * Image Processor: Optimize and convert images (PNG, JPEG, WebP, GLTF) for Assets and web applications
 * @copyright 2025 MdONeil
 * @license GPL-3.0-or-later
 */
import { drop_zone } from "../../../lib/html/drop_zone.js";
import { img_scl_crt } from "../../../lib/html/img_scl_crt.js";
import { get_file_name_from_url, save_file } from "../../../lib/module/files.js";
import { debounce } from "../../../lib/module/function.js";
import { canvas_to_blob, get_image_data, has_transparency, scale_image_array } from "../../../lib/module/image.js";
import { clamp } from "../../../lib/module/math.js";
import { init_workers_pool, scale_image_map } from "../../../lib/module/worker.js";

let uploader, scl_crt;

// Global state with optimized data structures
const state = {
    original_file: null,
    original_img: null,
    has_transparency_val: false,
    divider_position: 50,
    active_blob: null
};

// DOM elements cache with direct references
const elements = {};

// Initialize DOM elements cache in one batch
const initialize_dom_cache = () => {
    const element_ids = [
        'max_chk', 'max_val', 'step_sel', 'width_num', 'height_num',
        'width_pow2', 'height_pow2', 'scl_slider', 'filter_sel', 'gama_chk',
        'unsharp_chk', 'ush_amount', 'ush_radius', 'ush_threshold',
        'format', 'qualityRange', 'optimizedPreview', 'base64Uri',
        'originalDimensions', 'optimizedDimensions', 'optimizedSize',
        'spaceSaved', 'saveButton', 'originalPreview', 'originalSize',
        'template', 'alphaChannel', 'num_sec', 'pow2_sec', 'sldr_disp',
        'uploadArea', 'fileInput', 'qualityValue', 'previewContainer',
        'previewDivider', 'ush_a_disp', 'ush_r_disp',
        'ush_t_disp', 'copyButton', 'force_chk'
    ];

    element_ids.forEach(id => {
        elements[id] = document.getElementById(id);
    });
};

/**
 * Process image with current settings
 */
const process_image = async () => {
    if (!state.original_img) return;

    // Batch DOM reads for settings
    const width = scl_crt.width;
    const height = scl_crt.height;
    const filter = scl_crt.filter;
    const gamma_correction = scl_crt.gama;
    const unsharp_mask = scl_crt.unsharp;
    const unsharp_amount_val = scl_crt.ush_amount;
    const unsharp_radius_val = scl_crt.ush_radius;
    const unsharp_threshold_val = scl_crt.ush_threshold;

    let pixels = get_image_data(
        state.original_img,
        0, 0,
        state.original_img.width,
        state.original_img.height
    );

    // Scale image if dimensions changed
    if (width !== state.original_img.width || height !== state.original_img.height || scl_crt.force) {
        if (filter === "none") {
            pixels = scale_image_array(
                pixels,
                state.original_img.width,
                state.original_img.height,
                width,
                height,
            );
        } else {
            pixels = await scale_image_map(
                pixels,
                state.original_img.width,
                state.original_img.height,
                width,
                height,
                {
                    filter_sel: filter,
                    gamma_correct: gamma_correction,
                    unsharp_amount: unsharp_mask ? unsharp_amount_val : 0,
                    unsharp_radius: unsharp_radius_val,
                    unsharp_threshold: unsharp_threshold_val
                }
            );
        }
    }

    // Reuse canvas to reduce memory allocation
    let canvas = elements._process_canvas;
    if (!canvas) {
        canvas = document.createElement('canvas');
        elements._process_canvas = canvas;
    }
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions once
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    // Create ImageData efficiently
    const image_data = pixels instanceof ImageData ? pixels : new ImageData(pixels, width, height);
    ctx.putImageData(image_data, 0, 0);

    debounced_process_format();
};

/**
 * Process image format and update display
 */
const process_format = async () => {
    const canvas = elements._process_canvas;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const format_val = elements.format.value;
    const quality_val = +elements.qualityRange.value;

    const [preview_data_url, blob] = await Promise.all([
        canvas.toDataURL(`image/${format_val}`, quality_val),
        canvas_to_blob(canvas, format_val, quality_val)
    ]);

    // Update visual elements
    elements.optimizedPreview.style.backgroundImage = `url(${preview_data_url})`;
    elements.optimizedDimensions.textContent = `${width} × ${height} px`;
    elements.optimizedSize.textContent = format_size_units(blob.size);

    // Calculate savings with color coding
    let saved = 0;
    if (state.original_file) {
        saved = ((1 - blob.size / state.original_file.size) * 100);
    }

    // Format the saved percentage with sign
    const saved_formatted = `${saved >= 0 ? '+' : ''}${saved.toFixed(2)}%`;
    elements.spaceSaved.textContent = saved_formatted;

    // Set color based on savings
    if (saved === 0) {
        elements.spaceSaved.style.color = 'white';
    } else if (saved > 0) {
        elements.spaceSaved.style.color = 'green';
    } else {
        elements.spaceSaved.style.color = 'red';
    }

    // Update data elements
    elements.base64Uri.value = preview_data_url;
    state.active_blob = blob;
};

// Debounced image processing
const debounced_process_image = debounce(process_image, 300);
const debounced_process_format = debounce(process_format, 300);

/**
 * Handle file selection
 * @param {File} file - Selected image file
 */
const handle_file = (file) => {
    if (!file || !file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }

    state.original_file = file;
    const reader = new FileReader();

    reader.onload = (e) => {
        if (!state.original_img) {
            state.original_img = new Image();
        }

        const img = state.original_img;
        img.onload = () => {
            scl_crt.setup(img);

            // Check transparency
            const image_data = get_image_data(img, 0, 0, img.width, img.height);
            state.has_transparency_val = has_transparency(image_data);

            update_ui_after_file_load(e.target.result, file, img);
            update_format_options();
            process_image();
        };

        img.onerror = () => {
            alert('Failed to load image. Please try another file.');
        };

        img.src = e.target.result;
    };

    reader.onerror = () => {
        alert('Failed to read file. Please try again.');
    };

    reader.readAsDataURL(file);
};

/**
 * Update UI after file load
 * @param {string} result - File reader result
 * @param {File} file - Original file
 * @param {HTMLImageElement} img - Loaded image
 */
const update_ui_after_file_load = (result, file, img) => {

    elements.originalPreview.style.backgroundImage = `url(${result})`;
    elements.originalSize.textContent = format_size_units(file.size);
    elements.originalDimensions.textContent = `${img.width} × ${img.height} px`;
    elements.optimizedDimensions.textContent = `${img.width} × ${img.height} px`;

    // Update upload text
    const upload_text = document.querySelector('.upload-text');
    const upload_subtext = document.querySelector('.upload-subtext');
    if (upload_text && upload_subtext) {
        upload_text.textContent = `Selected: ${file.name}`;
        upload_subtext.textContent = `${img.width} × ${img.height}px • ${format_size_units(file.size)}`;
    }
};

/**
 * Update format options based on current settings
 */
const update_format_options = () => {
    const template = elements.template.value;
    const alpha_select = elements.alphaChannel.value;
    let formats = ['jpeg', 'png', 'webp', 'avif'];

    // Filter formats based on template
    if (template === 'slupload' || template === 'gltf') {
        formats = formats.filter(item => item !== 'avif' && item !== 'webp');
    }

    // Filter based on alpha channel settings
    const formats_to_remove = new Set();
    if (alpha_select === 'remove' || (alpha_select === 'unchanged' && !state.has_transparency_val)) {
        formats_to_remove.add('png').add('webp').add('avif');
    } else if (alpha_select === 'add' || (alpha_select === 'unchanged' && state.has_transparency_val)) {
        formats_to_remove.add('jpeg');
    }

    formats = formats.filter(item => !formats_to_remove.has(item));

    // Batch format option updates
    const fragment = document.createDocumentFragment();
    formats.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.toUpperCase();
        fragment.appendChild(option);
    });

    elements.format.innerHTML = '';
    elements.format.appendChild(fragment);
};

/**
 * Format bytes into human-readable size string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
const format_size_units = (bytes) => {
    if (!bytes || bytes === 0) return '0 bytes';
    if (bytes < 1024) return `${bytes} bytes`;

    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let size = bytes;

    while (size >= k && i < sizes.length - 1) {
        size /= k;
        i++;
    }

    return `${size.toFixed(2)} ${sizes[i]}`;
};

/**
 * Save optimized image
 */
const save_image = () => {
    if (!state.active_blob) {
        alert('No optimized image to save. Please process an image first.');
        return;
    }

    const name = get_file_name_from_url(state.original_file.name);
    const format_val = elements.format.value;
    save_file(state.active_blob, `${name}.process.${format_val}`);
};

/**
 * Handle file input
 * @param {FileList} files - Selected files
 */
const handle_file_input = (files) => {
    if (files.length > 0) handle_file(files[0]);
};

/**
 * Handle copy button click
 */
const handle_copy_click = async () => {
    if (!elements.base64Uri.value) {
        alert('No image data to copy. Please process an image first.');
        return;
    }

    try {
        await navigator.clipboard.writeText(elements.base64Uri.value);
        show_temporary_feedback(elements.copyButton, '✓ Copied!', 2000);
    } catch {
        // Fallback for older browsers
        try {
            elements.base64Uri.select();
            document.execCommand('copy');
            show_temporary_feedback(elements.copyButton, '✓ Copied!', 2000);
        } catch {
            show_temporary_feedback(elements.copyButton, '✗ Copy failed!', 2000);
        }
    }
};

/**
 * Show temporary feedback on buttons
 * @param {HTMLElement} element - Button element
 * @param {string} message - Feedback message
 * @param {number} duration - Display duration in ms
 */
const show_temporary_feedback = (element, message, duration) => {
    const original_html = element.innerHTML;
    element.innerHTML = `<span>${message}</span>`;

    setTimeout(() => {
        element.innerHTML = original_html;
    }, duration);
};

/**
 * Initialize application
 */
const initialize_application = () => {
    initialize_dom_cache();

    uploader = new drop_zone(
        elements.uploadArea,
        elements.fileInput,
        handle_file_input,
        null, 'image/*',
        { multiple: false, directory: false }
    );

    const controls = {
        max_chk: elements.max_chk,
        max_val: elements.max_val,
        step_sel: elements.step_sel,

        num_sec: elements.num_sec,
        width_num: elements.width_num,
        height_num: elements.height_num,

        pow2_sec: elements.pow2_sec,
        width_pow2: elements.width_pow2,
        height_pow2: elements.height_pow2,

        scl_slider: elements.scl_slider,
        sldr_disp: elements.sldr_disp,

        filter_sel: elements.filter_sel,
        gama_chk: elements.gama_chk,
        unsharp_chk: elements.unsharp_chk,
        force_chk: elements.force_chk,

        ush_amount: elements.ush_amount,
        ush_a_disp: elements.ush_a_disp,

        ush_radius: elements.ush_radius,
        ush_r_disp: elements.ush_r_disp,

        ush_threshold: elements.ush_threshold,
        ush_t_disp: elements.ush_t_disp
    };

    scl_crt = new img_scl_crt(controls, debounced_process_image);

    // Event listeners
    elements.template.addEventListener('change', () => {
        update_format_options();
        debounced_process_format();
    });

    elements.alphaChannel.addEventListener('change', () => {
        update_format_options();
        debounced_process_format();
    });

    elements.format.addEventListener('change', debounced_process_format);
    elements.qualityRange.addEventListener('change', debounced_process_format);

    elements.qualityRange.addEventListener('input', e => {
        const value = parseFloat(e.target.value) * 100;
        elements.qualityValue.textContent = `${+(value.toFixed(2))}%`;
    });

    // Preview divider handling
    let is_dragging = false;

    const handle_mouse_move = (e) => {
        if (!is_dragging) return;

        const rect = elements.previewContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        state.divider_position = clamp((x / rect.width) * 100, 10, 90);

        elements.originalPreview.style.clipPath = `inset(0 ${100 - state.divider_position}% 0 0)`;
        elements.optimizedPreview.style.clipPath = `inset(0 0 0 ${state.divider_position}%)`;
        elements.previewDivider.style.left = `${state.divider_position}%`;
    };

    const handle_mouse_up = () => {
        is_dragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handle_mouse_move);
        document.removeEventListener('mouseup', handle_mouse_up);
    };

    elements.previewDivider.addEventListener('mousedown', (e) => {
        e.preventDefault();
        is_dragging = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handle_mouse_move);
        document.addEventListener('mouseup', handle_mouse_up);
    });

    // Action handlers
    if (elements.saveButton) {
        elements.saveButton.addEventListener('click', save_image);
    }

    if (elements.copyButton) {
        elements.copyButton.addEventListener('click', handle_copy_click);
    }

    // Initialize worker pool
    init_workers_pool([{
        url: "../../../lib/worker/image_ww.js",
        type: "module"
    }]);
};

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize_application);
} else {
    initialize_application();
}
