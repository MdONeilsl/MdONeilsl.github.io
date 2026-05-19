import { array, pool } from "../array.js";
import { classes, kind_of } from "../../functions.js";
import { X, Y } from "../gui/point.js";
import { rect_set, rect_translated, x1, x2, y1, y2 } from "../gui/rect.js";
import { numb } from "./number.js";
import { Y_AXIS, Z_AXIS } from "./vec3.js";

/** @constant {number} */
export const m3_11 = 0;
/** @constant {number} */
export const m3_12 = 1;
/** @constant {number} */
export const m3_13 = 2;
/** @constant {number} */
export const m3_21 = 3;
/** @constant {number} */
export const m3_22 = 4;
/** @constant {number} */
export const m3_23 = 5;
/** @constant {number} */
export const m3_31 = 6;
/** @constant {number} */
export const m3_32 = 7;
/** @constant {number} */
export const m3_33 = 8;

const MAT3_IDENTITY = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
];

/** @constant {number} */
export const MAT3_NONE_FLAG = 0x00;
/** @constant {number} */
export const MAT3_TRANSLATE_FLAG = 0x01;
/** @constant {number} */
export const MAT3_SCALE_FLAG = 0x02;
/** @constant {number} */
export const MAT3_ROTATE_FLAG = 0x04;
/** @constant {number} */
export const MAT3_SHEAR_FLAG = 0x08;
/** @constant {number} */
export const MAT3_PROJECT_FLAG = 0x10;

class mat3_base {
    _flag = 0;
    #rows = 3;
    #cols = 3;

    /** @returns {String} */
    get kind() { return `mat3`; }

    /** @returns {Number} */
    get m11() { return this[m3_11]; }
    /** @returns {Number} */
    get m12() { return this[m3_12]; }
    /** @returns {Number} */
    get m13() { return this[m3_13]; }
    /** @returns {Number} */
    get m21() { return this[m3_21]; }
    /** @returns {Number} */
    get m22() { return this[m3_22]; }
    /** @returns {Number} */
    get m23() { return this[m3_23]; }
    /** @returns {Number} */
    get m31() { return this[m3_31]; }
    /** @returns {Number} */
    get m32() { return this[m3_32]; }
    /** @returns {Number} */
    get m33() { return this[m3_33]; }

    /** @param {Number} x */
    set m11(x) { this[m3_11] = x; }
    /** @param {Number} x */
    set m12(x) { this[m3_12] = x; }
    /** @param {Number} x */
    set m13(x) { this[m3_13] = x; }
    /** @param {Number} x */
    set m21(x) { this[m3_21] = x; }
    /** @param {Number} x */
    set m22(x) { this[m3_22] = x; }
    /** @param {Number} x */
    set m23(x) { this[m3_23] = x; }
    /** @param {Number} x */
    set m31(x) { this[m3_31] = x; }
    /** @param {Number} x */
    set m32(x) { this[m3_32] = x; }
    /** @param {Number} x */
    set m33(x) { this[m3_33] = x; }

    /** @returns {Number} */
    get flag() { return mat3_flag(this); }
    /** @param {Number} value */
    set flag(value) { this._flag = value; }

    /** @returns {Number} */
    get rows() { return 3; }
    /** @returns {Number} */
    get cols() { return 3; }

    /** @returns {Number} */
    get dx() { return this[m3_31]; }
    /** @returns {Number} */
    get dy() { return this[m3_32]; }
};

/**
 * Returns the transformation type of the matrix.
 * @param {mat3} mat - The input matrix.
 * @returns {number} - The transformation type flag of the matrix.
 */
const mat3_flag = mat => {
    if (mat._flag == MAT3_NONE_FLAG)
        return mat._flag;

    let dum = 0;
    switch (mat._flag) {
        case MAT3_PROJECT_FLAG:
            if (!numb.fuzzy_null(mat[m3_13]) || !numb.fuzzy_null(mat[m3_23]) || !numb.fuzzy_null(mat[m3_33] - 1)) {
                dum = MAT3_PROJECT_FLAG;
                break;
            }
        case MAT3_SHEAR_FLAG:
        case MAT3_ROTATE_FLAG:
            if (!numb.fuzzy_null(mat[m3_12]) || !numb.fuzzy_null(mat[m3_21])) {
                let dot = mat[m3_11] * mat[m3_21] + mat[m3_12] * mat[m3_22];
                if (numb.fuzzy_null(dot))
                    dum = MAT3_ROTATE_FLAG;
                else
                    dum = MAT3_SHEAR_FLAG;
                break;
            }
        case MAT3_SCALE_FLAG:
            if (!numb.fuzzy_null(mat[m3_11] - 1) || !numb.fuzzy_null(mat[m3_22] - 1)) {
                dum = MAT3_SCALE_FLAG;
                break;
            }
        case MAT3_TRANSLATE_FLAG:
            if (!numb.fuzzy_null(mat[m3_31]) || !numb.fuzzy_null(mat[m3_32])) {
                dum = MAT3_TRANSLATE_FLAG;
                break;
            }
        case MAT3_NONE_FLAG:
            dum = MAT3_NONE_FLAG;
            break;
    }

    mat._flag = dum;
    return dum;
};

