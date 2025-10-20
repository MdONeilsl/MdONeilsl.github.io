/** 
 * Images module
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */


import { clamp } from "./math.js";

/**
 * Fast dimension validation with bounds checking using bitwise operations
 * @param {number} value - Dimension value to validate
 * @param {number} max_value - Maximum allowed value
 * @returns {number} Validated dimension value
 */
export const valid_dim = (value, min = 0, max = 8192) => {
    const num = parseInt(value, 10) || 1;
    return clamp(num, min, max);
};

/**
 * Calculates proportional height maintaining aspect ratio for given dimensions
 * @param {number} width - Original image width in pixels
 * @param {number} height - Original image height in pixels  
 * @param {number} new_width - Target width for aspect ratio calculation
 * @returns {number} - Height value scaled proportionally to maintain aspect ratio
 */
export const height_for_width = (width, height, new_width) => 
    width > 0 ? (height * new_width) / width : 0;

/**
 * Calculates cubic interpolation weight for given input using piecewise cubic polynomial
 * @param {number} x - Input value
 * @returns {number} Interpolation weight
 */
export const cubic = x => {
    const abs_x = x < 0 ? -x : x;

    if (abs_x <= 1) {
        const x2 = abs_x * abs_x;
        return x2 * (1.5 * abs_x - 2.5) + 1;
    }

    if (abs_x <= 2) {
        const x2 = abs_x * abs_x;
        return x2 * (-0.5 * abs_x + 2.5) - 4 * abs_x + 2;
    }

    return 0;
};

/**
 * Performs 1D cubic interpolation for bicubic
 * @param {number} t - Fractional offset
 * @param {number} a - Value at -1
 * @param {number} b - Value at 0
 * @param {number} c - Value at 1
 * @param {number} d - Value at 2
 * @returns {number} Interpolated value
 */
export const terp = (t, a, b, c, d) => {
    const t2 = t * t;
    return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * b - 3 * c + d - a)));
};

/**
 * Retrieves normalized pixel channel value from image data
 * @param {Uint8ClampedArray} src_data - Source image data array
 * @param {number} src_width - Width of image in pixels
 * @param {number} src_height - Height of image in pixels
 * @param {number} px - X-coordinate of pixel
 * @param {number} py - Y-coordinate of pixel
 * @param {number} channel - Color channel index (0: red, 1: green, 2: blue, 3: alpha)
 * @returns {number} Normalized channel value in [0, 1]
 */
export const get_pixel = (src_data, src_width, src_height, px, py, channel) => {
    const x = px < 0 ? 0 : px >= src_width ? src_width - 1 : px;
    const y = py < 0 ? 0 : py >= src_height ? src_height - 1 : py;
    return src_data[(y * src_width + x) * 4 + channel] * 0.00392156862745098;
};

/**
 * Interpolates row value for pixel using cubic interpolation
 * @param {Uint8ClampedArray} src_data - Source image data array
 * @param {number} src_width - Width of source image
 * @param {number} src_height - Height of source image
 * @param {number} px - X-coordinate of pixel
 * @param {number} py - Y-coordinate of pixel
 * @param {number} dx - Fractional distance for interpolation
 * @param {number} channel - Color channel index to interpolate
 * @returns {number} Interpolated pixel value clamped to [0, 1]
 */
export const interpolate_row = (src_data, src_width, src_height, px, py, dx, channel) => {
    const y = py < 0 ? 0 : py >= src_height ? src_height - 1 : py;
    const row_start = y * src_width * 4;

    const dx0 = dx + 1;
    const dx1 = dx;
    const dx2 = dx - 1;
    const dx3 = dx - 2;

    const abs0 = dx0 < 0 ? -dx0 : dx0;
    const abs1 = dx1 < 0 ? -dx1 : dx1;
    const abs2 = dx2 < 0 ? -dx2 : dx2;
    const abs3 = dx3 < 0 ? -dx3 : dx3;

    const c0 = abs0 <= 1 ? abs0 * abs0 * (1.5 * abs0 - 2.5) + 1 :
        abs0 <= 2 ? abs0 * abs0 * (-0.5 * abs0 + 2.5) - 4 * abs0 + 2 : 0;
    const c1 = abs1 <= 1 ? abs1 * abs1 * (1.5 * abs1 - 2.5) + 1 :
        abs1 <= 2 ? abs1 * abs1 * (-0.5 * abs1 + 2.5) - 4 * abs1 + 2 : 0;
    const c2 = abs2 <= 1 ? abs2 * abs2 * (1.5 * abs2 - 2.5) + 1 :
        abs2 <= 2 ? abs2 * abs2 * (-0.5 * abs2 + 2.5) - 4 * abs2 + 2 : 0;
    const c3 = abs3 <= 1 ? abs3 * abs3 * (1.5 * abs3 - 2.5) + 1 :
        abs3 <= 2 ? abs3 * abs3 * (-0.5 * abs3 + 2.5) - 4 * abs3 + 2 : 0;

    const x0 = px - 1 < 0 ? 0 : px - 1 >= src_width ? src_width - 1 : px - 1;
    const x1 = px < 0 ? 0 : px >= src_width ? src_width - 1 : px;
    const x2 = px + 1 < 0 ? 0 : px + 1 >= src_width ? src_width - 1 : px + 1;
    const x3 = px + 2 < 0 ? 0 : px + 2 >= src_width ? src_width - 1 : px + 2;

    const p0 = src_data[row_start + x0 * 4 + channel] * 0.00392156862745098;
    const p1 = src_data[row_start + x1 * 4 + channel] * 0.00392156862745098;
    const p2 = src_data[row_start + x2 * 4 + channel] * 0.00392156862745098;
    const p3 = src_data[row_start + x3 * 4 + channel] * 0.00392156862745098;

    const value = p0 * c0 + p1 * c1 + p2 * c2 + p3 * c3;
    return value < 0 ? 0 : value > 1 ? 1 : value;
};

