/**
 * Batch Image Processor: Converts and processes multiple image files (PNG, JPEG, WebP, GLTF) for assets and web applications.
 * This module provides image scaling, format conversion, and packaging functionalities using a streamlined DOM interaction.
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

import { drop_zone } from "../../../lib/html/drop_zone.js";
import { img_scl_crt } from "../../../lib/html/img_scl_crt.js";
import { get_image_data, has_transparency, load_image, scale_image_array } from "../../../lib/module/image.js";
import { init_workers_pool, scale_image_map } from "../../../lib/module/worker.js";

let files_data = [];
let is_processing = false;
let uploader, scl_crt;

/**
 * Cached DOM references for all required UI elements.
 * @type {Object<string, HTMLElement>}
 */
const dom_elements = {
    max_chk: document.getElementById('max_chk'),
    max_val: document.getElementById('max_val'),
    step_sel: document.getElementById('step_sel'),
    num_sec: document.getElementById('num_sec'),
    width_num: document.getElementById('width_num'),
    height_num: document.getElementById('height_num'),
    pow2_sec: document.getElementById('pow2_sec'),
    width_pow2: document.getElementById('width_pow2'),
    height_pow2: document.getElementById('height_pow2'),
    scl_slider: document.getElementById('scl_slider'),
    sldr_disp: document.getElementById('sldr_disp'),
    filter_sel: document.getElementById('filter_sel'),
    gama_chk: document.getElementById('gama_chk'),
    unsharp_chk: document.getElementById('unsharp_chk'),
    force_chk: document.getElementById('force_chk'),
    ush_amount: document.getElementById('ush_amount'),
    ush_a_disp: document.getElementById('ush_a_disp'),
    ush_radius: document.getElementById('ush_radius'),
    ush_r_disp: document.getElementById('ush_r_disp'),
    ush_threshold: document.getElementById('ush_threshold'),
    ush_t_disp: document.getElementById('ush_t_disp'),
    template: document.getElementById('template'),
    alpha_channel: document.getElementById('alphaChannel'),
    format: document.getElementById('format'),
    quality_range: document.getElementById('qualityRange'),
    quality_value: document.getElementById('qualityValue'),
    upload_area: document.getElementById('uploadArea'),
    file_input: document.getElementById('fileInput'),
    process_button: document.getElementById('processButton'),
    reset_button: document.getElementById('resetButton'),
    save_button: document.getElementById('saveButton'),
    progress_container: document.getElementById('progressContainer'),
    prog_bar: document.getElementById('prog-bar'),
    prog_text: document.getElementById('prog-text')
};

/**
 * Updates the visible progress bar.
 * @param {number} percent - Percentage to display.
 */
const update_progress = (percent) => {
    const rounded = Math.round(percent);
    dom_elements.prog_bar.style.width = `${rounded}%`;
    dom_elements.prog_text.textContent = `${rounded}%`;
};

/**
 * Processes a single image element and prepares a new file.
 * @param {HTMLImageElement} img - Source image.
 * @param {string} filename - Original file name.
 * @returns {Promise<{blob: Blob, filename: string}>}
 */
const process_single = async (img, filename) => {
    const settings = {
        width: scl_crt.width,
        height: scl_crt.height,
        filter: scl_crt.filter,
        gamma_correction: scl_crt.gama,
        unsharp_mask: scl_crt.unsharp,
        ush_amount: scl_crt.ush_amount,
        ush_radius: scl_crt.ush_radius,
        ush_threshold: scl_crt.ush_threshold,
        format: dom_elements.format.value,
        quality: parseFloat(dom_elements.quality_range.value)
    };

    let pixels = get_image_data(img, 0, 0, img.width, img.height);
    const needs_scaling = settings.width !== img.width || settings.height !== img.height;

    if (needs_scaling) {
        pixels = settings.filter === 'none'
            ? scale_image_array(pixels, img.width, img.height, settings.width, settings.height)
            : await scale_image_map(pixels, img.width, img.height, settings.width, settings.height, {
                filter: settings.filter,
                gamma_correct: settings.gamma_correction,
                ush_amount: settings.unsharp_mask ? settings.ush_amount : 0,
                ush_radius: settings.ush_radius,
                ush_threshold: settings.ush_threshold
            });
    }

    const canvas = document.createElement('canvas');
    canvas.width = settings.width;
    canvas.height = settings.height;
    const ctx = canvas.getContext('2d');
    const image_data = new ImageData(pixels, settings.width, settings.height);
    ctx.putImageData(image_data, 0, 0);

    return new Promise((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                reject(new Error(`Timeout: ${filename}`));
            }
        }, 5000);

        canvas.toBlob((blob) => {
            if (resolved) return;
            clearTimeout(timeout);
            resolved = true;
            if (!blob) return reject(new Error(`Blob generation failed: ${filename}`));
            const base_name = filename.split('.')[0];
            resolve({ blob, filename: `${base_name}_optimized.${settings.format}` });
        }, `image/${settings.format}`, settings.quality);
    });
};

/**
 * Executes the image conversion process sequentially.
 */