/**
 * Maps the input object using the transformation matrix and stores the result in the output array.
 * @param {mat3} mat - The transformation matrix.
 * @param {Array} obj - The input object array.
 * @param {number} i1 - The index of the first coordinate in the input object array.
 * @param {number} i2 - The index of the second coordinate in the input object array.
 * @param {Array} result - The output array to store the mapped coordinates.
 * @param {boolean} [is_float=false] - Indicates whether to round the mapped coordinates to the nearest integer.
 */
const mat3_map = (mat, obj, i1, i2, result, is_float = false) => {
    let px, py;
    switch (mat.flag) {
        case MAT3_NONE_FLAG:
            px = obj[i1];
            py = obj[i2];
            break;
        case MAT3_TRANSLATE_FLAG:
            px = obj[i1] + mat[m3_31];
            py = obj[i2] + mat[m3_32];
            break;
        case MAT3_SCALE_FLAG:
            px = mat[m3_11] * obj[i1] + mat[m3_31];
            py = mat[m3_22] * obj[i2] + mat[m3_32];
            break;
        case MAT3_ROTATE_FLAG:
        case MAT3_SHEAR_FLAG:
        case MAT3_PROJECT_FLAG: {
            px = mat[m3_11] * obj[i1] + mat[m3_21] * obj[i2] + mat[m3_31];
            py = mat[m3_12] * obj[i1] + mat[m3_22] * obj[i2] + mat[m3_32];

            if (mat._flag == MAT3_PROJECT_FLAG) {
                let w = 1 / (mat[m3_13] * obj[i1] + mat[m3_23] * obj[i2] + mat[m3_33]);
                px *= w, py *= w;
            }
        }
    }

    if (mat.flag > MAT3_NONE_FLAG && !is_float) {
        px = numb.rounded(px, numb.rounding_mode.away_from_zero);
        py = numb.rounded(py, numb.rounding_mode.away_from_zero);
    }

    result[i1] = px;
    result[i2] = py;
};

/**
 * Represents a 3x3 matrix of single-precision floating-point numbers.
 * @class mat3f
 * @extends Float32Array
 * @extends mat3_base
 */
export class mat3f extends classes(Float32Array, mat3_base) {
    /**
     * Creates a new mat3f instance.
     * @param {number|mat3} v11 - The initial value for the matrix. If a number is provided, it initializes the matrix as a projective transformation with the given value and additional arguments.
     * @param {...number} args - Additional arguments for initializing the matrix as a projective transformation.
     */
    constructor(v11, ...args) {
        super(MAT3_IDENTITY);

        if (kind_of(v11) === `mat3`) {
            this.set(v11);
            this.flag = v11.flag;
        }
        else if (array.is_array(v11)) {
            for (let i = 0, max = Math.min(v11.length, 9); i < max; ++i)
                this[i] = v11[i];
            this.flag = MAT3_PROJECT_FLAG;

        }
        else if (kind_of(v11) === `number`) {
            this.set([v11, ...args.slice(0, 8)]);
            this.flag = MAT3_PROJECT_FLAG;
        }
    }

    /**
     * Returns the length of the matrix in bytes.
     * @returns {number} The length of the matrix in bytes.
     */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 9; }

    /**
     * Returns a new mat3f instance representing the identity matrix.
     * @returns {mat3f} A new mat3f instance representing the identity matrix.
     */
    static get IDENTITY() { return new mat3f(); }
}

/**
 * Represents a 3x3 matrix of single-precision floating-point numbers.
 * @class mat3f
 * @extends Float64Array
 * @extends mat3_base
 */
export class mat3d extends classes(Float64Array, mat3_base) {
    /**
     * Creates a new mat3f instance.
     * @param {number|mat3} v11 - The initial value for the matrix. If a number is provided, it initializes the matrix as a projective transformation with the given value and additional arguments.
     * @param {...number} args - Additional arguments for initializing the matrix as a projective transformation.
     */
    constructor(v11, ...args) {
        super(MAT3_IDENTITY);

        if (kind_of(v11) === `mat3`) {
            this.set(v11);
            this.flag = v11.flag;
        }
        else if (array.is_array(v11)) {
            for (let i = 0, max = Math.min(v11.length, 9); i < max; ++i)
                this[i] = v11[i];
            this.flag = MAT3_PROJECT_FLAG;

        }
        else if (kind_of(v11) === `number`) {
            this.set([v11, ...args.slice(0, 8)]);
            this.flag = MAT3_PROJECT_FLAG;
        }
    }

    /**
     * Returns the length of the matrix in bytes.
     * @returns {number} The length of the matrix in bytes.
     */
    static get BYTES_LENGTH() { return Float64Array.BYTES_PER_ELEMENT * 9; }

    /**
     * Returns a new mat3f instance representing the identity matrix.
     * @returns {mat3f} A new mat3f instance representing the identity matrix.
     */
    static get IDENTITY() { return new mat3d(); }
}

