

import { kind_of } from "../../functions.js";
import { error, type_error } from "../../error.js";
import { image_class, img_format as image_format, convert_image_format } from "./image.js";
import { sizei } from "../gui/size.js";

// =============================================================================
// CONSTANTS
// =============================================================================

const MIME_PATTERNS = {
    apng: /\.apng$/i,
    avif: /\.avif$/i,
    jpeg: /\.(jpg|jpeg|jfif|pjpeg|pjp)$/i,
    png: /\.png$/i,
    svg: /\.svg$/i,
    webp: /\.webp$/i,
    bmp: /\.bmp$/i,
    icon: /\.(ico|cur)$/i,
    tiff: /\.(tif|tiff)$/i,
};

const ALPHA_MAX = 255;
const TRANSPARENCY_THRESHOLD = 254;

// Hash constants (MurmurHash3 inspired)
const HASH_C1 = 0xcc9e2d51;
const HASH_C2 = 0x1b873593;
const HASH_R1 = 15;
const HASH_R2 = 13;
const HASH_M = 5;
const HASH_N = 0xe6546b64;
const HASH_FINAL1 = 0x85ebca6b;
const HASH_FINAL2 = 0xc2b2ae35;

// =============================================================================
// MIME TYPE SERVICE
// =============================================================================

/**
 * Service for determining image MIME types from URLs.
 */
export class image_mime_class {
    /**
     * Extracts MIME subtype from a URL or uri object.
     * @param {string|uri} url - The image URL.
     * @returns {string} MIME subtype (e.g., 'png', 'jpeg').
     * @throws {error} If extension is unknown.
     */
    static from_url(url) {
        const path = kind_of(url) === 'uri' ? url.path : String(url);
        for (const [mime, pattern] of Object.entries(MIME_PATTERNS)) {
            if (pattern.test(path)) return mime;
        }
        throw new error(`Unknown image type for URL: ${path}`);
    }
}

// =============================================================================
// HASH CALCULATOR
// =============================================================================

/**
 * Service for computing 32-bit hashes from pixel data.
 */
export class image_hash_calculator_class {
    /**
     * Computes a hash from pixel data and dimensions.
     * @param {Uint8ClampedArray|Uint16Array|Uint32Array} pixels - Pixel array.
     * @param {number} width - Image width.
     * @param {number} height - Image height.
     * @returns {number} Unsigned 32-bit hash.
     */
    static calculate(pixels, width, height) {
        let hash = 0;

        // Mix dimensions
        hash ^= (width ^ (width >>> 16)) * HASH_C1;
        hash ^= (height ^ (height >>> 16)) * HASH_C1;

        const len = pixels.length;
        for (let i = 0; i < len; i += 8) {
            for (let j = 0; j < 8; j++) {
                const idx = i + j;
                if (idx >= len) break;

                let v = pixels[idx];
                v ^= (v >>> 16);
                v = (v * HASH_C1) ^ ((v >>> HASH_R1) * HASH_C2);
                hash ^= v;
                hash = (hash << HASH_R2) | (hash >>> (32 - HASH_R2));
                hash = hash * HASH_M + HASH_N;
            }
        }

        hash ^= len;
        hash ^= (hash >>> 16);
        hash = (hash * HASH_FINAL1) ^ (hash >>> 13);
        hash = (hash * HASH_FINAL2) ^ (hash >>> 16);

        return hash >>> 0;
    }
}

// =============================================================================
// IMAGE LOADER (Factory)
// =============================================================================

/**
 * Factory for creating image_class instances from various sources.
 * All methods return Promises that resolve with the populated image.
 */
export class image_loader_class {
    /**
     * Loads an image from a URL.
     * @param {image_class} target - The image object to populate.
     * @param {string} url - Image URL.
     * @param {number} [target_format=image_format.rgba_8] - Desired format.
     * @returns {Promise<image_class>} The populated image.
     */
    static async from_url(target, url, target_format = image_format.rgba_8) {
        this._validate_target(target);
        target.url = url; // sets name and mime

        const img_element = await this._load_html_image(url);
        const canvas = this._create_canvas_from_element(img_element);
        return this.from_canvas(target, canvas, target_format);
    }

    /**
     * Loads an image from an HTML element (img, video, etc.).
     * @param {image_class} target - The image object to populate.
     * @param {HTMLImageElement|HTMLVideoElement} element - Source element.
     * @param {number} [target_format=image_format.rgba_8] - Desired format.
     * @returns {Promise<image_class>} The populated image.
     */
    static async from_element(target, element, target_format = image_format.rgba_8) {
        this._validate_target(target);
        const canvas = this._create_canvas_from_element(element);
        return this.from_canvas(target, canvas, target_format);
    }

    /**
     * Loads an image from a canvas element.
     * @param {image_class} target - The image object to populate.
     * @param {HTMLCanvasElement} canvas - Source canvas.
     * @param {number} [target_format=image_format.rgba_8] - Desired format.
     * @returns {Promise<image_class>} The populated image.
     */
    static async from_canvas(target, canvas, target_format = image_format.rgba_8) {
        this._validate_target(target);
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new type_error('canvas must be an HTMLCanvasElement');
        }

