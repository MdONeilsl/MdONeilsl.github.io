
/*
    Images Processor is a web-based tool for Second Life® creators to resize and compress images for virtual world content creation.
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


const drop_zone = document.getElementById('drop-zone');
const status_div = document.getElementById('status');
const fix_power2 = document.getElementById('fix-power2');
const fixed_size = document.getElementById('fixed-size');
const fixed_width = document.getElementById('fixed-width');
const fixed_height = document.getElementById('fixed-height');
const aspect_lock = document.getElementById('aspect-lock');
const max_power2 = document.getElementById('max-power2');
const template_select = document.getElementById('template');
const format_jpg = document.getElementById('format-jpg');
const format_png = document.getElementById('format-png');
const format_webp = document.getElementById('format-webp');
const quality_slider = document.getElementById('quality');
const quality_value = document.getElementById('quality-value');
const lossless = document.getElementById('lossless');
const pica_filter = document.getElementById('pica-filter');
const unsharp_amount = document.getElementById('unsharp-amount');
const unsharp_radius = document.getElementById('unsharp-radius');
const unsharp_threshold = document.getElementById('unsharp-threshold');
const alpha_check = document.getElementById('alpha');
const tile_input = document.getElementById('tile');
const idle_input = document.getElementById('idle');
const concurrency_input = document.getElementById('concurrency');
const use_ww = document.getElementById('use-ww');
const use_wasm = document.getElementById('use-wasm');
const use_js = document.getElementById('use-js');
const use_cib = document.getElementById('use-cib');
const reset_btn = document.getElementById('reset');
const process_btn = document.getElementById('process');
const progress_div = document.getElementById('progress');
const prog_bar = document.getElementById('prog-bar');
const prog_text = document.getElementById('prog-text');
const error_div = document.getElementById('error');
const pica_help_btn = document.getElementById('pica-help');
const pica_dialog = document.getElementById('pica-dialog');

let files = [];

/**
 * Checks WebP support in the browser
 * @returns {boolean} True if WebP is supported
 */
const supports_webp = (() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    return !!(ctx && canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0);
})();

if (!supports_webp) {
    format_webp.disabled = true;
    format_webp.parentElement.title = 'WebP not supported in this browser';
}

drop_zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop_zone.style.borderColor = '#aaa';
});

drop_zone.addEventListener('dragleave', () => {
    drop_zone.style.borderColor = '#ccc';
});

drop_zone.addEventListener('drop', (e) => {
    e.preventDefault();
    drop_zone.style.borderColor = '#ccc';
    handle_files(e.dataTransfer.files);
});

drop_zone.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = (e) => handle_files(e.target.files);
    input.click();
});

/**
 * Updates resize options based on user selection
 */
const update_resize_options = e => {
    const fid = e.currentTarget.id;
    if (fid === `fix-power2`) {
        fixed_size.checked = false;
        aspect_lock.checked = false;
    }
    else if (fid === `fixed-size`) {
        fix_power2.checked = false;
    }
    const is_fixed = fixed_size.checked;
    fixed_width.disabled = !is_fixed;
    fixed_height.disabled = !is_fixed;
    aspect_lock.checked = !is_fixed;
    aspect_lock.disabled = !is_fixed;
}

template_select.addEventListener('change', () => {
    if (template_select.value === 'asset') {
        format_webp.disabled = true;
        if (format_webp.checked) {
            format_jpg.checked = true;
            update_format_options();
        }
    } else if (supports_webp) {
        format_webp.disabled = false;
    }
});


/**
 * Updates format options based on selected format
 */
const update_format_options = () => {
    const checked_radio = document.querySelector('input[name="format"]:checked');
    const format = checked_radio ? checked_radio.value : null;

    if (format === 'png') {
        quality_slider.disabled = true;
        lossless.disabled = true;
    } else if (format) {
        quality_slider.disabled = false;
        lossless.disabled = format !== 'webp';
    } else {
        quality_slider.disabled = true;
        lossless.disabled = true;
    }
}

/**
 * Resets all settings to default values
 */
const reset_settings = () => {
    fix_power2.checked = false;
    fixed_size.checked = false;
    max_power2.value = '2048';
    fixed_width.value = '';
    fixed_height.value = '';
    aspect_lock.checked = false;
    format_jpg.checked = true;
    format_png.checked = false;
    format_webp.checked = false;
    template_select.value = 'web';
    quality_slider.value = 100;
    quality_value.textContent = '100';
    lossless.checked = false;
    pica_filter.value = 'mks2013';
    unsharp_amount.value = 0;
    unsharp_radius.value = 0.5;
    unsharp_threshold.value = 0;
    alpha_check.checked = true;
    tile_input.value = 1024;
    idle_input.value = 2000;
    concurrency_input.value = 4;
    use_ww.checked = true;
    use_wasm.checked = true;
    use_js.checked = true;
    use_cib.checked = false;
    update_resize_options();
    update_format_options();
    if (template_select.value === 'web' && supports_webp) format_webp.disabled = false;
}

