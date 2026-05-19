import { array, pool } from "../array.js";
//import { error } from "../../error.js";
import { classes, kind_of } from "../../functions.js";
import { numb } from "../math/number.js";
import { xnode } from "../system/format/xml/xnode.js";
import { X, Y, pointf } from "./point.js";
import { HEIGHT, WIDTH } from "./size.js";

/** @constant {number} */
export const x1 = 0;
/** @constant {number} */
export const y1 = 1;
/** @constant {number} */
export const x2 = 2;
/** @constant {number} */
export const y2 = 3;

// {top:x1, left:y1, bottom:x2, right:y2}

class rect_base {
    /** @returns {String} */
    get kind() { return `rect`; }

    /** @returns {number} */
    get left() { return this[x1]; }
    /** @returns {number} */
    get top() { return this[y1]; }
    /** @returns {number} */
    get right() { return this[x2]; }
    /** @returns {number} */
    get bottom() { return this[y2]; }
    /** @returns {number} */
    get x() { return this[x1]; }
    /** @returns {number} */
    get y() { return this[y1]; }


    /** @param {number} x */
    set left(x) { this[x1] = x; }
    /** @param {number} x */
    set top(x) { this[y1] = x; }
    /** @param {number} x */
    set right(x) { this[x2] = x; }
    /** @param {number} x */
    set bottom(x) { this[y2] = x; }
    /** @param {number} x */
    set x(x) { this[x1] = x; }
    /** @param {number} x */
    set y(x) { this[y1] = x; }

};

class recti_ext {

    init(x, y, width, height) {
        this[x1] = Math.round(x);
        this[y1] = Math.round(y);
        this[x2] = x + Math.round(width) - 1;
        this[y2] = y + Math.round(height) - 1;

        //console.log(kind_of(x));
        const kind_x = kind_of(x);
        if (kind_x === `rect`) {
            this[x1] = Math.round(x[x1]);
            this[y1] = Math.round(x[y1]);
            this.width = x.width;
            this.height = x.height;
            //this[x2] = x[x2];
            //this[y2] = x[y2];
        }
        else if (kind_x === `point`) {
            this[x1] = Math.round(x.x);
            this[y1] = Math.round(x.y);
        }

        //console.log(kind_of(y));
        const kind_y = kind_of(y);
        if (kind_y === `point`) {
            this[x2] = Math.round(y.x);
            this[y2] = Math.round(y.y);
        }
        else if (kind_y === `size`) {
            this.width = y.width;
            this.height = y.height;
        }
    };

    /** @returns {number} */
    get width() { return this[x2] - this[x1] + 1; }
    /** @returns {number} */
    get height() { return this[y2] - this[y1] + 1; }

    /** @param {number} x */
    set width(x) { this[x2] = (this[x1] + Math.round(x) - 1); }
    /** @param {number} x */
    set height(x) { this[y2] = (this[y1] + Math.round(x) - 1); }
};

class rectf_ext {

    init(x, y, width, height) {
        this[x1] = x;
        this[y1] = y;
        this[x2] = x + width;
        this[y2] = y + height;

        if (kind_of(x) === `rect`) {
            //let adj = array.is_float_array(x) ? 0 : 1;
            this[x1] = x[x1];
            this[y1] = x[y1];
            this.width = x.width;
            this.height = x.height;
            //this[x2] = x[x2] - adj;
            //this[y2] = x[y2] - adj;
        }
        else if (kind_of(x) === `point`) {
            this[x1] = x.x;
            this[y1] = x.y;
        }

        if (kind_of(y) === `point`) {
            this[x2] = y.x;
            this[y2] = y.y;
        }
        else if (kind_of(y) === `size`) {
            this[x2] = this[x1] + y.width;
            this[y2] = this[y1] + y.height;
        }
    };

    /** @returns {number} */
    get width() { return this[x2] - this[x1]; }
    /** @returns {number} */
    get height() { return this[y2] - this[y1]; }

    /** @param {number} x */
    set width(x) { this[x2] = (this[x1] + x); }
    /** @param {number} x */
    set height(x) { this[y2] = (this[y1] + x); }
};

/**
 * Represents a rectangle with integer coordinates.
 * @class recti
 * @extends Int16Array
 * @extends rect_base
 * @extends recti_ext
 */
export class recti extends classes(Int16Array, rect_base, recti_ext) {

