import { array, pool } from "../array.js";
import { error, type_error } from "../../error.js";
import { classes, kind_of } from "../../functions.js";
import { numb } from "../math/number.js";
import { X, Y, point_f32p_ref, point_i16p_ref } from "./point.js";

/** @constant {number} */
export const x1 = 0;
/** @constant {number} */
export const y1 = 1;
/** @constant {number} */
export const x2 = 2;
/** @constant {number} */
export const y2 = 3;

/** @constant {number} */
export const NO_INTERSECTION = 0;
/** @constant {number} */
export const BOUNDED_INTERSECTION = 1;
/** @constant {number} */
export const UNBOUNDED_INTERSECTION = 2;


class line_base {

    /**
     * Initializes a line object with the given points.
     * @param {number|point} p1x - The x-coordinate of the first point.
     * @param {number|point} p1y - The y-coordinate of the first point.
     * @param {number} [p2x] - The x-coordinate of the second point.
     * @param {number} [p2y] - The y-coordinate of the second point.
     */
    init(p1x, p1y, p2x, p2y) {
        this[x1] = p1x;
        this[y1] = p1y;
        this[x2] = p2x;
        this[y2] = p2y;

        if (kind_of(p1x) === `line`) {
            this.set(p1x);
        }
        else if (kind_of(p1x) === `point`) {
            this[x1] = p1x[X];
            this[y1] = p1x[Y];
        }

        if (kind_of(p1y) === `point`) {
            this[x2] = p1y[X];
            this[y2] = p1y[Y];
        }

    };

    /** @returns {String} */
    get kind() { return `line`; }

    /** @returns {number} */
    get x1() { return this[x1]; }
    /** @returns {number} */
    get y1() { return this[y1]; }


    /** @returns {number} */
    get x2() { return this[x2]; }
    /** @returns {number} */
    get y2() { return this[y2]; }

    /** @returns {number} */
    get dx() { return this[x2] - this[x1]; }
    /** @returns {number} */
    get dy() { return this[y2] - this[y1]; }
};

class linei_ext {
    /** @returns {point} */
    get p1() { return new point_i16p_ref(this.buffer, this.byteOffset); }

    /** @returns {point} */
    get p2() { return new point_i16p_ref(this.buffer, this.byteOffset + (this.BYTES_PER_ELEMENT * 2)); }

    /** @param {Array<number>} p */
    set p1(p) {
        this[x1] = p[X];
        this[y1] = p[Y];
    }
    /** @param {Array<number>} p */
    set p2(p) {
        this[x2] = p[X];
        this[y2] = p[Y];
    }
};

class linef_ext {
    /** @returns {point} */
    get p1() { return new point_f32p_ref(this.buffer, this.byteOffset); }

    /** @returns {point} */
    get p2() { return new point_f32p_ref(this.buffer, this.byteOffset + (this.BYTES_PER_ELEMENT * 2)); }

    /** @param {Array<number>} p */
    set p1(p) {
        this[x1] = p[X];
        this[y1] = p[Y];
    }
    /** @param {Array<number>} p */
    set p2(p) {
        this[x2] = p[X];
        this[y2] = p[Y];
    }
};

/**
 * Represents a line with integer coordinates.
 * @class  linei
 * @extends Int16Array
 * @extends line_base
 * @extends linei_ext
 */
export class linei extends classes(Int16Array, line_base, linei_ext) {
    /**
     * Initializes a line with integer coordinates.
     * @constructs linei
     * @param {number|Array<number>} [p1x=0] - The x-coordinate of the first point or a point object.
     * @param {number|Array<number>} [p1y=0] - The y-coordinate of the first point or a point object.
     * @param {number} [p2x=0] - The x-coordinate of the second point.
     * @param {number} [p2y=0] - The y-coordinate of the second point.
     */
    constructor(p1x = 0, p1y = 0, p2x = 0, p2y = 0) {
        super(4);
        super.init(p1x, p1y, p2x, p2y);
    }
}

