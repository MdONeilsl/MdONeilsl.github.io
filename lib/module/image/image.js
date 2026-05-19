/**
 * =============================================================================
 * IMAGE MODULE USAGE GUIDE
 * =============================================================================
 *
 * This module provides two main classes for working with images:
 *   - `pixel_class`: Represents a single pixel in any supported format.
 *   - `image_class`: Represents a complete image with metadata and pixel data.
 *
 * It also exports `img_format` constants and the `convert_image_format` function.
 *
 * -----------------------------------------------------------------------------
 * 1. Image Formats (img_format)
 * -----------------------------------------------------------------------------
 * The following format constants are available (values 1‑13):
 *   gray_8, gray_16, gray_32               – single channel grayscale
 *   gray_a_8, gray_a_16, gray_a_32          – grayscale + alpha
 *   rgb_8, rgb_16, rgb_32                   – RGB (no alpha)
 *   rgba_8, rgba_16, rgba_32                 – RGBA (integer)
 *   rgba_f32                                  – RGBA (32-bit float, range 0‑1)
 *
 * Each format has a specific byte depth per channel (1,2,4 bytes) and
 * corresponding channel count. The float format uses 4‑byte floats.
 *
 * -----------------------------------------------------------------------------
 * 2. pixel_class – Single Pixel Manipulation
 * -----------------------------------------------------------------------------
 * The `pixel_class` provides a format‑independent interface to pixel data.
 *
 *   // Create a pixel in RGBA_8 format (default)
 *   const p = new pixel_class();  // or new pixel_class(img_format.rgba_8)
 *
 *   // Access channels (always available, but may be aliased in grayscale)
 *   p.r = 255; p.g = 128; p.b = 64; p.a = 255;
 *   console.log(p.r, p.g, p.b, p.a);   // → 255, 128, 64, 255
 *
 *   // For grayscale formats, .r, .g, .b all refer to the same gray value
 *   const grayPix = new pixel_class(img_format.gray_8);
 *   grayPix.r = 200;                     // sets the gray value
 *   console.log(grayPix.g, grayPix.b);    // → 200, 200
 *
 *   // Alpha access throws an error if the format has no alpha
 *   // .a works only for formats with alpha (gray_a_*, rgba_*)
 *
 *   // Grayscale convenience
 *   p.gray = 120;                         // sets all three RGB channels
 *   console.log(p.gray);                   // returns luminance (average of RGB)
 *
 *   // Set multiple channels at once
 *   p.set([10, 20, 30, 40]);               // first channels get values, rest zero
 *
 * -----------------------------------------------------------------------------
 * 3. image_class – Complete Image Container
 * -----------------------------------------------------------------------------
 * An image consists of:
 *   - Metadata: id, name, url, mime, size (width/height), format
 *   - Pixel storage: a typed array (Uint8ClampedArray, Uint16Array, Uint32Array, Float32Array)
 *
 * 3.1 Creating an Image
 * -----------------------------------------------------------------------------
 *   // From width, height and optional data (flat array in row‑major order)
 *   const img = new image_class({
 *       width: 320,
 *       height: 240,
 *       format: img_format.rgba_8,
 *       data: myPixelArray   // ArrayLike<number>
 *   });
 *
 *   // Using a size object
 *   const sz = new sizei(320, 240);
 *   const img2 = new image_class({ size: sz, format: img_format.rgb_8 });
 *
 *   // From a URL (automatically sets name and mime type)
 *   const url = new uri('http://example.com/photo.jpg');
 *   const img3 = new image_class({ url });
 *
 *   // Metadata can be provided explicitly
 *   const img4 = new image_class({
 *       id: crypto.randomUUID(),
 *       name: 'myimage',
 *       mime: 'image/png',
 *       width: 100,
 *       height: 100
 *   });
 *
 * 3.2 Accessing Metadata
 * -----------------------------------------------------------------------------
 *   img.id                 // read‑only? Actually has setter, but use with care
 *   img.name = 'newname';
 *   img.url = 'path/to/file.jpg';   // updates name and mime automatically
 *   img.mime = 'image/gif';         // sets the MIME subtype (without "image/")
 *   img.width, img.height           // from the size object
 *   img.size = new sizei(640, 480); // updates width/height
 *   img.format = img_format.gray_16;
 *
 * 3.3 Pixel Data Access
 * -----------------------------------------------------------------------------
 *   img.pixels               // the underlying typed array (read‑only)
 *   img.pixel_count          // total number of pixels
 *   img.channel_count        // per pixel
 *   img.data_length          // total number of elements in the array
 *
 *   // Get a pixel at (x, y) – returns a pixel_class instance
 *   const pix = img.pixel_at(10, 20);
 *
 *   // Reuse a pixel object to avoid allocation
 *   const reusable = new pixel_class(img.format);
 *   img.pixel_at(10, 20, reusable);
 *
 *   // Sample at normalized coordinates (0..1)
 *   const sample = img.sample(0.5, 0.75);
 *
 *   // Replace all pixel data (must have same length)
 *   img.init_pixels(newDataArray);
 *
 * 3.4 Format Conversion
 * -----------------------------------------------------------------------------
 *   // Convert the image in‑place (destroys original data)
 *   convert_image_format(img, img_format.rgb_8);
 *
 *   // Convert into a new image (source unchanged)
 *   const converted = convert_image_format(img, img_format.gray_a_16, new image_class());
 *
 *   // The conversion handles scaling between bit depths and adds/removes alpha,
 *   // including conversions between integer and float formats.
 *
 * 3.5 Getting ImageData for Canvas
 * -----------------------------------------------------------------------------
 *   const imageData = img.image_data;   // always returns RGBA_8 ImageData
 *   // If the image is not in RGBA_8 format, a temporary conversion is performed.
 *
 * 3.6 Hashing and Equality
 * -----------------------------------------------------------------------------
 *   img.hash                 // 32‑bit hash derived from pixel data and dimensions
 *   img.recalc_hash()        // recalculates after manual pixel modifications
 *   img.equals(otherImage)   // compares size, format, and hash
 *
 * -----------------------------------------------------------------------------
 * 4. Standalone Converter Function
 * -----------------------------------------------------------------------------
 *   convert_image_format(srcImg, targetFormat, destImg?)  → image_class
 *   // See examples above.
 *
 * -----------------------------------------------------------------------------
 * 5. Error Handling
 * -----------------------------------------------------------------------------
 * Most methods throw `error` or `type_error` on invalid arguments or state.
 * Always wrap critical operations in try/catch when dealing with external data.
 *
 * -----------------------------------------------------------------------------
 * 6. Example: Loading an Image from a File (conceptual)
 * -----------------------------------------------------------------------------
 *   // Assume you have an ArrayBuffer from FileReader
 *   // (Decoding to raw pixel data is not part of this module – use a decoder)
 *   const decodedData = decodeMyImage(buffer);   // returns RGBA_8 flat array
 *   const img = new image_class({
 *       width: decodedWidth,
 *       height: decodedHeight,
 *       format: img_format.rgba_8,
 *       data: decodedData
 *   });
 *   img.name = 'myimage.png';
 *   img.mime = 'image/png';
 *
 *   // Later, draw on canvas
 *   const ctx = canvas.getContext('2d');
 *   ctx.putImageData(img.image_data, 0, 0);
 *
 * =============================================================================
 */