    /**
     * Constructs a new recti object.
     * @constructs recti
     * @example new recti(left, top, width, height)
     * @example new recti(left_top, bottom_right)
     * @example new recti(left_top_point, size)
     * @example new recti(rect)
     * 
     * @param {number|point|rect} x - The x-coordinate of the top-left corner, or a point or another rectangle to initialize from.
     * @param {number|point|size} y - The y-coordinate of the top-left corner, or a point or size to initialize from.
     * @param {number} [width=0] - The width of the rectangle.
     * @param {number} [height=0] - The height of the rectangle.
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        super(4);
        super.init(x, y, width, height);
    }

    /**
     * Gets the length of the rectangle in bytes.
     * @returns {number} The length of the rectangle in bytes.
     */
    static get BYTES_LENGTH() { return Int16Array.BYTES_PER_ELEMENT * 4; }
};

/**
 * Represents a rectangle with integer coordinates.
 * @class recti32
 * @extends Int32Array
 * @extends rect_base
 * @extends recti_ext
 */
export class recti32 extends classes(Int32Array, rect_base, recti_ext) {

    /**
     * Constructs a new recti object.
     * @constructs recti
     * @example new recti32(left, top, width, height)
     * @example new recti32(left_top, bottom_right)
     * @example new recti32(left_top_point, size)
     * @example new recti32(rect)
     * 
     * @param {number|point|rect} x - The x-coordinate of the top-left corner, or a point or another rectangle to initialize from.
     * @param {number|point|size} y - The y-coordinate of the top-left corner, or a point or size to initialize from.
     * @param {number} [width=0] - The width of the rectangle.
     * @param {number} [height=0] - The height of the rectangle.
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        super(4);
        super.init(x, y, width, height);
    }

    /**
     * Gets the length of the rectangle in bytes.
     * @returns {number} The length of the rectangle in bytes.
     */
    static get BYTES_LENGTH() { return Int32Array.BYTES_PER_ELEMENT * 4; }
};

/**
 * Represents a rectangle with integer coordinates.
 * @class recti
 * @extends BigInt64Array
 * @extends rect_base
 * @extends recti_ext
 */
export class recti64 extends classes(BigInt64Array, rect_base, recti_ext) {

    /**
     * Constructs a new recti object.
     * @constructs recti64
     * @example new recti64(left, top, width, height)
     * @example new recti64(left_top, bottom_right)
     * @example new recti64(left_top_point, size)
     * @example new recti64(rect)
     * 
     * @param {number|point|rect} x - The x-coordinate of the top-left corner, or a point or another rectangle to initialize from.
     * @param {number|point|size} y - The y-coordinate of the top-left corner, or a point or size to initialize from.
     * @param {number} [width=0] - The width of the rectangle.
     * @param {number} [height=0] - The height of the rectangle.
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        super(4);
        super.init(x, y, width, height);
    }

    /**
     * Gets the length of the rectangle in bytes.
     * @returns {number} The length of the rectangle in bytes.
     */
    static get BYTES_LENGTH() { return BigInt64Array.BYTES_PER_ELEMENT * 4; }
};

/**
 * @class  rectf
 * @extends Float32Array
 */
export class rectf extends classes(Float32Array, rect_base, rectf_ext) {

    /**
     * new 
     * @constructs rectf
     * @param {number|point} x 
     * @param {number|point|size} y 
     * @param {number} [width] 
     * @param {number} [height] 
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        super(4);
        super.init(x, y, width, height);
    }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 4; }
};

export class rectd extends classes(Float64Array, rect_base, rectf_ext) {

    /**
     * @constructs rectd
     * @param {number|point} x 
     * @param {number|point|size} y 
     * @param {number} [width] 
     * @param {number} [height] 
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        super(4);
        super.init(x, y, width, height);
    }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Float64Array.BYTES_PER_ELEMENT * 4; }
};

/**
 * @class  rect_i16p
 * @extends Int16Array
 */
export class rect_i16p extends classes(Int16Array, rect_base, recti_ext) {
    #buff;

    /**
     * @constructs rect_i16p
     * @param {number|point|rect} x 
     * @param {number|point|size} y 
     * @param {number} [width] 
     * @param {number} [height] 
     */
    constructor(obj, x = 0, y = 0, width = 0, height = 0) {

        let buff
        if (obj instanceof pool) buff = obj;
        else if (ArrayBuffer.isView(obj)) buff = obj.buff;
        else throw new error('Parameter is of the wrong type.');

        super(buff.buffer, buff.align(Int16Array, 4), 4);
        this.#buff = buff;

        super.init(x, y, width, height);
    }

