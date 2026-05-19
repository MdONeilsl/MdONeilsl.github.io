// image.js - Refactored with proper imports from provided modules
// Core: image_class and pixel_class, all functions work with them.

import { error, type_error } from "../../error.js";
import { kind_of, NULL } from "../../functions.js";
import { array } from "../array.js";
import { canv_set_pixel_ratio, canvas } from "../gui/canvas.js";
import { size_equals, sizei } from "../gui/size.js";
import { new_node } from "../html.js";
import { numb } from "../math/number.js";
import { ctx_draw_img, ctx_get_data } from "../rendering/2d/contex2d.js";
import { uri } from "../system/uri.js";
import { string } from "../text/string.js";

// Import color module for advanced color conversions
import {
    color,
    color_to_grayscale
} from "../gui/color.js";

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------

export const align_center = 0;
export const align_top_left = 1;
export const padding_min = 0;
export const padding_max = 1;
export const save_link_id = string.uid();

// Image formats
const image_format = {
    GRAY8: 0,
    GRAY16: 1,
    RGB8: 2,
    RGBA8: 3,
};

const {
    GRAY8: format_gray8,
    GRAY16: format_gray16,
    RGB8: format_rgb8,
    RGBA8: format_rgba8,
} = image_format;

// Hash constants (MurmurHash3 inspired)
const HASH_C1 = 0xcc9e2d51;
const HASH_C2 = 0x1b873593;
const HASH_R1 = 15;
const HASH_R2 = 13;
const HASH_M = 5;
const HASH_N = 0xe6546b64;
const HASH_FINAL1 = 0x85ebca6b;
const HASH_FINAL2 = 0xc2b2ae35;

// Conversion constants
const U8_TO_U16 = numb.MAX_UINT16 / numb.MAX_UINT8;
const U16_TO_U8 = numb.MAX_UINT8 / numb.MAX_UINT16;
const RGB_MAX = numb.MAX_UINT8 * 3;

// Math constants
const ONE_OVER_255 = 1 / 255;
const TWO_OVER_255 = 2 / 255;
const HALF = 0.5;
const EPSILON = 1e-12;
const MAX_DIM = 8192;

// Normal map generation defaults
const DEFAULT_STRENGTH = 5.0;
const DEFAULT_INVERT_GREEN = true;
const DEFAULT_SMOOTHING = 2;
const DEFAULT_USE_SCHARR = true;

// ----------------------------------------------------------------------
// Pixel class (value object) with color module integration
// ----------------------------------------------------------------------

/**
 * Represents a single pixel in various formats.
 * @class pixel_class
 */
export class pixel_class {
    #length;
    #count;
    #format;
    #view;
    #is_gray;

    /**
     * Creates a pixel.
     * @param {number} format - One of image_format values.
     * @throws {error} If format is unsupported.
     */
    constructor(format = format_rgba8) {
        const spec = this.#get_format_spec(format);
        this.#length = spec.length;
        this.#count = spec.count;
        this.#format = spec.array_type;
        this.#is_gray = spec.is_gray;
        this.#view = new DataView(new ArrayBuffer(this.#length));
    }

