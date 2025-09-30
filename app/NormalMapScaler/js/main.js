/*
    Normal Map Scaler: Scale normal maps using vector operations.
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

const drop_zone = document.getElementById('dropZone');
const file_input = document.getElementById('fileInput');
const width_select = document.getElementById('widthSelect');
const height_select = document.getElementById('heightSelect');
const process_button = document.getElementById('processButton');
const progress_bar = document.getElementById('progressBar');
const error_message = document.getElementById('errorMessage');
const preview_container = document.getElementById('previewContainer');
const download_button = document.getElementById('downloadButton');
const reset_button = document.getElementById('resetButton');

let files = [];
let zip_file_name = "";

// Cache reusable canvas contexts
const canvas_cache = new Map();
const ctx_cache = new Map();

/**
 * Gets a cached canvas context for better performance
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height  
 * @returns {CanvasRenderingContext2D} The 2D rendering context
 */
const get_cached_context = (width, height) => {
    const key = `${width}x${height}`;
    if (!ctx_cache.has(key)) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx_cache.set(key, ctx);
        canvas_cache.set(key, canvas);
    }
    return ctx_cache.get(key);
}

/**
 * Updates the file selection status display
 */
const update_file_status = () => {
    drop_zone.textContent = files.length ? `${files.length} file(s) selected` : 'Drag and drop normal maps here or click to select';
    process_button.disabled = files.length === 0;
}

// Event listeners for drag and drop functionality
drop_zone.addEventListener('click', () => file_input.click());
drop_zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop_zone.classList.add('dragover');
});
drop_zone.addEventListener('dragleave', () => drop_zone.classList.remove('dragover'));
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

/**
 * Loads an image from a file with optimized resource handling
 * @param {File} file - The image file to load
 * @returns {Promise<HTMLImageElement>} Promise resolving to loaded image
 */
const load_image = (file) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src); // Clean up object URL immediately
            resolve(img);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Converts sRGB color value to linear color space
 * @param {number} c - sRGB color component (0-1)
 * @returns {number} Linear color value
 */
const srgb_to_linear = (c) => {
    return c <= 0.0031308 ? c * 12.92 : 1.055 * (c ** 0.41666) - 0.055;
}

/**
 * Scales an image using vector-aware interpolation
 * @param {HTMLImageElement} img - Source image to scale
 * @param {number} target_width - Target width for scaling
 * @param {number} target_height - Target height for scaling
 * @returns {HTMLCanvasElement} Scaled image as canvas
 */
const scale_image = async (img, target_width, target_height) => {
    const src_width = img.width;
    const src_height = img.height;

    const ctx = get_cached_context(target_width, target_height);
    const dest_data = ctx.createImageData(target_width, target_height);

    // Pre-calculate source image data once
    const src_ctx = get_cached_context(src_width, src_height);
    src_ctx.drawImage(img, 0, 0);
    const src_data = src_ctx.getImageData(0, 0, src_width, src_height).data;

    // Use typed arrays for better performance
    const dest_array = dest_data.data;

    // Pre-calculate scaling factors
    const x_scale = src_width / target_width;
    const y_scale = src_height / target_height;

    // Process pixels with optimized loops
    for (let y = 0; y < target_height; y++) {
        const y_idx = y * target_width * 4;
        const src_y = y * y_scale;

        for (let x = 0; x < target_width; x++) {
            const idx = y_idx + (x * 4);
            const vector = get_scaled_vector(x, y, src_data, src_width, src_height, target_width, target_height);

            dest_array[idx] = vector[0] * 255;
            dest_array[idx + 1] = vector[1] * 255;
            dest_array[idx + 2] = vector[2] * 255;
            dest_array[idx + 3] = 255;
        }
    }

    ctx.putImageData(dest_data, 0, 0);
    return canvas_cache.get(`${target_width}x${target_height}`);
}

/**
 * Gets interpolated normal vector for scaling
 * @param {number} x - Target x coordinate
 * @param {number} y - Target y coordinate
 * @param {Uint8ClampedArray} src_data - Source image data
 * @param {number} src_width - Source image width
 * @param {number} src_height - Source image height
 * @param {number} target_width - Target image width
 * @param {number} target_height - Target image height
 * @returns {number[]} Normalized vector [r, g, b]
 */
