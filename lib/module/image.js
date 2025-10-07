
import { cross, dot, normalize, rotate_vector } from "./math.js";

/**
 * Calculates the cubic interpolation weight for a given input using a piecewise cubic polynomial.
 * @param {number} x - Input value.
 * @returns {number} Interpolation weight.
 */
export const cubic = x => {
    x = Math.abs(x);
    return x <= 1 ? 1.5 * x * x * x - 2.5 * x * x + 1 :
        x <= 2 ? -0.5 * x * x * x + 2.5 * x * x - 4 * x + 2 : 0;
};

/**
 * Performs 1D cubic interpolation for bicubic.
 * @param {number} t - Fractional offset.
 * @param {number} a - Value at -1.
 * @param {number} b - Value at 0.
 * @param {number} c - Value at 1.
 * @param {number} d - Value at 2.
 * @returns {number} Interpolated value.
 */
export const terp = (t, a, b, c, d) => {
    if (
        ![t, a, b, c, d].every(v =>
            (typeof v === 'number' && isFinite(v)) || typeof v === 'boolean'
        )
    ) return NaN;

    t = +t;
    a = +a;
    b = +b;
    c = +c;
    d = +d;

    const t2 = t * t;
    return (
        b +
        0.5 *
        (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a))) *
        t
    );
};

/**
 * Retrieves a normalized pixel channel value from image data.
 * @param {Uint8ClampedArray} src_data - Source image data array.
 * @param {number} src_width - Width of the image in pixels.
 * @param {number} src_height - Height of the image in pixels.
 * @param {number} px - X-coordinate of the pixel.
 * @param {number} py - Y-coordinate of the pixel.
 * @param {number} channel - Color channel index (0: red, 1: green, 2: blue, 3: alpha).
 * @returns {number} Normalized channel value in [0, 1].
 */
export const get_pixel = (src_data, src_width, src_height, px, py, channel) => {
    px = Math.max(0, Math.min(src_width - 1, px));
    py = Math.max(0, Math.min(src_height - 1, py));
    return src_data[(py * src_width + px) * 4 + channel] * 0.00392156862745098; // 1/255
};

/**
 * Interpolates a row value for a pixel using cubic interpolation.
 * @param {Uint8ClampedArray} src_data - Source image data array.
 * @param {number} src_width - Width of the source image.
 * @param {number} src_height - Height of the source image.
 * @param {number} px - X-coordinate of the pixel.
 * @param {number} py - Y-coordinate of the pixel.
 * @param {number} dx - Fractional distance for interpolation.
 * @param {number} channel - Color channel index to interpolate.
 * @returns {number} Interpolated pixel value clamped to [0, 1].
 */
export const interpolate_row = (src_data, src_width, src_height, px, py, dx, channel) => {
    const c0 = cubic(dx + 1);
    const c1 = cubic(dx);
    const c2 = cubic(dx - 1);
    const c3 = cubic(dx - 2);
    const value = (
        get_pixel(src_data, src_width, src_height, px - 1, py, channel) * c0 +
        get_pixel(src_data, src_width, src_height, px, py, channel) * c1 +
        get_pixel(src_data, src_width, src_height, px + 1, py, channel) * c2 +
        get_pixel(src_data, src_width, src_height, px + 2, py, channel) * c3
    );
    return Math.max(0, Math.min(1, value)); // Clamp to prevent NaN or out-of-range values
};

/**
 * Performs bicubic interpolation for a pixel and channel.
 * @param {Uint8ClampedArray} src_data - Source image data array.
 * @param {number} src_width - Width of the source image.
 * @param {number} src_height - Height of the source image.
 * @param {number} px - Target pixel x-coordinate.
 * @param {number} py - Target pixel y-coordinate.
 * @param {number} dx - X-axis fractional offset.
 * @param {number} dy - Y-axis fractional offset.
 * @param {number} channel - Color channel index (0: red, 1: green, 2: blue, 3: alpha).
 * @returns {number} Interpolated pixel value clamped to [0, 1].
 */