/**
 * Represents a 3x3 matrix of single-precision floating-point numbers with a pooled buffer.
 * @class mat3_f32p
 * @extends Float32Array
 * @extends mat3_base
 */
export class mat3_f32p extends classes(Float32Array, mat3_base) {
    #buff = null;

    /**
     * Creates a new mat3_f32p instance.
     * @constructs mat3_f32p
     * @param {pool} obj - The pool object for the buffer or an ArrayBuffer view.
     * @param {number|mat3} [v11] - The initial value for the matrix. If a number is provided, it initializes the matrix as a projective transformation with the given value and additional arguments.
     * @param {...number} args - Additional arguments for initializing the matrix as a projective transformation.
     * @throws {Error} Throws an error if the parameter is of the wrong type.
     */
    constructor(obj, v11, ...args) {
        let buff;
        if (obj instanceof pool) buff = obj;
        else if (ArrayBuffer.isView(obj)) buff = obj.buff;
        else throw new Error('Parameter is of the wrong type.');

        super(buff.buffer, buff.align(Float32Array, 9), 9);
        this.#buff = buff;
        this.set(MAT3_IDENTITY);

        if (kind_of(v11) === `mat3`) {
            this.set(v11);
            this.flag = v11.flag;
        }
        else if (array.is_array(v11)) {
            for (let i = 0, max = Math.min(v11.length, 9); i < max; ++i)
                this[i] = v11[i];
            this.flag = MAT3_PROJECT_FLAG;

        }
        else if (kind_of(v11) === `number`) {
            this.set([v11, ...args.slice(0, 8)]);
            this.flag = MAT3_PROJECT_FLAG;
        }
    }

    /**
     * Returns the length of the matrix in bytes.
     * @returns {Number} - The length of the matrix in bytes.
     */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 9; }

    /**
     * Returns a new mat3f instance representing the identity matrix.
     * @returns {mat3f} - A new mat3f instance representing the identity matrix.
     */
    static get IDENTITY() { return new mat3f(); }

    /**
     * Returns the buffer object associated with the matrix.
     * @returns {Object} - The buffer object associated with the matrix.
     */
    get buff() { return this.#buff; }
}

/**
 * @class  mat3_f32p_ref
 * @extends Float32Array
 */
export class mat3_f32p_ref extends classes(Float32Array, mat3_base) {

    /**
     * @constructs mat3_f32p_ref
     * @param {ArrayBuffer} buffer 
     * @param {number} offset 
     */
    constructor(buffer, offset) {
        super(buffer, offset, 9);
        this.flag = MAT3_PROJECT_FLAG;
    }

    /** @returns {Number} */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 9; }
    /** @returns {mat3f} */
    static get IDENTITY() { return new mat3f(); }
};

/**
 * Returns true if the matrix represent an affine transformation, otherwise returns false.
 * @param {mat3} m - The input matrix.
 * @returns {boolean} - True if the matrix represents an affine transformation, otherwise false.
 */
export const mat3_is_affine = m => m.flag < MAT3_PROJECT_FLAG;

/**
 * Returns true if the matrix is the identity matrix, otherwise returns false.
 * @param {mat3} m - The input matrix.
 * @returns {boolean} - True if the matrix is the identity matrix, otherwise false.
 */
export const mat3_is_identity = m => m.flag == MAT3_NONE_FLAG;

/**
 * Returns the matrix's determinant.
 * 
 * @param {mat3} m - The input matrix.
 * @returns {number} - The determinant of the matrix.
 * 
 * @example
 * const matrix = new mat3([1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const determinant = mat3_determinant(matrix);
 * console.log(determinant); // Output: 0
 */
export const mat3_determinant = m => m[m3_11] * (m[m3_33] * m[m3_22] - m[m3_32] * m[m3_23]) -
    m[m3_21] * (m[m3_33] * m[m3_12] - m[m3_32] * m[m3_13]) +
    m[m3_31] * (m[m3_23] * m[m3_12] - m[m3_22] * m[m3_13]);

/**
 * Returns true if the matrix is invertible, otherwise returns false.
 * @param {mat3} m - The matrix to check for invertibility.
 * @returns {boolean} - True if the matrix is invertible, false otherwise.
 */
export const mat3_is_invertible = m => !numb.fuzzy_null(mat3_determinant(m));

/**
 * Returns the adjoint of a 3x3 matrix.
 * @param {mat3} mat - The input matrix.
 * @param {mat3} result - The resulting adjoint matrix.
 * @returns {mat3} - The adjoint matrix.
 */
