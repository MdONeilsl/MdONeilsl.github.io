import { error, type_error } from "../../error.js";
import { kind_of } from "../../functions.js";
import { elem, new_node } from "../html.js";
import { string } from "../text/string.js";
import { color } from "./color.js";
import { size_to_css, sizei } from "./size.js";
//import { init_gui_worker, div_worker_id } from "./gui_util.js";


export const canv_worker_id = string.uuid();
export var canv_worker;
export const init_canv_worker = () => {
    if (!elem(div_worker_id)) init_gui_worker();
    canv_worker = canv_create_in(elem(div_worker_id), canv_worker_id, `2d`, { willReadFrequently: true });
};


export class canvas {
    #canv_id;
    #type;
    #opt;

    #elem
    #ctx;
    #clear_color = new color(color.RGBA, 255, 255, 255, 0);

    /**
     * Constructs a new canvas object.
     * @param {String|HTMLCanvasElement} id - The id of the canvas element or the canvas element itself.
     * @param {String} type - The type of the rendering context (default is '2d').
     * @param {Object} opt - Additional options for the rendering context.
     */
    constructor(id, type = `2d`, opt = {}) {
        if (id instanceof HTMLCanvasElement) {
            this.#elem = id;
            if (!id.id) id.id = string.uid();
            this.#canv_id = id.id;
        }
        else {
            this.#canv_id = id;
            if (!elem(id))
                this.#elem = new_node(`canvas`, { id: id });
        }

        this.#type = type;
        this.#opt = opt;

        this.elem.width = this.elem?.offsetWidth || 300;
        this.elem.height = this.elem?.offsetHeight || 150;
        this.elem.style.cssText = size_to_css(new sizei(this.elem.width, this.elem.height));
    };

    /** @returns {String} The type of the canvas object. */
    get kind() { return `canvas`; };