/**
 * Performs bicubic interpolation for pixel and channel
 * @param {Uint8ClampedArray} src_data - Source image data array
 * @param {number} src_width - Width of source image
 * @param {number} src_height - Height of source image
 * @param {number} px - Target pixel x-coordinate
 * @param {number} py - Target pixel y-coordinate
 * @param {number} dx - X-axis fractional offset
 * @param {number} dy - Y-axis fractional offset
 * @param {number} channel - Color channel index (0: red, 1: green, 2: blue, 3: alpha)
 * @returns {number} Interpolated pixel value clamped to [0, 1]
 */
export const bicubic_interpolate = (src_data, src_width, src_height, px, py, dx, dy, channel) => {
    const y0 = py - 1 < 0 ? 0 : py - 1 >= src_height ? src_height - 1 : py - 1;
    const y1 = py < 0 ? 0 : py >= src_height ? src_height - 1 : py;
    const y2 = py + 1 < 0 ? 0 : py + 1 >= src_height ? src_height - 1 : py + 1;
    const y3 = py + 2 < 0 ? 0 : py + 2 >= src_height ? src_height - 1 : py + 2;

    const row0_start = y0 * src_width * 4;
    const row1_start = y1 * src_width * 4;
    const row2_start = y2 * src_width * 4;
    const row3_start = y3 * src_width * 4;

    const x0 = px - 1 < 0 ? 0 : px - 1 >= src_width ? src_width - 1 : px - 1;
    const x1 = px < 0 ? 0 : px >= src_width ? src_width - 1 : px;
    const x2 = px + 1 < 0 ? 0 : px + 1 >= src_width ? src_width - 1 : px + 1;
    const x3 = px + 2 < 0 ? 0 : px + 2 >= src_width ? src_width - 1 : px + 2;

    const p00 = src_data[row0_start + x0 * 4 + channel] * 0.00392156862745098;
    const p01 = src_data[row0_start + x1 * 4 + channel] * 0.00392156862745098;
    const p02 = src_data[row0_start + x2 * 4 + channel] * 0.00392156862745098;
    const p03 = src_data[row0_start + x3 * 4 + channel] * 0.00392156862745098;

    const p10 = src_data[row1_start + x0 * 4 + channel] * 0.00392156862745098;
    const p11 = src_data[row1_start + x1 * 4 + channel] * 0.00392156862745098;
    const p12 = src_data[row1_start + x2 * 4 + channel] * 0.00392156862745098;
    const p13 = src_data[row1_start + x3 * 4 + channel] * 0.00392156862745098;

    const p20 = src_data[row2_start + x0 * 4 + channel] * 0.00392156862745098;
    const p21 = src_data[row2_start + x1 * 4 + channel] * 0.00392156862745098;
    const p22 = src_data[row2_start + x2 * 4 + channel] * 0.00392156862745098;
    const p23 = src_data[row2_start + x3 * 4 + channel] * 0.00392156862745098;

    const p30 = src_data[row3_start + x0 * 4 + channel] * 0.00392156862745098;
    const p31 = src_data[row3_start + x1 * 4 + channel] * 0.00392156862745098;
    const p32 = src_data[row3_start + x2 * 4 + channel] * 0.00392156862745098;
    const p33 = src_data[row3_start + x3 * 4 + channel] * 0.00392156862745098;

    const abs_dx0 = dx + 1 < 0 ? -(dx + 1) : dx + 1;
    const abs_dx1 = dx < 0 ? -dx : dx;
    const abs_dx2 = dx - 1 < 0 ? -(dx - 1) : dx - 1;
    const abs_dx3 = dx - 2 < 0 ? -(dx - 2) : dx - 2;

    const cx0 = abs_dx0 <= 1 ? abs_dx0 * abs_dx0 * (1.5 * abs_dx0 - 2.5) + 1 :
        abs_dx0 <= 2 ? abs_dx0 * abs_dx0 * (-0.5 * abs_dx0 + 2.5) - 4 * abs_dx0 + 2 : 0;
    const cx1 = abs_dx1 <= 1 ? abs_dx1 * abs_dx1 * (1.5 * abs_dx1 - 2.5) + 1 :
        abs_dx1 <= 2 ? abs_dx1 * abs_dx1 * (-0.5 * abs_dx1 + 2.5) - 4 * abs_dx1 + 2 : 0;
    const cx2 = abs_dx2 <= 1 ? abs_dx2 * abs_dx2 * (1.5 * abs_dx2 - 2.5) + 1 :
        abs_dx2 <= 2 ? abs_dx2 * abs_dx2 * (-0.5 * abs_dx2 + 2.5) - 4 * abs_dx2 + 2 : 0;
    const cx3 = abs_dx3 <= 1 ? abs_dx3 * abs_dx3 * (1.5 * abs_dx3 - 2.5) + 1 :
        abs_dx3 <= 2 ? abs_dx3 * abs_dx3 * (-0.5 * abs_dx3 + 2.5) - 4 * abs_dx3 + 2 : 0;

    const abs_dy0 = dy + 1 < 0 ? -(dy + 1) : dy + 1;
    const abs_dy1 = dy < 0 ? -dy : dy;
    const abs_dy2 = dy - 1 < 0 ? -(dy - 1) : dy - 1;
    const abs_dy3 = dy - 2 < 0 ? -(dy - 2) : dy - 2;

    const cy0 = abs_dy0 <= 1 ? abs_dy0 * abs_dy0 * (1.5 * abs_dy0 - 2.5) + 1 :
        abs_dy0 <= 2 ? abs_dy0 * abs_dy0 * (-0.5 * abs_dy0 + 2.5) - 4 * abs_dy0 + 2 : 0;
    const cy1 = abs_dy1 <= 1 ? abs_dy1 * abs_dy1 * (1.5 * abs_dy1 - 2.5) + 1 :
        abs_dy1 <= 2 ? abs_dy1 * abs_dy1 * (-0.5 * abs_dy1 + 2.5) - 4 * abs_dy1 + 2 : 0;
    const cy2 = abs_dy2 <= 1 ? abs_dy2 * abs_dy2 * (1.5 * abs_dy2 - 2.5) + 1 :
        abs_dy2 <= 2 ? abs_dy2 * abs_dy2 * (-0.5 * abs_dy2 + 2.5) - 4 * abs_dy2 + 2 : 0;
    const cy3 = abs_dy3 <= 1 ? abs_dy3 * abs_dy3 * (1.5 * abs_dy3 - 2.5) + 1 :
        abs_dy3 <= 2 ? abs_dy3 * abs_dy3 * (-0.5 * abs_dy3 + 2.5) - 4 * abs_dy3 + 2 : 0;

    const row0 = p00 * cx0 + p01 * cx1 + p02 * cx2 + p03 * cx3;
    const row1 = p10 * cx0 + p11 * cx1 + p12 * cx2 + p13 * cx3;
    const row2 = p20 * cx0 + p21 * cx1 + p22 * cx2 + p23 * cx3;
    const row3 = p30 * cx0 + p31 * cx1 + p32 * cx2 + p33 * cx3;

    const value = row0 * cy0 + row1 * cy1 + row2 * cy2 + row3 * cy3;
    return value < 0 ? 0 : value > 1 ? 1 : value;
};

