import { error, type_error } from "../../../error.js";
import { NULL, kind_of } from "../../../functions.js";
//import { size_equals, sizei } from "../../gui/size.js";
import { string } from "../../text/string.js";
//import { buffer } from "../buffer.js";
//import { uri } from "../../system/uri.js"
//import { ctx_draw_img } from "./contex2d.js";
//import { numb } from "../../math/number.js";
//import { canv_set_size } from "../../gui/canvas.js";
//import { vec3_normalize } from "../../math/vec3.js";
import { rendering_component } from "../rendering_component.js";

export const ALIGN_CENTER = 0;
export const ALIGN_TOP_LEFT = 1;

export const PADDING_MIN = 0;
export const PADDING_MAX = 1;

export const save_link_id = string.uid();

/**
 * Initializes the image worker by creating necessary elements and setting up the environment.
 
export const init_img_worker = () => {
    // Check if the GUI worker element is not present and initialize it if necessary
    if (!elem(div_worker_id)) init_gui_worker();
    
    // Check if the canvas worker element is not present and initialize it if necessary
    if (!elem(canv_worker_id)) init_canv_worker();
    
    // Create a new anchor element and append it to the GUI worker element
    const a = elem(div_worker_id).appendChild(new_node(`a`, { id: save_link_id, href: `#` }));
};

/**
 * Converts a canvas to an image element and appends it to the specified parent element.
 * @param {HTMLElement} parent - The parent element to which the image element will be appended.
 * @param {canvas} canv - The canvas object to be converted to an image.
 * @param {string} type - The type of the image to be created (e.g., 'image/png').
 * @returns {HTMLImageElement} - The created image element.
 * /
export const img_to_elem = (parent, canv, type) => {
    return parent.appendChild(new_node(`img`, { width: canv.width, height: canv.height, src: canv.elem.toDataURL(type) }));
};

//<img width="496" height="24" id="0be53b21-bf73-4ce8-b468-d8a85fbb4102" src="" data-name="header_back_tex.png" data-type="png"></img>
*/


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


export class image extends rendering_component {
    #id;
    #url = ``;
    #name;
    #mime;
    #size;
    #pixels = NULL;
    #format;
    #hash;

    constructor({ id, name, url, width, height, size, format = FORMAT_RGBA8, data }) {
        super();

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
        if (!string.is_key(value)) throw new type_error(`image id must be a uuid.`);
        this.#id = value;
    };

    get name() { return this.#name; };
    set name(value) {
        if (kind_of(value) !== `string`) throw new type_error(`image name must be a string.`);
        this.#name = value;
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
        if (kind_of(value) !== `string`) throw new type_error(`mime type must be a string.`);
        this.#mime = value.replace(/^image\//, ``);
    };

    get width() { return this.#size.width; };
    set width(value) {
        if (kind_of(value) !== `number`) throw new type_error(`image width must be a number.`);
        this.#size.width = value;
    };

    get height() { return this.#size.height; };
    set height(value) {
        if (kind_of(value) !== `number`) throw new type_error(`image height must be a number.`);
        this.#size.height = value;
    };

    get size() { return this.#size; };
    set size(value) {
        if (kind_of(value) !== `size`) throw new type_error(`image size must be of type size.`);
        this.#size = value;
    };

    get hash() { return this.#hash; };
    set hash(value) {
        if (kind_of(value) !== `number`) throw new type_error(`image hash must be a number.`);
        this.#hash = value;
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
        if (!Object.values(IMG_FORMAT).includes(value))
            throw new type_error(`Unknow image format.`);
        this.#format = value;
    };

    get buffer() { return this.#pixels; };
    get pixels() { return this.#pixels?.data; };

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
        const type = this.#format === FORMAT_GRAY16 ? buffer.TYPES.UINT16 : buffer.TYPES.UINT8C;
        const init = { stride: this.pixel_length, type: type, count: this.pixel_numb, data: data };
        if (this.parent) this.#pixels = this.scene.create_buffer(init);
        else this.#pixels = new buffer(init);
    };

    pixel_at(x, y, result) {
        const pix = result ?? new pixel(this.#format);
        return this.#pixels.get(x * this.width + y, pix);
    };

    equals(other) {
        if (other === NULL) return false;
        if (!size_equals(this.size, other.size)) return false;
        if (this.format !== other.format) return false;
        return this.buffer.equals(other.buffer);
    };

    eval_hash() {
        if (this.#pixels === NULL) throw new error("Pixels must be initalized.");

        const murmurHash3 = (key) => {
            const c1 = 0xcc9e2d51;
            const c2 = 0x1b873593;
            const r1 = 15;
            const r2 = 13;
            const m = 5;
            const n = 0xe6546b64;

            let hash = 0;
            const len = key.length;

            for (let i = 0; i < len; i++) {
                let k = key[i];
                k = (k ^ (k >>> 16)) * c1;
                k = (k ^ (k >>> r1)) * c2;
                hash ^= k;
                hash = (hash << r2) | (hash >>> (32 - r2));
                hash = (hash * m) + n;
            }

            hash ^= len;
            hash ^= (hash >>> 16);
            hash = (hash * 0x85ebca6b) ^ (hash >>> 13);
            hash = (hash * 0xc2b2ae35) ^ (hash >>> 16);

            return hash >>> 0; // Convert to unsigned int
        }

        this.hash = murmurHash3(this.pixels);
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

    };
    set gray(value) {
        this.r = value;
        this.g = value;
        this.b = value;
    }

    set(arg) {
        const max = Math.max(this.#count, arg.length);
        for (let i = 0; i < max; i++) {
            this.#view[`set${this.#format}`](i, arg[i]);
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

    return result;
};

/**
 * Computes a hash for the given image based on its pixel data using MurmurHash3.
 * @param {Object} img - The image object containing pixel data.
 * @returns {number} The computed hash value.
 * @throws {Error} If the pixel data is not initialized.
 */
export const image_hash = (img) => {
    if (!img.pixels) throw new error("Pixels must be initialized.");

    /**
     * Computes MurmurHash3 for a given key.
     * @param {Array<number>} key - The input data as an array of numbers.
     * @returns {number} The computed hash value.
     */
    const murmur_hash3 = (key) => {
        const c1 = 0xcc9e2d51;
        const c2 = 0x1b873593;
        const r1 = 15;
        const r2 = 13;
        const m = 5;
        const n = 0xe6546b64;

        let hash = 0;
        const len = key.length;

        for (let i = 0; i < len; i++) {
            let k = key[i];
            k ^= (k >>> 16);
            k = (k * c1) >>> 0;
            k ^= (k >>> r1);
            k = (k * c2) >>> 0;
            hash ^= k;
            hash = (hash << r2) | (hash >>> (32 - r2));
            hash = (hash * m + n) >>> 0;
        }

        hash ^= len;
        hash ^= (hash >>> 16);
        hash = (hash * 0x85ebca6b) >>> 0 ^ (hash >>> 13);
        hash = (hash * 0xc2b2ae35) >>> 0 ^ (hash >>> 16);

        return hash >>> 0; // Convert to unsigned int
    };

    return murmur_hash3(img.pixels);
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

    const data = canv_data(canv);
    let size;
    if (kine_of(canv) === `canvas`) size = canv.size;
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