import { error, type_error } from "../../error.js";
import { kind_of, NULL } from "../../functions.js";
import { array } from "../array.js";
import { size_equals, sizei } from "../gui/size.js";
import { numb } from "../math/number.js";
import { uri } from "../system/uri.js";
import { string } from "../text/string.js";
import { calculate_image_hash, image_mimetype } from "./img_util.js";


// ---------------------------------------------------------------------
// Constants and specifications
// ---------------------------------------------------------------------

export const img_format = {
    invalid: 0,
    gray_8: 1,
    gray_16: 2,
    gray_32: 3,
    gray_a_8: 4,
    gray_a_16: 5,
    gray_a_32: 6,
    rgb_8: 7,
    rgb_16: 8,
    rgb_32: 9,
    rgba_8: 10,
    rgba_16: 11,
    rgba_32: 12,
    rgba_f32: 13,              // new 32-bit float RGBA format (0-1 range)
};

const format_specs = {
    [img_format.gray_8]: {
        byte_length: 1,
        channel_count: 1,
        array_type: 'Uint8',
        is_gray: true,
        has_alpha: false,
        is_float: false,
    },
    [img_format.gray_16]: {
        byte_length: 2,
        channel_count: 1,
        array_type: 'Uint16',
        is_gray: true,
        has_alpha: false,
        is_float: false,
    },
    [img_format.gray_32]: {
        byte_length: 4,
        channel_count: 1,
        array_type: 'Uint32',
        is_gray: true,
        has_alpha: false,
        is_float: false,
    },
    [img_format.gray_a_8]: {
        byte_length: 1,
        channel_count: 2,
        array_type: 'Uint8',
        is_gray: true,
        has_alpha: true,
        is_float: false,
    },
    [img_format.gray_a_16]: {
        byte_length: 2,
        channel_count: 2,
        array_type: 'Uint16',
        is_gray: true,
        has_alpha: true,
        is_float: false,
    },
    [img_format.gray_a_32]: {
        byte_length: 4,
        channel_count: 2,
        array_type: 'Uint32',
        is_gray: true,
        has_alpha: true,
        is_float: false,
    },
    [img_format.rgb_8]: {
        byte_length: 1,
        channel_count: 3,
        array_type: 'Uint8',
        is_gray: false,
        has_alpha: false,
        is_float: false,
    },
    [img_format.rgb_16]: {
        byte_length: 2,
        channel_count: 3,
        array_type: 'Uint16',
        is_gray: false,
        has_alpha: false,
        is_float: false,
    },
    [img_format.rgb_32]: {
        byte_length: 4,
        channel_count: 3,
        array_type: 'Uint32',
        is_gray: false,
        has_alpha: false,
        is_float: false,
    },
    [img_format.rgba_8]: {
        byte_length: 1,
        channel_count: 4,
        array_type: 'Uint8',
        is_gray: false,
        has_alpha: true,
        is_float: false,
    },
    [img_format.rgba_16]: {
        byte_length: 2,
        channel_count: 4,
        array_type: 'Uint16',
        is_gray: false,
        has_alpha: true,
        is_float: false,
    },
    [img_format.rgba_32]: {
        byte_length: 4,
        channel_count: 4,
        array_type: 'Uint32',
        is_gray: false,
        has_alpha: true,
        is_float: false,
    },
    [img_format.rgba_f32]: {
        byte_length: 4,
        channel_count: 4,
        array_type: 'Float32',
        is_gray: false,
        has_alpha: true,
        is_float: true,
    },
};

