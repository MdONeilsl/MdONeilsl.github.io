
import { drop_zone } from "../../../lib/html/drop_zone.js";
import { load_image, get_image_data } from "../../../lib/module/image.js";
import { init_workers_pool, normal_from_height_map } from "../../../lib/module/worker.js";
import { save_file } from "../../../lib/module/files.js";

const elems = {};
let uploader = null;
let original_image = null;
let processed_image = null;
let animation_frame_id = null;

/**
 * Renders the comparison view between original and processed images.
 * Uses requestAnimationFrame for smooth updates and handles canvas clipping.
 */
const draw_comparison = () => {
    if (!original_image || !processed_image) return;

    if (animation_frame_id) {
        cancelAnimationFrame(animation_frame_id);
    }

    animation_frame_id = requestAnimationFrame(() => {
        const { ctx, canvas, comparison_slider } = elems;
        const split_ratio = comparison_slider.value / 100;
        const split_x = Math.floor(canvas.width * split_ratio);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, split_x, canvas.height);
        ctx.clip();
        ctx.drawImage(original_image, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        if (processed_image instanceof OffscreenCanvas) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(split_x, 0, canvas.width - split_x, canvas.height);
            ctx.clip();
            ctx.drawImage(processed_image, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        const line_gradient = ctx.createLinearGradient(split_x, 0, split_x, canvas.height);
        line_gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        line_gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
        line_gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(split_x, 0);
        ctx.lineTo(split_x, canvas.height);
        ctx.strokeStyle = line_gradient;
        ctx.lineWidth = 3;
        ctx.stroke();

        const handle_gradient = ctx.createRadialGradient(
            split_x, canvas.height / 2, 0,
            split_x, canvas.height / 2, 12
        );
        handle_gradient.addColorStop(0, 'rgba(124, 58, 237, 1)');
        handle_gradient.addColorStop(1, 'rgba(124, 58, 237, 0.3)');

        ctx.beginPath();
        ctx.arc(split_x, canvas.height / 2, 12, 0, Math.PI * 2);
        ctx.fillStyle = handle_gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
};

/**
 * Displays status messages with configurable styling.
 * @param {string} message - The message to display
 * @param {object} options - Display options
 * @param {boolean} options.is_error - Whether this is an error message
 * @param {number} options.auto_hide - Auto-hide timeout in milliseconds
 */
const show_status = (message, { is_error = false, auto_hide = 3000 } = {}) => {
    const { status_message } = elems;

    status_message.textContent = message;
    status_message.classList.remove('status-success', 'status-error');
    status_message.classList.add(is_error ? 'status-error' : 'status-success');
    status_message.style.display = 'block';

    clearTimeout(status_message.hide_timeout);

    if (auto_hide > 0 && !is_error) {
        status_message.hide_timeout = setTimeout(() => {
            status_message.style.display = 'none';
        }, auto_hide);
    }
};

const process_image = async () => {
    if (!original_image) return;

    const { strength, invert_red, invert_green, smoothing, use_scharr } = elems;
    const width = original_image.naturalWidth || original_image.width;
    const height = original_image.naturalHeight || original_image.height;

    const processing_options = {
        strength: parseFloat(strength.value),
        invert_red: invert_red.checked,
        invert_green: invert_green.checked,
        smoothing: parseInt(smoothing.value),
        use_scharr: use_scharr.checked
    };

    try {
        show_status('Processing image...', { auto_hide: 0 });

        const image_data = get_image_data(original_image, 0, 0, width, height);
        return normal_from_height_map(image_data, width, height, processing_options);
    } catch (error) {
        console.error('Image processing failed:', error);
        show_status(`Processing failed: ${error.message}`, { is_error: true, auto_hide: 5000 });
    }
};

/**
 * Applies image processing using web workers.
 * Handles image data extraction and normal map generation.
 */
const update_image = async () => {
    try {

        const { strength, invert_red, invert_green, smoothing, use_scharr } = elems;
        const width = original_image.naturalWidth || original_image.width;
        const height = original_image.naturalHeight || original_image.height;

        const height_data = await process_image();

        processed_image = new OffscreenCanvas(width, height);
        const offscreen_ctx = processed_image.getContext('2d', {
            alpha: true,
            desynchronized: true
        });

        offscreen_ctx.putImageData(new ImageData(height_data, width, height), 0, 0);
        draw_comparison();

        show_status(`Processing complete. Strength: ${parseFloat(strength.value)}, Smoothing: ${parseInt(smoothing.value)}.`);
    } catch (error) {
        console.error('Image processing failed:', error);
        show_status(`Processing failed: ${error.message}`, { is_error: true, auto_hide: 5000 });
    }
};

/**
 * Handles file input and image loading.
 * Validates file types and dimensions.
 * @param {FileList} files - The uploaded file list
 */
const handle_file_input = async (files) => {
    if (!files || !files.length) return;

    const file = files[0];

    if (!file.type.startsWith('image/')) {
        show_status('Please select an image file (JPEG, PNG, etc.)', {
            is_error: true,
            auto_hide: 5000
        });
        return;
    }

    const max_size_mb = 20;
    if (file.size > max_size_mb * 1024 * 1024) {
        show_status(`File too large. Maximum size is ${max_size_mb}MB`, {
            is_error: true,
            auto_hide: 5000
        });
        return;
    }

    try {
        show_status('Loading image...', { auto_hide: 0 });

        const img = await load_image(file);

        const max_dimension = 4096;
        if (img.width > max_dimension || img.height > max_dimension) {
            show_status(`Image dimensions too large. Maximum is ${max_dimension}x${max_dimension}`, {
                is_error: true,
                auto_hide: 5000
            });
            return;
        }

        original_image = img;

        elems.canvas.width = img.width;
        elems.canvas.height = img.height;
        elems.comparison_slider.style.display = 'block';
        elems.comparison_slider.value = 50;

        update_image();
        show_status(`Loaded: ${file.name} (${img.width}×${img.height})`);
    } catch (error) {
        console.error('Image loading failed:', error);
        show_status(`Failed to load image: ${error.message}`, {
            is_error: true,
            auto_hide: 5000
        });
    }
};

const save = async () => {
    if (!original_image || !processed_image) {
        show_status('No processed image available', {
            is_error: true,
            auto_hide: 3000
        });
        return;
    }

    try {
        if (processed_image instanceof OffscreenCanvas) {

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `normal-map-${timestamp}.png`;

            const blob = await processed_image.convertToBlob();
            save_file(blob, filename);
        }
    } catch (error) {
        console.error('Save failed:', error);
        show_status('Failed to save image', {
            is_error: true,
            auto_hide: 5000
        });
    }
};

/**
 * Caches DOM element references for performance.
 * Uses descriptive property names matching element IDs.
 */
const initialize_dom_cache = () => {
    elems.drop_zone = document.getElementById('drop-zone');
    elems.file_input = document.getElementById('file_input');
    elems.image_settings_form = document.getElementById('image-settings');
    elems.smoothing_value_span = document.getElementById('smoothing-value');
    elems.reset_button = document.getElementById('reset-button');
    elems.save_button = document.getElementById('save-button');
    elems.status_message = document.getElementById('status-message');
    elems.canvas = document.getElementById('image-canvas');
    elems.ctx = elems.canvas.getContext('2d', { alpha: false });
    elems.comparison_slider = document.getElementById('comparison-slider');
    elems.strength = document.getElementById('strength');
    elems.invert_red = document.getElementById('invert_red');
    elems.invert_green = document.getElementById('invert_green');
    elems.smoothing = document.getElementById('smoothing');
    elems.use_scharr = document.getElementById('use_scharr');

    elems.smoothing_value_span.textContent = elems.smoothing.value;
};

/**
 * Sets up event listeners with proper event delegation.
 * Uses debouncing for resize events and throttling for slider updates.
 */
const setup_listeners = () => {
    let update_debounce_timer = null;

    const debounced_update = () => {
        if (update_debounce_timer) clearTimeout(update_debounce_timer);
        update_debounce_timer = setTimeout(update_image, 150);
    };

    uploader = new drop_zone(
        elems.drop_zone,
        elems.file_input,
        handle_file_input,
        null,
        'image/*',
        { multiple: false, directory: false }
    );

    elems.image_settings_form.addEventListener('input', debounced_update);
    elems.image_settings_form.addEventListener('change', update_image);

    elems.smoothing.addEventListener('input', () => {
        elems.smoothing_value_span.textContent = elems.smoothing.value;
    });

    let slider_raf_id = null;
    elems.comparison_slider.addEventListener('input', () => {
        if (slider_raf_id) cancelAnimationFrame(slider_raf_id);
        slider_raf_id = requestAnimationFrame(draw_comparison);
    });

    elems.reset_button.addEventListener('click', (event) => {
        event.preventDefault();
        elems.image_settings_form.reset();
        elems.smoothing_value_span.textContent = elems.smoothing.value;
        update_image();
        show_status('Settings restored to defaults.');
    });

    elems.save_button.addEventListener('click', save);

    window.addEventListener('beforeunload', () => {
        if (animation_frame_id) {
            cancelAnimationFrame(animation_frame_id);
        }
    });

    init_workers_pool([{
        url: "../../../lib/worker/normal_map_ww.js",
        type: "module"
    }]);
};

/**
 * Renders a placeholder state on the canvas.
 * Provides visual feedback when no image is loaded.
 */
const render_placeholder = () => {
    const { ctx, canvas } = elems;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0a0a0f');
    gradient.addColorStop(1, '#1a1a2f');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

};

/**
 * Initializes the application with proper error handling.
 * Sets up DOM, listeners, and initial state.
 */
const initialize = () => {
    try {
        initialize_dom_cache();
        setup_listeners();

        elems.comparison_slider.style.display = 'none';
        elems.canvas.width = 800;
        elems.canvas.height = 600;

        render_placeholder();

        show_status('Ready to process images', { auto_hide: 2000 });
    } catch (error) {
        console.error('Initialization failed:', error);
        show_status('Application failed to initialize', {
            is_error: true,
            auto_hide: 0
        });
    }

    document.getElementById('current-year').textContent = new Date().getFullYear();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else initialize();
