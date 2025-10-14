/*
    Batch Image Processor: Optimize and convert multiple images (PNG, JPEG, WebP, GLTF) for Assets and web applications.
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

import { get_image_data, has_transparency, resize_img_canv } from "../../../lib/module/image.js";
import { clamp } from "../../../lib/module/math.js";
import { scale_image_worker } from "../../../lib/module/worker.js";

// Global variables
let files_data = [];
let is_processing = false;

// Cached DOM elements
const dom_elements = {
    width_num_in: document.getElementById('widthNumIn'),
    height_num_in: document.getElementById('heightNumIn'),
    scl_filter: document.getElementById('sclFilter'),
    scl_gamma: document.getElementById('sclGamma'),
    scl_unsharp: document.getElementById('sclUnsharp'),
    unsharp_amount: document.getElementById('unsharpAmount'),
    unsharp_radius: document.getElementById('unsharpRadius'),
    unsharp_threshold: document.getElementById('unsharpThreshold'),
    format: document.getElementById('format'),
    quality_range: document.getElementById('qualityRange'),
    quality_value: document.getElementById('qualityValue'),
    template: document.getElementById('template'),
    alpha_channel: document.getElementById('alphaChannel'),
    max_size: document.getElementById('maxSize'),
    max_power2: document.getElementById('maxPower2'),
    scl_algo: document.getElementById('sclAlgo'),
    fix_sel_sec: document.getElementById('fix_sel_sec'),
    pow2_sel_sec: document.getElementById('pow2_sel_sec'),
    width_power2: document.getElementById('widthPower2'),
    height_power2: document.getElementById('heightPower2'),
    scale_slider: document.getElementById('scaleSlider'),
    scale_value: document.getElementById('scaleValue'),
    upload_area: document.getElementById('uploadArea'),
    file_input: document.getElementById('fileInput'),
    unsharp_amount_value: document.getElementById('unsharpAmountValue'),
    unsharp_radius_value: document.getElementById('unsharpRadiusValue'),
    unsharp_threshold_value: document.getElementById('unsharpThresholdValue'),
    process_button: document.getElementById('processButton'),
    reset_button: document.getElementById('resetButton'),
    save_button: document.getElementById('saveButton'),
    progress_container: document.getElementById('progressContainer'),
    prog_bar: document.getElementById('prog-bar'),
    prog_text: document.getElementById('prog-text'),
};

const filters_const = ['box', 'hamming', 'lanczos2', 'lanczos3', 'mks2013', 'bicubic'];
const powers_const = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];

/**
 * Updates the progress bar.
 * @param {number} percent - The progress percentage.
 */
const update_progress = (percent) => {
    dom_elements.prog_bar.style.width = `${percent}%`;
    dom_elements.prog_text.textContent = `${Math.round(percent)}%`;
};

/**
 * Processes a single image with current settings.
 * @param {HTMLImageElement} original_img - The original image.
 * @param {string} filename - The original filename.
 * @returns {Promise<{blob: Blob, filename: string}>} The processed image blob and filename.
 */
