
/*
    Normal Map Merger: A tool for merging two normal maps.
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

const base_input = document.getElementById('baseInput');
const add_input = document.getElementById('addInput');
const convention_select = document.getElementById('convention');
const intensity_input = document.getElementById('intensity');
const fallback_alpha_input = document.getElementById('fallbackAlpha');
const merge_button = document.querySelector('button');
const preview_canvas = document.getElementById('preview');
const progress_container = document.getElementById('progress-container');
const progress_bar = document.getElementById('progress-bar');
const error_message = document.getElementById('error-message');
const download_button = document.getElementById('download');
let result_image_data;
let is_processing = false;

/**
 * Displays an error message and updates UI accordingly
 * @param {string} msg - The error message to display
 */
const show_error = (msg) => {
    error_message.textContent = msg;
    error_message.style.display = 'block';
    progress_container.style.display = 'none';
    preview_canvas.style.display = 'none';
    download_button.style.display = 'none';
    is_processing = false;
    if (merge_button) {
        merge_button.classList.remove('loading');
        merge_button.textContent = 'Merge Normal Maps';
    }
}

/**
 * Clears any displayed error messages
 */
const clear_error = () => {
    error_message.style.display = 'none';
}

/**
 * Loads an image from a file with validation
 * @param {File} file - The image file to load
 * @returns {Promise<HTMLImageElement>} Promise resolving to loaded image
 */
const load_image = (file) => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject('Invalid file type. Please upload an image.');
            return;
        }

        const img = new Image();
        img.onload = () => {
            if (img.width > 2048 || img.height > 2048) {
                reject('Image exceeds 2048x2048 pixels.');
            } else {
                resolve(img);
            }
        };
        img.onerror = () => reject('Failed to load image. The image may be corrupted.');
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Extracts ImageData from an image using a canvas
 * @param {HTMLImageElement} img - The source image
 * @param {HTMLCanvasElement} canvas - The canvas to use for rendering
 * @returns {ImageData} The image data extracted from the canvas
 */
const get_image_data = (img, canvas) => {
    const width = canvas.width = img.width;
    const height = canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    try {
        return ctx.getImageData(0, 0, width, height);
    } catch (error) {
        throw new Error('Error reading image data. The image may be corrupted.');
    }
}

/**
 * Normalizes a 3D vector
 * @param {number[]} v - The vector to normalize [x, y, z]
 * @returns {number[]} Normalized vector
 */
const normalize = (v) => {
    const x = v[0], y = v[1], z = v[2];
    const len_sq = x * x + y * y + z * z;
    if (len_sq === 0) return v;
    const len_inv = 1 / Math.sqrt(len_sq);
    return [x * len_inv, y * len_inv, z * len_inv];
}

/**
 * Calculates cross product of two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number[]} Cross product vector
 */