export const mat3_adjoint = (mat, result = new mat3f()) => {
    // Calculate the elements of the adjoint matrix
    let m11 = mat[m3_22] * mat[m3_33] - mat[m3_23] * mat[m3_32];
    let m12 = mat[m3_13] * mat[m3_32] - mat[m3_12] * mat[m3_33];
    let m13 = mat[m3_12] * mat[m3_23] - mat[m3_13] * mat[m3_22];
    let m21 = mat[m3_23] * mat[m3_31] - mat[m3_21] * mat[m3_33];
    let m22 = mat[m3_11] * mat[m3_33] - mat[m3_13] * mat[m3_31];
    let m23 = mat[m3_13] * mat[m3_21] - mat[m3_11] * mat[m3_23];
    let m31 = mat[m3_21] * mat[m3_32] - mat[m3_22] * mat[m3_31];
    let m32 = mat[m3_12] * mat[m3_31] - mat[m3_11] * mat[m3_32];
    let m33 = mat[m3_11] * mat[m3_22] - mat[m3_12] * mat[m3_21];

    // Assign the elements to the result matrix
    result[m3_11] = m11;
    result[m3_12] = m12;
    result[m3_13] = m13;
    result[m3_21] = m21;
    result[m3_22] = m22;
    result[m3_23] = m23;
    result[m3_31] = m31;
    result[m3_32] = m32;
    result[m3_33] = m33;

    // Set flag for the result matrix
    result.flag = MAT3_PROJECT_FLAG;

    // Return the resulting adjoint matrix
    return result;
};

/**
 * Returns the matrix obtained by adding the given mod to each element of the matrix.
 * @param {mat3} m - The original matrix.
 * @param {number} mod - The value to be added to each element of the matrix.
 * @param {mat3} [result = new mat3f()] - The matrix to store the result. If not provided, a new mat3f instance will be created.
 * @returns {mat3} - The resulting matrix after adding the mod to each element.
 */
export const mat3_add = (mat, mod, result = new mat3f()) => {
    result[m3_11] = mat[m3_11] + mod;
    result[m3_12] = mat[m3_12] + mod;
    result[m3_13] = mat[m3_13] + mod;
    result[m3_21] = mat[m3_21] + mod;
    result[m3_22] = mat[m3_22] + mod;
    result[m3_23] = mat[m3_23] + mod;
    result[m3_31] = mat[m3_31] + mod;
    result[m3_32] = mat[m3_32] + mod;
    result[m3_33] = mat[m3_33] + mod;
    result.flag = MAT3_PROJECT_FLAG;
    return result;
};

/**
 * Returns the matrix obtained by removing the given mod to each element of the matrix.
 * 
 * @param {mat3} m - The original matrix.
 * @param {number} mod - The value to subtract from each element of the matrix.
 * @param {mat3} result - The matrix to store the result.
 * 
 * @returns {mat3} - The matrix after subtracting the mod from each element.
 */
export const mat3_rem = (mat, mod, result = new mat3f()) => {
    result[m3_11] = mat[m3_11] - mod;
    result[m3_12] = mat[m3_12] - mod;
    result[m3_13] = mat[m3_13] - mod;
    result[m3_21] = mat[m3_21] - mod;
    result[m3_22] = mat[m3_22] - mod;
    result[m3_23] = mat[m3_23] - mod;
    result[m3_31] = mat[m3_31] - mod;
    result[m3_32] = mat[m3_32] - mod;
    result[m3_33] = mat[m3_33] - mod;
    result.flag = MAT3_PROJECT_FLAG;
    return result;
};

/**
 * Returns the result of performing an element-wise multiplication of this matrix with the given scalar.
 * @param {mat3} m - The original matrix.
 * @param {number|mat3} mod - The scalar to be multiplied with the matrix.
 * @param {mat3} result - The matrix to store the result. If not provided, a new mat3f instance will be created.
 * @returns {mat3} - The resulting matrix after performing an element-wise multiplication of this matrix with the given scalar.
 */