    #get_format_spec(format) {
        const specs = {
            [format_gray8]: { length: 1, count: 1, array_type: 'Uint8', is_gray: true },
            [format_gray16]: { length: 2, count: 1, array_type: 'Uint16', is_gray: true },
            [format_rgb8]: { length: 3, count: 3, array_type: 'Uint8', is_gray: false },
            [format_rgba8]: { length: 4, count: 4, array_type: 'Uint8', is_gray: false },
        };
        const spec = specs[format];
        if (!spec) throw new error(`Unsupported image format: ${format}`);
        return spec;
    }

    /** @returns {string} */
    get kind() { return 'pixel'; }

    /** @returns {number} Number of channels (1,3,4) */
    get length() { return this.#count; }

    /** @returns {number} Red or gray value (as uint8) */
    get r() { return this.#view[`get${this.#format}`](0); }
    set r(value) { this.#view[`set${this.#format}`](0, value); }

    /** @returns {number} Green value (or gray if grayscale) */
    get g() { return this.#view[`get${this.#format}`](this.#is_gray ? 0 : 1); }
    set g(value) { this.#view[`set${this.#format}`](this.#is_gray ? 0 : 1, value); }

    /** @returns {number} Blue value (or gray if grayscale) */
    get b() { return this.#view[`get${this.#format}`](this.#is_gray ? 0 : 2); }
    set b(value) { this.#view[`set${this.#format}`](this.#is_gray ? 0 : 2, value); }

    /** @returns {number} Alpha channel (if exists) */
    get a() {
        if (this.#view.byteLength < 4) throw new error('No alpha channel in this pixel format.');
        return this.#view.getUint8(3);
    }
    set a(value) {
        if (this.#view.byteLength < 4) throw new error('No alpha channel in this pixel format.');
        this.#view.setUint8(3, value);
    }

    /** @returns {number} Grayscale value (average of RGB) */
    get gray() {
        let sum = 0;
        const max = Math.min(this.#count, 3);
        for (let i = 0; i < max; i++) sum += this.#view[`get${this.#format}`](i);
        return Math.round(sum / max);
    }
    set gray(value) {
        this.r = this.g = this.b = value;
    }

    /** @returns {color} A color object representing this pixel (16-bit RGBA). */
    to_color() {
        // Create a color object (Uint16Array) from current pixel data
        return new color(color.RGBA, this.r, this.g, this.b, this.a);
    }

    /**
     * Sets pixel values from a color object.
     * @param {color} col - Color object (must be in RGBA16 format).
     */
    from_color(col) {
        const rgb_view = col.rgb; // get rgb accessor (uint8 values)
        this.r = rgb_view.red;
        this.g = rgb_view.green;
        this.b = rgb_view.blue;
        if (this.#view.byteLength >= 4) {
            this.a = col[3] >> 8; // convert from Uint16 to Uint8 (approximate)
        }
    }

    /**
     * Sets pixel channels from an array.
     * @param {number[]} values - Channel values.
     * @throws {type_error} If argument is not an array.
     */
    set(values) {
        if (!array.is_array(values)) throw new type_error('Pixel.set expects an array.');
        const max = Math.max(this.#count, values.length);
        for (let i = 0; i < max; i++) {
            this.#view[`set${this.#format}`](i, i < values.length ? values[i] : 0);
        }
    }

    /**
     * Writes this pixel's channels into a target array at given offset.
     * @param {TypedArray} arr - Destination array.
     * @param {number} offset - Starting index in destination.
     */
    write_to(arr, offset) {
        for (let i = 0; i < this.#count; i++) {
            arr[offset + i] = this.#view[`get${this.#format}`](i);
        }
    }
}

// ----------------------------------------------------------------------
// Visitor Pattern for image traversal
// ----------------------------------------------------------------------

/**
 * Abstract visitor for image operations.
 * Subclasses should implement visit_pixel and optionally visit_region.
 */
export class image_visitor {
    /**
     * Called for each pixel.
     * @param {pixel_class} pixel - The pixel (mutable).
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     */
    visit_pixel(pixel, x, y) { throw new error('visit_pixel not implemented'); }

    /**
     * Called before processing a region.
     * @param {number} x - Start X.
     * @param {number} y - Start Y.
     * @param {number} w - Width.
     * @param {number} h - Height.
     */
    visit_region(x, y, w, h) { /* optional */ }

    /**
     * Called after processing.
     */
    visit_end() { /* optional */ }
}

/**
 * Example visitor that applies a function to each pixel.
 */
export class pixel_function_visitor extends image_visitor {
    constructor(fn) {
        super();
        this.fn = fn;
    }
    visit_pixel(pixel, x, y) {
        this.fn(pixel, x, y);
    }
}

// ----------------------------------------------------------------------
// Image class with SharedArrayBuffer support and visitor pattern
// ----------------------------------------------------------------------

/**
 * Core image class holding pixel data and metadata.
 * @class image_class
 */
export class image_class {
    #id;
    #url = '';
    #name;
    #mime;
    #size;
    #pixels = NULL;
    #format;
    #hash;
    #use_shared; // whether pixels are stored in SharedArrayBuffer

    /**
     * @param {Object} params
     * @param {string} [params.id] - UUID
     * @param {string} [params.name]
     * @param {string|uri} [params.url]
     * @param {number} [params.width]
     * @param {number} [params.height]
     * @param {sizei} [params.size]
     * @param {number} [params.format=format_rgba8]
     * @param {TypedArray} [params.data] - Pixel data
     * @param {boolean} [params.use_shared=false] - Use SharedArrayBuffer for pixel storage
     */
    constructor({ id, name, url, width, height, size, format = format_rgba8, data, use_shared = false } = {}) {
        this.#set_id(id ?? crypto.randomUUID());
        if (url) this.url = url;
        else if (name) this.name = name;
        else this.name = string.uid();

        this.#size = size instanceof sizei ? size : new sizei(width ?? 0, height ?? 0);
        this.#format = this.#validate_format(format);
        this.#use_shared = use_shared;
        if (data) this.init_pixels(data);
    }

    /** @returns {string} */
    get kind() { return 'image'; }

    static get FORMAT() { return image_format; }

    // ---- ID ----
    get id() { return this.#id; }
    #set_id(value) {
        if (string.is_key(value)) this.#id = value;
        else throw new type_error('Image id must be a valid UUID.');
    }

    // ---- Name ----
    get name() { return this.#name; }
    set name(value) {
        if (kind_of(value) === 'string') this.#name = value;
        else throw new type_error('Image name must be a string.');
    }

    // ---- URL & MIME ----
    get url() { return this.#url?.path ?? ''; }
    set url(value) {
        const kind = kind_of(value);
        if (!['uri', 'string'].includes(kind)) throw new type_error('URL must be a uri or string.');
        this.#url = kind === 'uri' ? value : new uri(value);
        this.name = this.#url.file_name;
        this.#mime = get_image_mimetype(this.#url.ext);
    }

    get mime() { return `image/${this.#mime}`; }
    set mime(value) {
        if (kind_of(value) === 'string') this.#mime = value.replace(/^image\//, '');
        else throw new type_error('MIME type must be a string.');
    }

    // ---- Dimensions ----
    get width() { return this.#size.width; }
    set width(value) {
        if (kind_of(value) === 'number') this.#size.width = value;
        else throw new type_error('Width must be a number.');
    }

    get height() { return this.#size.height; }
    set height(value) {
        if (kind_of(value) === 'number') this.#size.height = value;
        else throw new type_error('Height must be a number.');
    }

    get size() { return this.#size; }
    set size(value) {
        if (value instanceof sizei) this.#size = value;
        else throw new type_error('Size must be a sizei instance.');
    }

    // ---- Hash ----
    get hash() { return this.#hash; }
    set hash(value) {
        if (kind_of(value) === 'number') this.#hash = value;
        else throw new type_error('Hash must be a number.');
    }

    // ---- Pixel format ----
    get format() { return this.#format; }
    set format(value) { this.#format = this.#validate_format(value); }

    #validate_format(value) {
        if (Object.values(image_format).includes(value)) return value;
        throw new type_error('Unknown image format.');
    }

    /** @returns {number} Bytes per pixel */
    get pixel_length() {
        const f = this.#format;
        if (f === format_gray8 || f === format_gray16) return 1;
        if (f === format_rgb8) return 3;
        if (f === format_rgba8) return 4;
        throw new error('Unknown image format.');
    }

    /** @returns {number} Number of pixels */
    get pixel_count() { return this.#size.width * this.#size.height; }

    /** @returns {number} Total data length in bytes */
    get data_length() { return this.pixel_count * this.pixel_length; }

    // ---- Pixel data ----
    get pixels() { return this.#pixels; }

    /**
     * Initializes pixel array. Supports SharedArrayBuffer if use_shared was set.
     * @param {TypedArray} [data] - Optional data to copy.
     * @throws {type_error} If data is not an array.
     */
    init_pixels(data) {
        if (data !== undefined && !array.is_array(data)) {
            throw new type_error('Pixel data must be an array.');
        }
        const ArrayType = this.#format === format_gray16 ? Uint16Array : Uint8ClampedArray;
        const buffer_size = this.data_length * (this.#format === format_gray16 ? 2 : 1);
        let buffer;
        if (this.#use_shared) {
            try {
                buffer = new SharedArrayBuffer(buffer_size);
            } catch (e) {
                throw new error('SharedArrayBuffer not supported in this environment.');
            }
        } else {
            buffer = new ArrayBuffer(buffer_size);
        }
        this.#pixels = new ArrayType(buffer);
        if (data) {
            this.#pixels.set(data);
            this.#hash = compute_pixel_hash(this.#pixels, this.#size);
        }
    }

    /**
     * Gets pixel at (x,y).
     * @param {number} x
     * @param {number} y
     * @param {pixel_class} [result] - Optional pixel object to reuse.
     * @returns {pixel_class} The pixel.
     */
    pixel_at(x, y, result) {
        const pix = result instanceof pixel_class ? result : new pixel_class(this.#format);
        const start = (y * this.width + x) * this.pixel_length;
        const values = Array.from(this.#pixels.slice(start, start + pix.length));
        pix.set(values);
        return pix;
    }

    /**
     * Samples pixel at normalized coordinates [0,1].
     * @param {number} x
     * @param {number} y
     * @param {pixel_class} [result]
     * @returns {pixel_class}
     */
    sample(x, y, result) {
        const sx = Math.floor(numb.clamp(x, 0, 1) * (this.width - 1));
        const sy = Math.floor(numb.clamp(y, 0, 1) * (this.height - 1));
        return this.pixel_at(sx, sy, result);
    }

    /**
     * Compares this image with another.
     * @param {image_class} other
     * @returns {boolean}
     */
    equals(other) {
        if (!other || !(other instanceof image_class)) return false;
        if (!size_equals(this.size, other.size)) return false;
        if (this.format !== other.format) return false;
        return this.#hash === other.#hash;
    }

    /** @returns {ImageData} Converts to browser ImageData (RGBA8). */
    get ImageData() {
        const pixel_count = this.pixel_count;
        const pixel_len = this.pixel_length;
        const is_rgba = this.#format === format_rgba8;
        const data = new Uint8ClampedArray(pixel_count * 4);
        const pix = new pixel_class(this.#format);

        for (let i = 0; i < pixel_count; i++) {
            const x = i % this.width;
            const y = Math.floor(i / this.width);
            this.pixel_at(x, y, pix);
            const base = i * 4;
            data[base] = pix.r;
            data[base + 1] = pix.g;
            data[base + 2] = pix.b;
            data[base + 3] = is_rgba ? pix.a : 0xff;
        }
        return new ImageData(data, this.width, this.height);
    }

    /**
     * Creates a new image with the same data but possibly different format.
     * @param {number} target_format
     * @returns {image_class}
     */
    clone_with_format(target_format) {
        const new_img = new image_class({
            width: this.width,
            height: this.height,
            format: target_format,
        });
        new_img.init_pixels();
        // If same format, copy directly; else convert
        if (this.format === target_format) {
            new_img.pixels.set(this.pixels);
        } else {
            convert_image_format(this, target_format, new_img);
        }
        return new_img;
    }

    /**
     * Accepts a visitor to traverse the image.
     * @param {image_visitor} visitor
     */
    accept(visitor) {
        if (!(visitor instanceof image_visitor)) {
            throw new type_error('Visitor must be an instance of image_visitor');
        }
        const pix = new pixel_class(this.#format);
        visitor.visit_region(0, 0, this.width, this.height);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.pixel_at(x, y, pix);
                visitor.visit_pixel(pix, x, y);
                // Write back pixel if visitor modified it
                const start = (y * this.width + x) * this.pixel_length;
                pix.write_to(this.#pixels, start);
            }
        }
        visitor.visit_end();
    }
}

// ----------------------------------------------------------------------
// Factory functions
// ----------------------------------------------------------------------

/**
 * Creates a new image with given size and format.
 * @param {sizei} size
 * @param {number} [format=format_rgba8]
 * @param {boolean} [use_shared=false]
 * @returns {image_class}
 */
export function create_image(size, format = format_rgba8, use_shared = false) {
    const img = new image_class({ size, format, use_shared });
    img.init_pixels();
    return img;
}

// ----------------------------------------------------------------------
// MIME type detection
// ----------------------------------------------------------------------

/**
 * Determines image MIME subtype from file extension.
 * @param {string|uri} url
 * @returns {string} MIME subtype (e.g., 'png', 'jpeg')
 * @throws {error} If extension is unknown.
 */
export function get_image_mimetype(url) {
    const path = kind_of(url) === 'uri' ? url.path : url;
    const extMatch = path.match(/\.([a-z0-9]+)$/i);
    if (!extMatch) throw new error('Unable to extract file extension.');
    const ext = extMatch[1].toLowerCase();

    const map = {
        apng: 'apng', avif: 'avif', jpg: 'jpeg', jpeg: 'jpeg', jfif: 'jpeg',
        pjpeg: 'jpeg', pjp: 'jpeg', png: 'png', svg: 'svg+xml', webp: 'webp',
        bmp: 'bmp', ico: 'x-icon', cur: 'x-icon', tif: 'tiff', tiff: 'tiff',
    };
    const mime = map[ext];
    if (!mime) throw new error(`Unknown image type for extension .${ext}`);
    return mime;
}

// ----------------------------------------------------------------------
// Hash utilities (pure)
// ----------------------------------------------------------------------

/**
 * Computes a 32-bit hash from pixel data and dimensions.
 * @param {TypedArray} pixels
 * @param {Object} size - { width, height }
 * @returns {number} Unsigned 32-bit hash.
 */
function compute_pixel_hash(pixels, size) {
    let hash = 0;
    hash ^= (size.width ^ (size.width >>> 16)) * HASH_C1;
    hash ^= (size.height ^ (size.height >>> 16)) * HASH_C1;

    const len = pixels.length;
    for (let i = 0; i < len; i++) {
        let v = pixels[i];
        v ^= (v >>> 16);
        v = (v * HASH_C1) ^ ((v >>> HASH_R1) * HASH_C2);
        hash ^= v;
        hash = (hash << HASH_R2) | (hash >>> (32 - HASH_R2));
        hash = hash * HASH_M + HASH_N;
    }

    hash ^= len;
    hash ^= (hash >>> 16);
    hash = (hash * HASH_FINAL1) ^ (hash >>> 13);
    hash = (hash * HASH_FINAL2) ^ (hash >>> 16);

    return hash >>> 0;
}

/**
 * Computes hash for an image (supports image_class or ImageData).
 * @param {image_class|ImageData} img
 * @returns {number}
 * @throws {error} If image type is unsupported.
 */
export function image_hash(img) {
    const kind = kind_of(img);
    let pixels, width, height;

    if (kind === 'image') {
        if (!img.pixels) throw new error('Pixels must be initialized.');
        pixels = img.pixels;
        width = img.width;
        height = img.height;
    } else if (kind === 'ImageData') {
        pixels = img.data;
        width = img.width;
        height = img.height;
    } else {
        throw new error('Invalid image format for hash.');
    }

    return compute_pixel_hash(pixels, { width, height });
}

// ----------------------------------------------------------------------
// Opacity calculation
// ----------------------------------------------------------------------

/**
 * Calculates opacity ratio (0-1) of an image.
 * @param {image_class|ImageData|HTMLImageElement|ImageBitmap} img
 * @returns {number}
 * @throws {error} If image type unsupported or pixels missing.
 */
export function calculate_opacity(img) {
    const kind = kind_of(img);
    let pixels;

    if (kind === 'ImageData') {
        pixels = img.data;
    } else if (kind === 'image') {
        if (!img.pixels) throw new error('Pixels must be initialized.');
        pixels = img.pixels;
    } else if (kind === 'Image' || kind === 'ImageBitmap') {
        const canv = new canvas(new_node('canvas'), '2d');
        canv_set_pixel_ratio(canv, img.width, img.height);
        ctx_draw_img(canv.ctx, img); // pass context
        pixels = ctx_get_data(canv.ctx).data;
    } else {
        throw new error('Unsupported image type for opacity calculation.');
    }

    let sum = 0;
    for (let i = 3; i < pixels.length; i += 4) sum += pixels[i];
    return (sum / 255) / (pixels.length / 4);
}

// ----------------------------------------------------------------------
// Sub‑section extraction
// ----------------------------------------------------------------------

/**
 * Extracts a rectangular region from an image.
 * @param {image_class} src_img
 * @param {Object} rect - { x, y, width, height }
 * @param {image_class} [dest_img] - Optional destination image (must have same format).
 * @returns {image_class} The extracted image.
 * @throws {error} On bounds or format mismatch.
 */
export function extract_sub_image(src_img, rect, dest_img = null) {
    if (rect.x < 0 || rect.y < 0 ||
        rect.x + rect.width > src_img.width ||
        rect.y + rect.height > src_img.height) {
        throw new error('Sub‑image rectangle out of bounds.');
    }

    if (!dest_img) {
        dest_img = new image_class({
            width: rect.width,
            height: rect.height,
            format: src_img.format,
        });
        dest_img.init_pixels();
    } else if (src_img.format !== dest_img.format) {
        throw new error('Destination image format must match source.');
    }

    const src_line_bytes = src_img.width * src_img.pixel_length;
    const dest_line_bytes = dest_img.width * dest_img.pixel_length;
    const src_pixels = src_img.pixels;
    const dest_pixels = dest_img.pixels;

    for (let row = 0; row < rect.height; row++) {
        const src_start = (src_line_bytes * (rect.y + row)) + (rect.x * src_img.pixel_length);
        const dest_start = dest_line_bytes * row;
        const line = src_pixels.slice(src_start, src_start + dest_line_bytes);
        dest_pixels.set(line, dest_start);
    }

    dest_img.hash = compute_pixel_hash(dest_pixels, dest_img.size);
    return dest_img;
}

// ----------------------------------------------------------------------
// Image conversion (strategy pattern) with color module integration
// ----------------------------------------------------------------------

/**
 * Conversion strategy registry.
 */
const conversion_strategies = {
    [format_gray8]: {
        [format_gray16]: (src, dest, i) => { dest[i] = src[i] * U8_TO_U16; },
        [format_rgb8]: (src, dest, i) => { const v = src[i]; dest.set([v, v, v], i * 3); },
        [format_rgba8]: (src, dest, i) => { const v = src[i]; dest.set([v, v, v, numb.MAX_UINT8], i * 4); },
    },
    [format_gray16]: {
        [format_gray8]: (src, dest, i) => { dest[i] = src[i] * U16_TO_U8; },
        [format_rgb8]: (src, dest, i) => { const v = src[i] * U16_TO_U8; dest.set([v, v, v], i * 3); },
        [format_rgba8]: (src, dest, i) => { const v = src[i] * U16_TO_U8; dest.set([v, v, v, numb.MAX_UINT8], i * 4); },
    },
    [format_rgb8]: {
        [format_gray8]: (src, dest, i) => {
            const off = i * 3;
            dest[i] = numb.scale(src[off] + src[off + 1] + src[off + 2], RGB_MAX, numb.MAX_UINT8);
        },
        [format_gray16]: (src, dest, i) => {
            const off = i * 3;
            dest[i] = numb.scale(src[off] + src[off + 1] + src[off + 2], RGB_MAX, numb.MAX_UINT16);
        },
        [format_rgba8]: (src, dest, i) => {
            const off = i * 3;
            dest.set([src[off], src[off + 1], src[off + 2], numb.MAX_UINT8], i * 4);
        },
    },
    [format_rgba8]: {
        [format_gray8]: (src, dest, i) => {
            const off = i * 4;
            dest[i] = numb.scale(src[off] + src[off + 1] + src[off + 2], RGB_MAX, numb.MAX_UINT8);
        },
        [format_gray16]: (src, dest, i) => {
            const off = i * 4;
            dest[i] = numb.scale(src[off] + src[off + 1] + src[off + 2], RGB_MAX, numb.MAX_UINT16);
        },
        [format_rgb8]: (src, dest, i) => {
            const off = i * 4;
            dest.set([src[off], src[off + 1], src[off + 2]], i * 3);
        },
    },
};

/**
 * Converts an image to a different pixel format (in‑place or into a new image).
 * @param {image_class} src_img
 * @param {number} target_format
 * @param {image_class} [dest_img] - If provided, result is stored here; otherwise src_img is modified.
 * @returns {image_class} The converted image (either src_img or dest_img).
 * @throws {error} If conversion not supported.
 */
export function convert_image_format(src_img, target_format, dest_img = null) {
    if (src_img.format === target_format) {
        if (dest_img && dest_img !== src_img) {
            // Copy pixels to dest
            dest_img.init_pixels(src_img.pixels);
            dest_img.format = target_format;
            return dest_img;
        }
        return src_img;
    }

    const src = src_img.pixels;
    const pixel_count = src_img.pixel_count;
    let dest_array;

    switch (target_format) {
        case format_rgb8: dest_array = new Uint8ClampedArray(pixel_count * 3); break;
        case format_rgba8: dest_array = new Uint8ClampedArray(pixel_count * 4); break;
        case format_gray8: dest_array = new Uint8ClampedArray(pixel_count); break;
        case format_gray16: dest_array = new Uint16Array(pixel_count); break;
        default: throw new error('Unknown target format.');
    }

    const converter = conversion_strategies[src_img.format]?.[target_format];
    if (!converter) throw new error(`Conversion from ${src_img.format} to ${target_format} not supported.`);

    for (let i = 0; i < pixel_count; i++) converter(src, dest_array, i);

    if (dest_img) {
        dest_img.format = target_format;
        dest_img.size = src_img.size; // same size
        dest_img.init_pixels(dest_array);
        return dest_img;
    } else {
        src_img.format = target_format;
        src_img.init_pixels(dest_array);
        return src_img;
    }
}

// ----------------------------------------------------------------------
// Image scaling with adaptive quality and weight caching
// ----------------------------------------------------------------------

// Cache for interpolation weights
const weight_cache = new Map();

/**
 * Generate cubic weights for a given fraction.
 * @param {number} t - Fraction (0-1)
 * @returns {number[]} weights for positions -1,0,1,2
 */
function get_cubic_weights(t) {
    const key = t.toFixed(4);
    if (weight_cache.has(key)) return weight_cache.get(key);
    const t2 = t * t;
    const t3 = t2 * t;
    const w0 = -0.5 * t3 + t2 - 0.5 * t;
    const w1 = 1.5 * t3 - 2.5 * t2 + 1;
    const w2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
    const w3 = 0.5 * t3 - 0.5 * t2;
    const weights = [w0, w1, w2, w3];
    weight_cache.set(key, weights);
    return weights;
}

/**
 * Scaling strategies with adaptive quality selection.
 */
const scaling_strategies = {
    // Fast downscale using box filter (suitable for large reductions)
    fast_down: (src_data, src_w, src_h, dest_w, dest_h) => {
        const dest_data = new Uint8ClampedArray(dest_w * dest_h * 4);
        const scale_x = src_w / dest_w;
        const scale_y = src_h / dest_h;

        for (let y = 0; y < dest_h; y++) {
            for (let x = 0; x < dest_w; x++) {
                const start_x = Math.floor(x * scale_x);
                const start_y = Math.floor(y * scale_y);
                const end_x = Math.min(Math.ceil((x + 1) * scale_x), src_w);
                const end_y = Math.min(Math.ceil((y + 1) * scale_y), src_h);

                let r = 0, g = 0, b = 0, a = 0, count = 0;
                for (let sy = start_y; sy < end_y; sy++) {
                    for (let sx = start_x; sx < end_x; sx++) {
                        const idx = (sy * src_w + sx) * 4;
                        r += src_data[idx];
                        g += src_data[idx + 1];
                        b += src_data[idx + 2];
                        a += src_data[idx + 3];
                        count++;
                    }
                }
                const dest_idx = (y * dest_w + x) * 4;
                dest_data[dest_idx] = r / count;
                dest_data[dest_idx + 1] = g / count;
                dest_data[dest_idx + 2] = b / count;
                dest_data[dest_idx + 3] = a / count;
            }
        }
        return dest_data;
    },

    // High-quality bicubic upscale (also used for moderate downscales)
    bicubic: (src_data, src_w, src_h, dest_w, dest_h) => {
        const dest_data = new Uint8ClampedArray(dest_w * dest_h * 4);
        const scale_x = src_w / dest_w;
        const scale_y = src_h / dest_h;

        const get_pixel = (data, x, y, offset) => {
            x = numb.clamp(x, 0, src_w - 1);
            y = numb.clamp(y, 0, src_h - 1);
            return data[(y * src_w + x) * 4 + offset];
        };

        const interpolate_bicubic = (x, y, offset) => {
            const ix = Math.floor(x);
            const iy = Math.floor(y);
            const dx = x - ix;
            const dy = y - iy;

            const weights_x = get_cubic_weights(dx);
            const weights_y = get_cubic_weights(dy);

            // Gather 4x4 neighborhood
            const samples = [];
            for (let m = -1; m <= 2; m++) {
                for (let n = -1; n <= 2; n++) {
                    samples.push(get_pixel(src_data, ix + n, iy + m, offset));
                }
            }

            // Interpolate along x first
            const col = [];
            for (let m = 0; m < 4; m++) {
                let sum = 0;
                for (let n = 0; n < 4; n++) {
                    sum += samples[m * 4 + n] * weights_x[n];
                }
                col.push(sum);
            }

            // Interpolate along y
            let val = 0;
            for (let m = 0; m < 4; m++) {
                val += col[m] * weights_y[m];
            }
            return numb.clamp(val, 0, 255);
        };

        for (let y = 0; y < dest_h; y++) {
            for (let x = 0; x < dest_w; x++) {
                const src_x = x * scale_x;
                const src_y = y * scale_y;
                const dest_idx = (y * dest_w + x) * 4;
                dest_data[dest_idx] = interpolate_bicubic(src_x, src_y, 0);
                dest_data[dest_idx + 1] = interpolate_bicubic(src_x, src_y, 1);
                dest_data[dest_idx + 2] = interpolate_bicubic(src_x, src_y, 2);
                dest_data[dest_idx + 3] = interpolate_bicubic(src_x, src_y, 3);
            }
        }
        return dest_data;
    },
};

/**
 * Adaptive quality scaling based on image size and scale factor.
 * @param {image_class} img
 * @param {number} new_width
 * @param {number} new_height
 * @param {Object} [options] - { quality: 'auto' | 'high' | 'fast' }
 */
export function scale_image_adaptive(img, new_width, new_height, options = {}) {
    if (img.format !== format_rgba8) {
        throw new error('Scaling is only supported for RGBA8 images.');
    }

    const src_w = img.width;
    const src_h = img.height;
    const src_data = img.pixels;
    const total_pixels = src_w * src_h;
    const scale_factor = Math.min(new_width / src_w, new_height / src_h);
    const is_downscale = scale_factor < 1;

    const { quality = 'auto' } = options;
    let strategy;
    if (quality === 'high') {
        strategy = 'bicubic';
    } else if (quality === 'fast') {
        strategy = is_downscale ? 'fast_down' : 'bicubic';
    } else { // auto
        if (is_downscale && total_pixels > 1024 * 1024) { // > 1 MP
            strategy = 'fast_down';
        } else {
            strategy = 'bicubic';
        }
    }

    const dest_data = scaling_strategies[strategy](src_data, src_w, src_h, new_width, new_height);
    img.width = new_width;
    img.height = new_height;
    img.init_pixels(dest_data);
}

// ----------------------------------------------------------------------
// OffscreenCanvas helpers
// ----------------------------------------------------------------------

/**
 * Converts an image_class to an OffscreenCanvas.
 * @param {image_class} img
 * @returns {OffscreenCanvas}
 */
export function image_to_offscreen_canvas(img) {
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(img.ImageData, 0, 0);
    return canvas;
}

/**
 * Creates an image_class from an OffscreenCanvas.
 * @param {OffscreenCanvas} canvas
 * @param {number} [format=format_rgba8]
 * @returns {image_class}
 */
export function image_from_offscreen_canvas(canvas, format = format_rgba8) {
    const ctx = canvas.getContext('2d');
    const image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const img = new image_class({
        width: canvas.width,
        height: canvas.height,
        format: format_rgba8,
        data: image_data.data,
    });
    if (format !== format_rgba8) convert_image_format(img, format);
    return img;
}

// ----------------------------------------------------------------------
// Async versions of heavy operations (using Promises and Web Workers)
// ----------------------------------------------------------------------

/**
 * Async wrapper for scale_image_adaptive.
 * @param {image_class} img
 * @param {number} new_width
 * @param {number} new_height
 * @param {Object} [options]
 * @returns {Promise<image_class>}
 */
export function scale_image_adaptive_async(img, new_width, new_height, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            setTimeout(() => {
                try {
                    scale_image_adaptive(img, new_width, new_height, options);
                    resolve(img);
                } catch (e) {
                    reject(e);
                }
            }, 0);
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Async version of convert_image_format.
 * @param {image_class} src_img
 * @param {number} target_format
 * @param {image_class} [dest_img]
 * @returns {Promise<image_class>}
 */
export function convert_image_format_async(src_img, target_format, dest_img = null) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                resolve(convert_image_format(src_img, target_format, dest_img));
            } catch (e) {
                reject(e);
            }
        }, 0);
    });
}

/**
 * Async version of normal_from_height_map_array.
 * @param {Uint8ClampedArray} height_map
 * @param {number} width
 * @param {number} height
 * @param {Object} options
 * @returns {Promise<Uint8ClampedArray>}
 */
export function normal_from_height_map_array_async(height_map, width, height, options = {}) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                resolve(normal_from_height_map_array(height_map, width, height, options));
            } catch (e) {
                reject(e);
            }
        }, 0);
    });
}

// ----------------------------------------------------------------------
// Normal map generation
// ----------------------------------------------------------------------

/**
 * Options for normal map generation.
 * @typedef {Object} normal_options
 * @property {number} [strength=5.0]
 * @property {boolean} [invert_red=false]
 * @property {boolean} [invert_green=true]
 * @property {number} [smoothing=2] - 0=none, 1=light, 2=medium
 * @property {boolean} [use_scharr=true]
 */

/**
 * Generates a normal map from a height map (RGBA, only red channel used).
 * @param {Uint8ClampedArray} height_map
 * @param {number} width
 * @param {number} height
 * @param {normal_options} [options={}]
 * @returns {Uint8ClampedArray}
 */
export function normal_from_height_map_array(height_map, width, height, options = {}) {
    const {
        strength = DEFAULT_STRENGTH,
        invert_red = false,
        invert_green = DEFAULT_INVERT_GREEN,
        smoothing = DEFAULT_SMOOTHING,
        use_scharr = DEFAULT_USE_SCHARR,
    } = options;

    const normal_map = new Uint8ClampedArray(width * height * 4);
    const width4 = width << 2;
    const max_x = width - 1;
    const max_y = height - 1;

    const kernel_5 = new Float32Array([1, 4, 6, 4, 1, 4, 16, 24, 16, 4, 6, 24, 36, 24, 6, 4, 16, 24, 16, 4, 1, 4, 6, 4, 1]);
    const kernel_3 = new Float32Array([1, 2, 1, 2, 4, 2, 1, 2, 1]);

    const kernel_div = smoothing === 2 ? 256 : 16;
    const kernel = smoothing === 2 ? kernel_5 : smoothing === 1 ? kernel_3 : null;
    const kernel_size = smoothing === 2 ? 5 : smoothing === 1 ? 3 : 0;
    const kernel_radius = kernel_size >> 1;

    const scharr_multiplier = use_scharr ? 0.35 : 1.0;
    const effective_strength = strength * scharr_multiplier;

    let smoothed_heights;
    if (kernel) {
        smoothed_heights = new Float32Array(width * height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let ki = 0;
                for (let ky = -kernel_radius; ky <= kernel_radius; ky++) {
                    const my = numb.clamp(y + ky, 0, max_y);
                    const row_offset = my * width4;
                    for (let kx = -kernel_radius; kx <= kernel_radius; kx++) {
                        const mx = numb.clamp(x + kx, 0, max_x);
                        sum += height_map[row_offset + (mx << 2)] * kernel[ki++];
                    }
                }
                smoothed_heights[y * width + x] = sum / kernel_div;
            }
        }
    }

    const get_height = (x, y) => {
        if (kernel) {
            return smoothed_heights[y * width + x];
        } else {
            return height_map[y * width4 + (x << 2)] * ONE_OVER_255;
        }
    };

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width4 + (x << 2);

            const s0 = get_height(numb.clamp(x - 1, 0, max_x), numb.clamp(y - 1, 0, max_y));
            const s1 = get_height(x, numb.clamp(y - 1, 0, max_y));
            const s2 = get_height(numb.clamp(x + 1, 0, max_x), numb.clamp(y - 1, 0, max_y));
            const s3 = get_height(numb.clamp(x - 1, 0, max_x), y);
            const s5 = get_height(numb.clamp(x + 1, 0, max_x), y);
            const s6 = get_height(numb.clamp(x - 1, 0, max_x), numb.clamp(y + 1, 0, max_y));
            const s7 = get_height(x, numb.clamp(y + 1, 0, max_y));
            const s8 = get_height(numb.clamp(x + 1, 0, max_x), numb.clamp(y + 1, 0, max_y));

            let dx, dy;
            if (use_scharr) {
                dx = (-3 * s0 + 3 * s2 - 10 * s3 + 10 * s5 - 3 * s6 + 3 * s8) * effective_strength;
                dy = (-3 * s0 - 10 * s1 - 3 * s2 + 3 * s6 + 10 * s7 + 3 * s8) * effective_strength;
            } else {
                dx = (-s0 + s2 - 2 * s3 + 2 * s5 - s6 + s8) * effective_strength;
                dy = (-s0 - 2 * s1 - s2 + s6 + 2 * s7 + s8) * effective_strength;
            }

            let nx = -dx;
            let ny = -dy;
            if (invert_red) nx = -nx;
            if (invert_green) ny = -ny;

            const len_sq = nx * nx + ny * ny + 1;
            if (len_sq < EPSILON) {
                normal_map[idx] = 128;
                normal_map[idx + 1] = 128;
                normal_map[idx + 2] = 255;
                normal_map[idx + 3] = 255;
                continue;
            }

            const len_inv = 1 / Math.sqrt(len_sq);
            normal_map[idx] = Math.round((nx * len_inv * 0.5 + 0.5) * 255);
            normal_map[idx + 1] = Math.round((ny * len_inv * 0.5 + 0.5) * 255);
            normal_map[idx + 2] = Math.round((len_inv * 0.5 + 0.5) * 255);
            normal_map[idx + 3] = 255;
        }
    }

    return normal_map;
}

// ----------------------------------------------------------------------
// Image loading (async) using OffscreenCanvas
// ----------------------------------------------------------------------

/**
 * Loads an image from a URL and returns a promise that resolves to an image_class.
 * @param {string} url
 * @param {number} [format=format_rgba8]
 * @returns {Promise<image_class>}
 */
export function load_image_from_url_async(url, format = format_rgba8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Allow CORS
        img.onload = () => {
            try {
                const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const result = new image_class({
                    width: canvas.width,
                    height: canvas.height,
                    format: format_rgba8,
                    data: image_data.data,
                });
                if (format !== format_rgba8) convert_image_format(result, format);
                resolve(result);
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = () => reject(new error(`Failed to load image from ${url}`));
        img.src = url;
    });
}

// ----------------------------------------------------------------------
// Canvas to blob with OffscreenCanvas support
// ----------------------------------------------------------------------

/**
 * Converts canvas to blob with auto format detection.
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas
 * @param {string} mime_type - 'png', 'jpeg', 'webp', or 'auto'
 * @param {number} [quality=1.0]
 * @returns {Promise<Blob>}
 */
export function canvas_to_blob(canvas, mime_type = 'png', quality = 1.0) {
    if (!canvas || (!canvas.toBlob && !canvas.toDataURL && !(canvas instanceof OffscreenCanvas))) {
        return Promise.reject(new type_error('Invalid canvas element'));
    }

    const q = numb.clamp(quality, 0, 1);
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
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new error('toBlob returned null')), mime, q);
        });
    } else if (canvas instanceof OffscreenCanvas) {
        return canvas.convertToBlob({ type: mime, quality: q });
    }

    const data_url = canvas.toDataURL(mime, q);
    return fetch(data_url).then(r => r.blob());
}

// ----------------------------------------------------------------------
// Color module integration utilities
// ----------------------------------------------------------------------

/**
 * Applies a color transformation to each pixel using a visitor.
 * @param {image_class} img
 * @param {Function} transform - Function that takes a color object and returns modified color.
 */
export function apply_color_transform(img, transform) {
    const visitor = new pixel_function_visitor((pixel, x, y) => {
        const col = pixel.to_color();
        const new_col = transform(col);
        pixel.from_color(new_col);
    });
    img.accept(visitor);
}

/**
 * Converts image to grayscale using color module.
 * @param {image_class} img
 * @returns {image_class}
 */
export function convert_to_grayscale(img) {
    const result = img.clone_with_format(format_rgba8);
    apply_color_transform(result, (col) => color_to_grayscale(col));
    return result;
}

/**
 * Darkens image by a percentage.
 * @param {image_class} img
 * @param {number} percent - 0-100
 * @returns {image_class}
 */
export function darken_image(img, percent) {
    const result = img.clone_with_format(format_rgba8);
    apply_color_transform(result, (col) => {
        const hsl_view = col.hsl;
        hsl_view.light = Math.max(0, hsl_view.light - percent);
        return col;
    });
    return result;
}

// ----------------------------------------------------------------------
// Remaining functions from original (canvas_to_png, canvas_to_jpeg, etc.)
// ----------------------------------------------------------------------

/**
 * Converts canvas to PNG blob.
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas
 * @returns {Promise<Blob>}
 */
export function canvas_to_png(canvas) {
    return canvas_to_blob(canvas, 'png', 1.0);
}

/**
 * Converts canvas to JPEG blob.
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas
 * @param {number} [quality=0.92]
 * @returns {Promise<Blob>}
 */
export function canvas_to_jpeg(canvas, quality = 0.92) {
    return canvas_to_blob(canvas, 'jpeg', quality);
}

/**
 * Converts canvas to WebP blob.
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas
 * @param {number} [quality=0.80]
 * @returns {Promise<Blob>}
 */
export function canvas_to_webp(canvas, quality = 0.80) {
    return canvas_to_blob(canvas, 'webp', quality);
}

// ----------------------------------------------------------------------
// Transparency detection (unchanged)
// ----------------------------------------------------------------------

/**
 * Checks if image data contains any transparent pixels (alpha < 255).
 * @param {Uint8ClampedArray} image_data
 * @returns {boolean}
 */
export function has_transparency(image_data) {
    if (!(image_data instanceof Uint8ClampedArray)) {
        throw new type_error('Input must be a Uint8ClampedArray');
    }

    const len = image_data.length;
    let step = 4;
    if (len > 1048576) step = 128;
    else if (len > 262144) step = 64;
    else if (len > 16384) step = 32;

    for (let i = 3; i < len; i += step) {
        if (image_data[i] < 254) return true;
    }
    return false;
}

// ----------------------------------------------------------------------
// Nearest-neighbor scaling (fast) - kept for compatibility
// ----------------------------------------------------------------------

/**
 * Scales image data using nearest-neighbor sampling (fast).
 * @param {Uint8ClampedArray} src_data
 * @param {number} src_width
 * @param {number} src_height
 * @param {number} target_width
 * @param {number} target_height
 * @returns {Uint8ClampedArray}
 */
export function scale_image_array(src_data, src_width, src_height, target_width, target_height) {
    const target_size = target_width * target_height;
    const target_data = new Uint8ClampedArray(target_size << 2);

    const width_ratio = src_width / target_width;
    const height_ratio = src_height / target_height;
    const src_width4 = src_width << 2;
    const target_width4 = target_width << 2;
    const max_src_x = src_width - 1;
    const max_src_y = src_height - 1;

    let target_index = 0;
    let src_y_prev = -1;
    let src_y_offset = 0;

    for (let y = 0; y < target_height; y++) {
        const src_y = Math.min((y * height_ratio) | 0, max_src_y);
        if (src_y !== src_y_prev) {
            src_y_offset = src_y * src_width4;
            src_y_prev = src_y;
        }

        const row_target_index = target_index;
        for (let x = 0; x < target_width; x++) {
            const src_x = Math.min((x * width_ratio) | 0, max_src_x);
            const src_index = src_y_offset + (src_x << 2);
            target_data[target_index++] = src_data[src_index];
            target_data[target_index++] = src_data[src_index + 1];
            target_data[target_index++] = src_data[src_index + 2];
            target_data[target_index++] = src_data[src_index + 3];
        }
        target_index = row_target_index + target_width4;
    }

    return target_data;
}

// ----------------------------------------------------------------------
// Export all public functions
// ----------------------------------------------------------------------

export {
    image_format as FORMAT, format_gray16, format_gray8, format_rgb8,
    format_rgba8
};
