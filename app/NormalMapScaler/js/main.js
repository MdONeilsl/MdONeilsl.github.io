
/*
    Normal Map Scaler.
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

import { save_file } from "../../../lib/module/files.js";
import { get_image_data, load_image } from "../../../lib/module/image.js";
import { scale_normal_map_worker } from "../../../lib/module/worker.js";

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

let files = [];
let zip_file_name;

let uid = 0;

//worker.onmessage = e=> console.log(e.data);
//worker.postMessage(`test`);

/**
 * Generates output file name
 * @param {File} file - Original file
 * @param {number} target_width - Target width
 * @param {number} target_height - Target height
 * @param {boolean} should_scale - Whether scaling was performed
 * @returns {string} Output file name
 */
const generate_output_name = (file, target_width, target_height, should_scale) => {
    const base_name = file.name.replace(/\.[^/.]+$/, "");
    let result = should_scale
        ? `${base_name}_scaled_${target_width || 'orig'}x${target_height || 'orig'}.png`
        : file.name;
    if (result.length > 20) {
        // Ensure we don't cut off the file extension
        const ext = '.png';
        const allowedBaseLen = 20 - ext.length;
        if (should_scale) {
            result = result.substring(0, allowedBaseLen) + ext;
        } else {
            // For non-scaled, just truncate to 20 chars
            result = result.substring(0, 20);
        }
    }
    return `${++uid}${result}`;
};

/**
 * Displays preview of original and scaled images
 * @param {string} file_name - Name of the file
 * @param {HTMLImageElement} original_img - Original image
 * @param {HTMLCanvasElement} scaled_canvas - Scaled image canvas
 */
const display_preview = (file_name, original_img, scaled_canvas) => {
    const preview = document.createElement('div');
    preview.className = 'preview';

    const original_width = original_img.naturalWidth || original_img.width;
    const original_height = original_img.naturalHeight || original_img.height;
    const scaled_width = scaled_canvas.width;
    const scaled_height = scaled_canvas.height;

    // Calculate display dimensions for original image
    let original_display_width = original_width;
    let original_display_height = original_height;
    if (original_width > 128 || original_height > 128) {
        const ratio = original_width / original_height;
        if (ratio > 1) {
            original_display_width = 128;
            original_display_height = Math.round(128 / ratio);
        } else {
            original_display_height = 128;
            original_display_width = Math.round(128 * ratio);
        }
    }

    // Calculate display dimensions for scaled image
    let scaled_display_width = scaled_width;
    let scaled_display_height = scaled_height;
    if (scaled_width > 128 || scaled_height > 128) {
        const ratio = scaled_width / scaled_height;
        if (ratio > 1) {
            scaled_display_width = 128;
            scaled_display_height = Math.round(128 / ratio);
        } else {
            scaled_display_height = 128;
            scaled_display_width = Math.round(128 * ratio);
        }
    }

    preview.innerHTML = `
        <h3 class="truncated-text" title="${file_name}">${file_name}</h3>
        <p>Original (${original_width}x${original_height})</p>
        <canvas width="${original_display_width}" height="${original_display_height}"></canvas>
        <p>Scaled (${scaled_width}x${scaled_height})</p>
        <canvas class="scaled" width="${scaled_display_width}" height="${scaled_display_height}"></canvas>
    `;

    preview_container.appendChild(preview);

    const original_canvas = preview.querySelector('canvas:not(.scaled)');
    const original_ctx = original_canvas.getContext('2d', { willReadFrequently: false });
    original_ctx.imageSmoothingEnabled = false;
    original_ctx.drawImage(original_img, 0, 0, original_display_width, original_display_height);

    const scaled_canvas_preview = preview.querySelector('canvas.scaled');
    const scaled_ctx = scaled_canvas_preview.getContext('2d', { willReadFrequently: false });
    scaled_ctx.imageSmoothingEnabled = false;
    scaled_ctx.drawImage(scaled_canvas, 0, 0, scaled_display_width, scaled_display_height);
};

/**
 * Updates the file selection status display
 */
const update_file_status = () => {
    drop_zone.textContent = files.length ? `${files.length} file(s) selected` : 'Drag and drop normal maps here or click to select';
    process_button.disabled = files.length === 0;
};

/**
 * Initializes UI for processing
 */
const initialize_ui = () => {
    error_message.textContent = '';
    preview_container.innerHTML = '';
    progress_bar.style.display = 'block';
    progress_bar.value = 0;
    download_button.style.display = 'none';
};

/**
 * Determines if scaling is needed
 * @param {HTMLImageElement} img - Source image
 * @param {number} target_width - Target width
 * @param {number} target_height - Target height
 * @returns {boolean} Whether scaling is required
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
 * Creates canvas from scaled data
 * @param {Uint8ClampedArray} scaled_data - Scaled image data
 * @param {number} target_width - Target width
 * @param {number} target_height - Target height
 * @returns {HTMLCanvasElement} Scaled image canvas
 */
const create_scaled_canvas = (scaled_data, target_width, target_height) => {
    const canvas = document.createElement('canvas');
    canvas.width = target_width;
    canvas.height = target_height;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const image_data = ctx.createImageData(target_width, target_height);
    image_data.data.set(scaled_data);
    ctx.putImageData(image_data, 0, 0);
    return canvas;
};