    /** @returns {String} The id of the canvas element. */
    get id() { return this.#canv_id; };

    /** @returns {HTMLCanvasElement} The canvas element. */
    get elem() {
        if (!this.#elem) this.#elem = elem(this.#canv_id);
        return this.#elem;
    };

    /** @returns {CanvasRenderingContext2D} The rendering context of the canvas. */
    get ctx() {
        if (!this.#ctx) this.#ctx = this.elem.getContext(this.#type, this.#opt);
        return this.#ctx;
    };

    /** @returns {Object} The additional options for the rendering context. */
    get opt() { return this.#opt; };
    set opt(x) { this.#opt = x; };

    /** @returns {color} The clear color of the canvas. */
    get clear_color() { return this.#clear_color; };
    set clear_color(x) {
        if (kind_of(x) !== `color`) throw new type_error(`parameter must be of type "color".`);
        this.#clear_color = x;
    }

    /** @returns {Number} The width of the canvas. */
    get width() { return this.elem.width; };
    /** @returns {Number} The height of the canvas. */
    get height() { return this.elem.height; };

    /** @returns {sizei} The size of the canvas. */
    get size() { return new sizei(this.width, this.height); };

};

/**
 * Creates a new canvas element and appends it to the specified parent element.
 * @param {Element} parent - The parent element to which the canvas will be appended.
 * @param {string} id - The id attribute for the canvas element.
 * @param {string} type - The context identifier defining the type of rendering context to create (e.g., '2d', 'webgl').
 * @param {object} opt - An optional object containing properties to be used as the configuration options for the canvas.
 * @returns {canvas} - A new canvas object representing the created canvas element.
 */
export const canv_create_in = (parent, id, type = `2d`, opt = {}) => {
    const can = new canvas(new_node(`canvas`, { id: id }), type, opt);
    parent.appendChild(can.elem);
    return can;
};

/**
 * Sets the size of the canvas element and updates its style properties accordingly.
 * If the provided width and height are of type 'size', it sets the style using the size_to_css function.
 * Otherwise, it directly sets the width and height style properties of the canvas element.
 * If the canvas element does not have the 'width' attribute, it calls the canv_set_pixel_ratio function to set the pixel ratio.
 * @param {canvas|HTMLCanvasElement} canv - The canvas object for which the size will be set.
 * @param {number|size} w - The width of the canvas, or a size object representing the width and height.
 * @param {number} [h] - The height of the canvas (optional if w is not a size object).
 * @returns {void}
 */
export const canv_set_size = (canv, w, h) => {
    const e = (kind_of(canv) === `canvas`) ? canv.elem : canv;
    if (kind_of(w) === `size`) {
        e.style.cssText = size_to_css(w);
    }
    else {
        e.style.width = `${w}px`;
        e.style.height = `${h}px`;
        //setTimeout(e => canv.elem.style.height = `${h}px`, 0);
    }
};

/**
 * Sets the pixel ratio of the canvas element.
 * If the provided width and height are of type 'size', it calls itself recursively with the width and height values.
 * Otherwise, it directly sets the width and height properties of the canvas element.
 * @param {canvas|HTMLCanvasElement} canv - The canvas object for which the pixel ratio will be set.
 * @param {number|size} w - The width of the canvas, or a size object representing the width and height.
 * @param {number} [h] - The height of the canvas (optional if w is not a size object).
 * @returns {void}
 */
export const canv_set_pixel_ratio = (canv, w, h) => {
    if (kind_of(w) == `size`)
        return canv_set_pixel_ratio(canv, w.width, w.height);

    //console.log(w, h);
    if (!string.is_integer(`${w}`) || !string.is_integer(`${h}`)) throw new type_error(`Invalid input`, w, h);
    const el = (kind_of(canv) === `canvas`) ? canv.elem : canv;
    el.width = w;
    el.height = h;
};

/**
 * Sets the fullscreen mode of the canvas.
 * If `full` is true, it sets the canvas size to the window's inner width and height,
 * and adds a resize event listener to adjust the canvas size when the window is resized.
 * If `full` is false, it removes the resize event listener.
 * @param {canvas|HTMLCanvasElement} canv - The canvas object or the canvas element to be set to fullscreen.
 * @param {Boolean} full - A boolean indicating whether to set the canvas to fullscreen mode.
 * @returns {void}
 */
export const canv_set_fullscreen = (canv, full) => {
    if (full) {
        canv_set_size(canv, window.innerWidth, window.innerHeight);

        window.addEventListener(`resize`, canv_set_size(canv, window.innerWidth, window.innerHeight), false);
    }
    else {
        window.removeEventListener(`resize`, canv_set_size(canv, window.innerWidth, window.innerHeight), false);
    }
};

/**
 * Clears the canvas with the specified color.
 * If no color is provided, it uses the clear color of the canvas.
 *
 * @param {canvas|HTMLCanvasElement} canv - The canvas object or the canvas element to be cleared.
 * @param {color} [color] - The color with which to clear the canvas. If not provided, it uses the clear color of the canvas.
 * @returns {void}
 *
 * @throws {error} - If the provided object is not a canvas.
 *
 * Try using ctx_clear_rect
 */
export const canv_clear = (canv, col) => {
    const ctx = canv?.ctx ?? canv.getContext('2d');
    if (!ctx) throw new error(`Function call on non canvas.`);
    ctx.save();
    ctx.fillStyle = (col ?? canv.clear_color)?.rgb.css;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canv.width, canv.height);
    ctx.restore();
};

/**
 * @param {canvas} canv 
 * @param {rect} source 
 * @returns {Uint8ClampedArray}
 */
export const canv_data = (canv, src) => {
    const ctx = canv?.ctx ?? canv.getContext('2d');
    const sx = src?.x ?? 0;
    const sy = src?.y ?? 0;
    const sw = src?.width ?? canv.width;
    const sh = src?.height ?? canv.height;
    return ctx.getImageData(sx, sy, sw, sh).data;
};

/**
 * Converts canvas to blob efficiently with configurable format and quality
 * @param {HTMLCanvasElement} canvas - Source canvas element
 * @param {string} mime_type - Output format ('png', 'jpeg', 'webp', or 'auto')
 * @param {number} quality - Compression quality from 0.0 to 1.0
 * @returns {Promise<Blob>} Promise resolving to image blob
 */
export const canv_to_blob = (canv, mime_type = 'png', quality = 1.0) => { 
    if (!canv.elem || !canv.elem.toBlob && !canv.elem.toDataURL) return Promise.reject(new type_error('Invalid canvas element'));

    const q = quality < 0 ? 0 : quality > 1 ? 1 : quality;
    let type = mime_type;

    if (type === 'auto') {
        try {
            const img_data = canv.ctx.getImageData(0, 0, canv.width, canv.height);
            type = has_transparency(img_data.data) ? 'png' : 'jpeg';
        } catch {
            type = 'png';
        }
    }

    const mime = `image/${type}`;

    if (canv.elem.toBlob) {
        return new Promise((resolve, reject) => {
            canv.elem.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob returned null')), mime, q);
        });
    }

    const data_url = canv.elem.toDataURL(mime, q);
    return fetch(data_url).then(r => r.blob());
};