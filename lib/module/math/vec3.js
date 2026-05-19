import { array } from "../array.js";
import { type_error } from "../../error.js";
import { classes, kind_of } from "../../functions.js";
import { numb } from "./number.js";
import { QW, QX, QY, QZ, quat_conjugated } from "./quaternion.js";


/** @constant {number} */
export const X_AXIS = 0;
/** @constant {number} */
export const Y_AXIS = 1;
/** @constant {number} */
export const Z_AXIS = 2;


/**
 * Base class for 3D vector operations.
 */
class vec3_base {
    /** @returns {string} */
    get kind() { return 'vec3'; }

    /** @returns {number} */
    get x() { return this[X_AXIS]; }
    /** @returns {number} */
    get y() { return this[Y_AXIS]; }
    /** @returns {number} */
    get z() { return this[Z_AXIS]; }

    /** @returns {number} */
    get xi() { return Math.round(this[X_AXIS]); }
    /** @returns {number} */
    get yi() { return Math.round(this[Y_AXIS]); }
    /** @returns {number} */
    get zi() { return Math.round(this[Z_AXIS]); }

    /** @param {number} x */
    set x(x) { this[X_AXIS] = x; }
    /** @param {number} y */
    set y(y) { this[Y_AXIS] = y; }
    /** @param {number} z */
    set z(z) { this[Z_AXIS] = z; }
};

/**
 * Represents a 3D vector with floating-point precision.
 * 
 * @class  vec3f
 * @extends Float32Array
 * @extends vec3_base
 */
export class vec3f extends classes(Float32Array, vec3_base) {
    /**
     * @constructor
     * @param {number|vec3f|number[]} [x=0] - The x-coordinate, another vec3f instance, or an array containing all three coordinates.
     * @param {number} [y=0] - The y-coordinate.
     * @param {number} [z=0] - The z-coordinate.
     */
    constructor(x = 0, y = 0, z = 0) {
        super(3);

        if (kind_of(x) === `vec3`) {
            this.set(x);
        } else if (array.is_array(x)) {
            this[X_AXIS] = numb.float32(x[X_AXIS]);
            this[Y_AXIS] = numb.float32(x[Y_AXIS]);
            this[Z_AXIS] = numb.float32(x[Z_AXIS]);
        } else {
            this[X_AXIS] = numb.float32(x);
            this[Y_AXIS] = numb.float32(y);
            this[Z_AXIS] = numb.float32(z);
        }
    };

    /** @returns {number} */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 3; }
}

/**
 * @class  vec3d
 * @extends Float64Array
 */
export class vec3d extends classes(Float64Array, vec3_base) {
    /**
     * @constructor
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    constructor(x = 0, y = 0, z = 0) {
        super(3);

        if (kind_of(x)=== `vec3`) {
            this.set(x);
        }
        if (array.is_array(x)) {
            this[X_AXIS] = x[X_AXIS];
            this[Y_AXIS] = x[Y_AXIS];
            this[Z_AXIS] = x[Z_AXIS];
        }
        else {
            this[X_AXIS] = x;
            this[Y_AXIS] = y;
            this[Z_AXIS] = z;
        }
    };

    /** @returns {number} */
    static get BYTES_LENGTH() { return Float64Array.BYTES_PER_ELEMENT * 3; };
};

export class vec3_f32p_ref extends classes(Float32Array, vec3_base) {

    /**
     * @constructs vec3_f32p_ref
     * @param {ArrayBuffer} buffer 
     * @param {number} offset 
     */
    constructor(buffer, offset) {
        super(buffer, offset, 3);
    }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 3; }

};

/**
 * Sets the components of a 3D vector.
 * 
 * @param {number[]} vec - The vector to set [x, y, z].
 * @param {number|number[]} [x=0] - The x-coordinate or an array containing all three coordinates.
 * @param {number} [y=0] - The y-coordinate.
 * @param {number} [z=0] - The z-coordinate.
 * @returns {number[]} The updated vector.
 */
export const vec3_set = (vec, x = 0, y = 0, z = 0) => {
    // Check if x is an array, if so, recursively set vec using array elements.
    if (array.is_array(x)) return vec3_set(vec, x[0] || 0, x[1] || 0, x[2] || 0);

    // Assign coordinates to vec, checking for NaN with numb.fast_nan.
    vec[0] = numb.fast_nan(x) ? NaN : x;
    vec[1] = numb.fast_nan(y) ? NaN : y;
    vec[2] = numb.fast_nan(z) ? NaN : z;

    return vec;
};