function get_scaled_vector(x, y, src_data, src_width, src_height, target_width, target_height) {
    const src_x = (x / target_width) * src_width;
    const src_y = (y / target_height) * src_height;

    const vectors = [];
    const scale_x = target_width >= src_width ? 3 : Math.ceil(src_width / target_width);
    const scale_y = target_height >= src_height ? 3 : Math.ceil(src_height / target_height);

    const half_scale_x = Math.floor(scale_x / 2);
    const half_scale_y = Math.floor(scale_y / 2);

    // Pre-calculate bounds
    const min_x = Math.max(0, Math.floor(src_x) - half_scale_x);
    const max_x = Math.min(src_width - 1, Math.floor(src_x) + Math.ceil(scale_x / 2));
    const min_y = Math.max(0, Math.floor(src_y) - half_scale_y);
    const max_y = Math.min(src_height - 1, Math.floor(src_y) + Math.ceil(scale_y / 2));

    for (let py = min_y; py <= max_y; py++) {
        const y_offset = py * src_width * 4;
        for (let px = min_x; px <= max_x; px++) {
            const idx = y_offset + (px * 4);
            vectors.push([
                src_data[idx] / 255,
                src_data[idx + 1] / 255,
                src_data[idx + 2] / 255
            ]);
        }
    }

    return average_and_normalize(vectors);
}

/**
 * Averages and normalizes a set of vectors
 * @param {number[][]} vectors - Array of vector arrays
 * @returns {number[]} Normalized average vector
 */
const average_and_normalize = (vectors) => {
    const count = vectors.length;
    if (count === 0) return [0, 0, 1];

    let sum_r = 0, sum_g = 0, sum_b = 0;

    // Optimized summation
    for (let i = 0; i < count; i++) {
        const vector = vectors[i];
        sum_r += vector[0];
        sum_g += vector[1];
        sum_b += vector[2];
    }

    const inv_count = 1 / count;
    const avg_r = sum_r * inv_count;
    const avg_g = sum_g * inv_count;
    const avg_b = sum_b * inv_count;

    const length = Math.sqrt(avg_r * avg_r + avg_g * avg_g + avg_b * avg_b);

    if (length > 1e-8) {
        const inv_length = 1 / length;
        return [avg_r * inv_length, avg_g * inv_length, avg_b * inv_length];
    }

    return [0, 0, 1];
}

/**
 * Scales a normal map using progressive scaling for quality
 * @param {HTMLImageElement} img - Source normal map image
 * @param {Object} target_size - Target dimensions
 * @param {number} target_size.width - Target width
 * @param {number} target_size.height - Target height
 * @returns {Promise<HTMLCanvasElement>} Promise resolving to scaled canvas
 */
const scale_normal_map = async (img, target_size) => {
    const src_width = img.width;
    const src_height = img.height;
    const target_width = target_size.width || src_width;
    const target_height = target_size.height || src_height;

    if (src_width === target_width && src_height === target_height) {
        return img;
    }

    let current_width = src_width;
    let current_height = src_height;
    let scaled_image = img;

    // Progressive scaling for better quality
    while (current_width < target_width || current_height < target_height) {
        const next_width = Math.min(current_width * 2, target_width);
        const next_height = Math.min(current_height * 2, target_height);
        scaled_image = await scale_image(scaled_image, next_width, next_height);
        current_width = next_width;
        current_height = next_height;
    }

    return scaled_image;
}

/**
 * Displays preview of original and scaled images
 * @param {string} file_name - Name of the file
 * @param {HTMLImageElement} original_img - Original image
 * @param {HTMLCanvasElement} scaled_canvas - Scaled image canvas
 */
const display_preview = (file_name, original_img, scaled_canvas) => {
    const preview = document.createElement('div');
    preview.className = 'preview';

    const original_width = original_img.width;
    const original_height = original_img.height;
    const scaled_width = scaled_canvas.width;
    const scaled_height = scaled_canvas.height;

    let display_width = original_width;
    let display_height = original_height;

    // Calculate display dimensions for preview
    if (original_width > 128 || original_height > 128) {
        if (original_width > original_height) {
            display_width = 128;
            display_height = Math.round((128 / original_width) * original_height);
        } else {
            display_height = 128;
            display_width = Math.round((128 / original_height) * original_width);
        }
    }

    preview.innerHTML = `
        <h3>${file_name}</h3>
        <p>Original (${original_width}x${original_height})</p>
        <canvas width="${display_width}" height="${display_height}"></canvas>
        <p>Scaled (${scaled_width}x${scaled_height})</p>
        <canvas class="scaled" width="128" height="128"></canvas>
    `;

    preview_container.appendChild(preview);

    // Draw preview images
    const original_canvas = preview.querySelector('canvas:not(.scaled)');
    const original_ctx = original_canvas.getContext('2d');
    original_ctx.drawImage(original_img, 0, 0, display_width, display_height);

    const scaled_canvas_preview = preview.querySelector('canvas.scaled');
    const scaled_ctx = scaled_canvas_preview.getContext('2d');
    scaled_ctx.drawImage(scaled_canvas, 0, 0, 128, 128);
}