/**
 * Calculates a normalized RGB vector and interpolated alpha for a target pixel using optimized bicubic interpolation.
 * @param {number} x - Target x-coordinate.
 * @param {number} y - Target y-coordinate.
 * @param {Uint8ClampedArray} src_data - Source image data array.
 * @param {number} src_width - Source image width.
 * @param {number} src_height - Source image height.
 * @param {number} target_width - Target image width.
 * @param {number} target_height - Target image height.
 * @returns {number[]} Array [r, g, b, a] with normalized RGB vector and interpolated alpha.
 */
export const get_scaled_vector = (x, y, src_data, src_width, src_height, target_width, target_height) => {
    const src_x = (x + 0.5) / target_width * src_width - 0.5;
    const src_y = (y + 0.5) / target_height * src_height - 0.5;
    const fx = Math.floor(src_x);
    const fy = Math.floor(src_y);
    const dx = src_x - fx;
    const dy = src_y - fy;

    const channels = [0, 1, 2, 3];
    const rgba = new Array(4);
    for (let ch = 0; ch < 4; ch++) {
        const channel = channels[ch];
        const row0 = terp(dx, get_pixel(src_data, src_width, src_height, fx - 1, fy - 1, channel),
            get_pixel(src_data, src_width, src_height, fx, fy - 1, channel),
            get_pixel(src_data, src_width, src_height, fx + 1, fy - 1, channel),
            get_pixel(src_data, src_width, src_height, fx + 2, fy - 1, channel));
        const row1 = terp(dx, get_pixel(src_data, src_width, src_height, fx - 1, fy, channel),
            get_pixel(src_data, src_width, src_height, fx, fy, channel),
            get_pixel(src_data, src_width, src_height, fx + 1, fy, channel),
            get_pixel(src_data, src_width, src_height, fx + 2, fy, channel));
        const row2 = terp(dx, get_pixel(src_data, src_width, src_height, fx - 1, fy + 1, channel),
            get_pixel(src_data, src_width, src_height, fx, fy + 1, channel),
            get_pixel(src_data, src_width, src_height, fx + 1, fy + 1, channel),
            get_pixel(src_data, src_width, src_height, fx + 2, fy + 1, channel));
        const row3 = terp(dx, get_pixel(src_data, src_width, src_height, fx - 1, fy + 2, channel),
            get_pixel(src_data, src_width, src_height, fx, fy + 2, channel),
            get_pixel(src_data, src_width, src_height, fx + 1, fy + 2, channel),
            get_pixel(src_data, src_width, src_height, fx + 2, fy + 2, channel));
        rgba[ch] = Math.max(0, Math.min(1, terp(dy, row0, row1, row2, row3)));
    }

    let rx = rgba[0] * 2 - 1;
    let gx = rgba[1] * 2 - 1;
    let bx = rgba[2] * 2 - 1;
    const length = Math.sqrt(rx * rx + gx * gx + bx * bx);
    if (length > 1e-8) {
        rx /= length;
        gx /= length;
        bx /= length;
    } else {
        rx = 0;
        gx = 0;
        bx = 1;
    }
    rgba[0] = (rx + 1) / 2;
    rgba[1] = (gx + 1) / 2;
    rgba[2] = (bx + 1) / 2;
    if (isNaN(rgba[3])) rgba[3] = 1;
    return rgba;
};

