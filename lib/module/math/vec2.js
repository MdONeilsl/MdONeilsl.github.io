
import { array } from '../array.js';
import { error, type_error } from '../../error.js';
import { numb } from './number.js';

/** @constant {number} */
export const X = 0;
/** @constant {number} */
export const Y = 1;

/**
 * Represents a 2D vector with floating-point precision.
 * 
 * @class vec2f
 * @extends Float32Array
 */
export class vec2f extends Float32Array {
    /**
     * Creates an instance of vec2f.
     * @param {number|Array<number>} [x=0] - The x-coordinate or an array containing both coordinates.
     * @param {number} [y=0] - The y-coordinate.
     */
    constructor(x = 0, y = 0) {
        super(2);
        if (array.is_array(x)) {
            this[0] = x[0] || 0;
            this[1] = x[1] || 0;
        } else {
            this[0] = x || 0;
            this[1] = y || 0;
        }
    }

    /** @returns {string} The type of the vector. */
    get kind() { return 'vec2'; }

    /** @returns {number} The x-coordinate. */
    get x() { return this[0]; }

    /** @returns {number} The y-coordinate. */
    get y() { return this[1]; }

    /** @returns {number} The rounded x-coordinate. */
    get xi() { return Math.round(this[0]); }

    /** @returns {number} The rounded y-coordinate. */
    get yi() { return Math.round(this[1]); }

    /**
     * Sets the x-coordinate.
     * @param {number} x - The new x-coordinate.
     */
    set x(x) { this[0] = x; }

    /**
     * Sets the y-coordinate.
     * @param {number} y - The new y-coordinate.
     */
    set y(y) { this[1] = y; }
}

/**
 * Represents a 2D vector with double-precision floating-point numbers.
 * 
 * @class vec2d
 * @extends Float64Array
 */
export class vec2d extends Float64Array {
    /**
     * Creates an instance of vec2d.
     * @param {number|Array<number>} [x=0] - The x-coordinate or an array containing both coordinates.
     * @param {number} [y=0] - The y-coordinate.
     */
    constructor(x = 0, y = 0) {
        super(2);
        if (array.is_array(x)) {
            this[0] = x[0] || 0;
            this[1] = x[1] || 0;
        } else {
            this[0] = x || 0;
            this[1] = y || 0;
        }
    }

    /**
     * @returns {string} The type of the vector.
     */
    get kind() { return 'vec2'; }

    /**
     * @returns {number} The x-coordinate.
     */
    get x() { return this[0]; }

    /**
     * @returns {number} The y-coordinate.
     */
    get y() { return this[1]; }

    /**
     * @returns {number} The rounded x-coordinate.
     */
    get xi() { return Math.round(this[0]); }

    /**
     * @returns {number} The rounded y-coordinate.
     */
    get yi() { return Math.round(this[1]); }

    /**
     * Sets the x-coordinate.
     * @param {number} x - The new x-coordinate.
     */
    set x(x) { this[0] = x; }

    /**
     * Sets the y-coordinate.
     * @param {number} y - The new y-coordinate.
     */
    set y(y) { this[1] = y; }
}

/**
 * @class  vec2_f32p
 * @extends Float32Array
 */
export class vec2_f32p extends Float32Array {

    /**
     * @constructor
     * @param {number|point|size} x
     * @param {number} [y] 
     */
    constructor(x = 0, y = 0) {
        super(2);

        if (array.is_array(x)) {
            this[X] = x[X];
            this[Y] = x[Y];
        }
        else {
            this[X] = x;
            this[Y] = y;
        }
    }

    /** @returns {String} */
    get kind() { return `vec2`; }

    get x() { return this[X]; }
    get y() { return this[Y]; }

    get xi() { return numb.rounded(this[X], numb.AwayFromZero); }
    get yi() { return numb.rounded(this[Y], numb.AwayFromZero); }

    set x(x) { this[X] = x; }
    set y(y) { this[Y] = y; }
}

/**
 * Sets the values of a 2D vector.
 * @param {Array<number>} vec - The vector to set.
 * @param {number|Array<number>} x - The x-coordinate or an array containing both coordinates.
 * @param {number} [y] - The y-coordinate.
 * @returns {Array<number>} The updated vector.
 */
export const vec2_set = (vec, x = 0, y = 0) => {
    // If 'x' is an array, recursively call vec2_set with the first and second elements of the array.
    if (array.is_array(x)) return vec2_set(vec, x[X] || 0, x[Y] || 0);

    // Set the x and y coordinates of the vector.
    vec[X] = numb.fast_nan(x) ? NaN : x;
    vec[Y] = numb.fast_nan(y) ? NaN : y;

    // Return the updated vector.
    return vec;
};