/**
 * Converts canvas to PNG blob
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @returns {Promise<Blob>} PNG blob
 */
const canvas_to_blob = async (canvas) => {
    if (canvas.toBlob) {
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
    }

    return new Promise(resolve => {
        const data_url = canvas.toDataURL('image/png');
        fetch(data_url)
            .then(res => res.blob())
            .then(resolve);
    });
};



/**
 * Processes an image file asynchronously without waiting, adding it to a zip.
 * @param {File} file - The input image file.
 * @param {number} target_width - Desired width for scaling.
 * @param {number} target_height - Desired height for scaling.
 * @param {JSZip} zip - The JSZip instance to store the processed file.
 * @returns {Promise<boolean>} Resolves to true on success, false on failure.
 */
const process_file = (file, target_width, target_height, zip) => {
    return new Promise((resolve) => {
        load_image(file)
            .then(img => {
                const natural_width = img.naturalWidth || img.width;
                const natural_height = img.naturalHeight || img.height;
                const should_scale = should_scale_image(img, target_width, target_height);

                let scaled_canvas;
                if (should_scale) {
                    const scale_width = target_width > 0 ? target_width : natural_width;
                    const scale_height = target_height > 0 ? target_height : natural_height;
                    const src_data = get_image_data(img, 0, 0, natural_width, natural_height);

                    return scale_normal_map_worker(src_data, natural_width, natural_height, scale_width, scale_height)
                        .then(scaled_data => {
                            scaled_canvas = create_scaled_canvas(scaled_data, scale_width, scale_height);
                            return { scaled_canvas, blob: canvas_to_blob(scaled_canvas), should_scale, img };
                        });
                } else {
                    scaled_canvas = document.createElement('canvas');
                    scaled_canvas.width = natural_width;
                    scaled_canvas.height = natural_height;
                    const ctx = scaled_canvas.getContext('2d', { willReadFrequently: false });
                    ctx.drawImage(img, 0, 0);
                    return { scaled_canvas, blob: canvas_to_blob(scaled_canvas), should_scale, img };
                }
            })
            .then(({ scaled_canvas, blob, should_scale, img }) => {
                return Promise.resolve(blob).then(blob => {
                    console.log(scaled_canvas, blob, should_scale, img);
                    const output_name = generate_output_name(file, target_width, target_height, should_scale);
                    zip.file(output_name, blob);
                    display_preview(file.name, img, scaled_canvas);
                    resolve(true);
                });
            })
            .catch(err => {
                console.error(`Error processing ${file.name}:`, err);
                error_message.textContent = `Error processing ${file.name}: ${err.message}. Continuing with other files.`;
                resolve(false);
            });
    });
};

/**
 * Finalizes processing and prepares download
 * @param {JSZip} zip - ZIP archive instance
 * @param {File[]} files - Processed files
 * @param {number} target_width - Target width used
 * @param {number} target_height - Target height used
 * @param {boolean} has_valid_normal_map - Whether valid maps were processed
 */
const finalize_processing = async (zip, files, target_width, target_height, has_valid_normal_map) => {
    if (has_valid_normal_map && Object.keys(zip.files).length > 0) {
        const zip_blob = await zip.generateAsync({ type: 'blob' });
        const size_label = `${target_width || 'orig'}x${target_height || 'orig'}`;
        const base_name = files[0].name.split('.')[0];
        zip_file_name = `${base_name}_scaled_normal_maps_${size_label}.zip`;

        download_button.textContent = `Download ${zip_file_name}`;
        download_button.style.display = "block";
        download_button.onclick = () => save_file(zip_blob, zip_file_name);
    } else {
        error_message.textContent = 'No valid normal maps were processed.';
    }
};

/**
 * Resets the application to initial state
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
};

window.addEventListener('DOMContentLoaded', () => {
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

    drop_zone.addEventListener('click', () => file_input.click());

    drop_zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        drop_zone.classList.add('dragover');
    });

    drop_zone.addEventListener('dragleave', () => {
        drop_zone.classList.remove('dragover');
    });

    drop_zone.addEventListener('drop', (e) => {
        e.preventDefault();
        drop_zone.classList.remove('dragover');
        files = Array.from(e.dataTransfer.files);
        update_file_status();
    });

    file_input.addEventListener('change', () => {
        files = Array.from(file_input.files);
        update_file_status();
    });

    process_button.addEventListener('click', () => {
        if (files.length === 0) return;

        initialize_ui();

        const target_width = parseInt(width_select.value) || 0;
        const target_height = parseInt(height_select.value) || 0;
        const zip = new JSZip();
        let has_valid_normal_map = false;

        const total_files = files.length;
        let processed = 0;

        Promise.all(files.map(file =>
            process_file(file, target_width, target_height, zip)
                .then(success => {
                    if (success) has_valid_normal_map = true;
                    processed++;
                    progress_bar.value = (processed / total_files) * 100;
                    return success;
                })
        ))
            .then(() => finalize_processing(zip, files, target_width, target_height, has_valid_normal_map))
            .finally(() => {
                progress_bar.style.display = 'none';
            });
    });

    reset_button.addEventListener('click', reset_app);
});