/**
 * Handles file selection and validation
 * @param {FileList} new_files - The files to process
 */
const handle_files = (new_files) => {
    const valid_files = [];
    for (let i = 0; i < new_files.length; i++) {
        if (new_files[i].type.startsWith('image/')) {
            valid_files.push(new_files[i]);
        }
    }

    if (valid_files.length === 0) {
        error_div.textContent = 'No valid images selected.';
        return;
    }

    if (files.length + valid_files.length > 100) {
        error_div.textContent = 'Maximum 100 images allowed.';
        return;
    }

    files.push(...valid_files);
    status_div.textContent = `${files.length} images loaded`;
    process_btn.disabled = files.length === 0;
    error_div.textContent = '';
}

/**
 * Processes all selected images with specified settings
 */
const process_images = async () => {
    if (files.length === 0) {
        error_div.textContent = 'No images to process.';
        return;
    }

    const checked_radio = document.querySelector('input[name="format"]:checked');
    if (!checked_radio) {
        error_div.textContent = 'Please select an output format.';
        return;
    }

    if (fixed_size.checked && (!fixed_width.value || !fixed_height.value)) {
        error_div.textContent = 'Please set fixed width and height.';
        return;
    }

    process_btn.disabled = true;
    progress_div.style.display = 'block';
    prog_bar.style.width = '0%';
    prog_text.textContent = '0%';
    error_div.textContent = '';

    const format = checked_radio.value;
    const ext = format === 'jpeg' ? 'jpg' : format;
    const mime = `image/${format}`;
    const qual = lossless.checked && format === 'webp' ? 1.0 : quality_slider.value / 100;
    const max_size = parseInt(max_power2.value, 10);

    const features = [];
    if (use_js.checked) features.push('js');
    if (use_wasm.checked) features.push('wasm');
    if (use_ww.checked) features.push('ww');
    if (use_cib.checked) features.push('cib');

    const pica_instance = window.pica({
        tile: parseInt(tile_input.value, 10),
        idle: parseInt(idle_input.value, 10),
        concurrency: parseInt(concurrency_input.value, 10),
        features: features.length > 0 ? features : ['all']
    });

    const zip = new JSZip();
    let processed = 0;

    try {
        const process_promises = [];
        const batch_size = Math.min(4, files.length);

        for (let i = 0; i < files.length; i += batch_size) {
            const batch = files.slice(i, i + batch_size);
            process_promises.push(process_batch(batch, pica_instance, zip, format, ext, mime, qual, max_size));
        }

        await Promise.all(process_promises);

        const zip_blob = await zip.generateAsync({ type: 'blob' });
        download_blob(zip_blob, 'processed_images.zip');

        files = [];
        status_div.textContent = '0 images loaded';
        process_btn.disabled = true;
        progress_div.style.display = 'none';
    } catch (err) {
        error_div.textContent = 'Error processing images: ' + err.message;
        process_btn.disabled = false;
        progress_div.style.display = 'none';
    }
}

/**
 * Processes a batch of images
 * @param {Array} batch - The batch of files to process
 * @param {Object} pica_instance - The pica instance
 * @param {Object} zip - The JSZip instance
 * @param {string} format - The output format
 * @param {string} ext - The file extension
 * @param {string} mime - The MIME type
 * @param {number} qual - The quality setting
 * @param {number} max_size - The maximum size
 */