/**
 * Scales source image data to target dimensions using normalized vectors and preserving alpha.
 * @param {Uint8ClampedArray} src_data - Source image data array.
 * @param {number} src_width - Width of the source image.
 * @param {number} src_height - Height of the source image.
 * @param {number} target_width - Desired width of the target image.
 * @param {number} target_height - Desired height of the target image.
 * @returns {Uint8ClampedArray} Scaled image data in RGBA format.
 */
export const scale_normal_array = (src_data, src_width, src_height, target_width, target_height) => {
    const dest_data = new Uint8ClampedArray(target_width * target_height << 2);
    const row_stride = target_width << 2;
    let offset = 0;
    for (let y = 0; y < target_height; ++y) {
        for (let x = 0; x < target_width; ++x) {
            const vector = get_scaled_vector(x, y, src_data, src_width, src_height, target_width, target_height);
            dest_data[offset++] = vector[0] * 255 | 0;
            dest_data[offset++] = vector[1] * 255 | 0;
            dest_data[offset++] = vector[2] * 255 | 0;
            dest_data[offset++] = vector[3] * 255 | 0;
        }
    }
    return dest_data;
};

/**
 * Retrieves pixel data from specified region of image using OffscreenCanvas
 * @param {HTMLImageElement} img - Source image
 * @param {number} x - X coordinate of rectangle top-left corner
 * @param {number} y - Y coordinate of rectangle top-left corner
 * @param {number} width - Width of rectangle to extract
 * @param {number} height - Height of rectangle to extract
 * @returns {Uint8ClampedArray} Pixel data of extracted image area
 */