/**
 * Generates a random vec3 with values between min (inclusive) and max (exclusive).
 * @param {vec3} vec - The vec3 to store the random values.
 * @param {number} [min=0] - The minimum value.
 * @param {number} [max=1] - The maximum value.
 * @returns {vec3} The generated random vec3.
 */
export const vec3_random = (vec, min = 0, max = 1) => {
    vec[X_AXIS] = numb.frand(min, max);
    vec[Y_AXIS] = numb.frand(min, max);
    vec[Z_AXIS] = numb.frand(min, max);
    return vec;
};

/**
 * Negates each component of the given vec3.
 * @param {vec3} vec - The input vec3.
 * @returns {vec3} The negated vec3.
 */
export const vec3_neg = vec => {
    // Negate each component of the vec3
    vec[X_AXIS] = vec[X_AXIS] == 0 ? 0 : -vec[X_AXIS];
    vec[Y_AXIS] = vec[Y_AXIS] == 0 ? 0 : -vec[Y_AXIS];
    vec[Z_AXIS] = vec[Z_AXIS] == 0 ? 0 : -vec[Z_AXIS];
    return vec;
};

/**
 * Checks if all components of a vec3 are zero.
 * @param {vec3} vec - The vector to check.
 * @returns {boolean} True if all components are zero, false otherwise.
 */
export const vec3_is_null = vec => vec[X_AXIS] === 0 && vec[Y_AXIS] === 0 && vec[Z_AXIS] === 0;

/**
 * Checks if a 3D vector is almost null, within a fuzzy tolerance.
 * @param {vec3} vec - The 3D vector to check.
 * @returns {boolean} - True if the vector is almost null, false otherwise.
 */
export const vec3_is_fuzzy_null = vec => numb.fuzzy_null(vec[X_AXIS]) && numb.fuzzy_null(vec[Y_AXIS]) && numb.fuzzy_null(vec[Z_AXIS]);

/**
 * Checks if two vec3 objects are equal.
 * @param {vec3} v1 - The first vec3 object.
 * @param {vec3} v2 - The second vec3 object.
 * @returns {boolean} - True if the vec3 objects are equal, false otherwise.
 */
export const vec3_equals = (v1, v2) => {
    return v1[X_AXIS] === v2[X_AXIS] &&
        v1[Y_AXIS] === v2[Y_AXIS] &&
        v1[Z_AXIS] === v2[Z_AXIS];
};

/**
 * Checks if two vec3 objects are almost equal within a small tolerance.
 * @param {vec3} v1 - The first vec3 object.
 * @param {vec3} v2 - The second vec3 object.
 * @returns {Boolean} - True if the vectors are almost equal, false otherwise.
 */
export const vec3_fuzzy_equals = (v1, v2) => numb.fuzzy_comparef(v1[X_AXIS], v2[X_AXIS]) &&
    numb.fuzzy_comparef(v1[Y_AXIS], v2[Y_AXIS]) &&
    numb.fuzzy_comparef(v1[Z_AXIS], v2[Z_AXIS]);

/**
 * Calculates the squared length of a 3D vector.
 * @param {vec3} vec - The 3D vector.
 * @returns {number} The squared length of the vector.
 */
export const vec3_length_square = vec => vec[X_AXIS] ** 2 + vec[Y_AXIS] ** 2 + vec[Z_AXIS] ** 2;

/**
 * Calculates the length of a 3D vector.
 * @param {vec3} vec - The input vector [x, y, z].
 * @returns {number} The length of the vector.
 */
export const vec3_length = vec => Math.sqrt(vec3_length_square(vec));

/**
 * Sets the length of a 3D vector.
 * @param {number[]} vec - The input vector [x, y, z].
 * @param {number} len - The desired length.
 * @returns {number[]} - The vector with the specified length.
 */
export const vec3_set_length = (vec, len) => vec3_mult(vec3_normalize(vec), len, vec);

/**
 * Normalizes a 3D vector.
 * @param {number[]} vec - The input vector [x, y, z].
 * @returns {number[]} - The normalized vector.
 */