        const ctx = canvas.getContext('2d');
        const image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const size = new sizei(canvas.width, canvas.height);

        return this.from_data(target, image_data.data, size, image_format.rgba_8, target_format);
    }

    /**
     * Initializes an image from raw pixel data.
     * @param {image_class} target - The image object to populate.
     * @param {ArrayLike<number>} src_data - Pixel data in source format.
     * @param {sizei} src_size - Dimensions of the source.
     * @param {number} src_format - Format of src_data.
     * @param {number} target_format - Desired final format.
     * @returns {Promise<image_class>} The populated image.
     */
    static async from_data(target, src_data, src_size, src_format, target_format) {
        this._validate_target(target);
        if (!(src_size instanceof sizei)) {
            throw new type_error('src_size must be a sizei');
        }

        target.size = src_size;
        target.format = src_format;
        target.init_pixels(src_data);

        if (src_format !== target_format) {
            convert_image_format(target, target_format);
        }

        return target;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    static _validate_target(target) {
        if (!(target instanceof image_class)) {
            throw new type_error('target must be an image_class');
        }
    }

    static _load_html_image(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new error(`Failed to load image from URL: ${url}`));
            img.src = url;
        });
    }

    static _create_canvas_from_element(element) {
        const canvas = document.createElement('canvas');
        canvas.width = element.naturalWidth || element.clientWidth || element.width;
        canvas.height = element.naturalHeight || element.clientHeight || element.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(element, 0, 0);
        return canvas;
    }
}

// =============================================================================
// IMAGE PROCESSOR (Operations returning new images)
// =============================================================================

/**
 * Provides operations that transform images and return new instances.
 */
export class image_processor_class {
    /**
     * Extracts a rectangular sub‑section of an image.
     * @param {image_class} source - Source image.
     * @param {Object} rect - Rectangle {x, y, width, height}.
     * @param {image_class} [target] - Optional target image (must match format and size).
     * @returns {image_class} The sub‑image (new instance if target not provided).
     */
    static sub_section(source, rect, target = null) {
        if (!(source instanceof image_class)) {
            throw new type_error('source must be an image_class');
        }
        this._validate_rect(rect, source);

        if (target === null) {
            target = new image_class({
                width: rect.width,
                height: rect.height,
                format: source.format,
            });
        } else {
            if (!(target instanceof image_class)) {
                throw new type_error('target must be an image_class or null');
            }
            if (target.format !== source.format) {
                throw new error('target image format does not match source');
            }
            if (target.width !== rect.width || target.height !== rect.height) {
                throw new error('target image size does not match rectangle');
            }
        }

        this._copy_pixel_block(source, rect, target);
        target.recalc_hash();
        return target;
    }

    /**
     * Creates a new image with alpha values clamped to a maximum.
     * If the source has no alpha, it is converted to RGBA_8 first.
     * @param {image_class} source - Source image.
     * @param {number} max_alpha - Maximum allowed alpha (0-255).
     * @returns {image_class} New image with clamped alpha.
     */
    static clamp_alpha(source, max_alpha) {
        if (!(source instanceof image_class)) {
            throw new type_error('source must be an image_class');
        }
        if (max_alpha < 0 || max_alpha > ALPHA_MAX) {
            throw new error(`max_alpha must be between 0 and ${ALPHA_MAX}`);
        }

        // Clone the source
        const result = new image_class({
            width: source.width,
            height: source.height,
            format: source.format,
            data: source.pixels.slice(),
        });

        // Ensure alpha channel exists
        const has_alpha = result.channel_count === 2 || result.channel_count === 4;
        if (!has_alpha) {
            convert_image_format(result, image_format.rgba_8);
        }

        // Clamp the last channel of each pixel
        const pixels = result.pixels;
        const channels = result.channel_count;
        for (let i = channels - 1; i < pixels.length; i += channels) {
            pixels[i] = Math.min(pixels[i], max_alpha);
        }

        result.recalc_hash();
        return result;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    static _validate_rect(rect, image) {
        const { x, y, width, height } = rect;
        if (x < 0 || y < 0 || x + width > image.width || y + height > image.height) {
            throw new error('Rectangle is out of image bounds');
        }
    }

    static _copy_pixel_block(source, rect, target) {
        const src_pixels = source.pixels;
        const dst_pixels = target.pixels;
        const channels = source.channel_count;
        const src_width = source.width;
        const dst_width = rect.width;

        for (let row = 0; row < rect.height; row++) {
            const src_row = rect.y + row;
            const src_start = (src_row * src_width + rect.x) * channels;
            const dst_start = row * dst_width * channels;
            const copy_length = rect.width * channels;
            const slice = src_pixels.slice(src_start, src_start + copy_length);
            dst_pixels.set(slice, dst_start);
        }
    }
}

// =============================================================================
// IMAGE EXPORTER (Presentation & Download)
// =============================================================================

/**
 * Handles conversion of image_class to DOM elements and file downloads.
 */
export class image_exporter_class {
    /**
     * Converts an image to an HTML img element and appends it to a parent.
     * @param {HTMLElement} parent - Parent node.
     * @param {image_class} image - Source image.
     * @param {string} [format='image/png'] - MIME type for data URL.
     * @returns {HTMLImageElement} The created img element.
     */
    static to_element(parent, image, format = 'image/png') {
        this._validate_image(image);
        if (!(parent instanceof HTMLElement)) {
            throw new type_error('parent must be an HTMLElement');
        }

        const canvas = this._image_to_canvas(image);
        const data_url = canvas.toDataURL(format);

        const img_elem = document.createElement('img');
        img_elem.id = image.id;
        img_elem.width = image.width;
        img_elem.height = image.height;
        img_elem.src = data_url;
        img_elem.dataset.name = image.name;
        img_elem.dataset.type = image.mime;

        parent.appendChild(img_elem);
        return img_elem;
    }