export const get_image_data = (img, x, y, width, height) => {
    if (!img || (x | 0) !== x || (y | 0) !== y || (width | 0) !== width ||
        (height | 0) !== height || width < 1 || height < 1 || x < 0 || y < 0 ||
        x + width > img.width || y + height > img.height) {
        throw new Error('invalid input parameters or out of bounds');
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
};

/**
 * Loads image file and returns Image object when loaded
 * @param {File} file - Image file to load
 * @returns {Promise<HTMLImageElement>} Promise that resolves with Image object on success
 */
export const load_image = file => {
    if (!file || !(file instanceof File)) return Promise.reject(new Error('no file provided'));

    return new Promise((resolve, reject) => {
        const img = new Image();
        const object_url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(object_url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(object_url);
            reject(new Error('failed to load image'));
        };
        img.src = object_url;
    });
};

/**
 * Checks if Uint8ClampedArray representing image data contains any transparency
 * @param {Uint8ClampedArray} image_data - Image data in RGBA format
 * @returns {boolean} True if any pixel has alpha less than 255
 */
export const has_transparency = image_data => {
    if (!(image_data instanceof Uint8ClampedArray)) throw new TypeError('input must be a Uint8ClampedArray');

    const len = image_data.length;
    let step = 4;
    if (len > 1048576) step = 128;
    else if (len > 262144) step = 64;
    else if (len > 16384) step = 32;

    for (let i = 3; i < len; i += step) {
        if (image_data[i] < 254) return true;
    }
    return false;
};

/**
 * Merge two normal maps with a mask into a result buffer using optimized vector math.
 *
 * @param {Uint8ClampedArray} base_data - Base normal map buffer (RGBA)
 * @param {Uint8ClampedArray} add_data - Additional normal map buffer to merge (RGBA)
 * @param {Uint8ClampedArray} mask_data - Mask buffer controlling merge blending (single channel or RGBA)
 * @param {number} width - Width of the maps
 * @param {number} height - Height of the maps
 * @param {Uint8ClampedArray} result - Output buffer to write merged normal map (RGBA)
 * @returns {Uint8ClampedArray} The merged normal map buffer

export const merge_normal_array = (base_data, add_data, mask_data, width, height, result) => {
    // Input validation
    if (!(base_data instanceof Uint8ClampedArray) || !(add_data instanceof Uint8ClampedArray) ||
        !(mask_data instanceof Uint8ClampedArray) || !(result instanceof Uint8ClampedArray)) {
        throw new Error('All input data must be Uint8ClampedArray');
    }

    const expected_base_length = width * height * 4;
    if (base_data.length !== expected_base_length) {
        throw new Error(`base_data length mismatch: expected ${expected_base_length}, got ${base_data.length}`);
    }
    if (add_data.length !== expected_base_length) {
        throw new Error(`add_data length mismatch: expected ${expected_base_length}, got ${add_data.length}`);
    }
    if (result.length !== expected_base_length) {
        throw new Error(`result length mismatch: expected ${expected_base_length}, got ${result.length}`);
    }

    // Validate mask data size (can be single channel or RGBA)
    const expected_mask_length_rgba = width * height * 4;
    const expected_mask_length_single = width * height;
    if (mask_data.length !== expected_mask_length_rgba && mask_data.length !== expected_mask_length_single) {
        throw new Error(`mask_data length must be ${expected_mask_length_single} (single channel) or ${expected_mask_length_rgba} (RGBA), got ${mask_data.length}`);
    }

    const y_sign = 1;
    const len = width * height * 4;
    const z_axis_x = 0, z_axis_y = 0, z_axis_z = 1;
    const is_mask_single_channel = mask_data.length === width * height;

    for (let i = 0; i < len; i += 4) {
        // Get mask intensity - handle both single channel and RGBA masks
        const mask_index = is_mask_single_channel ? Math.floor(i / 4) : i;
        const intensity = mask_data[mask_index] / 255;

        // Decode base normal from [0,255] to [-1,1]
        const base_x = base_data[i] / 127.5 - 1;
        const base_y = y_sign * (base_data[i + 1] / 127.5 - 1);
        const base_z = base_data[i + 2] / 127.5 - 1;

        // Decode add normal
        const add_x = add_data[i] / 127.5 - 1;
        const add_y = y_sign * (add_data[i + 1] / 127.5 - 1);
        const add_z = add_data[i + 2] / 127.5 - 1;

        let res_x = base_x,
            res_y = base_y,
            res_z = base_z;

        // Always compute rotation, but scale by intensity
        let axis = cross(z_axis_x, z_axis_y, z_axis_z, add_x, add_y, add_z);
        const axis_len = axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2];

        const dot_product = Math.min(Math.max(dot(z_axis_x, z_axis_y, z_axis_z, add_x, add_y, add_z), -1), 1);
        const angle = Math.acos(dot_product);

        // Only rotate if axis is valid and angle is significant
        if (axis_len > 1e-10 && angle > 1e-4) {
            axis = normalize(axis[0], axis[1], axis[2]);
            [res_x, res_y, res_z] = rotate_vector(res_x, res_y, res_z, axis[0], axis[1], axis[2], angle * intensity);
        }

        // Blend alpha channel linearly with clamping
        const base_alpha = base_data[i + 3];
        const add_alpha = add_data[i + 3];
        const blended_alpha = Math.max(0, Math.min(255, Math.round((1 - intensity) * base_alpha + intensity * add_alpha)));

        // Encode back to [0,255] with clamping
        result[i] = Math.max(0, Math.min(255, Math.round((res_x + 1) * 127.5)));
        result[i + 1] = Math.max(0, Math.min(255, Math.round((res_y * y_sign + 1) * 127.5)));
        result[i + 2] = Math.max(0, Math.min(255, Math.round((res_z + 1) * 127.5)));
        result[i + 3] = blended_alpha;
    }

    return result;
};
 */

export const merge_normal_array = (base_data, add_data, mask_data, width, height, result) => {
    const len = width * height * 4;

    if (base_data.length !== len || add_data.length !== len || result.length !== len) {
        throw new Error('data length mismatch');
    }

    const is_mask_single_channel = mask_data.length === width * height;

    if (mask_data.length !== len && !is_mask_single_channel) {
        throw new Error('mask_data length invalid');
    }

    const _2_255 = 0.00784313725490196; // 2/255
    const _127_5 = 127.5;
    const y_sign = 1;

    for (let i = 0; i < len; i += 4) {
        const mask_index = is_mask_single_channel ? i >> 2 : i;
        const intensity = mask_data[mask_index] * 0.00392156862745098;

        // Decode normals from [0,255] to [-1,1]
        const base_x = base_data[i] * _2_255 - 1.0;
        const base_y = (base_data[i + 1] * _2_255 - 1.0) * y_sign;
        const base_z = base_data[i + 2] * _2_255 - 1.0;

        const add_x = add_data[i] * _2_255 - 1.0;
        const add_y = (add_data[i + 1] * _2_255 - 1.0) * y_sign;
        const add_z = add_data[i + 2] * _2_255 - 1.0;

        let result_x = base_x;
        let result_y = base_y;
        let result_z = base_z;

        const axis_x = -add_y;
        const axis_y = add_x;
        const axis_len_sq = axis_x * axis_x + axis_y * axis_y;

        if (axis_len_sq > 1e-12) {
            const axis_len_inv = 1.0 / Math.sqrt(axis_len_sq);
            const n_axis_x = axis_x * axis_len_inv;
            const n_axis_y = axis_y * axis_len_inv;

            const dot_product = add_z;
            const clamped_dot = dot_product < -1.0 ? -1.0 : dot_product > 1.0 ? 1.0 : dot_product;
            const angle = Math.acos(clamped_dot) * intensity;

            if (angle > 1e-6) {
                const cos_a = Math.cos(angle);
                const sin_a = Math.sin(angle);
                const k = 1.0 - cos_a;

                const ux = n_axis_x, uy = n_axis_y;
                const x = base_x, y = base_y, z = base_z;

                const ux2 = ux * ux, uy2 = uy * uy, ux_uy = ux * uy;

                const rx = x * (cos_a + ux2 * k) + y * (ux_uy * k) + z * (uy * sin_a);
                const ry = x * (ux_uy * k) + y * (cos_a + uy2 * k) + z * (-ux * sin_a);
                const rz = x * (-uy * sin_a) + y * (ux * sin_a) + z * cos_a;

                const len_sq = rx * rx + ry * ry + rz * rz;
                if (len_sq > 1e-12) {
                    const len_inv = 1.0 / Math.sqrt(len_sq);
                    result_x = rx * len_inv;
                    result_y = ry * len_inv;
                    result_z = rz * len_inv;
                }
            }
        }

        // Encode back to [0,255] - use same formula as decoding but in reverse
        result[i] = (result_x + 1.0) * _127_5;
        result[i + 1] = (result_y * y_sign + 1.0) * _127_5;
        result[i + 2] = (result_z + 1.0) * _127_5;

        // Blend alpha channel
        const base_alpha = base_data[i + 3];
        const add_alpha = add_data[i + 3];
        result[i + 3] = (1.0 - intensity) * base_alpha + intensity * add_alpha;
    }

    return result;
};

/**
 * Resizes image data using OffscreenCanvas
 * @param {ImageData|Uint8ClampedArray} src_data - Source image data array or ImageData object
 * @param {number} src_width - Source image width
 * @param {number} src_height - Source image height
 * @param {number} target_width - Target image width
 * @param {number} target_height - Target image height
 * @param {boolean} smooth - Smooth option
 * @returns {ImageData} Resized image data
 */
export const resize_img_canv = (src_data, src_width, src_height, target_width, target_height, smooth = true) => {
    const tgt_canvas = new OffscreenCanvas(target_width, target_height);
    const tgt_ctx = tgt_canvas.getContext('2d');

    if (smooth) {
        tgt_ctx.imageSmoothingEnabled = true;
        tgt_ctx.imageSmoothingQuality = 'high';
    } else {
        tgt_ctx.imageSmoothingEnabled = false;
    }

    const src_img_data = src_data instanceof ImageData ? src_data : new ImageData(src_data, src_width, src_height);

    const src_canvas = new OffscreenCanvas(src_width, src_height);
    const src_ctx = src_canvas.getContext('2d');
    src_ctx.putImageData(src_img_data, 0, 0);

    tgt_ctx.drawImage(src_canvas, 0, 0, target_width, target_height);

    return tgt_ctx.getImageData(0, 0, target_width, target_height);
};

/**
 * Calculates next step size towards target using power-of-two scaling
 * @param {number} current - Current step size
 * @param {number} target - Target step size
 * @returns {number} Next step size
 */
export const next_step_size = (current, target) =>
    current > target ?
        ((current >> 1) < target ? target : current >> 1) :
        ((current << 1) > target ? target : current << 1);

/**
 * Returns blank pixel array element value
 * @param {any} _ - Unused index placeholder
 * @param {number} i - Index of element in array
 * @returns {number} Pixel channel value
 */
export const blank_pixel = (_, i) => (i & 3) === 3 ? 255 : 0;

/**
 * Creates blank RGBA image data array with full alpha channel
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @param {number} color - Color value for RGB channels
 * @returns {Uint8ClampedArray} RGBA pixel data with alpha set to 255
 */
export const blank_image_data = (width, height, color = 0) => {
    const data = new Uint8ClampedArray(width * height * 4);
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
        data[i] = color;
        data[i + 1] = color;
        data[i + 2] = color;
        data[i + 3] = 255;
    }

    return data;
};