export const vec3_normalize = vec => {
    let len = vec3_length_square(vec);
    if (!numb.fuzzy_null(len - 1.0) && len !== 0 ) {
        len = Math.sqrt(len);
        vec[X_AXIS] /= len;
        vec[Y_AXIS] /= len;
        vec[Z_AXIS] /= len;
    }
    return vec;
};

/**
 * Normalizes a 3D vector and stores the result in the provided result vector.
 * @param {vec3} vec - The input vector [x, y, z].
 * @param {vec3} [result=new vec3f()] - The result vector to store the normalized vector.
 * @returns {vec3} The normalized vector.
 */
export const vec3_normalized = (vec, result = new vec3f()) => {
    let len = vec3_length_square(vec);

    // Check if the vector length is not zero and not very close to 1
    if (!numb.fuzzy_null(len - 1.0) && len !== 0) {
        len = Math.sqrt(len);
        // Normalize the vector and store the result in the provided vector
        vec3_set(result, vec[X_AXIS] / len, vec[Y_AXIS] / len, vec[Z_AXIS] / len);
    }
    else {
        // If the vector length is zero or very close to 1.0, store the result
        vec3_set(result, vec);
    }
    return result;
};

/**
 * Adds two 3D vectors.
 * @param {vec3} v1 - The first vector.
 * @param {vec3} v2 - The second vector.
 * @param {vec3} result - The optional result vector to store the result.
 * @returns {vec3} - The sum of the two vectors.
 */
export const vec3_add = (v1, v2, result = new vec3f()) => {
    if (kind_of(v1) === `vec3` && kind_of(v2) === `vec3`) {
        result[X_AXIS] = v1[X_AXIS] + v2[X_AXIS];
        result[Y_AXIS] = v1[Y_AXIS] + v2[Y_AXIS];
        result[Z_AXIS] = v1[Z_AXIS] + v2[Z_AXIS];
    }
    else throw new Error(`Operant is of the wrong type.`);

    return result;
};

/**
 * Subtracts the components of v2 from the components of v1 and stores the result in result.
 * @param {vec3} v1 - The first vector.
 * @param {vec3} v2 - The second vector to subtract from the first vector.
 * @param {vec3} [result] - The result vector where the subtraction result will be stored.
 * @returns {vec3} - The result of the subtraction operation.
 */
export const vec3_rem = (v1, v2, result = new vec3f()) => {
    // Subtract the components of v2 from the components of v1 and store the result in result
    result[X_AXIS] = v1[X_AXIS] - v2[X_AXIS];
    result[Y_AXIS] = v1[Y_AXIS] - v2[Y_AXIS];
    result[Z_AXIS] = v1[Z_AXIS] - v2[Z_AXIS];
    return result;
};

/**
 * Multiplies a vectors, to a scalar, vector, quaternion or vec4.
 * @param {vec3|number} v1 - The first vector.
 * @param {vec3|number|quat|vec4} v2 - The second vector, scalar, quaternion, or vec4.
 * @param {vec3} [result] - The result vector where the multiplication result will be stored.
 * @returns {vec3} - The result of the multiplication operation.
 * @throws {type_error} - If the types of v1 or v2 are incorrect.
 */