/**
 * Checks if the x and y coordinates of a 2D vector are both zero.
 * 
 * @param {vec2} vec - The 2D vector to check.
 * @returns {boolean} True if both x and y are zero, otherwise false.
 */
export const vec2_is_null = vec => {
    if (!vec) return false;
    // Check if both x and y coordinates are equal to 0
    return vec[X] === 0 && vec[Y] === 0;
};

/**
 * Checks if the x and y coordinates of a 2D vector are close to zero.
 * 
 * @param {vec2} vec - The 2D vector to check.
 * @returns {boolean} True if both x and y are close to zero, otherwise false.
 */
export const vec2_is_fuzzy_null = vec => {
    // Check if both x and y coordinates are close to zero using a fuzzy comparison
    return numb.fuzzy_null(vec[X]) && numb.fuzzy_null(vec[Y]);
};

/**
 * Checks if two 2D vectors are equal.
 * @param {vec2} v1 - The first vector.
 * @param {vec2} v2 - The second vector.
 * @returns {boolean} - True if the vectors are equal, otherwise false.
 */
export const vec2_equals = (v1, v2) => {
    // Check if both x and y coordinates of v1 are equal to x and y coordinates of v2 respectively
    return v1[X] === v2[X] && v1[Y] === v2[Y];
}

/**
 * Returns true if v1 is almost equal to v2; otherwise returns false.
 * 
 * @param {vec2} v1 - The first vector.
 * @param {vec2} v2 - The second vector.
 * @returns {Boolean} True if v1 is almost equal to v2; otherwise false.
 */
export const vec2_fuzzy_equals = (v1, v2) => {
    // Compare each coordinate of v1 and v2 using fuzzy comparison
    return numb.fuzzy_comparef(v1[X], v2[X]) && numb.fuzzy_comparef(v1[Y], v2[Y]);
}

/**
 * Calculates and returns the squared length of the given 2D vector.
 * Squared length is calculated by taking the dot product of the vector with itself.
 * @param {vec2} vec - The 2D vector.
 * @returns {number} The squared length of the vector.
 */
export const vec2_length_square = vec => {
    // Calculate and return the squared length of the vector
    return vec[X] ** 2 + vec[Y] ** 2;
}

/**
 * Returns the length of the 2D vector from the origin.
 * 
 * @param {number[]} vec - The 2D vector represented as an array [x, y].
 * @returns {number} The length of the vector from the origin.
 */
export const vec2_length = vec => {
    // Calculate the length using the Pythagorean theorem
    return Math.sqrt(vec[X] ** 2 + vec[Y] ** 2);
}

/**
 * Normalizes a 2D vector in place.
 * @param {vec2} vec - The vector to normalize.
 * @returns {vec2} The normalized vector.
 */
export const vec2_normalize = vec => {
    // Calculate the squared length of the vector
    const len_squared = vec[X] ** 2 + vec[Y] ** 2;

    // Check if the vector is already normalized or null
    if (!numb.fuzzy_null(len_squared - 1.0) && len_squared !== 0.0) {
        // Calculate the length of the vector
        const len = Math.sqrt(len_squared);

        // Normalize the vector components
        vec[X] /= len;
        vec[Y] /= len;
    }

    return vec;
};

/**
 * Normalizes a 2D vector and stores the result in a given result vector.
 * If the vector is a null vector or its length is very close to 1, it remains unchanged.
 * 
 * @param {Array<number>} vec - The input vector to normalize.
 * @param {Array<number>} result - The vector to store the normalized result.
 * @returns {Array<number>} The normalized vector stored in the result vector.
 */
export const vec2_normalized = (vec, result) => {
    let len = vec[0] * vec[0] + vec[1] * vec[1];

    // Check if length is not close to 1 and not close to 0
    if (!numb.fuzzy_null(len - 1.0) && len !== 0.0) {
        len = Math.sqrt(len);
        result[0] = vec[0] / len;
        result[1] = vec[1] / len;
    } else {
        // If length is close to 1 or 0, copy the original vector to result
        result[0] = vec[0];
        result[1] = vec[1];
    }

    return result;
};

/**
 * Calculates the angle in radians of a 2D vector from the x-axis.
 * 
 * @param {Array<number>} vec - A 2D vector represented as an array with two elements [x, y].
 * @returns {number} The angle in radians between the vector and the positive x-axis.
 */
export const vec2_rad_angle = vec => {
    return Math.atan2(vec[Y], vec[X]);
}