/**
 * Generates a high-quality normal map from a height map array, minimizing artifacts like horizontal stripes.
 * @param {Uint8ClampedArray} height_map - Input height map as a Uint8ClampedArray (RGBA).
 * @param {number} width - Width of the height map.
 * @param {number} height - Height of the height map.
 * @param {Object} [options={}] - Configuration options.
 * @param {number} [options.strength=2.0] - Strength of the normal map effect (affects gradient intensity).
 * @param {boolean} [options.invert_red=false] - Inverts the red (X) channel.
 * @param {boolean} [options.invert_green=true] - Inverts the green (Y) channel.
 * @param {number} [options.smoothing=2] - Smoothing level (0 = none, 1 = light, 2 = medium).
 * @param {boolean} [options.use_scharr=true] - Use Scharr filter for enhanced gradient quality.
 * @param {number} [options.sample_scale=1.0] - Scale for potential supersampling (unused).
 * @returns {Uint8ClampedArray} - Normal map as a Uint8ClampedArray (RGBA).
 */
export const normal_from_height_map_array = (height_map, width, height, options = {}) => {
    // Destructure options with defaults
    const {
        strength = 5.0,
        invert_red = false,
        invert_green = true,
        smoothing = 2,
        use_scharr = true
    } = options;

    // Precompute all constants
    const normal_map = new Uint8ClampedArray(width * height * 4);
    const width4 = width << 2;
    const max_x = width - 1;
    const max_y = height - 1;

    // Precompute kernel configurations
    const kernel_5 = new Float32Array([1, 4, 6, 4, 1, 4, 16, 24, 16, 4, 6, 24, 36, 24, 6, 4, 16, 24, 16, 4, 1, 4, 6, 4, 1]);
    const kernel_3 = new Float32Array([1, 2, 1, 2, 4, 2, 1, 2, 1]);

    const kernel_div = smoothing === 2 ? 256 : 16;
    const kernel = smoothing === 2 ? kernel_5 : smoothing === 1 ? kernel_3 : null;
    const kernel_size = smoothing === 2 ? 5 : smoothing === 1 ? 3 : 0;
    const kernel_radius = kernel_size >> 1;

    // Precompute gradient multipliers
    const scharr_multiplier = use_scharr ? 0.35 : 1.0;
    const strength_scharr = strength * scharr_multiplier;


    // Precompute smoothed height map if needed
    let smoothed_heights;
    if (kernel) {
        smoothed_heights = new Float32Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let ki = 0;
                for (let ky = -kernel_radius; ky <= kernel_radius; ky++) {
                    const my = clamp(y + ky, 0, max_y);
                    const row_offset = my * width4;
                    for (let kx = -kernel_radius; kx <= kernel_radius; kx++) {
                        const mx = clamp(x + kx, 0, max_x);
                        sum += height_map[row_offset + (mx << 2)] * (1 / 255) * kernel[ki++];
                    }
                }
                smoothed_heights[y * width + x] = sum / kernel_div;
            }
        }
    }

    // Main processing loop - optimized for cache coherence
    for (let y = 0; y < height; y++) {
        const y_index = y * width;
        const y_index4 = y * width4;

        for (let x = 0; x < width; x++) {
            const index = y_index4 + (x << 2);

            // Get smoothed heights for 3x3 neighborhood with proper boundary checking
            const get_height_val = (dx, dy) => {
                const nx = clamp(x + dx, 0, max_x);
                const ny = clamp(y + dy, 0, max_y);
                if (kernel) {
                    return smoothed_heights[ny * width + nx];
                } else {
                    return height_map[ny * width4 + (nx << 2)] * (1 / 255);
                }
            };

            // Get all surrounding pixels for gradient calculation
            const s0 = get_height_val(-1, -1);
            const s1 = get_height_val(0, -1);
            const s2 = get_height_val(1, -1);
            const s3 = get_height_val(-1, 0);
            const s5 = get_height_val(1, 0);
            const s6 = get_height_val(-1, 1);
            const s7 = get_height_val(0, 1);
            const s8 = get_height_val(1, 1);

            // Compute gradients with precomputed coefficients
            let d_x, d_y;
            if (use_scharr) {
                d_x = (-3 * s0 + 3 * s2 - 10 * s3 + 10 * s5 - 3 * s6 + 3 * s8) * strength_scharr;
                d_y = (-3 * s0 - 10 * s1 - 3 * s2 + 3 * s6 + 10 * s7 + 3 * s8) * strength_scharr;
            } else {
                d_x = (-s0 + s2 - 2 * s3 + 2 * s5 - s6 + s8) * strength_scharr;
                d_y = (-s0 - 2 * s1 - s2 + s6 + 2 * s7 + s8) * strength_scharr;
            }

            // Apply inversion flags
            let nx = -d_x;
            let ny = -d_y;
            if (invert_red) nx = -nx;
            if (invert_green) ny = -ny;

            // Compute normal with proper normalization
            const len_sq = nx * nx + ny * ny + 1;

            // Handle edge case where length is too small
            if (len_sq < 1e-8) {
                normal_map[index] = 128;
                normal_map[index + 1] = 128;
                normal_map[index + 2] = 255;
                normal_map[index + 3] = 255;
                continue;
            }

            const len_inv = 1 / Math.sqrt(len_sq);

            // Convert to RGB and store (normal map format: X=R, Y=G, Z=B)
            normal_map[index] = (nx * len_inv * 0.5 + 0.5) * 255;
            normal_map[index + 1] = (ny * len_inv * 0.5 + 0.5) * 255;
            normal_map[index + 2] = (len_inv * 0.5 + 0.5) * 255;
            normal_map[index + 3] = 255;
        }
    }

    return normal_map;
};