export const vec3_mult = (v1, v2, result = new vec3f()) => {
    // vector * scalar
    // scalar * vector
    // vector * vector
    // vector * quaternion

    //? quaternion * vector (quaternion * vector * quaternion^(-1))
    if (array.is_array(v1)) {
        if (kind_of(v2) === `vec3`) {
            result[X_AXIS] = v1[X_AXIS] * v2[X_AXIS];
            result[Y_AXIS] = v1[Y_AXIS] * v2[Y_AXIS];
            result[Z_AXIS] = v1[Z_AXIS] * v2[Z_AXIS];
        }
        else if (kind_of(v2) === `quat`) {
            const ix = v2[QW] * v1[X_AXIS] + v2[QY] * v1[Z_AXIS] - v2[QZ] * v1[Y_AXIS];
            const iy = v2[QW] * v1[Y_AXIS] + v2[QZ] * v1[X_AXIS] - v2[QX] * v1[Z_AXIS];
            const iz = v2[QW] * v1[Z_AXIS] + v2[QX] * v1[Y_AXIS] - v2[QY] * v1[X_AXIS];
            const iw = - v2[QX] * v1[X_AXIS] - v2[QY] * v1[Y_AXIS] - v2[QZ] * v1[Z_AXIS];

            result[X_AXIS] = ix * v2[QW] + iw * - v2[QX] + iy * - v2[QZ] - iz * - v2[QY];
            result[Y_AXIS] = iy * v2[QW] + iw * - v2[QY] + iz * - v2[QX] - ix * - v2[QZ];
            result[Z_AXIS] = iz * v2[QW] + iw * - v2[QZ] + ix * - v2[QY] - iy * - v2[QX];
        }
        else if (kind_of(v2) === `number`) {
            result[X_AXIS] = v1[X_AXIS] * v2;
            result[Y_AXIS] = v1[Y_AXIS] * v2;
            result[Z_AXIS] = v1[Z_AXIS] * v2;
        }
        else throw new type_error(`Invalid operand types. v1:${v1}, v2:${v2}`);
    }
    else if (kind_of(v1) === `number`) {
        result[X_AXIS] = v2[X_AXIS] * v1;
        result[Y_AXIS] = v2[Y_AXIS] * v1;
        result[Z_AXIS] = v2[Z_AXIS] * v1;
    }
    else throw new type_error(`Invalid operand types. v1:${v1}, v2:${v2}`);

    return result;
};

/**
 * Divides the components of a vector by a scalar, another vector, or a quaternion.
 * @param {vec3} v1 - The first vector.
 * @param {vec3|number|quat} v2 - The second vector, scalar, or quaternion to divide by.
 * @param {vec3} [result=new vec3f()] - The result vector where the division result will be stored.
 * @returns {vec3} - The result of the division operation.
 * @throws {type_error} - If the types of v1 or v2 are incorrect.
 */
export const vec3_div = (v1, v2, result = new vec3f()) => {
    // Ensure the first operand is a vec3
    if (kind_of(v1) !== 'vec3') {
        throw new type_error('The first operand must be a vec3.');
    }

    if (kind_of(v2) === 'vec3') {
        // Vector / Vector
        result[X_AXIS] = v1[X_AXIS] / v2[X_AXIS];
        result[Y_AXIS] = v1[Y_AXIS] / v2[Y_AXIS];
        result[Z_AXIS] = v1[Z_AXIS] / v2[Z_AXIS];
    } else if (kind_of(v2) === 'quat') {
        // Vector / Quaternion (use conjugate of quaternion)
        vec3_mult(v1, quat_conjugated(v2, new v2.constructor()), result);
    } else if (kind_of(v2) === 'number') {
        // Vector / Scalar
        result[X_AXIS] = v1[X_AXIS] / v2;
        result[Y_AXIS] = v1[Y_AXIS] / v2;
        result[Z_AXIS] = v1[Z_AXIS] / v2;
    } else {
        throw new type_error('The second operand must be a vec3, quat, or number.');
    }

    return result;
};

/**
 * Calculates the dot product of two 3D vectors.
 * @param {vec3} v1 - The first vector.
 * @param {vec3} v2 - The second vector.
 * @returns {number} - The dot product of the two vectors.
 */
export const vec3_dot = (v1, v2) => 
    v1[X_AXIS] * v2[X_AXIS] + v1[Y_AXIS] * v2[Y_AXIS] + v1[Z_AXIS] * v2[Z_AXIS];

/**
 * Computes the cross product of two 3D vectors.
 * @param {vec3} v1 - The first vector.
 * @param {vec3} v2 - The second vector.
 * @param {vec3} [result] - The result vector where the cross product will be stored.
 * @returns {vec3} - The result of the cross product operation.
 */
export const vec3_cross = (v1, v2, result = new vec3f()) => {
    result[X_AXIS] = v1[Y_AXIS] * v2[Z_AXIS] - v1[Z_AXIS] * v2[Y_AXIS];
    result[Y_AXIS] = v1[Z_AXIS] * v2[X_AXIS] - v1[X_AXIS] * v2[Z_AXIS];
    result[Z_AXIS] = v1[X_AXIS] * v2[Y_AXIS] - v1[Y_AXIS] * v2[X_AXIS];
    return result;
};