/**
 * Represents a line with floating point coordinates.
 * @class  linef
 * @extends Float32Array
 * @extends line_base
 * @extends linef_ext
 */
export class linef extends classes(Float32Array, line_base, linef_ext) {

    /**
     * Initializes a line with floating point coordinates.
     * @constructs linef
     * @param {number|Array<number>} p1x - The x-coordinate of the first point or a point object.
     * @param {number|Array<number>} p1y - The y-coordinate of the first point or a point object.
     * @param {number} [p2x=0] - The x-coordinate of the second point.
     * @param {number} [p2y=0] - The y-coordinate of the second point.
     */
    constructor(p1x = 0, p1y = 0, p2x = 0, p2y = 0) {
        super(4);
        super.init(p1x, p1y, p2x, p2y);
    }
}

/**
 * @class  line_i16p
 * @extends Int16Array
 */
export class line_i16p extends classes(Int16Array, line_base, linei_ext) {

    /**
     * @constructs line_i16p
     * @param {number|point} _x1 
     * @param {number|point} _y1 
     * @param {number} [_x2] 
     * @param {number} [_y2] 
     */
    constructor(obj, p1x = 0, p1y = 0, p2x = 0, p2y = 0) {
        let p;
        if (obj instanceof pool) p = obj;
        else if (ArrayBuffer.isView(obj)) p = obj.buff;
        else throw new Error('Parameter is of the wrong type.');

        super(p.buffer, p.align(Int16Array, 4), 4);
        super.init(p1x, p1y, p2x, p2y);
    }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Int16Array.BYTES_PER_ELEMENT * 4; }
}

/**
 * @class  line_i16p_ref
 * @extends Int16Array
 */
export class line_i16p_ref extends classes(Int16Array, line_base, linei_ext) {

    /**
     * @constructs line_i16p_ref
     * @param {ArrayBuffer} buffer 
     * @param {number} offset 
     */
    constructor(buffer, offset) {
        super(buffer, offset, 4);
    }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Int16Array.BYTES_PER_ELEMENT * 4; }
}

/**
 * @class  line_f32p
 * @extends Float32Array
 */
export class line_f32p extends classes(Float32Array, line_base, linef_ext) {

    /**
     * @constructs line_f32p
     * @param {number|point} _x1 
     * @param {number|point} _y1 
     * @param {number} [_x2] 
     * @param {number} [_y2] 
     */
    constructor(obj, p1x = 0, p1y = 0, p2x = 0, p2y = 0) {
        let p;
        if (obj instanceof pool) p = obj;
        else if (ArrayBuffer.isView(obj)) p = obj.buff;
        else throw new Error('Parameter is of the wrong type.');

        super(p.buffer, p.align(Float32Array, 4), 4);
        super.init(p1x, p1y, p2x, p2y);
    }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 4; }
}

/**
 * @class  line_f32p_ref
 * @extends Float32Array
 */
export class line_f32p_ref extends classes(Float32Array, line_base, linef_ext) {

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

}

/**
 * Checks if a line is null (both endpoints are identical).
 * @param {Array<number>} l1 - The line object to check.
 * @returns {boolean} True if the line is null, false otherwise.
 */
export const line_is_null = l1 => {
    // Check if both x-coordinates and y-coordinates of the endpoints are identical
    return numb.fuzzy_comparef(l1[x1], l1[x2]) && numb.fuzzy_comparef(l1[y1], l1[y2]);
};

/**
 * Checks if two lines are equal.
 * 
 * @param {Array<number>} l1 - The first line object to compare.
 * @param {Array<number>} l2 - The second line object to compare.
 * 
 * @returns {boolean} True if the lines are equal, false otherwise.
 * 
 * The function compares the x and y coordinates of the endpoints of the two lines.
 * It uses fuzzy comparison to handle floating-point precision issues.
 */
export const line_equals = (l1, l2) => {
    return numb.fuzzy_comparef(l1[x1], l2[x1]) && numb.fuzzy_comparef(l1[y1], l2[y1]) &&
        numb.fuzzy_comparef(l1[x2], l2[x2]) && numb.fuzzy_comparef(l1[y2], l2[y2]);
};