/**
 * Converts canvas to blob efficiently with configurable format and quality
 * @param {HTMLCanvasElement} canvas - Source canvas element
 * @param {string} mime_type - Output format ('png', 'jpeg', 'webp', or 'auto')
 * @param {number} quality - Compression quality from 0.0 to 1.0
 * @returns {Promise<Blob>} Promise resolving to image blob
 */
export const canvas_to_blob = (canvas, mime_type = 'png', quality = 1.0) => {
    if (!canvas || !canvas.toBlob && !canvas.toDataURL) return Promise.reject(new TypeError('Invalid canvas element'));

    const q = quality < 0 ? 0 : quality > 1 ? 1 : quality;
    let type = mime_type;

    if (type === 'auto') {
        try {
            const ctx = canvas.getContext('2d');
            const img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            type = has_transparency(img_data.data) ? 'png' : 'jpeg';
        } catch {
            type = 'png';
        }
    }

    const mime = `image/${type}`;

    if (canvas.toBlob) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob returned null')), mime, q);
        });
    }

    const data_url = canvas.toDataURL(mime, q);
    return fetch(data_url).then(r => r.blob());
};

/**
 * Converts canvas to PNG blob
 * @param {HTMLCanvasElement} canvas - Source canvas element
 * @returns {Promise<Blob>} PNG blob
 */
