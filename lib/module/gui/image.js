//import { array } from "../array.js";
//import { error, type_error } from "../error.js";
import { kind_of, NULL } from "../../functions.js";
//import { new_node } from "../html.js";
//import { numb } from "../math/number.js";
//import { ctx_draw_img, ctx_get_data } from "../rendering/2d/contex2d.js";
//import { uri } from "../system/uri.js";
import { string } from "../text/string.js";
//import { canv_set_pixel_ratio, canvas } from "./canvas.js";
//import { size_equals, size_set, sizei } from "./size.js";

/** TODO
Clean this module of all pixel manipulation.
This module is for HTML <img> images only.
Implement all new image pixel manipulation in lib/module/rendering/2d/image.js.
*/


export const ALIGN_CENTER = 0;
export const ALIGN_TOP_LEFT = 1;

export const PADDING_MIN = 0;
export const PADDING_MAX = 1;

export const save_link_id = string.uid();


const IMG_FORMAT = {
    GRAY8: 0,
    GRAY16: 1,
    RGB8: 2,
    RGBA8: 3
};

const FORMAT_RGB8 = IMG_FORMAT.RGB8;
const FORMAT_RGBA8 = IMG_FORMAT.RGBA8;
const FORMAT_GRAY8 = IMG_FORMAT.GRAY8;
const FORMAT_GRAY16 = IMG_FORMAT.GRAY16;


export class image {
    #id;
    #url = ``;
    #name;
    #mime;
    #size;
    #pixels = NULL;
    #format;
    #hash;

    constructor({ id, name, url, width, height, size, format = FORMAT_RGBA8, data }) {

        this.id = id ?? crypto.randomUUID();
        if (url) this.url = url;
        else this.name = name ?? string.uid();

        this.size = size ?? new sizei(width ?? 0, height ?? 0);
        this.format = format;
        if (data) this.init_pixels(data);
    };

    /** @returns {String} */
    get kind() { return `image`; };

    static get FORMAT() { return IMG_FORMAT; };