/**
 * Returns the length of the line.
 * @param {Array<number>} l1 - The line object.
 * @returns {number} The length of the line.
 */
export const line_length = l1 => Math.hypot(l1.dx, l1.dy);

/**
 * Computes the center point of a line segment.
 * @param {Array<number>} line - The line segment defined by its endpoints.
 * @param {Array<number>} result - The resulting center point.
 * @returns {Array<number>} The center point of the line segment.
 */
export const line_center = (line, result) => {
    result[X] = (line[x1] + line[x2]) * 0.5;
    result[Y] = (line[y1] + line[y2]) * 0.5;
    return result;
};

/**
 * Translates a line by the given offset.
 * @param {Array<number>} l1 - The line to translate.
 * @param {number|Array<number>} x - The x-coordinate offset or a point representing the offset.
 * @param {number|Array<number>} y - The y-coordinate offset or a line representing the offset.
 * @param {Array<number>} [result] - The result line to store the translation (optional).
 * @returns {Array<number>} The translated line.
 */
export const line_translate = (l1, x, y, result) => {
    // If x is an array, extract x and y values
    if (array.is_array(x)) return line_translate(l1, x[X], x[Y], y);
    // Translate the line by adding the offset to each endpoint
    result[x1] = l1[x1] + x;
    result[y1] = l1[y1] + y;
    result[x2] = l1[x2] + x;
    result[y2] = l1[y2] + y;
    return result;
};

/**
 * Returns the angle of the line in radians.
 * @param {Array<number>} l1 - The line object.
 * @returns {number} The angle of the line in radians.
 */
export const line_rad_angle = l1 => {
    // Calculate the differences in x and y coordinates
    let dx = l1[x2] - l1[x1];
    let dy = l1[y2] - l1[y1];

    // Calculate the angle using arctan and adjust for the correct quadrant
    let angle = Math.atan2(-dy, dx);
    if (angle < 0) angle += numb.TWO_PI; // Adjust for negative angles
    if (numb.fuzzy_comparef(angle, numb.TWO_PI)) return 0; // Handle special case when angle is 2*PI

    if (angle == 0) angle = 0;
    return angle;
}

/**
 * Returns the angle of the line in degrees.
 * @param {Array<number>} l1 - The line object.
 * @returns {number} The angle of the line in degrees.
 */
export const line_deg_angle = l1 => {
    return numb.to_deg(line_rad_angle(l1));
}

/**
 * Returns the angle in radiant from line l1 to line l2, taking the direction of the lines into account.
 * @param {Array<number>} l1 
 * @param {Array<number>} l2 
 * @returns {Array<number>}
 */
export const line_rad_angle_between = (l1, l2) => {
    if (line_is_null(l1) || line_is_null(l2))
        return 0;

    let del = line_rad_angle(l2) - line_rad_angle(l1);
    if (del < 0) del += numb.TWO_PI;

    if (numb.fuzzy_comparef(del, numb.TWO_PI))
        return 0;

    if (del == 0) del = 0;
    return del;
}

/**
 * Returns the angle in degree from line l1 to line l2, taking the direction of the lines into account.
 * @param {Array<number>} l1 - The first line object.
 * @param {Array<number>} l2 - The second line object.
 * @returns {number} The angle in degrees from line l1 to line l2.
 */
export const line_deg_angle_between = (l1, l2) => {
    return numb.to_deg(line_rad_angle_between(l1, l2));
}

/**
 * Returns a value indicating whether or not two lines intersect and calculates the intersection point.
 * @param {Array<number>} l1 - The first line object.
 * @param {Array<number>} l2 - The second line object.
 * @param {Array<number>} [p1] - The intersection point (optional).
 * @returns {number} The intersection type (NO_INTERSECTION, BOUNDED_INTERSECTION, UNBOUNDED_INTERSECTION).
 */