    /**
     * Triggers a download of the image as a PNG file.
     * @param {image_class} image - Source image.
     * @returns {Promise<void>}
     */
    static async save(image) {
        this._validate_image(image);
        const canvas = this._image_to_canvas(image);
        const data_url = canvas.toDataURL('image/png');
        const download_name = image.name || 'image.png';

        const link = document.createElement('a');
        link.download = download_name;
        link.href = data_url.replace('image/png', 'image/octet-stream');
        link.click();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    static _validate_image(image) {
        if (!(image instanceof image_class)) {
            throw new type_error('image must be an image_class');
        }
    }

    static _image_to_canvas(image) {
        const canv = document.createElement('canvas');
        canv.width = image.width;
        canv.height = image.height;
        const ctx = canv.getContext('2d');
        ctx.putImageData(image.image_data, 0, 0);
        return canv;
    }
}

// =============================================================================
// STANDALONE UTILITIES (Pure functions, kept for backward compatibility)
// =============================================================================

/**
 * Loads an image file and returns an HTMLImageElement.
 * @param {File} file - Image file.
 * @returns {Promise<HTMLImageElement>}
 */
export const load_image_file = (file) => {
    if (!(file instanceof File)) {
        return Promise.reject(new type_error('file must be a File'));
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const object_url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(object_url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(object_url);
            reject(new error('Failed to load image file'));
        };
        img.src = object_url;
    });
};

/**
 * Checks if an RGBA image data array contains any transparent pixels.
 * @param {Uint8ClampedArray} image_data - RGBA pixel data.
 * @returns {boolean} True if any alpha < 254.
 */
export const has_transparency = (image_data) => {
    if (!(image_data instanceof Uint8ClampedArray)) {
        throw new type_error('image_data must be a Uint8ClampedArray');
    }

    const len = image_data.length;
    // Adaptive step size for performance
    const step = len > 1048576 ? 128 : len > 262144 ? 64 : len > 16384 ? 32 : 4;

    for (let i = 3; i < len; i += step) {
        if (image_data[i] < TRANSPARENCY_THRESHOLD) return true;
    }
    return false;
};

/**
 * Creates a blank RGBA image data array with full alpha.
 * @param {number} width - Image width.
 * @param {number} height - Image height.
 * @param {number} [color=0] - Grayscale value for RGB channels.
 * @returns {Uint8ClampedArray} Filled pixel array.
 */
export const blank_image_data = (width, height, color = 0) => {
    const data = new Uint8ClampedArray(width * height * 4);
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
        data[i] = color;
        data[i + 1] = color;
        data[i + 2] = color;
        data[i + 3] = ALPHA_MAX;
    }

    return data;
};

// =============================================================================
// BACKWARD COMPATIBILITY ALIASES (wrapped to preserve context)
// =============================================================================

export const image_mimetype = (url) => image_mime_class.from_url(url);
export const calculate_image_hash = (pixels, width, height) =>
    image_hash_calculator_class.calculate(pixels, width, height);
export const image_sub_section = (source, rect, target) =>
    image_processor_class.sub_section(source, rect, target);
export const image_clamped_alpha = (source, max_alpha) =>
    image_processor_class.clamp_alpha(source, max_alpha);
export const image_from_url = (target, url, target_format) =>
    image_loader_class.from_url(target, url, target_format);
export const image_from_elem = (target, element, target_format) =>
    image_loader_class.from_element(target, element, target_format);
export const image_from_canv = (target, canvas, target_format) =>
    image_loader_class.from_canvas(target, canvas, target_format);
export const image_from_data = (target, src_data, src_size, src_format, target_format) =>
    image_loader_class.from_data(target, src_data, src_size, src_format, target_format);
export const image_to_elem = (parent, image, format) =>
    image_exporter_class.to_element(parent, image, format);
export const image_save = (image) => image_exporter_class.save(image);