const process_single = async (original_img, filename) => {
    const settings = {
        width: parseInt(dom_elements.width_num_in.value, 10),
        height: parseInt(dom_elements.height_num_in.value, 10),
        filter: parseInt(dom_elements.scl_filter.value, 10),
        gamma_correction: dom_elements.scl_gamma.checked,
        unsharp_mask: dom_elements.scl_unsharp.checked,
        unsharp_amount: parseFloat(dom_elements.unsharp_amount.value),
        unsharp_radius: parseFloat(dom_elements.unsharp_radius.value),
        unsharp_threshold: parseFloat(dom_elements.unsharp_threshold.value),
        format: dom_elements.format.value,
        quality: parseFloat(dom_elements.quality_range.value)
    };

    let pixels = get_image_data(original_img, 0, 0, original_img.width, original_img.height);

    if (settings.width !== original_img.width || settings.height !== original_img.height) {
        if (settings.filter < 0) {
            pixels = resize_img_canv(
                pixels,
                original_img.width,
                original_img.height,
                settings.width,
                settings.height,
                false
            );
        } else {
            pixels = await scale_image_worker(
                pixels,
                original_img.width,
                original_img.height,
                settings.width,
                settings.height,
                {
                    filter: filters_const[settings.filter],
                    gamma_correct: settings.gamma_correction,
                    unsharp_amount: settings.unsharp_mask ? settings.unsharp_amount : 0,
                    unsharp_radius: settings.unsharp_radius,
                    unsharp_threshold: settings.unsharp_threshold
                }
            );
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = settings.width;
    canvas.height = settings.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(pixels, settings.width, settings.height), 0, 0);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve({ blob, filename: `${filename.split('.')[0]}_optimized.${settings.format}` });
        }, `image/${settings.format}`, settings.quality);
    });
};

/**
 * Processes all selected images and creates a ZIP file.
 */
const batch_process = async () => {
    if (is_processing || files_data.length === 0) return;

    is_processing = true;
    dom_elements.process_button.disabled = true;
    dom_elements.progress_container.style.display = 'block';
    update_progress(0);

    const zip = new JSZip();
    const total = files_data.length;
    let processed = 0;

    for (const data of files_data) {
        const result = await process_single(data.img, data.file.name);
        zip.file(result.filename, result.blob);
        processed++;
        update_progress((processed / total) * 100);
    }

    const zip_blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zip_blob);
    dom_elements.save_button.href = url;
    dom_elements.save_button.download = 'optimized_images.zip';
    dom_elements.save_button.style.display = 'inline-flex';

    is_processing = false;
    dom_elements.process_button.disabled = false;
};

/**
 * Handles the selected files.
 * @param {FileList} files - The selected image files.
 */
const handle_files = (files) => {
    if (files.length === 0) return;

    const upload_text = document.querySelector('.upload-text');
    upload_text.textContent = `Selected: ${files.length} files`;
    document.querySelector('.upload-subtext').textContent = '';

    const promises = Array.from(files).map((file) => {
        if (!file.type.startsWith('image/')) return null;
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const has_trans = has_transparency(get_image_data(img, 0, 0, img.width, img.height));
                    resolve({ file, img, has_trans });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }).filter(p => p);

    Promise.all(promises).then((data) => {
        files_data = data;
        dom_elements.process_button.disabled = files_data.length === 0;
        update_format_options();
    });
};

/**
 * Updates format options based on template and alpha.
 */
const update_format_options = () => {
    const template = dom_elements.template.value;
    const format_select = dom_elements.format;
    const alpha_select = dom_elements.alpha_channel;

    let formats = ['jpeg', 'png', 'webp', 'avif'];

    if (template === 'slupload' || template === 'gltf') {
        formats = formats.filter((item) => item !== 'avif' && item !== 'webp');
    }

    const alphsel = alpha_select.value;
    if (alphsel === 'remove') {
        formats = formats.filter((item) => item !== 'avif' && item !== 'webp' && item !== 'png');
    } else if (alphsel === 'add') {
        formats = formats.filter((item) => item !== 'jpeg');
    }

    format_select.innerHTML = formats.map((type) => `<option value="${type}">${type.toUpperCase()}</option>`).join('');
};

/**
 * Resets the application state.
 */