export const mat3_mult = (mat, mod, result = new mat3f()) => {
    if (kind_of(mod) === `number`) {
        result[m3_11] = mat[m3_11] * mod;
        result[m3_12] = mat[m3_12] * mod;
        result[m3_13] = mat[m3_13] * mod;
        result[m3_21] = mat[m3_21] * mod;
        result[m3_22] = mat[m3_22] * mod;
        result[m3_23] = mat[m3_23] * mod;
        result[m3_31] = mat[m3_31] * mod;
        result[m3_32] = mat[m3_32] * mod;
        result[m3_33] = mat[m3_33] * mod;
        result._flag = Math.max(mat._flag, MAT3_SCALE_FLAG);
    }
    else if (kind_of(mod) === `mat3`) {
        let t1 = mat._flag;
        if (t1 == MAT3_NONE_FLAG) {
            result[m3_11] = mod[m3_11];
            result[m3_12] = mod[m3_12];
            result[m3_13] = mod[m3_13];
            result[m3_21] = mod[m3_21];
            result[m3_22] = mod[m3_22];
            result[m3_23] = mod[m3_23];
            result[m3_31] = mod[m3_31];
            result[m3_32] = mod[m3_32];
            result[m3_33] = mod[m3_33];
            result._flag = mod._flag;
            return result;
        }

        let t2 = mod._flag;
        if (t2 == MAT3_NONE_FLAG) {
            result[m3_11] = mat[m3_11];
            result[m3_12] = mat[m3_12];
            result[m3_13] = mat[m3_13];
            result[m3_21] = mat[m3_21];
            result[m3_22] = mat[m3_22];
            result[m3_23] = mat[m3_23];
            result[m3_31] = mat[m3_31];
            result[m3_32] = mat[m3_32];
            result[m3_33] = mat[m3_33];
            result._flag = mat._flag;
            return result;
        }

        if (t2 > t1) t1 = t2;

        switch (t1) {
            case MAT3_NONE_FLAG:
                break;
            case MAT3_TRANSLATE_FLAG:
                result[m3_11] = mat[m3_11];
                result[m3_12] = mat[m3_12];
                result[m3_13] = mat[m3_13];
                result[m3_21] = mat[m3_21];
                result[m3_22] = mat[m3_22];
                result[m3_23] = mat[m3_23];
                result[m3_31] = mat[m3_31] + mod[m3_31];
                result[m3_32] = mat[m3_32] + mod[m3_32];
                result[m3_33] = mat[m3_33];
                break;
            case MAT3_SCALE_FLAG:
                {
                    let m11 = mat[m3_11] * mod[m3_11];
                    let m22 = mat[m3_22] * mod[m3_22];

                    let m31 = mat[m3_31] * mod[m3_11] + mod[m3_31];
                    let m32 = mat[m3_32] * mod[m3_22] + mod[m3_32];

                    result[m3_11] = m11;
                    result[m3_12] = mat[m3_12];
                    result[m3_13] = mat[m3_13];
                    result[m3_21] = mat[m3_21];
                    result[m3_22] = m22;
                    result[m3_23] = mat[m3_23];
                    result[m3_31] = m31;
                    result[m3_32] = m32;
                    result[m3_33] = mat[m3_33];
                    break;
                }
            case MAT3_ROTATE_FLAG:
            case MAT3_SHEAR_FLAG:
                {
                    let m11 = mat[m3_11] * mod[m3_11] + mat[m3_12] * mod[m3_21];
                    let m12 = mat[m3_11] * mod[m3_12] + mat[m3_12] * mod[m3_22];

                    let m21 = mat[m3_21] * mod[m3_11] + mat[m3_22] * mod[m3_21];
                    let m22 = mat[m3_21] * mod[m3_12] + mat[m3_22] * mod[m3_22];

                    let m31 = mat[m3_31] * mod[m3_11] + mat[m3_32] * mod[m3_21] + mod[m3_31];
                    let m32 = mat[m3_31] * mod[m3_12] + mat[m3_32] * mod[m3_22] + mod[m3_32];

                    result[m3_11] = m11;
                    result[m3_12] = m12;
                    result[m3_13] = mat[m3_13];
                    result[m3_21] = m21;
                    result[m3_22] = m22;
                    result[m3_23] = mat[m3_23];
                    result[m3_31] = m31;
                    result[m3_32] = m32;
                    result[m3_33] = mat[m3_33];
                    break;
                }
            case MAT3_PROJECT_FLAG:
                {
                    let m11 = mat[m3_11] * mod[m3_11] + mat[m3_12] * mod[m3_21] + mat[m3_13] * mod[m3_31];
                    let m12 = mat[m3_11] * mod[m3_12] + mat[m3_12] * mod[m3_22] + mat[m3_13] * mod[m3_32];
                    let m13 = mat[m3_11] * mod[m3_13] + mat[m3_12] * mod[m3_23] + mat[m3_13] * mod[m3_33];

                    let m21 = mat[m3_21] * mod[m3_11] + mat[m3_22] * mod[m3_21] + mat[m3_23] * mod[m3_31];
                    let m22 = mat[m3_21] * mod[m3_12] + mat[m3_22] * mod[m3_22] + mat[m3_23] * mod[m3_32];
                    let m23 = mat[m3_21] * mod[m3_13] + mat[m3_22] * mod[m3_23] + mat[m3_23] * mod[m3_33];

                    let m31 = mat[m3_31] * mod[m3_11] + mat[m3_32] * mod[m3_21] + mat[m3_33] * mod[m3_31];
                    let m32 = mat[m3_31] * mod[m3_12] + mat[m3_32] * mod[m3_22] + mat[m3_33] * mod[m3_32];
                    let m33 = mat[m3_31] * mod[m3_13] + mat[m3_32] * mod[m3_23] + mat[m3_33] * mod[m3_33];

                    result[m3_11] = m11;
                    result[m3_12] = m12;
                    result[m3_13] = m13;
                    result[m3_21] = m21;
                    result[m3_22] = m22;
                    result[m3_23] = m23;
                    result[m3_31] = m31;
                    result[m3_32] = m32;
                    result[m3_33] = m33;
                }
        }

        result._flag = t1;
    }

    return result;
};

/**
 * 
 * @param {mat3} mat 
 * @param {number} mod 
 * @param {mat3f} result 
 * @returns 
 */