const process_batch = async (batch, pica_instance, zip, format, ext, mime, qual, max_size) => {
    for (const file of batch) {
        try {
            const img = await create_image(file);
            const orig_canvas = image_to_canvas(img);
            const has_alpha = await detect_transparency(orig_canvas);
            const pica_alpha = alpha_check.checked && has_alpha && format !== 'jpeg';

            let target_width, target_height;

            if (fix_power2.checked) {
                target_width = get_nearest_power_of_2(img.width, max_size);
                target_height = get_nearest_power_of_2(img.height, max_size);

            } else if (fixed_size.checked) {
                target_width = parseInt(fixed_width.value, 10);
                target_height = parseInt(fixed_height.value, 10);
                if (aspect_lock.checked) {
                    const scale = Math.min(target_width / img.width, target_height / img.height);
                    target_width = Math.round(img.width * scale);
                    target_height = Math.round(img.height * scale);
                }
            } else {
                target_width = img.width;
                target_height = img.height;
            }

            if (max_power2.checked) {
                if (target_width > max_size) target_width = max_size;
                if (target_height > max_size) target_height = max_size;
            }

            if (target_width === img.width && target_height === img.height) {
                const blob = await canvas_to_blob(orig_canvas, mime, qual);
                zip.file(file.name.replace(/\.[^/.]+$/, "") + '.' + ext, blob);
                processed++;
                update_progress(processed / files.length * 100);
                continue;
            }

            const target_canvas = document.createElement('canvas');
            target_canvas.width = target_width;
            target_canvas.height = target_height;

            await pica_instance.resize(orig_canvas, target_canvas, {
                filter: pica_filter.value,
                unsharpAmount: parseFloat(unsharp_amount.value),
                unsharpRadius: parseFloat(unsharp_radius.value),
                unsharpThreshold: parseFloat(unsharp_threshold.value),
                alpha: pica_alpha
            });

            const blob = await canvas_to_blob(target_canvas, mime, qual);
            zip.file(file.name.replace(/\.[^/.]+$/, "") + '.' + ext, blob);

            processed++;
            update_progress(processed / files.length * 100);
        } catch (err) {
            console.error('Error processing file:', file.name, err);
        }
    }
}

/**
 * Updates progress display
 * @param {number} percent - The completion percentage
 */
const update_progress = (percent) => {
    const rounded = Math.round(percent);
    prog_bar.style.width = `${rounded}%`;
    prog_text.textContent = `${rounded}%`;
}

/**
 * Creates an image from a file
 * @param {File} file - The image file
 * @returns {Promise<HTMLImageElement>} The loaded image
 */
const create_image = (file) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve(img);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Converts an image to a canvas
 * @param {HTMLImageElement} img - The image to convert
 * @returns {HTMLCanvasElement} The canvas with the image
 */
const image_to_canvas = (img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas;
}

/**
 * Detects transparency in a canvas
 * @param {HTMLCanvasElement} canvas - The canvas to check
 * @returns {Promise<boolean>} True if transparency is detected
 */
const detect_transparency = async (canvas) => {
    const ctx = canvas.getContext('2d');
    const image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image_data.data;

    for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) return true;
    }
    return false;
}

/**
 * Converts canvas to blob
 * @param {HTMLCanvasElement} canvas - The canvas to convert
 * @param {string} mime - The MIME type
 * @param {number} quality - The quality setting
 * @returns {Promise<Blob>} The resulting blob
 */
const canvas_to_blob = (canvas, mime, quality) => {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, mime, quality);
    });
}

/**
 * Gets nearest power of 2 for a dimension
 * @param {number} dim - The dimension
 * @param {number} max - The maximum allowed value
 * @returns {number} The nearest power of 2
 */
const get_nearest_power_of_2 = (dim, max) => {
    if (dim <= 1) return 1;
    let power = Math.pow(2, Math.round(Math.log2(dim)));
    if (power > max) {
        power = Math.pow(2, Math.floor(Math.log2(dim)));
        if (power > max) power = max;
    }
    return power;
}

/**
 * Downloads a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} name - The file name
 */
const download_blob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

document.querySelectorAll('input[name="format"]').forEach(radio => {
    radio.addEventListener('change', update_format_options);
});

quality_slider.addEventListener('input', () => {
    quality_value.textContent = quality_slider.value;
});

reset_btn.addEventListener('click', reset_settings);
process_btn.addEventListener('click', process_images);
pica_help_btn.addEventListener('click', () => pica_dialog.showModal());

fix_power2.addEventListener('change', update_resize_options);
fixed_size.addEventListener('change', update_resize_options);


/**
 * Initializes Google Translate widget on page load.
 * @function initialize_google_translate
 */
const initialize_google_translate = () => {
    // Create container for Google Translate element with fixed positioning
    const translate_div = document.createElement('div');
    translate_div.id = 'google_translate_element';
    Object.assign(translate_div.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        z_index: '1000'
    });
    document.body.appendChild(translate_div);

    // Load Google Translate script asynchronously
    const script = document.createElement('script');
    Object.assign(script, {
        type: 'text/javascript',
        src: '//translate.google.com/translate_a/element.js?cb=google_translate_element_init',
        async: true
    });
    document.body.appendChild(script);
}

/**
 * Callback to initialize Google Translate element.
 * @function google_translate_element_init
 */
const google_translate_element_init = () => {
    new google.translate.TranslateElement({
        page_language: 'en',
        included_languages: 'en,zh-CN,hi,es,fr,ar,bn,pt,ru,ur,ja,de',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE
    }, 'google_translate_element');
}

// Use defer to avoid DOMContentLoaded for faster execution
window.google_translate_element_init = google_translate_element_init;
initialize_google_translate();
//reset_settings();