export const line_intersects = (l1, l2, p1) => {
    if (!line_is_null(l1) && !line_is_null(l2) && line_equals(l1, l2)) return UNBOUNDED_INTERSECTION;

    let ax = l1[x2] - l1[x1], ay = l1[y2] - l1[y1];
    let bx = l2[x1] - l2[x2], by = l2[y1] - l2[y2];

    let deno = ay * bx - ax * by;
    if (deno === 0 || !numb.is_finite(deno)) return NO_INTERSECTION;



    let cx = l1[x1] - l2[x1], cy = l1[y1] - l2[y1];
    let reci = 1.0 / deno;
    let na = (by * cx - bx * cy) * reci;

    let bxResult = l1[x1] + ax * na;
    let byResult = l1[y1] + ay * na;

    if (p1 && p1[Symbol.toStringTag] === 'Int16Array') {
        p1[X] = numb.rounded(bxResult, numb.rounding_mode.away_from_zero);
        p1[Y] = numb.rounded(byResult, numb.rounding_mode.away_from_zero);
    } else if (p1) {
        p1[X] = bxResult;
        p1[Y] = byResult;
    }

    if (na < 0 || na > 1) {
        return UNBOUNDED_INTERSECTION;
    }

    let nb = (ax * cy - ay * cx) * reci;
    if (nb < 0 || nb > 1) {
        return UNBOUNDED_INTERSECTION;
    }

    return BOUNDED_INTERSECTION;
};

/**
 * Returns a line that is perpendicular to l1 with the same starting point and length.
 * 
 * @param {Array<number>} l1 - The input line.
 * @param {Array<number>} result - The resulting line.
 * 
 * @returns {Array<number>} - The perpendicular line with the same starting point and length.
 * 
 * The function calculates the perpendicular line by swapping the x and y coordinates of the second point,
 * and then adjusting the x-coordinate of the second point to maintain the same length as the original line.
 * 
 * The function assumes that the input line is represented by an array of four numbers, where the first two numbers
 * represent the x and y coordinates of the starting point, and the last two numbers represent the x and y coordinates
 * of the ending point.
 * 
 * The function does not modify the original line, but instead returns a new line as the result.
 */
export const line_normal = (l1, result) => {
    result[x1] = l1[x1];
    result[y1] = l1[y1];
    result[x2] = l1[x1] + (l1[y2] - l1[y1]);
    result[y2] = l1[y1] - (l1[x2] - l1[x1]);
    return result;
}

/**
 * Return a point along the line where t=0 is the start point and t=1 is the end point.
 * 
 * @param {Array<number>} l1 - The input line.
 * @param {number} t - The parameter to calculate the point along the line.
 * @param {Array<number>} result - The resulting point.
 * 
 * @returns {Array<number>} - The input line for chaining.
 * 
 * The function calculates the point along the line by multiplying the direction vector of the line (dx, dy) by the parameter t.
 * The resulting point is then added to the starting point of the line.
 * 
 * If the input line is an Int16Array, the resulting point coordinates are rounded to the nearest integer using the away-from-zero rounding mode.
 * 
 * The function does not modify the original line, but instead returns the input line for chaining.
 */
export const line_point_at = (l1, t, result) => {
    if (typeof t !== `number`) throw new type_error(`t must be a number`);
    let px = l1[x1] + l1.dx * t;
    let py = l1[y1] + l1.dy * t;
    if (l1[Symbol.toStringTag] === `Int16Array`) {
        result[X] = numb.rounded(px, numb.rounding_mode.away_from_zero);
        result[Y] = numb.rounded(py, numb.rounding_mode.away_from_zero);
    }
    else {
        result[X] = px;
        result[Y] = py;
    }
    return result;
}

/**
 * Sets the angle of l1 to the given angle (in radiant). This will change the position of the second point of the line such that the line has the given angle.
 * 
 * Positive values for the angles mean counter-clockwise while negative values mean the clockwise direction. Zero degrees is at the 3 o'clock position.
 * 
 * @param {Array<number>} l1 - The line to modify.
 * @param {number} angle - The angle to set in radiant.
 * 
 * @returns {void}
 */