export const bicubic_interpolate = (src_data, src_width, src_height, px, py, dx, dy, channel) => {
    const cy0 = cubic(dy + 1);
    const cy1 = cubic(dy);
    const cy2 = cubic(dy - 1);
    const cy3 = cubic(dy - 2);
    const value = (
        interpolate_row(src_data, src_width, src_height, px, py - 1, dx, channel) * cy0 +
        interpolate_row(src_data, src_width, src_height, px, py, dx, channel) * cy1 +
        interpolate_row(src_data, src_width, src_height, px, py + 1, dx, channel) * cy2 +
        interpolate_row(src_data, src_width, src_height, px, py + 2, dx, channel) * cy3
    );
    return Math.max(0, Math.min(1, value)); // Clamp to prevent NaN or out-of-range values
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
 * Retrieves pixel data from a specified region of an image using OffscreenCanvas.
 * Throws error if input parameters are invalid or if reading image data fails.
 * @param {HTMLImageElement} img - source image
 * @param {number} x - x coordinate of the rectangle's top-left corner
 * @param {number} y - y coordinate of the rectangle's top-left corner
 * @param {number} width - width of the rectangle to extract
 * @param {number} height - height of the rectangle to extract
 * @returns {Uint8ClampedArray} pixel data of the extracted image area
 */
export const get_image_data = (img, x, y, width, height) => {
    if (
        !img || typeof img.width !== 'number' || typeof img.height !== 'number' ||
        !Number.isInteger(x) || !Number.isInteger(y) ||
        !Number.isInteger(width) || !Number.isInteger(height) ||
        x < 0 || y < 0 || width <= 0 || height <= 0 ||
        x + width > img.width || y + height > img.height
    ) {
        throw new Error('invalid input parameters or out of bounds');
    }

    const canvas = new OffscreenCanvas(img.width, img.height);
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, img.width, img.height);

    try {
        return ctx.getImageData(x, y, width, height).data;
    } catch {
        throw new Error('error reading image data. the image may be corrupted.');
    }
};

/**
 * Loads an image file and returns an Image object when loaded.
 * Cleans up the object URL after load or error.
 * @param {File} file - The image file to load.
 * @returns {Promise<HTMLImageElement>} Promise that resolves with the Image object on success, rejects on failure.
 */
export const load_image = file =>
    new Promise((resolve, reject) => {
        if (!file || !(file instanceof File)) {
            reject(new Error('no file provided'));
            return;
        }

        const img = new Image();
        const object_url = URL.createObjectURL(file);

        const cleanup = () => {
            if (object_url) {
                URL.revokeObjectURL(object_url);
            }
        };

        img.onload = () => {
            cleanup();
            resolve(img);
        };
        img.onerror = () => {
            cleanup();
            reject(new Error('failed to load image'));
        };
        img.onabort = () => {
            cleanup();
            reject(new Error('image loading aborted'));
        };
        img.src = object_url;
    });

/**
 * Checks if a Uint8ClampedArray representing image data contains any transparency.
 * Throws error if input is not a Uint8ClampedArray.
 * @param {Uint8ClampedArray} image_data - The image data in RGBA format.
 * @returns {boolean} True if any pixel has alpha less than 255, false otherwise.
 */
export const has_transparency = image_data => {
    if (!(image_data instanceof Uint8ClampedArray)) {
        throw new TypeError('input must be a Uint8ClampedArray');
    }
    for (let i = 3; i < image_data.length; i += 4) {
        if (image_data[i] < 255) {
            return true;
        }
    }
    return false;
};

/**
 * Merge two normal maps with a mask into a result buffer using optimized vector math.
 *
 * @param {Uint8Array} base_data - Base normal map buffer (RGBA)
 * @param {Uint8Array} add_data - Additional normal map buffer to merge (RGBA)
 * @param {Uint8Array} mask_data - Mask buffer controlling merge blending (single channel or RGBA)
 * @param {number} width - Width of the maps
 * @param {number} height - Height of the maps
 * @param {Uint8Array} result - Output buffer to write merged normal map (RGBA)
 * @returns {Uint8Array} The merged normal map buffer
 */
