import { array, pool } from '../array.js';
import { classes } from '../../functions.js';
import { numb } from '../math/number.js';
import { string } from '../text/string.js';

/** @constant {number} */
export const X = 0;
/** @constant {number} */
export const Y = 1;


/**
 * Base class for point objects.
 * @class point_base
 */
class point_base {
    /**
     * Get the type of the point.
     * @returns {String} The type of the point.
     */
    get kind() { return `point`; }

    /**
     * Get the x-coordinate of the point.
     * @returns {number} The x-coordinate of the point.
     */
    get x() { return this[X]; }

    /**
     * Get the y-coordinate of the point.
     * @returns {number} The y-coordinate of the point.
     */
    get y() { return this[Y]; }

    /**
     * Set the x-coordinate of the point.
     * @param {number} x - The x-coordinate to set.
     */
    set x(x) { this[X] = x; }

    /**
     * Set the y-coordinate of the point.
     * @param {number} y - The y-coordinate to set.
     */
    set y(y) { this[Y] = y; }

    /**
     * Get the Manhattan length of the point, which is the sum of the absolute values of its x and y coordinates.
     * @returns {number} The Manhattan length of the point.
     */
    get manhattan_length() {
        return Math.abs(this[X]) + Math.abs(this[Y]);
    }
}

/**
 * Represents a point with integer coordinates.
 * @class pointi
 * @extends Int16Array
 * @extends point_base
 */
export class pointi extends classes(Int16Array, point_base) {

    /**
     * Constructs a point with the given coordinates (xpos, ypos).
     * @param {number} [x=0] - The x-coordinate of the point.
     * @param {number} [y=0] - The y-coordinate of the point.
     */
    constructor(x = 0, y = 0) {
        super(2);
        this[X] = string.is_numb(`${x}`) ? Math.round(numb.parse(x)) : 0;
        this[Y] = string.is_numb(`${y}`) ? Math.round(numb.parse(y)) : 0;
    }

    static get BYTES_LENGTH() { return Int16Array.BYTES_PER_ELEMENT * 2; }
};

/**
 * Represents a point with integer coordinates.
 * @class pointi32
 * @extends Int32Array
 * @extends point_base
 */
export class pointi32 extends classes(Int32Array, point_base) {

    /**
     * Constructs a point with the given coordinates (xpos, ypos).
     * @param {number} [x=0] - The x-coordinate of the point.
     * @param {number} [y=0] - The y-coordinate of the point.
     */
    constructor(x = 0, y = 0) {
        super(2);
        this[X] = string.is_numb(`${x}`) ? Math.round(numb.parse(x)) : 0;
        this[Y] = string.is_numb(`${y}`) ? Math.round(numb.parse(y)) : 0;
    }

    static get BYTES_LENGTH() { return Int32Array.BYTES_PER_ELEMENT * 2; }
};

/**
 * @class  pointf
 * @extends Float32Array
 * @extends point_base
 */
export class pointf extends classes(Float32Array, point_base) {

    /**
     * Constructs a point with the given coordinates (xpos, ypos).
     * @param {number=0} [x] 
     * @param {number=0} [y] 
     */
    constructor(x = 0, y = 0) {
        super(2);
        this[X] = string.is_numb(`${x}`) ? numb.parse(x) : 0;
        this[Y] = string.is_numb(`${y}`) ? numb.parse(y) : 0;
    }
};

/**
 * @class  point_i16p
 * @extends Int16Array
 */
export class point_i16p extends classes(Int16Array, point_base) {

    /**
     * @param {pool|ArrayBuffer} obj data pool or a other wrapper to build this obj
     * @param {number=0} [x] the x coordinate
     * @param {number=0} [y] the y coordinate
     */
    constructor(obj, x = 0, y = 0) {
        let p;
        if (obj instanceof pool) p = obj;
        else if (ArrayBuffer.isView(obj)) p = obj.buff;
        else throw new Error('Parameter is of the wrong type.');

        super(p.buffer, p.align(Int16Array, 2), 2);

        if (array.is_array(obj)) {
            this[X] = obj[X];
            this[Y] = obj[Y];
        }
        else {
            this[X] = x;
            this[Y] = y;
        }
    }

    /** @param {number} x */
    static get BYTES_LENGTH() { return Int16Array.BYTES_PER_ELEMENT * 2; }

};

/**
 * @class  point_i16p_ref
 * @extends Int16Array
 */
export class point_i16p_ref extends classes(Int16Array, point_base) {

    /**
     * 
     * @param {ArrayBuffer} buffer 
     * @param {number} offset 
     */
    constructor(buffer, offset) {
        super(buffer, offset, 2);
    }

    /** @param {number} x */
    static get BYTES_LENGTH() { return Int16Array.BYTES_PER_ELEMENT * 2; }

};

/**
 * @class  point_f32p
 * @extends Float32Array
 */
export class point_f32p extends classes(Float32Array, point_base) {

    /**
     * @param {pool|ArrayBuffer} obj data pool or a other wrapper to build this obj
     * @param {number=0} [x] the x coordinate
     * @param {number=0} [y] the y coordinate
     */
    constructor(obj, x = 0, y = 0) {
        let p;
        if (obj instanceof pool) p = obj;
        else if (ArrayBuffer.isView(obj)) p = obj.buff;
        else throw new Error('Parameter is of the wrong type.');

        super(p.buffer, p.align(Float32Array, 2), 2);

        if (array.is_array(obj)) {
            this[X] = obj[X];
            this[Y] = obj[Y];
        }
        else {
            this[X] = x;
            this[Y] = y;
        }
    }