    get id() { return this.#id; };
    set id(value) {
        if (string.is_key(value)) this.#id = value;
        else throw new type_error(`image id must be a uuid.`);

    };

    get name() { return this.#name; };
    set name(value) {
        if (kind_of(value) === `string`) this.#name = value;
        else throw new type_error(`image name must be a string.`);

    };

    get url() { return this.#url?.path ?? ``; };
    set url(value) {
        const kind = kind_of(value);
        if (kind !== `uri` && kind !== `string`) throw new type_error(`url name must be a uri or a string.`);
        this.#url = kind === `uri` ? value : new uri(value);
        this.name = this.#url.file_name;
        this.#mime = image_mimetype(this.#url.ext);
    };

    get mime() { return `image/${this.#mime}`; };
    set mime(value) {
        if (kind_of(value) === `string`) this.#mime = value.replace(/^image\//, ``);
        else throw new type_error(`mime type must be a string.`);

    };

    get width() { return this.#size.width; };
    set width(value) {
        if (kind_of(value) === `number`) this.#size.width = value;
        else throw new type_error(`image width must be a number.`);

    };

    get height() { return this.#size.height; };
    set height(value) {
        if (kind_of(value) === `number`) this.#size.height = value;
        else throw new type_error(`image height must be a number.`);

    };

    get size() { return this.#size; };
    set size(value) {
        if (kind_of(value) === `size`) this.#size = value;
        else throw new type_error(`image size must be of type size.`);

    };

    get hash() { return this.#hash; };
    set hash(value) {
        if (kind_of(value) === `number`) this.#hash = value;
        else throw new type_error(`image hash must be a number.`);
    };

    get pixel_length() {
        const format = this.#format;
        if (format === FORMAT_GRAY8 || format === FORMAT_GRAY16) return 1;
        if (format === FORMAT_RGB8) return 3;
        if (format === FORMAT_RGBA8) return 4;
        throw new error('Unknown image format.');
    };

    get pixel_numb() { return this.#size.width * this.#size.height; };

    get data_length() { return this.pixel_numb * this.pixel_length; };

    get format() { return this.#format; };
    set format(value) {
        if (Object.values(IMG_FORMAT).includes(value)) this.#format = value;
        else throw new type_error(`Unknow image format.`);

    };

    get pixels() { return this.#pixels; };

    get ImageData() {
        const pixel_numb = this.pixel_numb;
        const pixel_length = this.pixel_length;

        const format = this.#format;
        const rgba = FORMAT_RGBA8;

        const data = new Uint8ClampedArray(this.data_length);
        const pix = new pixel(format);

        for (let i = 0; i < pixel_numb; i++) {
            this.#pixels.get(i, pix);
            data[i * pixel_length + 0] = pix.r;
            data[i * pixel_length + 1] = pix.g;
            data[i * pixel_length + 2] = pix.b;
            data[i * pixel_length + 3] = format === rgba ? pix.a : 0xFF;
        }

        return new ImageData(data, this.#size.width, this.#size.height);
    };

    init_pixels(data) {
        if (!array.is_array(data)) throw new type_error(`Data must be an array.`);
        const type = this.#format === FORMAT_GRAY16 ? `Uint16` : `Uint8Clamped`;
        this.#pixels = new globalThis[`${type}Array`](this.data_length);
        if (data) {
            this.#pixels.set(data);
            this.eval_hash();
        }
    };

    pixel_at(x, y, result) {
        if (kind_of(result) !== `pixel`) result = new pixel(this.#format);
        const start = (y * this.width + x) * this.pixel_length;
        result.set(this.#pixels.slice(start, start + result.length));
        return result;
    };

    sample(x, y, result) {
        const sx = Math.floor(numb.clamp(x, 0, 1) * (this.width - 1));
        const sy = Math.floor(numb.clamp(y, 0, 1) * (this.height - 1));

        //const sx = Math.min(Math.floor(x * this.width), this.width - 1);
        //const sy = Math.min(Math.floor(y * this.height), this.height - 1);
        return this.pixel_at(sx, sy, result);
    }

    equals(other) {
        if (other === NULL) return false;
        if (!size_equals(this.size, other.size)) return false;
        if (this.format !== other.format) return false;
        return (this.#hash === other.#hash);
    };

    eval_hash() {
        if (this.#pixels === NULL) throw new error("Pixels must be initialized.");

        const c1 = 0xcc9e2d51;
        const c2 = 0x1b873593;
        const r1 = 15;
        const r2 = 13;
        const m = 5;
        const n = 0xe6546b64;

        let hash = 0;

        // Precompute initial values for width and height
        hash ^= (this.#size.width ^ (this.#size.width >>> 16)) * c1;
        hash ^= (this.#size.height ^ (this.#size.height >>> 16)) * c1;

        const pixels = this.#pixels;
        const len = pixels.length;

        // Process in larger chunks and reduce function call overhead
        for (let i = 0; i < len; i += 8) {
            for (let j = 0; j < 8; j++) {
                if (i + j >= len) break;

                let v = pixels[i + j];
                v ^= (v >>> 16);
                v = (v * c1) ^ ((v >>> r1) * c2);
                hash ^= v;
                hash = (hash << r2) | (hash >>> (32 - r2));
                hash = hash * m + n;
            }
        }

        // Finalize hash with length
        hash ^= len;
        hash ^= (hash >>> 16);
        hash = (hash * 0x85ebca6b) ^ (hash >>> 13);
        hash = (hash * 0xc2b2ae35) ^ (hash >>> 16);

        this.#hash = hash >>> 0; // Convert to unsigned int
    }

};

export class pixel {
    #length;
    #count;
    #format;
    #view;
    #gray;

    constructor(format = FORMAT_RGBA8) {
        this.#init(format);
    }

    #init(format) {
        const formats = {
            [FORMAT_GRAY8]: { length: 1, count: 1, format: 'Uint8', gray: true },
            [FORMAT_GRAY16]: { length: 2, count: 1, format: 'Uint16', gray: true },
            [FORMAT_RGB8]: { length: 3, count: 3, format: 'Uint8', gray: false },
            [FORMAT_RGBA8]: { length: 4, count: 4, format: 'Uint8', gray: false }
        };

        const selectedFormat = formats[format];
        if (selectedFormat) {
            this.#length = selectedFormat.length;
            this.#count = selectedFormat.count;
            this.#format = selectedFormat.format;
            this.#gray = selectedFormat.gray;
            this.#view = new DataView(new ArrayBuffer(this.#length));
        }
        else {
            throw new error(`Unsupported image format: ${format}`);
        }
    }

    get kind() { return `pixel`; };
    get length() { return this.#count; }

    get r() { return this.#view[`get${this.#format}`](0); }
    set r(value) { this.#view[`set${this.#format}`](0, value); }

    get g() { return this.#view[`get${this.#format}`](this.#gray ? 0 : 1); }
    set g(value) { this.#view[`set${this.#format}`](this.#gray ? 0 : 1, value); }

    get b() { return this.#view[`get${this.#format}`](this.#gray ? 0 : 2); }
    set b(value) { this.#view[`set${this.#format}`](this.#gray ? 0 : 2, value); }

    get a() {
        if (this.#view.byteLength < 4) throw new error(`There is no alpha channel.`);
        return this.#view.getUint8(3);
    }
    set a(value) {
        if (this.#view.byteLength < 4) throw new error(`There is no alpha channel.`);
        this.#view.setUint8(3, value);
    }

    get gray() {
        let sum = 0;
        const max = Math.min(this.#count, 3);
        for (let i = 0; i < max; ++i)
            sum += this.#view[`get${this.#format}`](i);
        return Math.round(sum / max);
    };

    set gray(value) {
        this.r = value;
        this.g = value;
        this.b = value;
    }

    /**
     * Sets values in the view based on the provided argument array.
     * 
     * @param {Array} arg - The array of values to set in the view.
     */
    set(arg) {
        if (!array.is_array(arg)) throw new type_error(`Argument must be an array.`);
        const max = Math.max(this.#count, arg.length);
        for (let i = 0; i < max; i++) {
            this.#view[`set${this.#format}`](i, i < arg.length ? arg[i] : 0);
        }
    };
};

/**
 * @param {size} size 
 * @param {Number} format 
 * @returns 
 */
export const image_new = (size, format = FORMAT_RGBA8) => {
    const ret = new image({ size: size, format: format });
    ret.init_pixels();
    return ret;
};

export const image_mimetype = url => {
    if (kind_of(url) === `uri`) url = url.path;
    if (/\.apng$/i.test(url)) return `apng`;
    if (/\.avif$/i.test(url)) return `avif`;
    if (/\.(jpg|jpeg|jfif|pjpeg|pjp)$/i.test(url)) return `jpeg`;
    if (/\.png$/i.test(url)) return `png`;
    if (/\.svg$/i.test(url)) return `svg+xml`;
    if (/\.webp$/i.test(url)) return `webp`;
    if (/\.bmp$/i.test(url)) return `bmp`;
    if (/\.(ico|cur)$/i.test(url)) return `x-icon`;
    if (/\.(tif|tiff)$/i.test(url)) return `tiff`;
    throw new error(`Unknow image type.`);
};

/**
 * Computes a hash for the given image based on its pixel data using an optimized version of MurmurHash3.
 * Includes image width and height in the hash to differentiate between images with the same pixel data.
 * @param {Object} img - The image object containing pixel data.
 * @returns {number} The computed hash value.
 * @throws {Error} If the pixel data is not initialized.
 */
export const image_hash = (img) => {
    const img_kind = kind_of(img);
    if (img_kind === `image` && !img.pixels) throw new error("Pixels must be initialized.");

    const murmur_hash3 = (key, width, height) => {
        const c1 = 0xcc9e2d51;
        const c2 = 0x1b873593;
        const m = 5;
        const n = 0xe6546b64;

        let hash = 0;
        hash ^= (width * 0x5bd1e995) >>> 0;
        hash ^= (height * 0x5bd1e995) >>> 0;

        const buff = new Uint32Array(key.buffer);
        const len = buff.length;

        for (let i = 0; i < len; i++) {
            let k = buff[i];

            k = (k * c1) >>> 0;
            k ^= (k >>> 16);
            k = (k * c2) >>> 0;
            hash ^= k;

            hash = (hash << 13) | (hash >>> 19);
            hash = (hash * m + n) >>> 0;
        }

        hash ^= len;
        hash ^= (hash >>> 16);
        hash = (hash * 0x85ebca6b) >>> 0 ^ (hash >>> 13);
        hash = (hash * 0xc2b2ae35) >>> 0 ^ (hash >>> 16);

        return `${hash >>> 0}`; // Convert to unsigned int
    };

    let pixels;
    if (img_kind === `ImageData`) pixels = img.data;
    else if (img_kind === `image`) pixels = img.pixels;
    else throw new Error("Invalid image format.");

    return murmur_hash3(pixels, img.width, img.height);
};

/**
 * Calculate the opacity ratio of an image.
 * 
 * @param {ImageData|HTMLImageElement|ImageBitmap|image} img - The image object or ImageData to calculate opacity from.
 * @returns {number} The calculated opacity ratio between 0 and 1.
 * @throws {Error} Throws an error if pixels are not initialized or if the image type is unsupported.
 */
export const opacity = img => {
    const kind = kind_of(img);

    let pixels;
    if (kind === 'ImageData') {
        pixels = img.data;
    } else if (kind === 'image') {
        if (!img.pixels) throw new error("Pixels must be initialized.");
        pixels = img.pixels;
    } else if (kind === 'Image' || kind === 'ImageBitmap') {
        const canv = new canvas(elem('canvas'));
        canv_set_pixel_ratio(canv, img.width, img.height);
        ctx_draw_img(canv, img);
        pixels = ctx_get_data(canv).data;
    } else {
        throw new error("Unsupported image type.");
    }

    let opacity_sum = 0;
    const length = pixels.length;

    for (let i = 3; i < length; i += 4) {
        opacity_sum += pixels[i];
    }

    return (opacity_sum / 255) / (length / 4);
};

export const image_sub_section = (img, rect, result) => {
    if (kind_of(result) !== `image`) {
        result = new image({ width: rect.width, height: rect.height, format: img.format });
        result.init_pixels();
    }
    else if (img.format !== result.format) {
        throw new error('Target image is of the wrong format.');
    }

    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > img.width || rect.y + rect.height > img.height) {
        throw new error('Target region is out of bounds');
    }

    const src_line_bytes = img.width * img.pixel_length;
    const result_line_bytes = result.width * result.pixel_length;

    for (let i = 0; i < result.height; i++) {
        const src_start = (src_line_bytes * i) + (rect.x * img.pixel_length);
        const result_start = result_line_bytes * i;
        const line = img.pixels.slice(src_start, src_start + result_line_bytes);
        result.pixels.set(line, result_start);
    }
    result.eval_hash();
    return result;
};

/**
 * Converts an image from a URL to an image object.
 * @param {image} img - The image object to be populated.
 * @param {String} url - The URL of the image.
 * @param {Number} format - The format of the image (e.g., FORMAT_RGBA8).
 * @param {Function?} fb - Optional callback function.
 */
export const image_from_url = (img, url, format = FORMAT_RGBA8, fb) => {
    // Set the URL and name of the image
    img.url = url;

    // Create a new Image object and set its onload event
    const o = new Image();
    o.onload = () => {

        // Create a canvas element with the same dimensions as the loaded image
        const canv = document.createElement('canvas');
        canv_set_size(canv, o.naturalWidth, o.naturalHeight);

        // Draw the loaded image onto the canvas
        ctx_draw_img(canv.getContext('2d'), o);

        // Convert the canvas to an image object
        image_from_canv(img, canv, format, fb);
    };
    // Set the source of the Image object to the provided URL
    o.src = url;
};

/** 
 * @param {image} img 
 * @param {HTMLImageElement} element 
 * @param {Number} format 
 * @param {Function?} fb 
 */
export const image_from_elem = (img, element, format = image.FORMAT.RGBA8, fb) => {
    const canv = document.createElement('canvas');
    canv_set_size(canv, element.clientWidth, element.clientHeight);
    ctx_draw_img(canv.getContext('2d'), element);
    image_from_canv(img, canv, format, fb);
};

/**
 * @param {image} img 
 * @param {canvas|HTMLCanvasElement} canv 
 * @param {Number} format 
 * @param {Function?} fb 
 */
export const image_from_canv = (img, canv, format = image.FORMAT.RGBA8, fb) => {

    const data = ctx_get_data(canv).data;
    let size;
    if (kind_of(canv) === `canvas`) size = canv.size;
    else size = new sizei(canv.width, canv.height);

    if (!data) throw new error(`Unknow canvas type.`);
    image_from_data(img, data, size, image.FORMAT.RGBA8, format, fb);
};

/**
 * @param {image} img 
 * @param {Array} src_data 
 * @param {size} src_size 
 * @param {Number} src_format 
 * @param {Number} dest_format 
 * @param {Function} fb 
 */
export const image_from_data = (img, src_data, src_size, src_format, dest_format, fb) => {
    size_set(img.size, src_size);
    img.format = src_format;
    img.init_pixels(src_data);

    if (src_format !== dest_format) {
        image_convert_to(img, dest_format);
    }

    if (fb) fb(img);
};

export const image_to_elem = (parent, img) => {
    const canv = new canvas(new_node(`canvas`));
    canv_set_pixel_ratio(canv, img.width, img.height);
    ctx_draw_img(canv.ctx, img);

    const node = new_node(`img`, {
        id: img.id,
        width: img.width,
        height: img.height,
        src: canv.elem.toDataURL(img.type),
        data: {
            name: img.name,
            type: img.type
        }
    });
    return parent.appendChild(img);
};

/**
 * @param {image} img 
 * @param {string} name 
 */
export const image_save = async img => {
    const canv = document.createElement('canvas');

    canv_set_size(canv, img.size);
    ctx_draw_img(canv.ctx, img);

    const link = elem(save_link_id);
    link.download = img.name;
    link.href = canv_worker.elem.toDataURL(`image/png`).replace(`image/png`, `image/octet-stream`);
    link.click();
};

export const image_convert_to = (img, format) => {
    if (img.format === format) return;

    const data_length = img.width * img.height;
    let dest;

    switch (format) {
        case FORMAT_RGB8:
            dest = new Uint8ClampedArray(data_length * 3);
            break;
        case FORMAT_RGBA8:
            dest = new Uint8ClampedArray(data_length * 4);
            break;
        case FORMAT_GRAY8:
            dest = new Uint8ClampedArray(data_length);
            break;
        case FORMAT_GRAY16:
            dest = new Uint16Array(data_length);
            break;
        default:
            throw new error('Unknown image format.');
    }

    const u8ToU16 = numb.MAX_UINT16 / numb.MAX_UINT8;
    const u16ToU8 = numb.MAX_UINT8 / numb.MAX_UINT16;
    const rgb_max = numb.MAX_UINT8 * 3;

    const conv_funcs = {
        [FORMAT_GRAY8]: {
            [FORMAT_GRAY16]: (src, dest, i) => dest[i] = src[i] * u8ToU16,
            [FORMAT_RGB8]: (src, dest, i) => {
                const val = src[i];
                dest.set([val, val, val], i * 3);
            },
            [FORMAT_RGBA8]: (src, dest, i) => {
                const val = src[i];
                dest.set([val, val, val, numb.MAX_UINT8], i * 4);
            }
        },
        [FORMAT_GRAY16]: {
            [FORMAT_GRAY8]: (src, dest, i) => dest[i] = src[i] * u16ToU8,
            [FORMAT_RGB8]: (src, dest, i) => {
                const val = src[i] * u16ToU8;
                dest.set([val, val, val], i * 3);
            },
            [FORMAT_RGBA8]: (src, dest, i) => {
                const val = src[i] * u16ToU8;
                dest.set([val, val, val, numb.MAX_UINT8], i * 4);
            }
        },
        [FORMAT_RGB8]: {
            [FORMAT_GRAY8]: (src, dest, i) => {
                const offset = i * 3;
                dest[i] = numb.scale(src[offset] + src[offset + 1] + src[offset + 2], rgb_max, numb.MAX_UINT8);
            },
            [FORMAT_GRAY16]: (src, dest, i) => {
                const offset = i * 3;
                dest[i] = numb.scale(src[offset] + src[offset + 1] + src[offset + 2], rgb_max, numb.MAX_UINT16);
            },
            [FORMAT_RGBA8]: (src, dest, i) => {
                const offset = i * 3;
                dest.set([src[offset], src[offset + 1], src[offset + 2], numb.MAX_UINT8], i * 4);
            }
        },
        [FORMAT_RGBA8]: {
            [FORMAT_GRAY8]: (src, dest, i) => {
                const offset = i * 4;
                dest[i] = numb.scale(src[offset] + src[offset + 1] + src[offset + 2], rgb_max, numb.MAX_UINT8);
            },
            [FORMAT_GRAY16]: (src, dest, i) => {
                const offset = i * 4;
                dest[i] = numb.scale(src[offset] + src[offset + 1] + src[offset + 2], rgb_max, numb.MAX_UINT16);
            },
            [FORMAT_RGB8]: (src, dest, i) => {
                const offset = i * 4;
                dest.set([src[offset], src[offset + 1], src[offset + 2]], i * 3);
            }
        }
    };

    const src = img.pixels;
    const conv_func = conv_funcs[img.format][format];

    for (let i = 0; i < data_length; ++i) {
        conv_func(src, dest, i);
    }

    img.format = format;
    img.init_pixels(dest);
};

export const image_clamped_alpha = (img, alpha) => {
    const result = new image({ width: img.width, height: img.height, format: img.format, data: img.pixels });
    if (img.format !== FORMAT_RGBA8) image_convert_to(result, FORMAT_RGBA8);

    const src = img.pixels;
    for (let i = 3; i < src.length; i += 4) {
        src[i] = Math.min(src[i], alpha);
    }

    return result;
};

export const scale_image = (img, new_width, new_height) => {
    const src_width = img.width;
    const src_height = img.height;
    const src_data = img.pixels;
    const dest_data = new Uint8ClampedArray(new_width * new_height * 4);

    if (new_width < src_width || new_height < src_height) {
        // Scaling down using box kernel
        const scale_x = src_width / new_width;
        const scale_y = src_height / new_height;

        for (let y = 0; y < new_height; y++) {
            for (let x = 0; x < new_width; x++) {
                const start_x = Math.floor(x * scale_x);
                const start_y = Math.floor(y * scale_y);
                const end_x = Math.min(Math.ceil((x + 1) * scale_x), src_width);
                const end_y = Math.min(Math.ceil((y + 1) * scale_y), src_height);

                let r = 0, g = 0, b = 0, a = 0, count = 0;

                for (let sy = start_y; sy < end_y; sy++) {
                    for (let sx = start_x; sx < end_x; sx++) {
                        const src_index = (sy * src_width + sx) * 4;
                        r += src_data[src_index];
                        g += src_data[src_index + 1];
                        b += src_data[src_index + 2];
                        a += src_data[src_index + 3];
                        count++;
                    }
                }

                const dest_index = (y * new_width + x) * 4;
                dest_data[dest_index] = r / count;
                dest_data[dest_index + 1] = g / count;
                dest_data[dest_index + 2] = b / count;
                dest_data[dest_index + 3] = a / count;
            }
        }
    } else {
        // Scaling up using bicubic interpolation
        const interpolate = (t, a, b, c, d) => {
            return (
                0.5 *
                (a * (1 - t) * (1 - t) * (1 - t) +
                    b * (1 + t) * (1 - t) * (1 - t) +
                    c * (1 + t) * (1 + t) * (1 - t) +
                    d * (1 + t) * (1 + t) * (1 + t))
            );
        };

        const get_pixel = (data, width, height, x, y, offset) => {
            x = numb.clamp(x, 0, width - 1);
            y = numb.clamp(y, 0, height - 1);
            return data[(y * width + x) * 4 + offset];
        };

        const get_bicubic_pixel = (x, y, offset) => {
            const fx = Math.floor(x);
            const fy = Math.floor(y);
            const dx = x - fx;
            const dy = y - fy;

            const px = (i, j) => get_pixel(src_data, src_width, src_height, fx + i, fy + j, offset);

            const col0 = interpolate(dy, px(-1, -1), px(-1, 0), px(-1, 1), px(-1, 2));
            const col1 = interpolate(dy, px(0, -1), px(0, 0), px(0, 1), px(0, 2));
            const col2 = interpolate(dy, px(1, -1), px(1, 0), px(1, 1), px(1, 2));
            const col3 = interpolate(dy, px(2, -1), px(2, 0), px(2, 1), px(2, 2));
            return interpolate(dx, col0, col1, col2, col3);
        };

        const scale_x = src_width / new_width;
        const scale_y = src_height / new_height;

        for (let y = 0; y < new_height; y++) {
            for (let x = 0; x < new_width; x++) {
                const src_x = x * scale_x;
                const src_y = y * scale_y;

                const dest_index = (y * new_width + x) * 4;
                dest_data[dest_index] = get_bicubic_pixel(src_x, src_y, 0);
                dest_data[dest_index + 1] = get_bicubic_pixel(src_x, src_y, 1);
                dest_data[dest_index + 2] = get_bicubic_pixel(src_x, src_y, 2);
                dest_data[dest_index + 3] = get_bicubic_pixel(src_x, src_y, 3);
            }
        }
    }

    img.width = new_width;
    img.height = new_height;
    img.init_pixels(dest_data);
};

export const compute_normal_map = (vectors, width, height) => {

    const res = new image({ width: width, height: height, format: image.FORMAT.RGB8 });
    res.init_pixels();
    const dest = res.pixels;

    // Compute the normal map
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const v = vec3_normalize(vectors[y][x]);
            // Convert normalized vector to RGB color
            // Map [-1, 1] to [0, 255]
            const index = (y * width + x) * 4;
            dest[index + 0] = Math.floor((v.x + 1) * 127.5);
            dest[index + 1] = Math.floor((v.y + 1) * 127.5);
            dest[index + 2] = Math.floor((v.z + 1) * 127.5);
        }
    }

    return res;
};