const cross = (a, b) => {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

/**
 * Calculates dot product of two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Dot product
 */
const dot = (a, b) => {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Rotates a vector around an axis by specified angle
 * @param {number[]} vec - Vector to rotate
 * @param {number[]} axis - Axis of rotation
 * @param {number} angle - Angle in radians
 * @returns {number[]} Rotated vector
 */
const rotate_vector = (vec, axis, angle) => {
    const cos_a = Math.cos(angle);
    const sin_a = Math.sin(angle);
    const k = 1 - cos_a;
    const [x, y, z] = vec;
    const [ux, uy, uz] = axis;

    const rotated = [
        x * (cos_a + ux * ux * k) + y * (ux * uy * k - uz * sin_a) + z * (ux * uz * k + uy * sin_a),
        x * (uy * ux * k + uz * sin_a) + y * (cos_a + uy * uy * k) + z * (uy * uz * k - ux * sin_a),
        x * (uz * ux * k - uy * sin_a) + y * (uz * uy * k + ux * sin_a) + z * (cos_a + uz * uz * k)
    ];
    return normalize(rotated);
}

/**
 * Merges two normal maps with specified intensity and convention
 * @returns {Promise<void>}
 */
const merge_normal_maps = async () => {
    if (is_processing) return;
    is_processing = true;
    clear_error();
    progress_container.style.display = 'block';
    progress_bar.style.width = '0%';
    preview_canvas.style.display = 'none';
    download_button.style.display = 'none';
    merge_button.classList.add('loading');
    merge_button.textContent = 'Processing...';

    try {
        if (!base_input.files[0] || !add_input.files[0]) {
            throw new Error('Please upload both normal maps.');
        }

        const [base_img, add_img] = await Promise.all([
            load_image(base_input.files[0]),
            load_image(add_input.files[0])
        ]);

        if (base_img.width !== add_img.width || base_img.height !== add_img.height) {
            throw new Error('Images must have the same dimensions.');
        }

        const temp_canvas = document.createElement('canvas');
        const [base_data, add_data] = [
            get_image_data(base_img, temp_canvas),
            get_image_data(add_img, temp_canvas)
        ];

        const width = Math.min(base_data.width, add_data.width);
        const height = Math.min(base_data.height, add_data.height);
        preview_canvas.width = width;
        preview_canvas.height = height;
        const ctx = preview_canvas.getContext('2d');
        const result_data = ctx.createImageData(width, height);

        const intensity = parseFloat(intensity_input.value);
        const is_directx = convention_select.value === 'directx';
        const fallback_alpha = parseInt(fallback_alpha_input.value);
        const y_sign = is_directx ? -1 : 1;
        const base_data_arr = base_data.data;
        const add_data_arr = add_data.data;
        const result_data_arr = result_data.data;
        const base_width = base_data.width;
        const add_width = add_data.width;
        const base_height = base_data.height;
        const add_height = add_data.height;

        let progress_update_count = 0;
        const progress_interval = Math.max(1, Math.floor(height / 100));

        for (let y = 0; y < height; y++) {
            const y_base = y % base_height;
            const y_add = y % add_height;
            const base_row_offset = y_base * base_width;
            const add_row_offset = y_add * add_width;
            const result_row_offset = y * width;

            for (let x = 0; x < width; x++) {
                const x_base = x % base_width;
                const x_add = x % add_width;
                const base_idx = (base_row_offset + x_base) << 2;
                const add_idx = (add_row_offset + x_add) << 2;
                const result_idx = (result_row_offset + x) << 2;

                const base_normal = [
                    base_data_arr[base_idx] * 0.00784313725 - 1,
                    y_sign * (base_data_arr[base_idx + 1] * 0.00784313725 - 1),
                    base_data_arr[base_idx + 2] * 0.00784313725 - 1
                ];
                const add_normal = [
                    add_data_arr[add_idx] * 0.00784313725 - 1,
                    y_sign * (add_data_arr[add_idx + 1] * 0.00784313725 - 1),
                    add_data_arr[add_idx + 2] * 0.00784313725 - 1
                ];

                const z_axis = [0, 0, 1];
                const axis = normalize(cross(z_axis, add_normal));
                const dot_product = Math.min(Math.max(dot(z_axis, add_normal), -1), 1);
                const angle = Math.acos(dot_product);

                let result_normal = base_normal;
                if (!isNaN(axis[0]) && angle > 1e-4) {
                    result_normal = rotate_vector(base_normal, axis, angle * intensity);
                }

                const base_alpha = base_data_arr[base_idx + 3] ?? fallback_alpha;
                const add_alpha = add_data_arr[add_idx + 3] ?? fallback_alpha;
                const blended_alpha = Math.round((1 - intensity) * base_alpha + intensity * add_alpha);

                result_data_arr[result_idx] = (result_normal[0] + 1) * 127.5;
                result_data_arr[result_idx + 1] = (result_normal[1] * y_sign + 1) * 127.5;
                result_data_arr[result_idx + 2] = (result_normal[2] + 1) * 127.5;
                result_data_arr[result_idx + 3] = blended_alpha;
            }

            if (++progress_update_count >= progress_interval || y === height - 1) {
                progress_update_count = 0;
                progress_bar.style.width = `${(y / (height - 1)) * 100}%`;
            }
        }

        ctx.putImageData(result_data, 0, 0);
        preview_canvas.style.display = 'block';
        progress_container.style.display = 'none';
        download_button.style.display = 'block';
        result_image_data = result_data;

        const base_name = base_input.files[0].name.split('.')[0];
        const add_name = add_input.files[0].name.split('.')[0];
        download_button.dataset.filename = `${base_name}_${add_name}.png`;
    } catch (err) {
        show_error(err.message);
    } finally {
        is_processing = false;
        if (merge_button) {
            merge_button.classList.remove('loading');
            merge_button.textContent = 'Merge Normal Maps';
        }
    }
}

/**
 * Downloads the merged normal map result
 */
const download_result = () => {
    if (!result_image_data) {
        show_error('No result to download. Please merge normal maps first.');
        return;
    }
    const link = document.createElement('a');
    link.download = download_button.dataset.filename;
    link.href = preview_canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Event listeners
merge_button.addEventListener('click', merge_normal_maps);
download_button.addEventListener('click', download_result);
