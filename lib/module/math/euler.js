import { array } from "../array.js";
import { classes, kind_of } from "../../functions.js";
import { mat4_from_quat } from "./mat4.js";
import { numb } from "./number.js";
import { X_AXIS, Y_AXIS, Z_AXIS } from "./vec3.js";

export const DEFAULT_EULER_ORDER = 'XYZ';


class euler_base {
    _order = DEFAULT_EULER_ORDER;

    /** @returns {String} */
    get kind() { return `euler`; }

    /** @returns {String} */
    get order() { return this._order; }
    /** @param {String} o */
    set order(o) { this._order = o; }

    /** @returns {Number} */
    get x() { return this[X_AXIS]; }
    /** @returns {Number} */
    get y() { return this[Y_AXIS]; }
    /** @returns {Number} */
    get z() { return this[Z_AXIS]; }

    /** @param {Number} x */
    set x(x) { this[X_AXIS] = x; }
    /** @param {Number} y */
    set y(y) { this[Y_AXIS] = y; }
    /** @param {Number} z */
    set z(z) { this[Z_AXIS] = z; }
};

//const mat4_proxy = new mat4d();

export class eulerd extends classes(Float64Array, euler_base) {

    /**
     * @constructor
     * @param {Number|euler} x
     * @param {Number|String} y
     * @param {Number} [z]
     * @param {String} [o]
     */
    constructor(x = 0, y = 0, z = 0, o = DEFAULT_EULER_ORDER) {
        super(3);

        const kind = kind_of(x);
        if (kind === `euler` || kind === `vec3`) {
            this.set(x);
            if (kind_of(y) == `string`)
                this._order = y;
        }
        else if (array.is_array(x)) {
            this.set(...x.slice(0, 3));
            if (kind_of(y) == `string`)
                this._order = y;
        }
        else {
            this[X_AXIS] = x;
            this[Y_AXIS] = y;
            this[Z_AXIS] = z;
            this._order = o;
        }
    }
};

export class eulerf extends classes(Float32Array, euler_base) {
    /**
     * @constructor
     * @param {Number|euler} x
     * @param {Number|String} y
     * @param {Number} [z]
     * @param {String} [o]
     */
    constructor(x = 0, y = 0, z = 0, o = DEFAULT_EULER_ORDER) {
        super(3);

        const kind = kind_of(x);
        if (kind === `euler` || kind === `vec3`) {
            this.set(x);
            this._order = y;
        }
        if (array.is_array(x)) {
            this.set(...x.slice(0, 3));
            this._order = y;
        }
        else {
            this[X_AXIS] = x;
            this[Y_AXIS] = y;
            this[Z_AXIS] = z;
            this._order = o;
        }
    }
};

/**
 * @param {euler} vec 
 * @param {Number} x 
 * @param {Number} y 
 * @param {Number} z 
 * @returns {euler}
 */
export const euler_set = (e, x = 0, y = 0, z = 0) => {
    e[X_AXIS] = x;
    e[Y_AXIS] = y;
    e[Z_AXIS] = z;
    return e;
}

export const euler_from_quat = (q, order, res = new eulerf()) => {
    const mat = mat4_from_quat(q);
    return euler_from_mat4(mat, order, res);
};

export const euler_from_mat4 = (m, order = DEFAULT_EULER_ORDER, res = new eulerf()) => {

    const m11 = m[0], m12 = m[4], m13 = m[8];
    const m21 = m[1], m22 = m[5], m23 = m[9];
    const m31 = m[2], m32 = m[6], m33 = m[10];

    switch (order) {
        case 'XYZ': {
            res[Y_AXIS] = Math.asin(numb.clamp(m13, -1, 1));
            if (Math.abs(m13) < 0.9999999) {
                res[X_AXIS] = Math.atan2(- m23, m33);
                res[Z_AXIS] = Math.atan2(- m12, m11);
            } else {
                res[X_AXIS] = Math.atan2(m32, m22);
                res[Z_AXIS] = 0;
            }
        } break;

        case 'YXZ': {
            res[X_AXIS] = Math.asin(-numb.clamp(m23, -1, 1));
            if (Math.abs(m23) < 0.9999999) {
                res[Y_AXIS] = Math.atan2(m13, m33);
                res[Z_AXIS] = Math.atan2(m21, m22);
            } else {
                res[Y_AXIS] = Math.atan2(- m31, m11);
                res[Z_AXIS] = 0;
            }
        } break;

        case 'ZXY': {
            res[X_AXIS] = Math.asin(numb.clamp(m32, -1, 1));
            if (Math.abs(m32) < 0.9999999) {
                res[Y_AXIS] = Math.atan2(- m31, m33);
                res[Z_AXIS] = Math.atan2(- m12, m22);
            } else {
                res[Y_AXIS] = 0;
                res[Z_AXIS] = Math.atan2(m21, m11);
            }
        } break;

        case 'ZYX': {
            res[Y_AXIS] = Math.asin(-numb.clamp(m31, -1, 1));
            if (Math.abs(m31) < 0.9999999) {
                res[X_AXIS] = Math.atan2(m32, m33);
                res[Z_AXIS] = Math.atan2(m21, m11);
            } else {
                res[X_AXIS] = 0;
                res[Z_AXIS] = Math.atan2(-m12, m22);
            }
        } break;

        case 'YZX': {
            res[Z_AXIS] = Math.asin(numb.clamp(m21, -1, 1));
            if (Math.abs(m21) < 0.9999999) {
                res[X_AXIS] = Math.atan2(- m23, m22);
                res[Y_AXIS] = Math.atan2(- m31, m11);
            } else {
                res[X_AXIS] = 0;
                res[Y_AXIS] = Math.atan2(m13, m33);
            }
        } break;

        case 'XZY': {
            res[Z_AXIS] = Math.asin(-numb.clamp(m12, -1, 1));
            if (Math.abs(m12) < 0.9999999) {
                res[X_AXIS] = Math.atan2(m32, m22);
                res[Y_AXIS] = Math.atan2(m13, m11);
            } else {
                res[X_AXIS] = Math.atan2(- m23, m33);
                res[Y_AXIS] = 0;
            }
        } break;

        default: throw new Error(`euler_from_mat4: Unknow order: ${order}`);
    }

    res._order = order;
    return res;
};