const canvas_to_png = (canvas) => canvas_to_blob(canvas, 'png', 1.0);

/**
 * Converts canvas to JPEG blob with specified quality
 * @param {HTMLCanvasElement} canvas - Source canvas element
 * @param {number} [quality=0.92] - JPEG quality (0.0 to 1.0)
 * @returns {Promise<Blob>} JPEG blob
 */
const canvas_to_jpeg = (canvas, quality = 0.92) => canvas_to_blob(canvas, 'jpeg', quality);

/**
 * Converts canvas to WebP blob with specified quality
 * @param {HTMLCanvasElement} canvas - Source canvas element
 * @param {number} [quality=0.80] - WebP quality (0.0 to 1.0)
 * @returns {Promise<Blob>} WebP blob
 */
const canvas_to_webp = (canvas, quality = 0.80) => canvas_to_blob(canvas, 'webp', quality);

/**
 * scaling function using nearest-neighbor sampling
 * @param {Uint8ClampedArray} src_data - Source pixel data in RGBA format
 * @param {number} src_width - Source image width in pixels
 * @param {number} src_height - Source image height in pixels  
 * @param {number} target_width - Target image width in pixels
 * @param {number} target_height - Target image height in pixels
 * @returns {Uint8ClampedArray} - Scaled pixel data in RGBA format
 */
export const scale_image_array = (src_data, src_width, src_height, target_width, target_height) => {
    const target_size = target_width * target_height;
    const target_data = new Uint8ClampedArray(target_size << 2);

    // Precompute all constants outside loops
    const width_ratio = src_width / target_width;
    const height_ratio = src_height / target_height;
    const src_width4 = src_width << 2;
    const target_width4 = target_width << 2;
    const max_src_x = (src_width - 1) | 0;
    const max_src_y = (src_height - 1) | 0;

    let target_index = 0;
    let src_y_prev = -1;
    let src_y_offset = 0;

    // Unrolled loop strategy with minimal calculations
    for (let y = 0; y < target_height; y++) {
        const src_y = Math.min((y * height_ratio) | 0, max_src_y);

        // Only recalculate Y offset when Y changes
        if (src_y !== src_y_prev) {
            src_y_offset = src_y * src_width4;
            src_y_prev = src_y;
        }

        const row_target_index = target_index;

        // Process row with minimal operations
        for (let x = 0; x < target_width; x++) {
            const src_x = Math.min((x * width_ratio) | 0, max_src_x);
            const src_index = src_y_offset + (src_x << 2);

            // Direct memory copy for maximum speed
            target_data[target_index++] = src_data[src_index];
            target_data[target_index++] = src_data[src_index + 1];
            target_data[target_index++] = src_data[src_index + 2];
            target_data[target_index++] = src_data[src_index + 3];
        }

        // Verify we're at the correct position for next row
        target_index = row_target_index + target_width4;
    }

    return target_data;
};