/**
 * Converts a vector's angle from radians to degrees.
 * 
 * @param {Array<number>} vec - A 2D vector represented as an array of two numbers.
 * @returns {number} The angle in degrees.
 */
export const vec2_deg_angle = (vec) => {
    return Math.atan2(vec[Y], vec[X]) * numb.RAD_2_DEG;
};

/**
 * Adds two 2D vectors and stores the result in the provided result vector.
 * 
 * @param {Array<number>} v1 - The first vector.
 * @param {Array<number>} v2 - The second vector.
 * @param {Array<number>} [result] - The vector to store the result. Defaults to a new vec2f.
 * @returns {Array<number>} The resulting vector after addition.
 */
export const vec2_add = (v1, v2, result = new vec2f(2)) => {
    result[X] = v1[X] + v2[X];
    result[Y] = v1[Y] + v2[Y];
    return result;
};

/**
 * Subtracts the second 2D vector from the first and stores the result in the provided result vector.
 * 
 * @param {Array<number>} v1 - The first vector.
 * @param {Array<number>} v2 - The second vector to subtract from the first vector.
 * @param {Array<number>} [result] - The vector to store the result. Defaults to a new vec2f.
 * @returns {Array<number>} The resulting vector after subtraction.
 */
export const vec2_rem = (v1, v2, result = new vec2f()) => {
    result[X] = v1[X] - v2[X];
    result[Y] = v1[Y] - v2[Y];
    return result;
};

/**
 * Multiplies two 2D vectors component-wise if both are vectors, or scales a vector by a number.
 * Stores the result in the provided result vector.
 * 
 * @param {Array<number>} v1 - The first vector.
 * @param {Array<number>|number} v2 - The second vector or a scalar to multiply with the first vector.
 * @param {Array<number>} [result] - The vector to store the result. Defaults to a new vec2f.
 * @returns {Array<number>} The resulting vector after multiplication.
 * @throws {type_error} Throws an error if v2 is neither an array nor a number.
 */
export const vec2_mult = (v1, v2, result = new vec2f()) => {
    if (array.is_array(v2)) {
        result[X] = v1[X] * v2[X];
        result[1] = v1[1] * v2[1];
    } else if (typeof v2 === 'number') {
        result[X] = v1[X] * v2;
        result[1] = v1[1] * v2;
    } else {
        throw new type_error('Multiplier is of the wrong type.');
    }
    return result;
};

/**
 * Divides two 2D vectors component-wise if both are vectors, or scales a vector by a number.
 * Stores the result in the provided result vector.
 * 
 * @param {Array<number>} v1 - The first vector.
 * @param {Array<number>|number} v2 - The second vector or a scalar to divide the first vector by.
 * @param {Array<number>} [result] - The vector to store the result. Defaults to a new vec2f.
 * @returns {Array<number>} The resulting vector after division.
 * @throws {type_error} Throws an error if v2 is neither an array nor a number.
 */
export const vec2_div = (v1, v2, result = new vec2f()) => {
    if (array.is_array(v2)) {
        result[X] = v1[X] / v2[X];
        result[Y] = v1[Y] / v2[Y];
    } else if (typeof v2 === 'number') {
        if (v2 === 0.0) throw new error('Divided by zero.');
        result[X] = v1[X] / v2;
        result[Y] = v1[Y] / v2;
    } else {
        throw new type_error('Divider is of the wrong type.');
    }
    return result;
};

/**
 * Calculate the dot product of two 2D vectors.
 * 
 * @param {number[]} v1 - The first vector [x, y].
 * @param {number[]} v2 - The second vector [x, y].
 * @returns {number} The dot product of the two vectors.
 */
export const vec2_dot_product = (v1, v2) => v1[0] * v2[0] + v1[1] * v2[1];


/**
 * Calculates the squared distance between a 2D vector and a point.
 * 
 * @param {number[]} vec - The vector [x, y].
 * @param {number[]} point - The point [x, y].
 * @returns {number} The squared distance between the vector and the point.
 */
export const vec2_dist_to_point_sqr = (vec, point) => {
    const dx = vec[0] - point[0];
    const dy = vec[1] - point[1];
    return dx ** 2 + dy ** 2;
};

/**
 * Calculates the Euclidean distance between 2 point.
 * 
 * @param {number[]} vec - The vector [x, y].
 * @param {number[]} point - The point [x, y].
 * @returns {number} The distance between the vector and the point.
 */
export const vec2_dist_vec2 = (vec, point) => {
    const dx = vec[0] - point[0];
    const dy = vec[1] - point[1];
    return Math.sqrt(dx ** 2 + dy ** 2);
};