const reset_app = () => {
    files_data = [];
    document.querySelector('.upload-text').textContent = 'Drop your images here or click to browse';
    document.querySelector('.upload-subtext').textContent = '';
    dom_elements.process_button.disabled = true;
    dom_elements.save_button.style.display = 'none';
    dom_elements.save_button.removeAttribute('href');
    dom_elements.save_button.removeAttribute('download');
    dom_elements.progress_container.style.display = 'none';
    update_progress(0);
    dom_elements.file_input.value = '';
    dom_elements.width_num_in.value = 512;
    dom_elements.height_num_in.value = 512;
    dom_elements.width_power2.value = 512;
    dom_elements.height_power2.value = 512;
    dom_elements.scale_slider.value = 100;
    dom_elements.scale_value.textContent = '100%';
    dom_elements.scl_filter.value = 4;
    dom_elements.scl_gamma.checked = false;
    dom_elements.scl_unsharp.checked = false;
    dom_elements.unsharp_amount.value = 0;
    dom_elements.unsharp_amount_value.textContent = '0';
    dom_elements.unsharp_radius.value = 1.0;
    dom_elements.unsharp_radius_value.textContent = '1.0';
    dom_elements.unsharp_threshold.value = 0;
    dom_elements.unsharp_threshold_value.textContent = '0';
    dom_elements.quality_range.value = 1;
    dom_elements.quality_value.textContent = '100%';
    dom_elements.template.value = 'web';
    dom_elements.alpha_channel.value = 'unchange';
    dom_elements.scl_algo.value = '0';
    dom_elements.fix_sel_sec.style.display = 'grid';
    dom_elements.pow2_sel_sec.style.display = 'none';
    update_format_options();
};

/**
 * Initializes scaling controls.
 */