/**
 * Computes the squared distance between two 3D vectors.
 * @param {vec3} v1 - The first vector.
 * @param {vec3} v2 - The second vector.
 * @returns {number} - The squared distance between the two vectors.
 */
export const vec3_dist_sqr = (v1, v2) => {
    const dx = v1[X_AXIS] - v2[X_AXIS];
    const dy = v1[Y_AXIS] - v2[Y_AXIS];
    const dz = v1[Z_AXIS] - v2[Z_AXIS];
    return dx * dx + dy * dy + dz * dz;
};

/**
 * Computes the distance between two 3D vectors.
 * @param {vec3} v1 - The first vector.
 * @param {vec3} v2 - The second vector.
 * @returns {number} - The distance between the two vectors.
 */
export const vec3_dist = (v1, v2) => Math.sqrt(vec3_dist_sqr(v1, v2));

export const vec3_apply_quat = (v, q, result = new vec3f()) => {
    const ix = q[QW] * v[X_AXIS] + q[QY] * v[Z_AXIS] - q[QZ] * v[Y_AXIS];
    const iy = q[QW] * v[Y_AXIS] + q[QZ] * v[X_AXIS] - q[QX] * v[Z_AXIS];
    const iz = q[QW] * v[Z_AXIS] + q[QX] * v[Y_AXIS] - q[QY] * v[X_AXIS];
    const iw = - q[QX] * v[X_AXIS] - q[QY] * v[Y_AXIS] - q[QZ] * v[Z_AXIS];

    result[X_AXIS] = ix * q[QW] + iw * - q[QX] + iy * - q[QZ] - iz * - q[QY];
    result[Y_AXIS] = iy * q[QW] + iw * - q[QY] + iz * - q[QX] - ix * - q[QZ];
    result[Z_AXIS] = iz * q[QW] + iw * - q[QZ] + ix * - q[QY] - iy * - q[QX];

    return result;
};

/**
 * Applies a 4x4 matrix transformation to a 3D vector.
 * @param {vec3} vec - The input vector {x, y, z}.
 * @param {mat4} mat - The 4x4 transformation matrix as a flat array.
 * @param {vec3} res - The resulting transformed vector {x, y, z}.
 * @returns {vec3} - The transformed vector.
 */
export const vec3_apply_mat4 = (vec, mat, res) => {
    const vx = vec[X_AXIS] || 0;
    const vy = vec[Y_AXIS] || 0;
    const vz = vec[Z_AXIS] || 0;
    
    // Compute the reciprocal of the w component
    const w = 1 / (mat[3] * vx + mat[7] * vy + mat[11] * vz + mat[15]);
    
    // Apply the transformation matrix to the vector
    res[X_AXIS] = (mat[0] * vx + mat[4] * vy + mat[8] * vz + mat[12]) * w;
    res[Y_AXIS] = (mat[1] * vx + mat[5] * vy + mat[9] * vz + mat[13]) * w;
    res[Z_AXIS] = (mat[2] * vx + mat[6] * vy + mat[10] * vz + mat[14]) * w;
    
    return res;
};

/**
 * Converts a 3D vector to a comma-separated string.
 * @param {vec3} v - The input vector with components [x, y, z].
 * @returns {string} - A string representation of the vector in the format "x, y, z".
 */
export const vec3_string_comp = v => `${v[X_AXIS]}, ${v[Y_AXIS]}, ${v[Z_AXIS]}`;

/**
 * Rounds the components of a 3D vector to a specified number of decimal places.
 * @param {vec3} v - The input vector with components [x, y, z].
 * @param {number} dec - The number of decimal places to round to.
 * @returns {vec3} - The input vector with its components rounded to the specified number of decimal places.
 */
export const vec3_round_2_dec = (v, dec) => {
    v[X_AXIS] = numb.parse(numb.f32s(v[X_AXIS], dec));
    v[Y_AXIS] = numb.parse(numb.f32s(v[Y_AXIS], dec));
    v[Z_AXIS] = numb.parse(numb.f32s(v[Z_AXIS], dec));
};

export const vec3_string = (v, dec = 6) => {
    return `${numb.parse(numb.f32s(v.x, dec))} ${numb.parse(numb.f32s(v.y, dec))} ${numb.parse(numb.f32s(v.z, dec))}`;
};