    /** @returns {Object} */
    get buff() { return this.#buff; }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Int16Array.BYTES_PER_ELEMENT * 4; }

};

/**
 * @class  rect_i16p_ref
 * @extends Int16Array
 */
export class rect_i16p_ref extends classes(Int16Array, rect_base, recti_ext) {

    /**
     * @constructs rect_i16p_ref
     * @param {ArrayBuffer} buffer 
     * @param {number} offset 
     */
    constructor(buffer, offset = 0) {
        super(buffer, offset, 4);
    }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Int16Array.BYTES_PER_ELEMENT * 4; }

};

/**
 * @class  rect_f32p
 * @extends Float32Array
 */
export class rect_f32p extends classes(Float32Array, rect_base, rectf_ext) {
    #buff;

    /**
     * @constructs rect_f32p
     * @param {pool} _x1 
     * @param {number|point|rect} _x1 
     * @param {number|point|size} _y1 
     * @param {number} [_x2] 
     * @param {number} [_y2] 
     */
    constructor(obj, x = 0, y = 0, width = 0, height = 0) {

        let buff
        if (obj instanceof pool) buff = obj;
        else if (ArrayBuffer.isView(obj)) buff = obj.buff;
        else throw new error('Parameter is of the wrong type.');

        super(buff.buffer, buff.align(Float32Array, 4), 4);
        this.#buff = buff;

        super.init(x, y, width, height);
    }

    /** @returns {Object} */
    get buff() { return this.#buff; }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 4; }

};

/**
 * @class  rect_f32p_ref
 * @extends Float32Array
 */
export class rect_f32p_ref extends classes(Float32Array, rect_base, rectf_ext) {