export const merge_normal_array = (base_data, add_data, mask_data, width, height, result) => {
    const y_sign = 1;
    const len = width * height * 4;
    const z_axis_x = 0, z_axis_y = 0, z_axis_z = 1;

    for (let i = 0; i < len; i += 4) {
        // Decode base normal from [0,255] to [-1,1]
        const base_x = base_data[i] / 127.5 - 1;
        const base_y = y_sign * (base_data[i + 1] / 127.5 - 1);
        const base_z = base_data[i + 2] / 127.5 - 1;

        // Decode add normal
        const add_x = add_data[i] / 127.5 - 1;
        const add_y = y_sign * (add_data[i + 1] / 127.5 - 1);
        const add_z = add_data[i + 2] / 127.5 - 1;

        // Intensity from mask alpha channel (or red if alpha not present)
        const intensity = mask_data[i] / 255;

        // Compute rotation axis and angle
        let axis = cross(z_axis_x, z_axis_y, z_axis_z, add_x, add_y, add_z);
        const axis_len = axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2];

        const dot_product = Math.min(Math.max(dot(z_axis_x, z_axis_y, z_axis_z, add_x, add_y, add_z), -1), 1);
        const angle = Math.acos(dot_product);

        let res_x = base_x,
            res_y = base_y,
            res_z = base_z;

        // Only rotate if axis is valid and angle is significant
        if (axis_len > 1e-10 && angle > 1e-4) {
            axis = normalize(axis[0], axis[1], axis[2]);
            [res_x, res_y, res_z] = rotate_vector(res_x, res_y, res_z, axis[0], axis[1], axis[2], angle * intensity);
        }

        // Blend alpha channel linearly
        const blended_alpha = Math.round((1 - intensity) * base_data[i + 3] + intensity * add_data[i + 3]);

        // Encode back to [0,255]
        result[i] = (res_x + 1) * 127.5 | 0;
        result[i + 1] = (res_y * y_sign + 1) * 127.5 | 0;
        result[i + 2] = (res_z + 1) * 127.5 | 0;
        result[i + 3] = blended_alpha;
    }

    return result;
};

/**
 * Converts a canvas element to a lossless Blob asynchronously.
 * Uses PNG format if transparency is detected, otherwise uses JPEG with 100% quality.
 *
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas - Canvas to convert
 * @returns {Promise<Blob>} Resolves with a Blob of the canvas content
 */
export const canvas_to_blob = async canvas => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('unable to get canvas 2d context');
    const img_data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const use_png = has_transparency(img_data);
    const mime_type = use_png ? 'image/png' : 'image/jpeg';
    const quality = 1;

    if ('toBlob' in canvas) {
        return new Promise(resolve => canvas.toBlob(resolve, mime_type, quality));
    }

    const data_url = canvas.toDataURL(mime_type, quality);
    const res = await fetch(data_url);
    return res.blob();
};

/**
 * Resizes image data using OffscreenCanvas.
 * @param {ImageData|Uint8ClampedArray} src_data - Source image data array or ImageData object
 * @param {number} src_width - Source image width
 * @param {number} src_height - Source image height
 * @param {number} target_width - Target image width
 * @param {number} target_height - Target image height
 * @param {Boolean} smooth - smooth option
 * @returns {ImageData} Resized image data
 */
export const resize_img_canv = (src_data, src_width, src_height, target_width, target_height, smooth = true) => {
    const src_canvas = new OffscreenCanvas(src_width, src_height);
    const src_ctx = src_canvas.getContext('2d');
    if (src_data instanceof ImageData) {
        src_ctx.putImageData(src_data, 0, 0);
    } else {
        src_ctx.putImageData(new ImageData(src_data, src_width, src_height), 0, 0);
    }

    const tgt_canvas = new OffscreenCanvas(target_width, target_height);
    const tgt_ctx = tgt_canvas.getContext('2d');
    tgt_ctx.imageSmoothingEnabled = smooth;
    tgt_ctx.imageSmoothingQuality = 'high';
    tgt_ctx.drawImage(src_canvas, 0, 0, src_width, src_height, 0, 0, target_width, target_height);

    return tgt_ctx.getImageData(0, 0, target_width, target_height);
};