    /** @param {number} x */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 2; }

}

/**
 * @class  point_f32p_ref
 * @extends Float32Array
 */
export class point_f32p_ref extends classes(Float32Array, point_base) {

    /**
     * 
     * @param {ArrayBuffer} buffer 
     * @param {number} offset 
     */
    constructor(buffer, offset) {
        super(buffer, offset, 2);
    }

    /** @param {number} x */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 2; }

};

/**
 * @param {point} p 
 * @param {number} x 
 * @param {number} y 
 * @returns {point}
 */
export const point_set = (p, x = 0, y = 0) => {
    if (typeof x !== `number`) throw new Error(`x must be a number.`);
    if (typeof y !== `number`) throw new Error(`y must be a number.`);
    p[X] = x;
    p[Y] = y;
    return p;
};

/**
 * Swap the x and y coordinates of the given point.
 * 
 * @param {point} p1 - The point to transpose.
 * @returns {point} The transposed point with its x and y coordinates swapped.
 */
export const point_transpose = p1 => {
    let x = p1[X];  // Store the current x-coordinate in a temporary variable.
    p1[X] = p1[Y];  // Set the x-coordinate to the current y-coordinate.
    p1[Y] = x;      // Set the y-coordinate to the stored x-coordinate.
    return p1;      // Return the transposed point.
};

/**
 * Map a point from a cardinal coordinate system to a Cartesian coordinate system.
 * 
 * @param {Array<number>} point - The point to be mapped from the cardinal coordinate system to the Cartesian coordinate system.
 * @param {number} width - The width of the Cartesian coordinate system.
 * @param {number} height - The height of the Cartesian coordinate system.
 * @param {Array<number>} result - The result object to store the mapped point.
 * @returns {Array<number>} The mapped point in the Cartesian coordinate system.
 */
export const point_cardinal_to_cartesian = (point, width, height, result) => {
    result[X] = numb.map(point[X], -1, 1, 0, width);
    result[Y] = numb.map(point[Y], -1, 1, height, 0);
    return result;
};

/**
 * Returns the sum of the given starting point and the provided values or point object; each component is added separately.
 * 
 * @param {Array<number>} s1 - The starting point represented as an array of numbers.
 * @param {number|Array<number>} x - The x-coordinate or a point object to add.
 * @param {number|Array<number>} y - The y-coordinate to add or the result object.
 * @param {Array<number>} result - The result object to store the sum of the points.
 * @returns {Array<number>} The result object containing the sum of the points.
 */
export const point_add = (s1, x, y, result) => {
    if (array.is_array(x)) return point_add(s1, x[X], x[Y], y);
    result[X] = s1[X] + x;
    result[Y] = s1[Y] + y;
    return result;
};

/**
 * Returns the result of subtracting the given x and y values from the starting point p1. 
 * If x and y are arrays, each component is subtracted separately.
 * 
 * @param {Array<number>} p1 - The starting point represented as an array of numbers.
 * @param {number|Array<number>} x - The x-coordinate or a point object to subtract.
 * @param {number|Array<number>} [y] - The y-coordinate to subtract or the result object.
 * @param {Array<number>} result - The result object to store the subtraction result.
 * @returns {Array<number>} The result object containing the subtraction result.
 */
export const point_rem = (p1, x, y, result) => {
    if (array.is_array(x)) return point_rem(p1, x[X], x[Y], y);
    result[X] = p1[X] - x;
    result[Y] = p1[Y] - y;
    return result;
};

/**
 * Multiplies the given point by the specified factor and stores the result in the provided result array.
 * 
 * @param {Array<number>} p1 - The point to be multiplied, represented as an array of numbers [x, y].
 * @param {number} factor - The factor by which the point should be multiplied.
 * @param {Array<number>} result - The array to store the result of the multiplication [x * factor, y * factor].
 * @returns {Array<number>} The result array containing the multiplied point [x * factor, y * factor].
 */
export const point_mult = (p1, factor, result) => {
    result[X] = p1[X] * factor;
    result[Y] = p1[Y] * factor;
    return result;
};

/**
 * Divides the given point by the given divisor, and returns the result.
 * If the given point is an integer array, the result will be rounded to the nearest integer.
 * @param {Array<number>} p1 - The point to be divided, represented as an array of numbers [x, y].
 * @param {number} factor - The divisor by which the point should be divided.
 * @param {Array<number>} result - The array to store the result of the division [x / factor, y / factor].
 * @returns {Array<number>} The result array containing the divided point [x / factor, y / factor].
 */
export const point_div = (p1, factor, result) => {

    let x = p1[X] / (factor || Number.EPSILON);
    let y = p1[Y] / (factor || Number.EPSILON);

    if (!array.is_float_array(p1)) {
        x = numb.rounded(x, numb.AwayFromZero);
        y = numb.rounded(y, numb.AwayFromZero);
    }

    result[X] = x;
    result[Y] = y;

    return result;
};

/**
 * Returns a string that can be used in a CSS rule to position an element at the specified coordinates.
 * 
 * @param {Array<number>} p1 - The point object representing the coordinates.
 * @returns {string} A string in the format "top:x;left:y;" where x and y are the coordinates of the point.
 */
export const point_to_css = p1 => {
    return `top:${Math.round(p1[X])};left:${Math.round(p1[Y])};`;
};

/**
 * Returns a string representation of the given point object.
 * 
 * @param {Array<number>} p1 - The point object represented as an array of numbers [x, y].
 * @returns {string} A string representing the point in the format "(x,y)".
 */
export const point_to_string = p1 => {
    return `(${p1[X]},${p1[Y]})`;
};