    /**
     * @constructs line_f32p_ref
     * @param {ArrayBuffer} buffer 
     * @param {number} offset 
     */
    constructor(buffer, offset) {
        super(buffer, offset, 4);
    }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 4; }

};

/**
 * Sets the coordinates of the given rectangle to the specified values.
 * @param {rect} r0 - The rectangle to be modified.
 * @param {Number} v1 - The x-coordinate of the top-left corner.
 * @param {Number} v2 - The y-coordinate of the top-left corner.
 * @param {Number} v3 - The x-coordinate of the bottom-right corner.
 * @param {Number} v4 - The y-coordinate of the bottom-right corner.
 * @returns {rect} The modified rectangle with the updated coordinates.
 */
export const rect_set = (r0, v1, v2, v3, v4) => {
    r0[x1] = v1;
    r0[y1] = v2;
    r0[x2] = v3;
    r0[y2] = v4;
    return r0;
};

/**
 * Checks if the given rectangle is null (has zero area).
 * @param {rect} r1 - The rectangle to be checked.
 * @returns {boolean} True if the rectangle is null, false otherwise.
 */
export const rect_is_null = r1 => {
    // Check if the rectangle is of type FloatArray
    const adj = array.is_float_array(r1) ? 0 : 1;
    return numb.fuzzy_comparef(r1[x1], r1[x2] + adj) && numb.fuzzy_comparef(r1[y1], r1[y2] + adj);
};

/**
 * Returns the size of the rectangle.
 * @param {rect} r0 - The rectangle to calculate the size for.
 * @param {size} result - The result object to store the size.
 * @returns {size} The size of the rectangle.
 */
export const rect_size = (r0, result) => {
    // Determine adjustment based on the type of the rectangle
    const adj = array.is_float_array(r0) ? 0 : 1;
    // Calculate width and height and store in the result object
    result[WIDTH] = r0[x2] - r0[x1] + adj;
    result[HEIGHT] = r0[y2] - r0[y1] + adj;
    return result;
};

/**
 * Sets the size of the rectangle to the given size. The top-left corner is not moved.
 * @param {rect} r0 - The rectangle to be modified.
 * @param {size} size - The size to set for the rectangle.
 * @returns {rect} The modified rectangle with the updated size.
 */
export const rect_set_size = (r0, size) => {
    // Determine adjustment based on the type of the rectangle
    //let adj = array.is_float_array(r0) ? 0 : 1;
    // Set the bottom-right corner coordinates based on the given size
    r0.width = size[WIDTH];
    r0.height = size[HEIGHT];
    return r0;
};

/**
 * Returns the position of the rectangle's top-left corner.
 * @param {rect} r0 - The rectangle to get the top-left corner position from.
 * @param {point} [result=new pointf()] - The result object to store the top-left corner position.
 * @returns {point} The position of the top-left corner of the rectangle.
 */
export const rect_top_left = (r0, result = new pointf()) => {
    result[X] = r0[x1];
    result[Y] = r0[y1];
    return result;
};

/**
 * Set the top-left corner of the rectangle to the given position. May change the size, but will never change the bottom-right corner of the rectangle.
 * @param {rect} r0 - The rectangle to be modified.
 * @param {point} p0 - The new position for the top-left corner.
 * @returns {rect} The modified rectangle with the updated top-left corner position.
 */
export const rect_set_top_left = (r0, p0) => {
    r0[x1] = p0[X];
    r0[y1] = p0[Y];
    return r0;
};

/**
 * Returns the position of the rectangle's bottom-right corner.
 * @param {rect} r0 - The rectangle to get the bottom-right corner position from.
 * @param {point} result - The result object to store the bottom-right corner position.
 * @returns {point} The position of the bottom-right corner of the rectangle.
 */
export const rect_bottom_right = (r0, result) => {
    result[X] = r0[x2];
    result[Y] = r0[y2];
    return result;
};

/**
 * Set the bottom-right corner of the rectangle to the given position. May change the size, but will never change the top-left corner of the rectangle.
 * @param {rect} r0 - The rectangle to be modified.
 * @param {point} p0 - The new position for the bottom-right corner.
 * @returns {rect} The modified rectangle with the updated bottom-right corner position.
 */
export const rect_set_bottom_right = (r0, p0) => {
    r0[x2] = p0[X];
    r0[y2] = p0[Y];
    return r0;
};

/**
 * Returns the position of the rectangle's top-right corner.
 * @param {rect} r0 - The rectangle to get the top-right corner position from.
 * @param {point} result - The result object to store the top-right corner position.
 * @returns {point} The position of the top-right corner of the rectangle.
 */
export const rect_top_right = (r0, result) => {
    result[X] = r0[x2];
    result[Y] = r0[y1];
    return result;
};

/**
 * Set the top-right corner of the rectangle to the given position. May change the size, but will never change the bottom-left corner of the rectangle.
 * @param {rect} r0 - The rectangle to be modified.
 * @param {point} p0 - The new position for the top-right corner.
 */
export const rect_set_top_right = (r0, p0) => {
    r0[x2] = p0[X];
    r0[y1] = p0[Y];
};

/**
 * Returns the position of the rectangle's bottom-left corner.
 * @param {rect} r0 - The rectangle to get the bottom-left corner position from.
 * @param {point} result - The result object to store the bottom-left corner position.
 * @returns {point} The position of the bottom-left corner of the rectangle.
 */
export const rect_bottom_left = (r0, result) => {
    result[X] = r0[x1];
    result[Y] = r0[y2];
    return result;
};

/**
 * Set the bottom-left corner of the rectangle to the given position. May change the size, but will never change the top-right corner of the rectangle.
 * @param {rect} r0 - The rectangle to be modified.
 * @param {point} p0 - The new position for the bottom-left corner.
 */
export const rect_set_bottom_left = (r0, p0) => {
    r0[x1] = p0[X];
    r0[y2] = p0[Y];
};

/**
 * Returns the center point of the rectangle.
 * @param {rect|Array<number>} r0 - The rectangle to calculate the center point for.
 * @param {point|Array<number>} result - The result object to store the center point.
 * @returns {point|Array<number>} The center point of the rectangle.
 */
export const rect_center = (r0, result) => {
    const cx = (+r0[x1]) + (r0.width * 0.5);
    const cy = (+r0[y1]) + (r0.height * 0.5);

    if (array.is_float_array(result)) {
        result[X] = cx;
        result[Y] = cy;
    }
    else {
        result[X] = Math.round(cx);
        result[Y] = Math.round(cy);
    }
    return result;
};

/**
 * Moves the rectangle horizontally, leaving the rectangle's left edge at the given x coordinate.
 * @param {Array<number>} rect - The rectangle to be moved.
 * @param {number} at - The x coordinate to move the left edge to.
 */
export const rect_move_left = (r0, at) => {
    r0[x2] += (at - r0[x1]);
    r0[x1] = at;
};

/**
 * Moves the rectangle vertically, leaving the rectangle's top edge at the given y coordinate.
 * @param {Array<number>} rect - The rectangle to be moved.
 * @param {number} at - The y coordinate to move the top edge to.
 */
export const rect_move_top = (r0, at) => {
    // Move the bottom edge by the difference between the new top edge position and the current top edge position
    r0[y2] += (at - r0[y1]);
    // Set the new top edge position
    r0[y1] = at;
};

/**
 * Moves the rectangle horizontally, leaving the rectangle's right edge at the given x coordinate.
 * @param {Array<number>} rect - The rectangle to be moved.
 * @param {number} at - The x coordinate to move the right edge to.
 */
export const rect_move_right = (r0, at) => {
    // Move the left edge by the difference between the new right edge position and the current right edge position
    r0[x1] += (at - r0[x2]);
    // Set the new right edge position
    r0[x2] = at;
};

/**
 * Moves the rectangle vertically, leaving the rectangle's bottom edge at the given y coordinate.
 * @param {Array<number>} rect - The rectangle to be moved.
 * @param {number} at - The y coordinate to move the bottom edge to.
 */
export const rect_move_bottom = (r0, at) => {
    // Move the top edge by the difference between the new bottom edge position and the current bottom edge position
    r0[y1] += (at - r0[y2]);
    // Set the new bottom edge position
    r0[y2] = at;
};

/**
 * Moves the rectangle, leaving the top-left corner at the given position.
 * @param {rect|Array<number>} r0 - The rectangle to be modified.
 * @param {point|Array<number>} pos - The new position for the top-left corner.
 */
export const rect_move_top_left = (r0, pos) => {
    // Adjust the bottom-right corner based on the new top-left corner position
    r0[x2] += (pos[X] - r0[x1]);
    r0[x1] = pos[X];
    r0[y2] += (pos[Y] - r0[y1]);
    r0[y1] = pos[Y];
};

/**
 * Moves the rectangle, leaving the bottom-right corner at the given position.
 * @param {Array<number>} r0 - The rectangle to be modified.
 * @param {Array<number>} pos - The new position for the bottom-right corner.
 */
export const rect_move_bottom_right = (r0, pos) => {
    r0[x1] += (pos[X] - r0[x2]);
    r0[x2] = pos[X];
    r0[y1] += (pos[Y] - r0[y2]);
    r0[y2] = pos[Y];
};

/**
 * Moves the rectangle, leaving the top-right corner at the given position.
 * @param {Array<number>} r0 - The rectangle to be modified.
 * @param {Array<number>} pos - The new position for the top-right corner.
 */
export const rect_move_top_right = (r0, pos) => {
    // Move the left edge by the difference between the new right edge position and the current right edge position
    r0[x1] += (pos[X] - r0[x2]);
    // Set the new right edge position
    r0[x2] = pos[X];
    // Move the bottom edge by the difference between the new top edge position and the current top edge position
    r0[y2] += (pos[Y] - r0[y1]);
    // Set the new top edge position
    r0[y1] = pos[Y];
};

/**
 * Moves the rectangle, leaving the bottom-left corner at the given position.
 * @param {Array<number>} r0 - The rectangle to be modified.
 * @param {Array<number>} pos - The new position for the bottom-left corner.
 * @returns {Array<number>} The modified rectangle with the updated bottom-left corner position.
 */
export const rect_move_bottom_left = (r0, pos) => {
    // Move the right edge by the difference between the new bottom-left corner x position and the current bottom-left corner x position
    r0[x2] += (pos[X] - r0[x1]);
    // Set the new bottom-left corner x position
    r0[x1] = pos[X];
    // Move the top edge by the difference between the new bottom-left corner y position and the current bottom-left corner y position
    r0[y1] += (pos[Y] - r0[y2]);
    // Set the new bottom-left corner y position
    r0[y2] = pos[Y];
    return r0;
};

/**
 * Moves the rectangle, leaving the center point at the given position.
 * @param {Array<number>} r0 - The rectangle to be modified.
 * @param {Array<number>} pos - The new position for the center point.
 * @returns {Array<number>} The modified rectangle with the updated center point position.
 */
export const rect_move_center = (r0, pos) => {
    // Calculate the width and height of the rectangle
    let width = r0[x2] - r0[x1];
    let height = r0[y2] - r0[y1];

    if (array.is_float_array(r0)) {
        r0[x1] = pos[X] - (width * 0.5);
        r0[y1] = pos[Y] - (height * 0.5);
    }
    else {
        r0[x1] = pos[X] - Math.round(width * 0.5);
        r0[y1] = pos[Y] - Math.round(height * 0.5);
    }

    r0[x2] = r0[x1] + width;
    r0[y2] = r0[y1] + height;

    return r0;
};

/**
 * Moves the rectangle along the x and y axes, relative to the current position.
 * @param {Array<number>} r0 - The rectangle to be moved.
 * @param {number|Array<number>} x - The amount to move along the x axis, or a point representing the amount to move along both axes.
 * @param {number} [y] - The amount to move along the y axis (if x is a number).
 */
export const rect_translate = (r0, x, y) => {
    if (kind_of(x) === `point`) {
        y = x[Y];
        x = x[X];
    }

    r0[x1] += x;
    r0[x2] += x;
    r0[y1] += y;
    r0[y2] += y;
};

/**
 * Returns a copy of the rectangle that is translated dx along the x axis and dy along the y axis, relative to the current position. Positive values move the rectangle to the right and down.
 * @param {Array<number>} r0 - The original rectangle.
 * @param {number|Array<number>} x - The amount to move along the x axis, or a point representing the amount to move along both axes.
 * @param {number} [y] - The amount to move along the y axis (if x is a number).
 * @param {Array<number>} result - The result object to store the translated rectangle.
 * @returns {Array<number>} The translated rectangle.
 */
export const rect_translated = (r0, x, y, result) => {
    if (kind_of(x) === `point`) {
        result = y;
        y = x[Y];
        x = x[X];
    }

    let rx1 = r0[x1] + x,
        ry1 = r0[x2] + x,
        rx2 = r0[y1] + y,
        ry2 = r0[y2] + y;

    // Round the coordinates if the rectangle is not a FloatArray
    if (!array.is_float_array(r0)) {
        rx1 = numb.rounded(rx1);
        ry1 = numb.rounded(ry1);
        rx2 = numb.rounded(rx2);
        ry2 = numb.rounded(ry2);
    }

    result[x1] = rx1;
    result[x2] = ry1;
    result[y1] = rx2;
    result[y2] = ry2;

    return result;
};

/**
 * Returns a copy of the rectangle that has its width and height exchanged.
 * @param {rect} r0 - The original rectangle.
 * @param {rect} result - The result object to store the transposed rectangle.
 * @returns {rect} The transposed rectangle.
 */
export const rect_transposed = (r0, result) => {
    // Copy the top-left corner coordinates from the original rectangle to the result
    result[x1] = r0[x1];
    result[y1] = r0[y1];

    // Calculate the width and height of the original rectangle
    let width = r0[x2] - r0[x1] + 1;
    let height = r0[y2] - r0[y1] + 1;

    // Set the transposed rectangle's bottom-right corner coordinates based on the original rectangle's dimensions
    result[x2] = (height + r0[x1] - 1);
    result[y2] = (width + r0[y1] - 1);

    return result;
};

/**
 * Returns a normalized rectangle; i.e., a rectangle that has a non-negative width and height.
 * @param {rect} r0 - The original rectangle to be normalized.
 * @param {rect} result - The result object to store the normalized rectangle.
 * @returns {rect} The normalized rectangle.
 */
export const rect_normalized = (r0, result) => {
    result[x1] = r0[x1];
    result[y1] = r0[y1];
    result[x2] = r0[x2];
    result[y2] = r0[y2];

    let adj = array.is_float_array(r0) ? 0 : 1;

    // Normalize the x-axis coordinates if the width is negative
    if (r0[x2] < r0[x1]) {
        result[x1] = r0[x2] + adj;
        result[x2] = r0[x1] - adj;
    }

    // Normalize the y-axis coordinates if the height is negative
    if (r0[y2] < r0[y1]) {
        result[y1] = r0[y2] + adj;
        result[y2] = r0[y1] - adj;
    }

    return result;
};

/**
 * Returns the intersection of the two given rectangles. Returns an empty rectangle if there is no intersection.
 * @param {rect} rect1 - The first rectangle.
 * @param {rect} rect2 - The second rectangle.
 * @param {rect} result - The result object to store the intersection rectangle.
 * @returns {rect} The intersection rectangle.
 */
export const rect_and = (rect1, rect2, result) => {
    result.fill(0); // Fill the result rectangle with 0
    let adj = 0; // Initialize the adjustment value

    // Check if the result is not a float array
    if (!array.is_float_array(result)) {
        adj = 1; // Set the adjustment value to 1
        result[x2] = -1; // Set the x2 coordinate of the result to -1
        result[y2] = -1; // Set the y2 coordinate of the result to -1
    }

    // Check if either of the rectangles is null
    if (rect_is_null(rect1) || rect_is_null(rect2))
        return result; // Return the empty result rectangle

    // Calculate the left and right coordinates for the intersection
    let l1 = rect1[x1], r1 = rect1[x2];
    if (rect1[x2] < rect1[x1] - adj) {
        l1 = rect1[x2] + adj;
        r1 = rect1[x1] - adj;
    }

    let l2 = rect2[x1], r2 = rect2[x2];
    if (rect2[x2] < rect2[x1] - adj) {
        l2 = rect2[x2] + adj;
        r2 = rect2[x1] - adj;
    }

    // Check if there is no intersection on the x-axis
    if (l1 > r2 || l2 > r1)
        return result; // Return the empty result rectangle

    // Calculate the top and bottom coordinates for the intersection
    let t1 = rect1[y1], b1 = rect1[y2];
    if (rect1[y2] < rect1[y1] - adj) {
        t1 = rect1[y2] + adj;
        b1 = rect1[y1] - adj;
    }

    let t2 = rect2[y1], b2 = rect2[y2];
    if (rect2[y2] < rect2[y1] - adj) {
        t2 = rect2[y2] + adj;
        b2 = rect2[y1] - adj;
    }

    // Check if there is no intersection on the y-axis
    if (t1 > b2 || t2 > b1)
        return result; // Return the empty result rectangle

    // Calculate the coordinates of the intersection rectangle
    result[x1] = Math.max(l1, l2);
    result[y1] = Math.max(t1, t2);
    result[x2] = Math.min(r1, r2);
    result[y2] = Math.min(b1, b2);
    return result; // Return the intersection rectangle
};

/**
 * Returns the bounding rectangle of the two given rectangle.
 * @param {rect} rect1 
 * @param {rect} rect2 
 * @param {rect} result 
 * @returns {rect}
 */
export const rect_or = (rect1, rect2, result) => {
    if (rect_is_null(rect1)) return rect2;
    if (rect_is_null(rect2)) return rect1;

    let adj = array.is_float_array(result) ? 0 : 1;

    let l1 = rect1[x1], r1 = rect1[x1] - adj;
    if (rect1[x2] < rect1[x1] - adj) l1 = rect1[x2] + adj;
    else r1 = rect1[x2];

    let l2 = rect2[x1], r2 = rect2[x1] - adj;
    if (rect2[x2] < rect2[x1] - adj) l2 = rect2[x2] + adj;
    else r2 = rect2[x2];

    let t1 = rect1[y1], b1 = rect1[y1] - adj;
    if (rect1[y2] < rect1[y1] - adj) t1 = rect1[y2] + adj;
    else b1 = rect1[y2];

    let t2 = rect2[y1], b2 = rect2[y1] - adj;
    if (rect2[y2] < rect2[y1] - adj) t2 = rect2[y2] + adj;
    else b2 = rect2[y2];

    result[x1] = Math.min(l1, l2);
    result[x2] = Math.max(r1, r2);
    result[y1] = Math.min(t1, t2);
    result[y2] = Math.max(b1, b2);

    return result;
};

/**
 * Returns true if the given point is inside or on the edge of the rectangle, otherwise returns false. 
 * If inside is true, this function only returns true if the given point is inside the rectangle (i.e., not on the edge).
 * @param {rect} r1 
 * @param {number|point} x 
 * @param {number|boolean} [y] 
 * @param {boolean} [inside] 
 * @returns {boolean}
 */
export const rect_contains_point = (r1, x, y, inside) => {
    if (kind_of(x) === `point`)
        return rect_contains_point(r1, x[X], x[Y], y);

    let adj = array.is_float_array(r1) ? 0 : 1;

    let l, r;
    if (r1[x2] < r1[x1] - adj) {
        l = r1[x2] + adj;
        r = r1[x1] - adj;
    } else {
        l = r1[x1];
        r = r1[x2];
    }

    if (inside) {
        if (x <= l || x >= r)
            return false;
    } else {
        if (x < l || x > r)
            return false;
    }

    let t, b;
    if (r1[y2] < r1[y1] - adj) {
        t = r1[y2] + adj;
        b = r1[y1] - adj;
    } else {
        t = r1[y1];
        b = r1[y2];
    }

    if (inside) {
        if (y <= t || y >= b)
            return false;
    } else {
        if (y < t || y > b)
            return false;
    }

    return true;
};

/**
 * Returns true if rect2 is inside of rect1. otherwise returns false. 
 * If inside is true, this function only returns true if rect2 is entirely inside rect1 (not on the edge).
 * @param {rect} rect1 
 * @param {rect} rect2 
 * @param {boolean} inside 
 * @returns {boolean}
 */
export const rect_contains_rect = (rect1, rect2, inside) => {

    if (rect_is_null(rect1) || rect_is_null(rect2))
        return false;

    let adj = array.is_float_array(rect1) ? 0 : 1;

    let l1 = rect1[x1], r1 = rect1[x1] - adj;
    if (rect1[x2] < rect1[x1] - adj) l1 = rect1[x2] + adj;
    else r1 = rect1[x2];

    let l2 = rect2[x1], r2 = rect2[x1] - adj;
    if (rect2[x2] < rect2[x1] - adj) l2 = rect2[x2] + adj;
    else r2 = rect2[x2];

    if (inside) {
        if (l2 <= l1 || r2 >= r1)
            return false;
    } else {
        if (l2 < l1 || r2 > r1)
            return false;
    }

    let t1 = rect1[y1], b1 = rect1[y1] - adj;
    if (rect1[y2] < rect1[y1] - adj) t1 = rect1[y2] + adj;
    else b1 = rect1[y2];

    let t2 = rect2[y1], b2 = rect2[y1] - adj;
    if (rect2[y2] < rect2[y1] - adj) t2 = rect2[y2] + adj;
    else b2 = rect2[y2];

    if (inside) {
        if (t2 <= t1 || b2 >= b1)
            return false;
    } else {
        if (t2 < t1 || b2 > b1)
            return false;
    }

    return true;
};

/**
 * Returns true if rect1 intersects with rect2 (i.e., there is at least one pixel that is within both rectangles), otherwise returns false.
 * @param {rect} rect1 
 * @param {rect} rect2 
 * @returns {boolean}
 */
export const rect_intersects_rect = (rect1, rect2) => {
    if (rect_is_null(rect1) || rect_is_null(rect2))
        return false;

    let adj = array.is_float_array(rect1) ? 0 : 1;

    let l1 = rect1[x1], r1 = rect1[x2];
    if (rect1[x2] < rect1[x1] - adj) {
        l1 = rect1[x2] + adj;
        r1 = rect1[x1] - adj;
    }

    let l2 = rect2[x1], r2 = rect2[x2];
    if (rect2[x2] < rect2[x1] - 1) {
        l2 = rect2[x2] + adj;
        r2 = rect2[x1] - adj;
    }

    if (l1 > r2 || l2 > r1)
        return false;

    let t1 = rect1[y1], b1 = rect1[y2];
    if (rect1[y2] < rect1[y1] - adj) {
        t1 = rect1[y2] + adj;
        b1 = rect1[y1] - adj;
    }

    let t2 = rect2[y1], b2 = rect2[y2];
    if (rect2[y2] < rect2[y1] - adj) {
        t2 = rect2[y2] + adj;
        b2 = rect2[y1] - adj;
    }

    if (t1 > b2 || t2 > b1)
        return false;

    return true;
};

export const rect_to_xml = r1 => {
    const node = new xnode(`rect`);
    node.append_child(new xnode(`x`)).value = `${r1.x}`;
    node.append_child(new xnode(`y`)).value = `${r1.y}`;
    node.append_child(new xnode(`width`)).value = `${r1.width}`;
    node.append_child(new xnode(`height`)).value = `${r1.height}`;
    return node;
};

export const rect_from_xml = node => {
    const r = new recti();
    r.x = numb.parse(node.child_by_name(`x`).value);
    r.y = numb.parse(node.child_by_name(`y`).value);
    r.width = numb.parse(node.child_by_name(`width`).value);
    r.height = numb.parse(node.child_by_name(`height`).value);
    return r;
};
