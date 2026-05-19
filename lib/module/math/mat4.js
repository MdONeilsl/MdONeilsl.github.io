import { classes, kind_of } from "../../functions.js";
import { QW, QX, QY, QZ } from "./quaternion.js";
import { X_AXIS, Y_AXIS, Z_AXIS, vec3d } from "./vec3.js";

//const zero_vec = new vec3d();
//const unit_vec = new vec3d(1, 1, 1);

/** @constant {number} */
export const m4_11 = 0;
/** @constant {number} */
export const m4_12 = 1;
/** @constant {number} */
export const m4_13 = 2;
/** @constant {number} */
export const m4_14 = 3;
/** @constant {number} */
export const m4_21 = 4;
/** @constant {number} */
export const m4_22 = 5;
/** @constant {number} */
export const m4_23 = 6;
/** @constant {number} */
export const m4_24 = 7;
/** @constant {number} */
export const m4_31 = 8;
/** @constant {number} */
export const m4_32 = 9;
/** @constant {number} */
export const m4_33 = 10;
/** @constant {number} */
export const m4_34 = 11;
/** @constant {number} */
export const m4_41 = 12;
/** @constant {number} */
export const m4_42 = 13;
/** @constant {number} */
export const m4_43 = 14;
/** @constant {number} */
export const m4_44 = 15;

const MAT4_IDENTITY = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

/** @constant {number} */
export const MAT4_IDENTITY_FLAG = 0x00;
/** @constant {number} */
export const MAT4_TRANSLATE_FLAG = 0x01;
/** @constant {number} */
export const MAT4_SCALE_FLAG = 0x02;
/** @constant {number} */
export const MAT4_ROTATE2D_FLAG = 0x04;
/** @constant {number} */
export const MAT4_ROTATE_FLAG = 0x08;
/** @constant {number} */
export const MAT4_PERSPECTIVE_FLAG = 0x10;
/** @constant {number} */
export const MAT4_GENERAL_FLAG = 0x1f;


class mat4_base {
    _flag = MAT4_IDENTITY_FLAG;
    _rows = 4;
    _cols = 4;

    /** @returns {String} */
    get kind() { return `mat4`; }

    /** @returns {Number} */
    get m11() { return this[m4_11]; }
    /** @returns {Number} */
    get m12() { return this[m4_12]; }
    /** @returns {Number} */
    get m13() { return this[m4_13]; }
    /** @returns {Number} */
    get m14() { return this[m4_14]; }
    /** @returns {Number} */
    get m21() { return this[m4_21]; }
    /** @returns {Number} */
    get m22() { return this[m4_22]; }
    /** @returns {Number} */
    get m23() { return this[m4_23]; }
    /** @returns {Number} */
    get m24() { return this[m4_24]; }
    /** @returns {Number} */
    get m31() { return this[m4_31]; }
    /** @returns {Number} */
    get m32() { return this[m4_32]; }
    /** @returns {Number} */
    get m33() { return this[m4_33]; }
    /** @returns {Number} */
    get m34() { return this[m4_34]; }
    /** @returns {Number} */
    get m41() { return this[m4_41]; }
    /** @returns {Number} */
    get m42() { return this[m4_42]; }
    /** @returns {Number} */
    get m43() { return this[m4_43]; }
    /** @returns {Number} */
    get m44() { return this[m4_44]; }

    /** @param {number} x */
    set m11(x) { this[m4_11] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m12(x) { this[m4_12] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m13(x) { this[m4_13] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m14(x) { this[m4_14] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m21(x) { this[m4_21] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m22(x) { this[m4_22] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m23(x) { this[m4_23] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m24(x) { this[m4_24] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m31(x) { this[m4_31] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m32(x) { this[m4_32] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m33(x) { this[m4_33] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m34(x) { this[m4_34] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m41(x) { this[m4_41] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m42(x) { this[m4_42] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m43(x) { this[m4_43] = x; this._flag = MAT4_GENERAL_FLAG; }
    /** @param {number} x */
    set m44(x) { this[m4_44] = x; this._flag = MAT4_GENERAL_FLAG; }

    /** @returns {number} */
    get flag() { return this._flag; }
    /** @param {number} value */
    set flag(value) { this._flag = value; }

    /** @returns {number} */
    get rows() { return 4; }
    /** @returns {number} */
    get cols() { return 4; }
};

export class mat4d extends classes(Float64Array, mat4_base) {
    constructor(v11, ...args) {
        super(MAT4_IDENTITY);
        if (v11 !== undefined) {
            if (kind_of(v11) == `mat4`) {
                this.set(v11);
                this._flag = v11._flag;
            }
            else if (kind_of(v11) === `number`) {
                this.set([v11, ...args.slice(0, 15)]);
                this._flag = MAT4_GENERAL_FLAG;
            }
        }
    }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Float64Array.BYTES_PER_ELEMENT * 16; }
    /** @returns {mat4d} */
    static get IDENTITY() { return new mat4d(); }
};

export class mat4f extends classes(Float32Array, mat4_base) {
    constructor(v11, ...args) {
        super(MAT4_IDENTITY);
        if (v11 !== undefined) {
            if (kind_of(v11) === `mat4`) {
                this.set(v11);
                this._flag = v11._flag;
            }
            else if (kind_of(v11) === `number`) {
                this.set([v11, ...args.slice(0, 15)]);
                this._flag = MAT4_GENERAL_FLAG;
            }
        }
    }

    /** @returns {number} */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 16; }
    /** @returns {mat4f} */
    static get IDENTITY() { return new mat4f(); }
};

/**
 * Returns true if the matrix is the identity matrix, otherwise returns false.
 * @param {mat4} m 
 * @returns {boolean}
 */
export const mat4_is_identity = m => {
    return m.flag == MAT4_IDENTITY_FLAG;
}

export const mat4_from_quat = (q, res = new mat4d()) => {
    return mat4_compose(new vec3d(), q, new vec3d(1, 1, 1), res);
};

/**
 * @param {vec3} pos 
 * @param {quat} rot 
 * @param {vec3} scl 
 * @param {mat4} res
 */
export const mat4_compose = (pos, rot, scl, res = new mat4f()) => {

    const x2 = rot[QX] + rot[QX],
        y2 = rot[QY] + rot[QY],
        z2 = rot[QZ] + rot[QZ];

    const xx = rot[QX] * x2,
        xy = rot[QX] * y2,
        xz = rot[QX] * z2;

    const yy = rot[QY] * y2,
        yz = rot[QY] * z2,
        zz = rot[QZ] * z2;

    const wx = rot[QW] * x2,
        wy = rot[QW] * y2,
        wz = rot[QW] * z2;

    res[m4_11] = (1 - (yy + zz)) * scl[X_AXIS];
    res[m4_12] = (xy + wz) * scl[X_AXIS];
    res[m4_13] = (xz - wy) * scl[X_AXIS];
    res[m4_14] = 0;

    res[m4_21] = (xy - wz) * scl[Y_AXIS];
    res[m4_22] = (1 - (xx + zz)) * scl[Y_AXIS];
    res[m4_23] = (yz + wx) * scl[Y_AXIS];
    res[m4_24] = 0;

    res[m4_31] = (xz + wy) * scl[Z_AXIS];
    res[m4_32] = (yz - wx) * scl[Z_AXIS];
    res[m4_33] = (1 - (xx + yy)) * scl[Z_AXIS];
    res[m4_34] = 0;

    res[m4_41] = pos[X_AXIS];
    res[m4_42] = pos[Y_AXIS];
    res[m4_43] = pos[Z_AXIS];
    res[m4_44] = 1;

    return res;
};