/**
 * Saves a file to the user's download location
 * @param {Blob} blob - File data as blob
 * @param {string} file_name - Name for the downloaded file
 */
const save_file = (blob, file_name) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file_name;
    link.click();
    URL.revokeObjectURL(link.href);
}

/**
 * Resets the application to initial state
 */
const reset_app = () => {
    files = [];
    zip_file_name = "";
    drop_zone.textContent = 'Drag and drop normal maps here or click to select';
    process_button.disabled = true;
    progress_bar.style.display = 'none';
    progress_bar.value = 0;
    error_message.textContent = '';
    preview_container.innerHTML = '';
    download_button.style.display = 'none';
    file_input.value = '';
    width_select.value = "512";
    height_select.value = "512";

    // Clear caches to free memory
    ctx_cache.clear();
    canvas_cache.clear();
}

/**
 * Processes all selected normal map files
 */
process_button.addEventListener('click', async () => {
    if (files.length === 0) return;

    error_message.textContent = '';
    preview_container.innerHTML = '';
    progress_bar.style.display = 'block';
    progress_bar.value = 0;
    download_button.style.display = 'none';

    const target_width = parseInt(width_select.value) || 0;
    const target_height = parseInt(height_select.value) || 0;
    const zip = new JSZip();

    let processed = 0;
    const total_files = files.length;
    let has_valid_normal_map = false;

    // Process files in sequence for memory efficiency
    for (const file of files) {
        try {
            const img = await load_image(file);
            has_valid_normal_map = true;

            let scaled_canvas;
            let should_scale = true;

            // Determine if scaling is needed
            if (target_width === 0 && target_height === 0) {
                scaled_canvas = img;
                should_scale = false;
            } else if (target_width === 0) {
                should_scale = img.height !== target_height;
            } else if (target_height === 0) {
                should_scale = img.width !== target_width;
            } else {
                should_scale = img.width !== target_width || img.height !== target_height;
            }

            // Perform scaling if needed
            if (should_scale) {
                const scale_width = target_width > 0 ? target_width : img.width;
                const scale_height = target_height > 0 ? target_height : img.height;
                scaled_canvas = await scale_normal_map(img, {
                    width: scale_width,
                    height: scale_height
                });
            } else {
                scaled_canvas = img;
            }

            // Add to ZIP
            const blob = await new Promise(resolve => {
                if (scaled_canvas.toBlob) {
                    scaled_canvas.toBlob(resolve, 'image/png');
                } else {
                    // Fallback for older browsers
                    const temp_canvas = document.createElement('canvas');
                    temp_canvas.width = scaled_canvas.width;
                    temp_canvas.height = scaled_canvas.height;
                    const temp_ctx = temp_canvas.getContext('2d');
                    temp_ctx.drawImage(scaled_canvas, 0, 0);
                    temp_canvas.toBlob(resolve, 'image/png');
                }
            });

            const output_name = should_scale ?
                `${file.name.replace(/\.[^/.]+$/, "")}_scaled_${target_width || 'orig'}x${target_height || 'orig'}.png` :
                file.name;

            zip.file(output_name, blob);
            display_preview(file.name, img, scaled_canvas);

        } catch (err) {
            console.error(`Error processing ${file.name}:`, err);
            error_message.textContent = `Error processing ${file.name}: ${err.message}. Continuing with other files.`;
        }

        // Update progress
        processed++;
        progress_bar.value = (processed / total_files) * 100;

        // Allow UI updates between files
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Generate and prepare download
    if (has_valid_normal_map && Object.keys(zip.files).length > 0) {
        const zip_blob = await zip.generateAsync({ type: 'blob' });
        const size_label = `${target_width || 'orig'}x${target_height || 'orig'}`;
        zip_file_name = `${files[0].name.split('.')[0]}_scaled_normal_maps_${size_label}.zip`;

        download_button.textContent = `Download ${zip_file_name}`;
        download_button.style.display = "block";
        download_button.onclick = () => save_file(zip_blob, zip_file_name);
    } else {
        error_message.textContent = 'No valid normal maps were processed.';
    }

    progress_bar.style.display = 'none';
});

reset_button.addEventListener('click', reset_app);