export const mat3_div = (mat, mod, result = new mat3f()) => {
    if (mod == 0 || numb.fuzzy_comparef(mod, 1)) {
        result[m3_11] = mat[m3_11];
        result[m3_12] = mat[m3_12];
        result[m3_13] = mat[m3_13];
        result[m3_21] = mat[m3_21];
        result[m3_22] = mat[m3_22];
        result[m3_23] = mat[m3_23];
        result[m3_31] = mat[m3_31];
        result[m3_32] = mat[m3_32];
        result[m3_33] = mat[m3_33];
        result.flag = mat.flag;
    }
    else {
        result[m3_11] = mat[m3_11] / mod;
        result[m3_12] = mat[m3_12] / mod;
        result[m3_13] = mat[m3_13] / mod;
        result[m3_21] = mat[m3_21] / mod;
        result[m3_22] = mat[m3_22] / mod;
        result[m3_23] = mat[m3_23] / mod;
        result[m3_31] = mat[m3_31] / mod;
        result[m3_32] = mat[m3_32] / mod;
        result[m3_33] = mat[m3_33] / mod;
        result.flag = Math.max(mat.flag, MAT3_SCALE_FLAG);
    }

    return result;
};

/**
 * Moves the coordinate system dx along the x axis and dy along the y axis, and returns a reference to the result.
 * @param {mat3} m 
 * @param {number|point|vec2} x 
 * @param {number|mat3} y 
 * @param {mat3} [result] 
 * @returns {mat3}
 */
export const mat3_translate = (m, x, y, result) => {
    if (array.is_array(x))
        return mat3_translate(m, x[X], x[Y], y);

    result[m3_11] = m[m3_11];
    result[m3_12] = m[m3_12];
    result[m3_13] = m[m3_13];
    result[m3_21] = m[m3_21];
    result[m3_22] = m[m3_22];
    result[m3_23] = m[m3_23];
    //result[m3_31] = m[m3_31];
    //result[m3_32] = m[m3_32];
    result[m3_33] = m[m3_33];

    if (numb.fuzzy_null(x) && numb.fuzzy_null(y)) {
        result[m3_31] = m[m3_31];
        result[m3_32] = m[m3_32];
        return result;
    }


    if (numb.fast_nan(x) || numb.fast_nan(y)) {
        result[m3_31] = m[m3_31];
        result[m3_32] = m[m3_32];
        return result;
    }

    switch (mat3_flag(m)) {
        case MAT3_NONE_FLAG:
            result[m3_31] = x;
            result[m3_32] = y;
            break;

        case MAT3_TRANSLATE_FLAG:
            result[m3_31] = m[m3_31] + x;
            result[m3_32] = m[m3_32] + y;
            break;

        case MAT3_SCALE_FLAG:
            result[m3_31] = m[m3_31] + x * m[m3_11];
            result[m3_32] = m[m3_32] + y * m[m3_22];
            break;

        case MAT3_PROJECT_FLAG:
            result[m3_33] = m[m3_33] + x * m[m3_13] + y * m[m3_23];

        case MAT3_ROTATE_FLAG:
        case MAT3_SHEAR_FLAG:
            result[m3_31] = m[m3_31] + x * m[m3_11] + y * m[m3_21];
            result[m3_32] = m[m3_32] + y * m[m3_22] + x * m[m3_12];
    }

    result._flag = Math.max(m._flag, MAT3_TRANSLATE_FLAG);
    return result;
};

/**
 * Scales the coordinate system by x horizontally and y vertically.
 * @param {mat3} m 
 * @param {number|point|vec2} x 
 * @param {number|mat3} y 
 * @param {mat3} [result] 
 * @returns {mat3}
 */
export const mat3_scale = (m, x, y, result) => {
    if (array.is_array(x))
        return mat3_scale(m, x[X], x[Y], y);

    //result[m3_11] = m[m3_11];
    result[m3_12] = m[m3_12];
    result[m3_13] = m[m3_13];
    result[m3_21] = m[m3_21];
    //result[m3_22] = m[m3_22];
    result[m3_23] = m[m3_23];
    result[m3_31] = m[m3_31];
    result[m3_32] = m[m3_32];
    result[m3_33] = m[m3_33];

    if (numb.fast_nan(x) || numb.fast_nan(y)) {
        result[m3_11] = m[m3_11];
        result[m3_22] = m[m3_22];
        return result;
    }


    if (numb.fuzzy_comparef(x, 1) && numb.fuzzy_comparef(y, 1)) {
        result[m3_11] = m[m3_11];
        result[m3_22] = m[m3_22];
        return result;
    }

    switch (mat3_flag(m)) {
        case MAT3_NONE_FLAG:
        case MAT3_TRANSLATE_FLAG:
            result[m3_11] = x;
            result[m3_22] = y;
            break;
        case MAT3_PROJECT_FLAG:
            result[m3_13] = m[m3_13] * x;
            result[m3_23] = m[m3_23] * y;
        case MAT3_ROTATE_FLAG:
        case MAT3_SHEAR_FLAG:
            result[m3_12] = m[m3_12] * x;
            result[m3_21] = m[m3_21] * y;
        case MAT3_SCALE_FLAG:
            result[m3_11] = m[m3_11] * x;
            result[m3_22] = m[m3_22] * y;
            break;
    }

    result._flag = Math.max(m._flag, MAT3_SCALE_FLAG);
    return result;
};

/**
 * Rotates the coordinate system counterclockwise by the given angle a about the specified axis at distance dist from the screen.
 * @param {mat3} m 
 * @param {number} angle 
 * @param {mat3} result 
 * @param {number} [axis] 
 * @param {number} [dist] 
 * @returns 
 */