// ---------------------------------------------------------------------
// Helper functions for format handling
// ---------------------------------------------------------------------

/**
 * Get format specification by format id.
 * @param {number} format_id
 * @returns {Object}
 * @throws {error}
 */
const get_format_spec = (format_id) => {
    const spec = format_specs[format_id];
    if (!spec) {
        throw new error(`Unsupported image format: ${format_id}`);
    }
    return spec;
};

/**
 * Get maximum representable value for a given format.
 * For float formats, returns 1.0.
 * @param {number} format_id
 * @returns {number}
 */
const get_max_for_format = (format_id) => {
    const spec = get_format_spec(format_id);
    if (spec.is_float) return 1.0;
    if (spec.byte_length === 1) return 0xff;
    if (spec.byte_length === 2) return 0xffff;
    if (spec.byte_length === 4) return 0xffffffff;
    throw new error(`Unknown byte length for format ${format_id}`);
};

/**
 * Create a typed array suitable for a given format with a given length.
 * @param {number} format_id
 * @param {number} length
 * @returns {Uint8ClampedArray|Uint16Array|Uint32Array|Float32Array}
 */
const allocate_typed_array_for_format = (format_id, length) => {
    const spec = get_format_spec(format_id);
    if (spec.array_type === 'Uint8') return new Uint8ClampedArray(length);
    if (spec.array_type === 'Uint16') return new Uint16Array(length);
    if (spec.array_type === 'Uint32') return new Uint32Array(length);
    if (spec.array_type === 'Float32') return new Float32Array(length);
    throw new error(`Unsupported array type: ${spec.array_type}`);
};

// ---------------------------------------------------------------------
// Pixel class – single pixel abstraction
// ---------------------------------------------------------------------

/**
 * Represents a single pixel in any supported format.
 */
export class pixel_class {
    #bytes_per_channel;
    #channel_count;
    #array_type;
    #is_gray;
    #has_alpha;
    #is_float;
    #view;
    #alpha_offset = -1;