const batch_process = async () => {
    if (is_processing || !files_data.length) return;

    is_processing = true;
    dom_elements.process_button.disabled = true;
    dom_elements.progress_container.style.display = 'block';
    update_progress(0);

    const zip = new JSZip();
    const total_files = files_data.length;
    let completed_count = 0;

    for (let i = 0; i < total_files; i++) {
        const file_data = files_data[i];
        try {
            const result = await process_single(file_data.img, file_data.file.name);
            if (result?.blob) zip.file(result.filename, result.blob);
        } catch (err) {
            console.error(`File skipped: ${file_data.file.name}`, err);
        } finally {
            completed_count++;
            update_progress((completed_count / total_files) * 100);
        }
    }

    try {
        const zip_blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zip_blob);
        Object.assign(dom_elements.save_button, {
            href: url,
            download: 'optimized_images.zip',
            style: 'display:inline-flex'
        });
    } catch (err) {
        console.error('ZIP creation failed', err);
    }

    is_processing = false;
    dom_elements.process_button.disabled = false;
};

/**
 * Reads selected files and prepares them for further actions.
 * @param {FileList} files - List of user-selected files.
 */
const handle_files = (files) => {
    if (!files.length) return;

    document.querySelector('.upload-text').textContent = `Selected: ${files.length} files`;
    document.querySelector('.upload-subtext').textContent = '';

    const file_promises = Array.from(files).map((file) =>
        load_image(file).then((img) => {
            const img_data = get_image_data(img, 0, 0, img.width, img.height);
            return { file, img, has_trans: has_transparency(img_data) };
        })
    );

    Promise.all(file_promises).then((processed) => {
        files_data = processed;
        const valid = files_data.length > 0;
        dom_elements.process_button.disabled = !valid;
        if (valid) scl_crt.setup({ width: 800, height: 600 });
    });
};

/**
 * Updates available format options according to template and alpha settings.
 */
const update_format_options = () => {
    const template = dom_elements.template.value;
    const format_select = dom_elements.format;
    const alpha_value = dom_elements.alpha_channel.value;
    let available = ['jpeg', 'png', 'webp', 'avif'];

    if (template === 'slupload' || template === 'gltf') available = available.filter(f => f !== 'avif' && f !== 'webp');
    if (alpha_value === 'remove') available = available.filter(f => f !== 'avif' && f !== 'webp' && f !== 'png');
    if (alpha_value === 'add') available = available.filter(f => f !== 'jpeg');

    format_select.innerHTML = available.map(f => `<option value="${f}">${f.toUpperCase()}</option>`).join('');
};

/**
 * Resets UI to initial state.
 */
const reset_app = () => {
    files_data = [];
    document.querySelector('.upload-text').textContent = 'Drop your images here or click to browse';
    document.querySelector('.upload-subtext').textContent = '';

    Object.assign(dom_elements.process_button, { disabled: true });
    Object.assign(dom_elements.save_button, { style: 'display:none' });
    dom_elements.save_button.removeAttribute('href');
    dom_elements.save_button.removeAttribute('download');
    dom_elements.progress_container.style.display = 'none';
    update_progress(0);
};

/**
 * Initializes application elements and events.
 */
const initialize_application = () => {
    uploader = new drop_zone(dom_elements.upload_area, dom_elements.file_input, handle_files, null, 'image/*', { multiple: true, directory: false });

    const controls = {
        max_chk: dom_elements.max_chk,
        max_val: dom_elements.max_val,
        step_sel: dom_elements.step_sel,
        num_sec: dom_elements.num_sec,
        width_num: dom_elements.width_num,
        height_num: dom_elements.height_num,
        pow2_sec: dom_elements.pow2_sec,
        width_pow2: dom_elements.width_pow2,
        height_pow2: dom_elements.height_pow2,
        scl_slider: dom_elements.scl_slider,
        sldr_disp: dom_elements.sldr_disp,
        filter_sel: dom_elements.filter_sel,
        gama_chk: dom_elements.gama_chk,
        unsharp_chk: dom_elements.unsharp_chk,
        force_chk: dom_elements.force_chk,
        ush_amount: dom_elements.ush_amount,
        ush_a_disp: dom_elements.ush_a_disp,
        ush_radius: dom_elements.ush_radius,
        ush_r_disp: dom_elements.ush_r_disp,
        ush_threshold: dom_elements.ush_threshold,
        ush_t_disp: dom_elements.ush_t_disp
    };

    scl_crt = new img_scl_crt(controls, () => {});

    dom_elements.template.addEventListener('change', update_format_options);
    dom_elements.alpha_channel.addEventListener('change', update_format_options);

    dom_elements.quality_range.addEventListener('input', (e) => {
        const percentage = (parseFloat(e.target.value) * 100).toFixed(2);
        dom_elements.quality_value.textContent = `${percentage}%`;
    });

    init_workers_pool([{ url: "../../../lib/worker/image_ww.js", type: "module" }]);

    dom_elements.quality_value.textContent = `${Math.round(dom_elements.quality_range.value * 100)}%`;
    dom_elements.sldr_disp.textContent = `${Math.round(dom_elements.scl_slider.value)}%`;
    dom_elements.ush_a_disp.textContent = dom_elements.ush_amount.value;
    dom_elements.ush_r_disp.textContent = dom_elements.ush_radius.value;
    dom_elements.ush_t_disp.textContent = dom_elements.ush_threshold.value;

    dom_elements.process_button.addEventListener('click', batch_process);
    dom_elements.reset_button.addEventListener('click', reset_app);
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize_application);
else initialize_application();