export const line_set_rad_angle = (l1, angle) => {
    if (line_is_null(l1)) return;

    let length = line_length(l1);
    if (length === 0) return;

    let px = l1[x1] + (Math.cos(angle) * length);
    let py = l1[y1] + (-Math.sin(angle) * length);

    if (l1[Symbol.toStringTag] === `Int16Array`) {
        l1[x2] = numb.rounded(px, numb.rounding_mode.away_from_zero);
        l1[y2] = numb.rounded(py, numb.rounding_mode.away_from_zero);
    }
    else {
        l1[x2] = px;
        l1[y2] = py;
    }
}

/**
 * Sets the angle of l1 to the given angle (in degree). This will change the position of the second point of the line such that the line has the given angle.
 * 
 * Positive values for the angles mean counter-clockwise while negative values mean the clockwise direction. Zero degrees is at the 3 o'clock position.
 * 
 * @param {Array<number>} l1 - The line to modify.
 * @param {number} angle - The angle to set in degrees.
 * 
 * @returns {void} - The function does not return any value.
 */
export const line_set_deg_angle = (l1, angle) => {
    return line_set_rad_angle(l1, angle * numb.DEG_2_RAD);
}

/**
 * Sets the length of the line to the given finite length.
 * 
 * @param {Array<number>} l1 - The line to modify.
 * @param {number} length - The new length of the line.
 * 
 * @returns {Array<number>} - The modified line with the new length.
 * 
 * @throws {error} - If the new length is not a finite number.
 * 
 * The function calculates the new coordinates of the second point of the line based on the given length.
 * If the original line length is not zero, the new coordinates are calculated by scaling the direction vector of the line.
 * The function then updates the second point of the line with the new coordinates.
 * If the original line was represented by an Int16Array, the new coordinates are rounded to the nearest integer using the away-from-zero rounding mode.
 * 
 * The function returns the modified line.
 */
export const line_set_length = (l1, length) => {
    if (!numb.is_finite(length))
        throw new error(`new length is not finite.`);

    let old_len = Math.hypot(l1.dx, l1.dy);
    if (!numb.is_finite(old_len))
        throw new error(`line length is not finite.`);

    let px = l1[x2], py = l1[y2];
    if (old_len > 0) {
        px = l1[x1] + length * (l1.dx / old_len);
        py = l1[y1] + length * (l1.dy / old_len);
    }

    if (l1[Symbol.toStringTag] === `Int16Array`) {
        l1[x2] = numb.rounded(px, numb.rounding_mode.away_from_zero);
        l1[y2] = numb.rounded(py, numb.rounding_mode.away_from_zero);
    }
    else {
        l1[x2] = px;
        l1[y2] = py;
    }

    return l1;
}

/**
 * Returns the unit vector of l1.
 * A unit vector is a vector of length 1.
 * 
 * @param {line|Array<number>} l1 - The input line.
 * @param {line|Array<number>} result - The resulting unit vector.
 * 
 * @returns {Array<number>} - The unit vector of l1.
 * 
 * The function calculates the unit vector by dividing the direction vector of the line by its length.
 * If the original line was represented by an Int16Array, the new coordinates of the unit vector are rounded to the nearest integer using the away-from-zero rounding mode.
 * 
 * The function returns the unit vector.
 */
export const line_unit_vector = (l1, result = new linef()) => {
    result[x1] = l1[x1];
    result[y1] = l1[y1];

    let length = line_length(l1);
    if (length === 0) return result;

    let px = l1[x1] + l1.dx / length;
    let py = l1[y1] + l1.dy / length;

    if (result[Symbol.toStringTag] === `Int16Array`) {
        result[x2] = numb.rounded(px, numb.rounding_mode.away_from_zero);
        result[y2] = numb.rounded(py, numb.rounding_mode.away_from_zero);
    }
    else {
        result[x2] = px;
        result[y2] = py;
    }

    return result;
}