    /**
     * @param {number} format - One of img_format constants.
     */
    constructor(format = img_format.rgba_8) {
        this.#initialize(format);
    }

    #initialize(format) {
        const spec = get_format_spec(format);

        this.#bytes_per_channel = spec.byte_length;
        this.#channel_count = spec.channel_count;
        this.#array_type = spec.array_type;
        this.#is_gray = spec.is_gray;
        this.#has_alpha = spec.has_alpha;
        this.#is_float = spec.is_float;

        const total_bytes = this.#channel_count * this.#bytes_per_channel;
        this.#view = new DataView(new ArrayBuffer(total_bytes));

        if (this.#has_alpha) {
            this.#alpha_offset = (this.#channel_count - 1) * this.#bytes_per_channel;
        }
    }

    /** @returns {string} */
    get kind() { return 'pixel'; }

    /** @returns {number} number of channels */
    get length() { return this.#channel_count; }

    /** @returns {number} red or gray value */
    get r() { return this.#get_value(0); }
    /** @param {number} value */
    set r(value) { this.#set_value(0, value); }

    /** @returns {number} green value (or gray if grayscale) */
    get g() { return this.#is_gray ? this.#get_value(0) : this.#get_value(this.#bytes_per_channel); }
    /** @param {number} value */
    set g(value) {
        if (this.#is_gray) this.#set_value(0, value);
        else this.#set_value(this.#bytes_per_channel, value);
    }

    /** @returns {number} blue value (or gray if grayscale) */
    get b() { return this.#is_gray ? this.#get_value(0) : this.#get_value(2 * this.#bytes_per_channel); }
    /** @param {number} value */
    set b(value) {
        if (this.#is_gray) this.#set_value(0, value);
        else this.#set_value(2 * this.#bytes_per_channel, value);
    }

    /** @returns {number} alpha value */
    get a() {
        if (!this.#has_alpha) throw new error('This format has no alpha channel.');
        return this.#get_value(this.#alpha_offset);
    }
    /** @param {number} value */
    set a(value) {
        if (!this.#has_alpha) throw new error('This format has no alpha channel.');
        this.#set_value(this.#alpha_offset, value);
    }

    /** @returns {number} grayscale value (average of RGB if needed) */
    get gray() {
        if (this.#is_gray) return this.#get_value(0);
        const sum = this.r + this.g + this.b;
        return this.#is_float ? sum / 3 : Math.round(sum / 3);
    }
    /** @param {number} value */
    set gray(value) {
        this.r = value;
        this.g = value;
        this.b = value;
    }

    #get_value(byte_offset) {
        const method = `get${this.#array_type}`;
        if (this.#bytes_per_channel === 1) {
            return this.#view[method](byte_offset);
        } else {
            // For 2 and 4 byte reads, we use big-endian (false) to match existing behaviour.
            // For float we also use big-endian for consistency.
            return this.#view[method](byte_offset, false);
        }
    }

    #set_value(byte_offset, value) {
        const method = `set${this.#array_type}`;
        if (this.#bytes_per_channel === 1) {
            this.#view[method](byte_offset, value);
        } else {
            // For 2 and 4 byte writes, use big-endian (false)
            this.#view[method](byte_offset, value, false);
        }
    }

    /**
     * Set pixel channels from an array of values.
     * @param {number[]} values
     * @throws {type_error}
     */
    set(values) {
        if (!array.is_array(values)) throw new type_error('Argument must be an array.');
        const count = Math.min(this.#channel_count, values.length);
        for (let i = 0; i < count; i++) {
            this.#set_value(i * this.#bytes_per_channel, values[i]);
        }
        // Zero out remaining channels if any
        for (let i = count; i < this.#channel_count; i++) {
            this.#set_value(i * this.#bytes_per_channel, 0);
        }
    }
}

// ---------------------------------------------------------------------
// Image metadata (immutable-like, but with setters for flexibility)
// ---------------------------------------------------------------------

/**
 * Holds image metadata: id, name, url, mime, size, format.
 */
class image_metadata_class {
    #id;
    #name;
    #url;
    #mime;
    #size;
    #format;

    /**
     * @param {Object} params
     * @param {string} [params.id]
     * @param {string} [params.name]
     * @param {string|uri} [params.url]
     * @param {sizei} [params.size]
     * @param {number} [params.format]
     */
    constructor({ id, name, url, size, format } = {}) {
        this.id = id ?? crypto.randomUUID();
        if (url) this.url = url;
        else this.name = name ?? string.uid();
        if (size) this.size = size;
        if (format) this.format = format;
    }

    get id() { return this.#id; }
    set id(value) {
        if (!string.is_key(value)) throw new type_error('image id must be a uuid.');
        this.#id = value;
    }

    get name() { return this.#name; }
    set name(value) {
        if (kind_of(value) !== 'string') throw new type_error('image name must be a string.');
        this.#name = value;
    }

    get url() { return this.#url?.path ?? ''; }
    set url(value) {
        const kind = kind_of(value);
        if (kind !== 'uri' && kind !== 'string') {
            throw new type_error('url must be a uri or a string.');
        }
        this.#url = kind === 'uri' ? value : new uri(value);
        this.name = this.#url.file_name;
        this.#mime = image_mimetype(this.#url.ext);
    }

    get mime() { return `image/${this.#mime}`; }
    set mime(value) {
        if (kind_of(value) !== 'string') throw new type_error('mime type must be a string.');
        this.#mime = value.replace(/^image\//, '');
    }

    get size() { return this.#size; }
    set size(value) {
        if (kind_of(value) !== 'size') throw new type_error('image size must be of type size.');
        this.#size = value;
    }

    get width() { return this.#size?.width ?? 0; }
    get height() { return this.#size?.height ?? 0; }

    get format() { return this.#format; }
    set format(value) {
        if (!format_specs[value]) throw new type_error('Unknown image format.');
        this.#format = value;
    }
}

// ---------------------------------------------------------------------
// Pixel storage – manages the raw pixel array
// ---------------------------------------------------------------------

/**
 * Manages the pixel data array and provides pixel-level access.
 */
class image_pixel_storage_class {
    #pixels;
    #format;
    #width;
    #height;

    /**
     * @param {number} width
     * @param {number} height
     * @param {number} format
     * @param {ArrayLike<number>} [data] - initial pixel data
     */
    constructor(width, height, format, data = null) {
        this.#width = width;
        this.#height = height;
        this.#format = format;
        this.init_pixels(data);
    }

    /** @returns {Uint8ClampedArray|Uint16Array|Uint32Array|Float32Array} */
    get pixels() { return this.#pixels; }

    /** @returns {number} */
    get format() { return this.#format; }
    set format(value) { this.#format = value; }

    /** @returns {number} */
    get width() { return this.#width; }
    set width(value) { this.#width = value; }

    /** @returns {number} */
    get height() { return this.#height; }
    set height(value) { this.#height = value; }

    /** @returns {number} total number of pixels */
    get pixel_count() { return this.#width * this.#height; }

    /** @returns {number} number of channels per pixel */
    get channel_count() { return get_format_spec(this.#format).channel_count; }

    /** @returns {number} total length of pixel array */
    get data_length() { return this.pixel_count * this.channel_count; }

    /**
     * Initialize or replace pixel data.
     * @param {ArrayLike<number>} [data]
     */
    init_pixels(data) {
        if (data && !array.is_array(data)) {
            throw new type_error('Data must be an array.');
        }
        this.#pixels = allocate_typed_array_for_format(this.#format, this.data_length);
        if (data) {
            this.#pixels.set(data);
        }
    }

    /**
     * Get pixel at (x, y).
     * @param {number} x
     * @param {number} y
     * @param {pixel_class} [result] - optional pixel object to reuse
     * @returns {pixel_class}
     */
    pixel_at(x, y, result = null) {
        if (x < 0 || x >= this.#width || y < 0 || y >= this.#height) {
            throw new error(`Coordinates (${x}, ${y}) out of bounds.`);
        }
        if (!(result instanceof pixel_class) || result.kind !== 'pixel') {
            result = new pixel_class(this.#format);
        }
        const start = (y * this.#width + x) * this.channel_count;
        const end = start + this.channel_count;
        const values = Array.from(this.#pixels.slice(start, end));
        result.set(values);
        return result;
    }

    /**
     * Sample pixel at normalized coordinates.
     * @param {number} nx - 0..1
     * @param {number} ny - 0..1
     * @param {pixel_class} [result]
     * @returns {pixel_class}
     */
    sample(nx, ny, result = null) {
        const sx = Math.floor(numb.clamp(nx, 0, 1) * (this.#width - 1));
        const sy = Math.floor(numb.clamp(ny, 0, 1) * (this.#height - 1));
        return this.pixel_at(sx, sy, result);
    }

    /**
     * Create a copy of the pixel data.
     * @returns {Uint8ClampedArray|Uint16Array|Uint32Array|Float32Array}
     */
    clone_data() {
        return this.#pixels.slice();
    }
}

// ---------------------------------------------------------------------
// Image converter (strategy-based)
// ---------------------------------------------------------------------

/**
 * Convert a source pixel to target format values.
 * @param {pixel_class} src_pixel
 * @param {number} src_format
 * @param {number} dst_format
 * @returns {number[]} array of channel values for destination pixel
 */
const convert_pixel_values = (src_pixel, src_format, dst_format) => {
    const src_spec = get_format_spec(src_format);
    const dst_spec = get_format_spec(dst_format);
    const src_max = get_max_for_format(src_format);
    const dst_max = get_max_for_format(dst_format);

    // Extract source colour and alpha
    let r, g, b, a;
    if (src_spec.is_gray) {
        const gray = src_pixel.gray;
        r = g = b = gray;
    } else {
        r = src_pixel.r;
        g = src_pixel.g;
        b = src_pixel.b;
    }
    a = src_spec.has_alpha ? src_pixel.a : null;

    // Scaling factor
    const scaleFactor = dst_max / src_max;

    // Helper to scale a single channel
    const scaleChannel = (val) => {
        const scaled = val * scaleFactor;
        // Round only if destination is integer format
        return dst_spec.is_float ? scaled : Math.round(scaled);
    };

    const values = [];

    if (dst_spec.is_gray) {
        let gray;
        if (src_spec.is_gray) {
            gray = r;
        } else {
            // Compute luminance (simple average)
            gray = (r + g + b) / 3;
            if (!src_spec.is_float) gray = Math.round(gray); // integer src already rounded
        }
        values.push(scaleChannel(gray));
        if (dst_spec.has_alpha) {
            values.push(a !== null ? scaleChannel(a) : dst_max);
        }
    } else {
        values.push(scaleChannel(r), scaleChannel(g), scaleChannel(b));
        if (dst_spec.has_alpha) {
            values.push(a !== null ? scaleChannel(a) : dst_max);
        }
    }
    return values;
};

/**
 * Write pixel values into a destination array at the given offset.
 * @param {Uint8ClampedArray|Uint16Array|Uint32Array|Float32Array} dest_array
 * @param {number} offset - pixel index (not byte offset)
 * @param {number[]} values
 * @param {number} dst_format
 */
const write_pixel_to_array = (dest_array, offset, values, dst_format) => {
    const dst_spec = get_format_spec(dst_format);
    const start = offset * dst_spec.channel_count;
    for (let i = 0; i < values.length; i++) {
        dest_array[start + i] = values[i];
    }
};

/**
 * Convert an image from any format to any other format.
 * @param {image_class} src_img
 * @param {number} target_format
 * @param {image_class} [dest_img]
 * @returns {image_class}
 */
export const convert_image_format = (src_img, target_format, dest_img = null) => {
    // If formats identical, handle copy or return source
    if (src_img.format === target_format) {
        if (dest_img && dest_img !== src_img) {
            dest_img.format = target_format;
            dest_img.size = src_img.size;
            dest_img.init_pixels(src_img.pixels.slice());
            return dest_img;
        }
        return src_img;
    }

    const pixel_count = src_img.pixel_count;
    const dst_spec = get_format_spec(target_format);
    const src_format = src_img.format;

    // Allocate destination array
    const dest_array = allocate_typed_array_for_format(
        target_format,
        pixel_count * dst_spec.channel_count
    );

    // Process each pixel
    const src_pixel = new pixel_class(src_format);
    for (let i = 0; i < pixel_count; i++) {
        const x = i % src_img.width;
        const y = Math.floor(i / src_img.width);
        src_img.pixel_at(x, y, src_pixel);
        const dst_values = convert_pixel_values(src_pixel, src_format, target_format);
        write_pixel_to_array(dest_array, i, dst_values, target_format);
    }

    // Store result
    if (dest_img) {
        dest_img.format = target_format;
        dest_img.size = src_img.size;
        dest_img.init_pixels(dest_array);
        return dest_img;
    } else {
        src_img.format = target_format;
        src_img.init_pixels(dest_array);
        return src_img;
    }
};

// ---------------------------------------------------------------------
// Main image class (facade)
// ---------------------------------------------------------------------

/**
 * Image class – represents an image with metadata and pixel data.
 */
export class image_class {
    #metadata;
    #storage;
    #hash;

    /**
     * @param {Object} params
     * @param {string} [params.id]
     * @param {string} [params.name]
     * @param {string|uri} [params.url]
     * @param {number} [params.width]
     * @param {number} [params.height]
     * @param {sizei} [params.size]
     * @param {number} [params.format=img_format.rgba_8]
     * @param {ArrayLike<number>} [params.data]
     */
    constructor({ id, name, url, width, height, size, format = img_format.rgba_8, data } = {}) {
        // Create metadata
        this.#metadata = new image_metadata_class({ id, name, url, size, format });
        // Ensure size is set
        if (!size) {
            this.#metadata.size = new sizei(width ?? 0, height ?? 0);
        }
        // Create storage
        this.#storage = new image_pixel_storage_class(
            this.#metadata.width,
            this.#metadata.height,
            this.#metadata.format,
            data
        );
        if (data) {
            this.#hash = calculate_image_hash(this.#storage.pixels, this.width, this.height);
        }
    }

    get kind() { return 'image'; }
    static get format_constants() { return img_format; }

    // Metadata delegation
    get id() { return this.#metadata.id; }
    set id(value) { this.#metadata.id = value; }

    get name() { return this.#metadata.name; }
    set name(value) { this.#metadata.name = value; }

    get url() { return this.#metadata.url; }
    set url(value) { this.#metadata.url = value; }

    get mime() { return this.#metadata.mime; }
    set mime(value) { this.#metadata.mime = value; }

    get width() { return this.#metadata.width; }
    set width(value) {
        this.#metadata.size.width = value;
        if (this.#storage) this.#storage.width = value;
    }

    get height() { return this.#metadata.height; }
    set height(value) {
        this.#metadata.size.height = value;
        if (this.#storage) this.#storage.height = value;
    }

    get size() { return this.#metadata.size; }
    set size(value) {
        this.#metadata.size = value;
        if (this.#storage) {
            this.#storage.width = value.width;
            this.#storage.height = value.height;
        }
    }

    get format() { return this.#metadata.format; }
    set format(value) {
        this.#metadata.format = value;
        if (this.#storage) this.#storage.format = value;
    }

    // Pixel storage delegation
    get pixels() { return this.#storage.pixels; }
    get pixel_count() { return this.#storage.pixel_count; }
    get channel_count() { return this.#storage.channel_count; }
    get data_length() { return this.#storage.data_length; }

    get hash() { return this.#hash; }

    // Methods
    init_pixels(data) {
        this.#storage.init_pixels(data);
        this.#hash = calculate_image_hash(this.#storage.pixels, this.width, this.height);
    }

    pixel_at(x, y, result) {
        return this.#storage.pixel_at(x, y, result);
    }

    sample(x, y, result) {
        return this.#storage.sample(x, y, result);
    }

    equals(other) {
        if (other === NULL) return false;
        if (!size_equals(this.size, other.size)) return false;
        if (this.format !== other.format) return false;
        return this.#hash === other.#hash;
    }

    /**
     * Get ImageData (always RGBA8). May perform conversion.
     * @returns {ImageData}
     */
    get image_data() {
        if (this.format === img_format.rgba_8) {
            return new ImageData(this.pixels.slice(), this.width, this.height);
        }
        // Convert a copy to RGBA8
        const temp = new image_class({
            width: this.width,
            height: this.height,
            format: this.format,
            data: this.pixels.slice()
        });
        const converted = convert_image_format(temp, img_format.rgba_8);
        return new ImageData(converted.pixels, this.width, this.height);
    }

    // Recalculate hash (e.g., after manual pixel changes)
    recalc_hash() {
        this.#hash = calculate_image_hash(this.#storage.pixels, this.width, this.height);
    }
}