const initialize_scaling_controls = () => {
    const default_values = {
        width_num_in: 512,
        height_num_in: 512,
        width_power2: 512,
        height_power2: 512,
        scale_slider: 100,
        max_power2: 1024
    };

    const update_max_constraints = (max_value) => {
        dom_elements.width_num_in.max = max_value;
        dom_elements.height_num_in.max = max_value;
        const options_html = powers_const
            .filter((power) => power <= max_value)
            .map((power) => `<option value="${power}">${power}</option>`)
            .join('');
        dom_elements.width_power2.innerHTML = options_html;
        dom_elements.height_power2.innerHTML = options_html;
        dom_elements.scale_slider.max = Math.min(500, (max_value / Math.max(parseInt(dom_elements.width_num_in.value, 10), parseInt(dom_elements.height_num_in.value, 10))) * 100);
        dom_elements.width_num_in.value = Math.min(parseInt(dom_elements.width_num_in.value, 10), max_value);
        dom_elements.height_num_in.value = Math.min(parseInt(dom_elements.height_num_in.value, 10), max_value);
        dom_elements.width_power2.value = Math.min(parseInt(dom_elements.width_power2.value, 10), max_value);
        dom_elements.height_power2.value = Math.min(parseInt(dom_elements.height_power2.value, 10), max_value);
    };

    const restore_defaults = () => {
        dom_elements.width_num_in.max = default_values.max_power2;
        dom_elements.height_num_in.max = default_values.max_power2;
        const options_html = powers_const
            .filter((power) => power <= default_values.max_power2)
            .map((power) => `<option value="${power}">${power}</option>`)
            .join('');
        dom_elements.width_power2.innerHTML = options_html;
        dom_elements.height_power2.innerHTML = options_html;
        dom_elements.scale_slider.max = 500;
        dom_elements.width_num_in.value = default_values.width_num_in;
        dom_elements.height_num_in.value = default_values.height_num_in;
        dom_elements.width_power2.value = default_values.width_power2;
        dom_elements.height_power2.value = default_values.height_power2;
        dom_elements.scale_slider.value = default_values.scale_slider;
        dom_elements.scale_value.textContent = `${default_values.scale_slider}%`;
    };

    const update_dimensions_from_scale = () => {
        const scale = parseFloat(dom_elements.scale_slider.value) / 100;
        const base_width = dom_elements.scl_algo.value === '0' ? default_values.width_num_in : parseInt(dom_elements.width_power2.value, 10);
        const base_height = dom_elements.scl_algo.value === '0' ? default_values.height_num_in : parseInt(dom_elements.height_power2.value, 10);
        const max_value = dom_elements.max_size.checked ? parseInt(dom_elements.max_power2.value, 10) : default_values.max_power2;
        dom_elements.width_num_in.value = Math.min(Math.round(base_width * scale), max_value);
        dom_elements.height_num_in.value = Math.min(Math.round(base_height * scale), max_value);
    };

    const toggle_scaling_method = () => {
        const is_fix = dom_elements.scl_algo.value === '0';
        dom_elements.fix_sel_sec.style.display = is_fix ? 'grid' : 'none';
        dom_elements.pow2_sel_sec.style.display = is_fix ? 'none' : 'grid';
        update_dimensions_from_scale();
    };

    dom_elements.max_size.addEventListener('change', () => {
        if (dom_elements.max_size.checked) {
            update_max_constraints(parseInt(dom_elements.max_power2.value, 10));
        } else {
            restore_defaults();
        }
    });

    dom_elements.max_power2.addEventListener('change', () => {
        if (dom_elements.max_size.checked) {
            update_max_constraints(parseInt(dom_elements.max_power2.value, 10));
        }
    });

    dom_elements.scl_algo.addEventListener('change', toggle_scaling_method);

    dom_elements.width_power2.addEventListener('change', () => {
        dom_elements.width_num_in.value = dom_elements.width_power2.value;
    });

    dom_elements.height_power2.addEventListener('change', () => {
        dom_elements.height_num_in.value = dom_elements.height_power2.value;
    });

    dom_elements.scale_slider.addEventListener('input', () => {
        dom_elements.scale_value.textContent = `${dom_elements.scale_slider.value}%`;
        update_dimensions_from_scale();
    });

    toggle_scaling_method();
};

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    dom_elements.upload_area.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom_elements.upload_area.classList.add('dragover');
    });

    dom_elements.upload_area.addEventListener('dragleave', () => {
        dom_elements.upload_area.classList.remove('dragover');
    });

    dom_elements.upload_area.addEventListener('drop', (e) => {
        e.preventDefault();
        dom_elements.upload_area.classList.remove('dragover');
        handle_files(e.dataTransfer.files);
    });

    dom_elements.upload_area.addEventListener('click', () => dom_elements.file_input.click());
    dom_elements.file_input.addEventListener('change', (e) => handle_files(e.target.files));

    dom_elements.quality_range.addEventListener('input', () => {
        const value = Math.round(dom_elements.quality_range.value * 100);
        dom_elements.quality_value.textContent = `${value}%`;
    });

    dom_elements.unsharp_amount.addEventListener('input', () => {
        dom_elements.unsharp_amount_value.textContent = dom_elements.unsharp_amount.value;
    });

    dom_elements.unsharp_radius.addEventListener('input', () => {
        dom_elements.unsharp_radius_value.textContent = dom_elements.unsharp_radius.value;
    });

    dom_elements.unsharp_threshold.addEventListener('input', () => {
        dom_elements.unsharp_threshold_value.textContent = dom_elements.unsharp_threshold.value;
    });

    initialize_scaling_controls();

    dom_elements.template.addEventListener('change', update_format_options);
    dom_elements.alpha_channel.addEventListener('change', update_format_options);

    dom_elements.process_button.addEventListener('click', batch_process);
    dom_elements.reset_button.addEventListener('click', reset_app);

    

    update_format_options();

    dom_elements.quality_value.textContent = `${Math.round(dom_elements.quality_range.value * 100)}%`;
    dom_elements.scale_value.textContent = `${Math.round(dom_elements.scale_slider.value)}%`;
    dom_elements.unsharp_amount_value.textContent = dom_elements.unsharp_amount.value;
    dom_elements.unsharp_radius_value.textContent = dom_elements.unsharp_radius.value;
    dom_elements.unsharp_threshold_value.textContent = dom_elements.unsharp_threshold.value;
});