export const mat3_rad_rotate = (m, angle, result, axis = Z_AXIS, dist = 1024) => {

    //result[m3_11] = m[m3_11];
    //result[m3_12] = m[m3_12];
    result[m3_13] = m[m3_13];
    //result[m3_21] = m[m3_21];
    //result[m3_22] = m[m3_22];
    result[m3_23] = m[m3_23];
    result[m3_31] = m[m3_31];
    result[m3_32] = m[m3_32];
    result[m3_33] = m[m3_33];

    if (numb.fuzzy_null(angle)) {
        result[m3_11] = m[m3_11];
        result[m3_12] = m[m3_12];
        result[m3_21] = m[m3_21];
        result[m3_22] = m[m3_22];
        return result;
    }

    let s = 0, c = 0;
    if (angle == 1.570796 || angle == -4.712389)
        s = 1;
    else if (angle == -1.570796 || angle == 4.712389)
        s = -1;
    else if (angle == 3.141593)
        c = -1;
    else {
        s = Math.sin(angle);
        c = Math.cos(angle);
    }

    if (axis == Z_AXIS) {
        switch (mat3_flag(m)) {
            case MAT3_NONE_FLAG:
            case MAT3_TRANSLATE_FLAG:
                result[m3_11] = c;
                result[m3_12] = s;
                result[m3_21] = -s;
                result[m3_22] = c;
                break;
            case MAT3_SCALE_FLAG: {
                let m11 = c * m[m3_11];
                let m12 = s * m[m3_22];
                let m21 = -s * m[m3_11];
                let m22 = c * m[m3_22];

                result[m3_11] = m11;
                result[m3_12] = m12;
                result[m3_21] = m21;
                result[m3_22] = m22;
                break;
            }
            case MAT3_PROJECT_FLAG: {
                let m13 = c * m[m3_13] + s * m[m3_23];
                let m23 = -s * m[m3_13] + c * m[m3_23];

                result[m3_13] = m13;
                result[m3_23] = m23;
            }
            case MAT3_ROTATE_FLAG:
            case MAT3_SHEAR_FLAG: {
                let m11 = c * m[m3_11] + s * m[m3_21];
                let m12 = c * m[m3_12] + s * m[m3_22];
                let m21 = -s * m[m3_11] + c * m[m3_21];
                let m22 = -s * m[m3_12] + c * m[m3_22];

                result[m3_11] = m11;
                result[m3_12] = m12;
                result[m3_21] = m21;
                result[m3_22] = m22;
                break;
            }
        }
        result._flag = Math.max(m._flag, MAT3_ROTATE_FLAG);

    }
    else {
        if (!numb.fuzzy_null(dist))
            s /= dist;

        if (axis == Y_AXIS) {
            result[m3_11] = c;
            result[m3_13] = -s;
        } else {
            result[m3_22] = c;
            result[m3_23] = -s;
        }
        result._flag = MAT3_PROJECT_FLAG;
        mat3_mult(result, m, result);
        //*this = result * *this;
    }

    return result;
};

/**
 * Shears the coordinate system by x horizontally and y vertically, and returns the result.
 * @param {mat3} m 
 * @param {number|point|size|vec2} x 
 * @param {number|mat3} y 
 * @param {mat3} [result] 
 * @returns {mat3}
 */
export const mat3_shear = (m, x, y, result) => {
    if (array.is_array(x))
        return mat3_shear(m, x[X], x[Y], y);

    result[m3_11] = m[m3_11];
    //result[m3_12] = m[m3_12];
    result[m3_13] = m[m3_13];
    //result[m3_21] = m[m3_21];
    result[m3_22] = m[m3_22];
    result[m3_23] = m[m3_23];
    result[m3_31] = m[m3_31];
    result[m3_32] = m[m3_32];
    result[m3_33] = m[m3_33];

    if (numb.fast_nan(x) || numb.fast_nan(y)) {
        result[m3_12] = m[m3_12];
        result[m3_21] = m[m3_21];
        return result;
    }

    if (numb.fuzzy_null(x) && numb.fuzzy_null(y)) {
        result[m3_12] = m[m3_12];
        result[m3_21] = m[m3_21];
        return result;
    }

    switch (mat3_flag(m)) {
        case MAT3_NONE_FLAG:
        case MAT3_TRANSLATE_FLAG:
            result[m3_12] = y;
            result[m3_21] = x;
            break;
        case MAT3_SCALE_FLAG:
            result[m3_12] = y * m[m3_22];
            result[m3_21] = x * m[m3_11];
            break;
        case MAT3_PROJECT_FLAG: {
            let m13 = m[m3_13] + y * m[m3_23];
            let m23 = m[m3_23] + x * m[m3_13];

            result[m3_13] = m13;
            result[m3_23] = m23;
        }
        case MAT3_ROTATE_FLAG:
        case MAT3_SHEAR_FLAG: {
            let m11 = m[m3_11] + y * m[m3_21];
            let m22 = m[m3_22] + x * m[m3_12];
            let m12 = m[m3_12] + y * m[m3_22];
            let m21 = m[m3_21] + x * m[m3_11];

            result[m3_11] = m11;
            result[m3_12] = m12;
            result[m3_21] = m21;
            result[m3_22] = m22;
            break;
        }
    }
    result._flag = Math.max(m._flag, MAT3_SHEAR_FLAG);
    return result;
};

/**
 * Return a copy of the given point, p, mapped into the coordinate system defined by this matrix.
 * @param {mat3} m 
 * @param {point} p 
 * @param {point} result 
 * @returns {point}
 */
export const mat3_map_point = (m, p, result) => {
    mat3_map(m, p, X, Y, result, array.is_float_array(p));
    /*
    let px, py;
    let flag = mat3_flag(m);
    switch (flag) {
        case MAT3_NONE_FLAG:
            px = p[X];
            py = p[Y];
            break;
        case MAT3_TRANSLATE_FLAG:
            px = p[X] + m[m3_31];
            py = p[Y] + m[m3_32];
            break;
        case MAT3_SCALE_FLAG:
            px = m[m3_11] * p[X] + m[m3_31];
            py = m[m3_22] * p[Y] + m[m3_32];
            break;
        case MAT3_ROTATE_FLAG:
        case MAT3_SHEAR_FLAG:
        case MAT3_PROJECT_FLAG: {
            px = m[m3_11] * p[X] + m[m3_21] * p[Y] + m[m3_31];
            py = m[m3_12] * p[X] + m[m3_22] * p[Y] + m[m3_32];

            if (flag == MAT3_PROJECT_FLAG) {
                let w = 1 / (m[m3_13] * p[X] + m[m3_23] * p[Y] + m[m3_33]);
                px *= w, py *= w;
            }
        }
    }

    if (flag > MAT3_NONE_FLAG && !array.is_float_array(p)) {
        px = numb.rounded(px, numb.AwayFromZero);
        py = numb.rounded(py, numb.AwayFromZero);
    }

    result[X] = px;
    result[Y] = py;
    */
    return result;
};

/**
 * Return a copy of the given line, l, mapped into the coordinate system defined by this matrix.
 * @param {mat3} m 
 * @param {line} l 
 * @param {mat3} result 
 * @returns {mat3}
 */
export const mat3_map_line = (m, l, result) => {
    let is_float = array.is_float_array(l);
    mat3_map(m, l, x1, y1, result, is_float);
    mat3_map(m, l, x2, y2, result, is_float);

    return result;
};

/**
 * Return the bounding rectangle of the given rect, r, mapped into the coordinate system defined by matrix m.
 * @param {mat3} m 
 * @param {rect} r 
 * @param {rect} result 
 * @returns {rect}
 */
export const mat3_map_rect = (m, r, result) => {

    if (m._flag <= MAT3_TRANSLATE_FLAG) {
        return rect_translated(r, m[m3_31], m[m3_32], result);
    }
    else if (m._flag <= MAT3_SCALE_FLAG) {
        let x = m[m3_11] * r.x + m[m3_31];
        let y = m[m3_22] * r.y + m[m3_32];
        let w = m[m3_11] * r.width;
        let h = m[m3_22] * r.height;

        if (!array.is_float_array(r)) {
            x = numb.rounded(x, numb.AwayFromZero);
            y = numb.rounded(y, numb.AwayFromZero);
            w = numb.rounded(w, numb.AwayFromZero);
            h = numb.rounded(h, numb.AwayFromZero);
        }

        if (w < 0) w = -w, x -= w;
        if (h < 0) h = -h, y -= h;

        result.x = x;
        result.y = y;
        result.width = w;
        result.height = h;

        return result;
    }
    else if (m._flag < MAT3_PROJECT_FLAG) {
        let is_float = array.is_float_array(r);
        let adjust = is_float ? 0 : 1;

        rect_set(result, r.left, r.top, r.right + adjust, r.top);
        //rect_set(result, r[x1], r[y1], r[x2], r[y1]);
        mat3_map(m, result, x1, y1, result, is_float);
        mat3_map(m, result, x2, y2, result, is_float);

        let xmin = Math.min(result[x1], result[x2]),
            ymin = Math.min(result[y1], result[y2]),
            xmax = Math.max(result[x1], result[x2]),
            ymax = Math.max(result[y1], result[y2]);

        //rect_set(result, r.right, r.bottom, r.left, r.bottom);
        rect_set(result, r.right + adjust, r.bottom + adjust, r.left, r.bottom + adjust);
        //rect_set(result, r[x2], r[y2], r[x1], r[y2]);
        mat3_map(m, result, x1, y1, result, is_float);
        mat3_map(m, result, x2, y2, result, is_float);

        xmin = Math.min(xmin, result[x1], result[x2]);
        ymin = Math.min(ymin, result[y1], result[y2]);
        xmax = Math.max(xmax, result[x1], result[x2]);
        ymax = Math.max(ymax, result[y1], result[y2]);

        return rect_set(result, xmin, ymin, xmax - adjust, ymax - adjust);
    }
};

