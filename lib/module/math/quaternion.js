import { array } from "../array.js";
import { classes, kind_of } from "../../functions.js";
import { euler_set, eulerf } from "./euler.js";
import { numb } from "./number.js";
import { X_AXIS, Y_AXIS, Z_AXIS, vec3_dot } from "./vec3.js";

/** @constant {number} */
export const QX = 0;
/** @constant {number} */
export const QY = 1;
/** @constant {number} */
export const QZ = 2;
/** @constant {number} */
export const QW = 3;

const QUAT_IDENTITY = [0, 0, 0, 1];

class quat_base {
    /** @returns {String} */
    get kind() { return `quat`; }

    /** @returns {Number} */
    get x() { return this[QX]; }
    /** @returns {Number} */
    get y() { return this[QY]; }
    /** @returns {Number} */
    get z() { return this[QZ]; }
    /** @returns {Number} */
    get w() { return this[QW]; }

    /** @param {number} x */
    set x(x) { this[QX] = x; }
    /** @param {number} x */
    set y(y) { this[QY] = y; }
    /** @param {number} x */
    set z(z) { this[QZ] = z; }
    /** @param {number} x */
    set w(w) { this[QW] = w; }
};

/**
 * Class representing a quaternion with single-precision floating point components.
 * @class
 * @extends Float32Array
 */
export class quatf extends classes(Float32Array, quat_base) {
    /**
     * Creates a new quaternion.
     * @constructor
     * @param {number|quat} x - The x component of the quaternion or another quaternion to copy.
     * @param {number} [y=0] - The y component of the quaternion.
     * @param {number} [z=0] - The z component of the quaternion.
     * @param {number} [w=1] - The w component of the quaternion.
     */
    constructor(x = 0, y = 0, z = 0, w = 1) {
        super(QUAT_IDENTITY); // Call the parent class constructor with identity quaternion values

        // Initialize the quaternion based on the input parameters
        if (kind_of(x) === `quat`) { // If the input is a quaternion
            this.set(x); // Copy the values from the input quaternion
        } else if (array.is_array(x)) { // If the input is an array
            for (let i = 0, max = Math.min(x.length, 4); i < max; ++i)
                this[i] = numb.float32(x[i]); // Copy the values from the input array 


        } else { // If the input is individual components
            // Convert the components to single-precision floating point and assign them to the quaternion
            this[QX] = numb.float32(x);
            this[QY] = numb.float32(y);
            this[QZ] = numb.float32(z);
            this[QW] = numb.float32(w);
        }
    }

    /** 
     * Gets the number of bytes used to represent a quaternion.
     * @static
     * @returns {number} The number of bytes.
     */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 4; }
};


/**
 * Class representing a quaternion with double-precision floating point components.
 * @class
 * @extends Float64Array
 */
export class quatd extends classes(Float64Array, quat_base) {
    /**
     * Creates a new quaternion.
     * @constructor
     * @param {number|quat} x - The x component of the quaternion or another quaternion to copy.
     * @param {number} [y=0] - The y component of the quaternion.
     * @param {number} [z=0] - The z component of the quaternion.
     * @param {number} [w=1] - The w component of the quaternion.
     */
    constructor(x = 0, y = 0, z = 0, w = 1) {
        super(QUAT_IDENTITY); // Call the parent class constructor with identity quaternion values

        // Initialize the quaternion based on the input parameters
        if (kind_of(x) === 'quat') { // If the input is a quaternion
            this.set(x); // Copy the values from the input quaternion
        } else if (Array.isArray(x)) { // If the input is an array
            for (let i = 0, max = Math.min(x.length, 4); i < max; ++i) {
                this[i] = x[i]; // Copy the values from the input array
            }
        } else { // If the input is individual components
            // Assign the components to the quaternion
            this[QX] = x;
            this[QY] = y;
            this[QZ] = z;
            this[QW] = w;
        }
    }

    /** 
     * Gets the number of bytes used to represent a quaternion.
     * @static
     * @returns {number} The number of bytes.
     */
    static get BYTES_LENGTH() {
        return Float64Array.BYTES_PER_ELEMENT * 4;
    }
}

/**
 * Sets the components of a quaternion.
 * @param {quat} q0 - The quaternion to set.
 * @param {number|Array<number>} [x=0] - The x component of the quaternion or an array of components.
 * @param {number} [y=0] - The y component of the quaternion.
 * @param {number} [z=0] - The z component of the quaternion.
 * @param {number} [w=1] - The w component of the quaternion.
 * @returns {quat} The updated quaternion.
 */
export const quat_set = (q0, x = 0, y = 0, z = 0, w = 1) => {
    // If x is an array, recursively call quat_set with array elements as arguments
    if (array.is_array(x)) return quat_set(q0, x[0], x[1], x[2], x[3]);

    // Assign values to quaternion components, ensuring no NaN values are set
    q0[QX] = numb.fast_nan(x) ? NaN : x;
    q0[QY] = numb.fast_nan(y) ? NaN : y;
    q0[QZ] = numb.fast_nan(z) ? NaN : z;
    q0[QW] = numb.fast_nan(w) ? NaN : w;

    return q0;
};

/**
 * Negates the components of a quaternion.
 * @param {quat} q0 - The quaternion to negate.
 * @returns {quat} The negated quaternion.
 */
export const quat_neg = q0 => {
    q0[QX] = -q0[QX];
    q0[QY] = -q0[QY];
    q0[QZ] = -q0[QZ];
    q0[QW] = -q0[QW];
    return q0;
};

/**
 * Checks if a quaternion is null (all components are zero).
 * @param {quat} q0 - The quaternion to check.
 * @returns {boolean} True if the quaternion is null, otherwise false.
 */
export const quat_is_null = q0 => q0[QX] === 0 && q0[QY] === 0 && q0[QZ] === 0 && q0[QW] === 0;

/**
 * Checks if a quaternion is "fuzzy null" (all components are close to zero within a certain tolerance).
 * @param {quat} q0 - The quaternion to check.
 * @returns {boolean} True if the quaternion is "fuzzy null", otherwise false.
 */
export const quat_is_fuzzy_null = q0 =>
    numb.fuzzy_null(q0[QX]) &&
    numb.fuzzy_null(q0[QY]) &&
    numb.fuzzy_null(q0[QZ]) &&
    numb.fuzzy_null(q0[QW]);

/**
 * Checks if two quaternions are equal.
 * @param {quat} q1 - The first quaternion to compare.
 * @param {quat} q2 - The second quaternion to compare.
 * @returns {boolean} True if the quaternions are equal, otherwise false.
 */
export const quat_equals = (q1, q2) => {
    if (q1.includes(NaN) || q2.includes(NaN)) return false;
    return (q1[QX] === q2[QX] &&
        q1[QY] === q2[QY] &&
        q1[QZ] === q2[QZ] &&
        q1[QW] === q2[QW]);
};

/**
 * Compares two quaternions for approximate equality using fuzzy comparison.
 *
 * @param {Array} q1 - The first quaternion to compare.
 * @param {Array} q2 - The second quaternion to compare.
 * @returns {boolean} True if the quaternions are approximately equal, false otherwise.
 */
export const quat_fuzzy_equals = (q1, q2) => 
    numb.fuzzy_comparef(q1[QX], q2[QX]) &&
    numb.fuzzy_comparef(q1[QY], q2[QY]) &&
    numb.fuzzy_comparef(q1[QZ], q2[QZ]) &&
    numb.fuzzy_comparef(q1[QW], q2[QW]);

/**
 * Checks if a quaternion is an identity quaternion.
 * @param {quat} q0 - The quaternion to check.
 * @returns {boolean} - True if the quaternion is an identity quaternion, false otherwise.
 */
export const quat_is_identity = (q0) => quat_equals(q0, QUAT_IDENTITY);

/**
 * Checks if a quaternion is approximately equal to the identity quaternion.
 * @param {quat} q0 - The quaternion to check.
 * @returns {boolean} - True if the quaternion is approximately equal to the identity quaternion, false otherwise.
 */
export const quat_is_fuzzy_identity = q0 => quat_fuzzy_equals(q0, QUAT_IDENTITY);

/**
 * Creates a quaternion from an axis and an angle.
 * @param {vec3} axis - The axis of rotation.
 * @param {number} angle - The angle of rotation (in radians).
 * @param {quatf} [result] - The quaternion to store the result.
 * @returns {quatf} - The resulting quaternion.
 */
export const quat_from_axis_angle = (axis, angle, result = new quatf()) => {
    const half = angle * 0.5;
    const shalf = Math.sin(half);

    result[QX] = axis[X_AXIS] * shalf;
    result[QY] = axis[Y_AXIS] * shalf;
    result[QZ] = axis[Z_AXIS] * shalf;
    result[QW] = Math.cos(half);

    return result;
};

/**
 * Computes the conjugate of a quaternion.
 * @param {quatf} q - The quaternion.
 * @returns {quatf} - The conjugate of the quaternion.
 */
export const quat_conj = (q1) => {
    q1[QX] = q1[QX] ? -q1[QX] : 0;
    q1[QY] = q1[QY] ? -q1[QY] : 0;
    q1[QZ] = q1[QZ] ? -q1[QZ] : 0;
    return q1;
};

/**
 * Computes the conjugate of a quaternion.
 * @param {quatf} q1 - The input quaternion.
 * @param {quatf} [result] - The result quaternion where the conjugate will be stored.
 * @returns {quatf} - The conjugate of the input quaternion.
 */
export const quat_conjugated = (q1, result = new quatf()) => {
    // Compute the conjugate of the quaternion components
    // If a component is non-zero, negate it; otherwise, leave it as zero
    result[QX] = q1[QX] ? -q1[QX] : 0;
    result[QY] = q1[QY] ? -q1[QY] : 0;
    result[QZ] = q1[QZ] ? -q1[QZ] : 0;
    result[QW] = q1[QW];
    
    return result;
};

/**
 * Computes the square of the length (magnitude) of a quaternion.
 * @param {quat} q0 - The quaternion.
 * @returns {number} - The square of the length of the quaternion.
 */
export const quat_length_square = q0 => q0[QX] ** 2 + q0[QY] ** 2 + q0[QZ] ** 2 + q0[QW] ** 2;

/**
 * Computes the length of a quaternion.
 * @param {quat} q0 - The input quaternion.
 * @returns {Number} - The length of the quaternion.
 */
export const quat_length = q0 => Math.sqrt(quat_length_square(q0));

/**
 * Normalizes a quaternion.
 * @param {quat} q0 - The input quaternion to normalize.
 * @returns {quat} - The normalized quaternion.
 */
export const quat_normalize = q0 => {
    // Compute the square of the quaternion length
    let len = quat_length_square(q0);

    // If the length is not close to 1 or zero, normalize the quaternion
    if (!numb.fuzzy_null(len - 1.0) && len !== 0) {
        // Compute the length using square root
        len = Math.sqrt(len);
        
        // Normalize the quaternion components
        q0[QX] /= len;
        q0[QY] /= len;
        q0[QZ] /= len;
        q0[QW] /= len;
    }

    // Return the normalized quaternion
    return q0;
};

/**
 * Computes the normalized quaternion.
 * @param {quat} q0 - The input quaternion to normalize.
 * @param {quat} [result] - The result quaternion where the normalized quaternion will be stored.
 * @returns {quat} - The normalized quaternion.
 */
export const quat_normalized = (q0, result = new quatf()) => {
    // Compute the square of the quaternion length
    let len = quat_length_square(q0);

    // If the length is not close to 1 or zero, normalize the quaternion
    if (!numb.fuzzy_null(len - 1.0) && len !== 0) {
        // Compute the length using square root
        len = Math.sqrt(len);
        
        // Normalize the quaternion components and store them in the result quaternion
        result[QX] = q0[QX] / len;
        result[QY] = q0[QY] / len;
        result[QZ] = q0[QZ] / len;
        result[QW] = q0[QW] / len;
    }
    else quat_set(result, q0);

    // Return the normalized quaternion
    return result;
};

/**
 * Adds two quaternions.
 * @param {quat} q1 - The first quaternion.
 * @param {quat} q2 - The second quaternion.
 * @param {quat} [result] - The result quaternion where the sum will be stored.
 * @returns {quat} - The sum of the two quaternions.
 */
export const quat_add = (q1, q2, result = new quatf()) => {
    // Add corresponding components of the quaternions and store the result in the result quaternion
    result[QX] = q1[QX] + q2[QX];
    result[QY] = q1[QY] + q2[QY];
    result[QZ] = q1[QZ] + q2[QZ];
    result[QW] = q1[QW] + q2[QW];
    
    // Return the result quaternion
    return result;
};

/**
 * Computes the remainder of two quaternions.
 * @param {quat} q1 - The first quaternion.
 * @param {quat} q2 - The second quaternion.
 * @param {quat} [result=new quatf()] - The result quaternion where the remainder will be stored.
 * @returns {quat} - The remainder of the two quaternions.
 */
export const quat_rem = (q1, q2, result = new quatf()) => {
    // Subtract corresponding components of q2 from q1 and store the result in the result quaternion
    result[QX] = q1[QX] - q2[QX];
    result[QY] = q1[QY] - q2[QY];
    result[QZ] = q1[QZ] - q2[QZ];
    result[QW] = q1[QW] - q2[QW];
    
    // Return the result quaternion
    return result;
};

/**
 * Multiplies two quaternions.
 * @param {quat} q1 - The first quaternion.
 * @param {quat} q2 - The second quaternion.
 * @param {quat} [result] - The result quaternion where the multiplication will be stored.
 * @returns {quat} - The product of the two quaternions.
 */
export const quat_mult = (q1, q2, result = new quatf()) => {
    // Compute the components of the resulting quaternion using quaternion multiplication formula
    result[QX] = q1[QX] * q2[QW] + q1[QW] * q2[QX] + q1[QZ] * q2[QY] - q1[QY] * q2[QZ];
    result[QY] = q1[QY] * q2[QW] - q1[QZ] * q2[QX] + q1[QW] * q2[QY] + q1[QX] * q2[QZ];
    result[QZ] = q1[QZ] * q2[QW] + q1[QY] * q2[QX] - q1[QX] * q2[QY] + q1[QW] * q2[QZ];
    result[QW] = q1[QW] * q2[QW] - q1[QX] * q2[QX] - q1[QY] * q2[QY] - q1[QZ] * q2[QZ];
    
    // Return the resulting quaternion
    return result;
};

/**
 * Divides one quaternion by another quaternion.
 * @param {quat} q1 - The numerator quaternion.
 * @param {quat} q2 - The denominator quaternion.
 * @param {quat} [result] - The result quaternion where the division will be stored.
 * @returns {quat} - The quotient of the two quaternions.
 */
export const quat_div = (q1, q2, result = new quatf()) => {
    // Compute the conjugate of the denominator quaternion
    const conjugateQ2 = quat_conjugated(q2, new q2.constructor());

    // Multiply the numerator quaternion by the conjugate of the denominator quaternion
    // This is equivalent to dividing the two quaternions
    return quat_mult(q1, conjugateQ2, result);
};

/**
 * Computes the dot product of two quaternions.
 * @param {quat} q1 - The first quaternion.
 * @param {quat} q2 - The second quaternion.
 * @returns {number} - The dot product of the two quaternions.
 */
export const quat_dot = (q1, q2) => {
    // Compute the dot product by multiplying corresponding components of the quaternions and summing the results
    return q1[QX] * q2[QX] + q1[QY] * q2[QY] + q1[QZ] * q2[QZ] + q1[QW] * q2[QW];
};

/**
 * Computes the angle between two quaternions.
 * @param {quat} q1 - The first quaternion.
 * @param {quat} q2 - The second quaternion.
 * @returns {number} - The angle between the two quaternions in radians.
 */
export const quat_angle_to = (q1, q2) => {
    // Compute the dot product of the two quaternions
    const dotProduct = quat_dot(q1, q2);

    // Clamp the dot product to the range [-1, 1] to avoid numerical errors in the acos function
    const clampedDotProduct = Math.abs(numb.clamp(dotProduct, -1, 1));

    // Compute the angle between the two quaternions using the arccosine of the clamped dot product
    // The angle is multiplied by 2 to get the actual angle between the quaternions
    return 2 * Math.acos(clampedDotProduct);
};

/**
 * Computes the angle of a quaternion.
 * @param {quat} q1 - The input quaternion.
 * @returns {number} - The angle of the quaternion in radians.
 */
export const quat_angle = (q1) => {
    // Compute the sum of the squares of the x, y, and z components of the quaternion
    const sum = q1[QX] * q1[QX] + q1[QY] * q1[QY] + q1[QZ] * q1[QZ];

    // Compute the angle using the arctangent of the square root of the sum and the absolute value of the w component
    return 2 * Math.atan2(Math.sqrt(sum), Math.abs(q1[QW]));
};

/**
 * Computes the angle between two quaternions.
 * @param {quat} q1 - The first quaternion.
 * @param {quat} q2 - The second quaternion.
 * @returns {number} - The angle between the two quaternions.
 */
export const quat_angle_between = (q1, q2) => {
    // Divide q1 by q2 to get the relative rotation quaternion
    const relativeQuat = quat_div(q1, q2, new q1.constructor());

    // Compute the angle of the relative rotation quaternion
    return quat_angle(relativeQuat);
};


/**
 * Converts a quaternion to Euler angles.
 * @param {quat} q - The input quaternion.
 * @param {euler} [res=new eulerf()] - The result Euler angles where the converted values will be stored.
 * @returns {euler} - The Euler angles corresponding to the input quaternion.
 */
export const quat_to_euler = (q, res = new eulerf()) => {
    // Compute the length of the quaternion
    const len = quat_length(q);

    // Determine if the quaternion should be rescaled
    const rescale = !numb.fuzzy_null(len);

    // Normalize the quaternion components if necessary
    const xps = rescale ? q[QX] / len : q[QX];
    const yps = rescale ? q[QY] / len : q[QY];
    const zps = rescale ? q[QZ] / len : q[QZ];
    const wps = rescale ? q[QW] / len : q[QW];

    // Precompute reused values
    const xx = xps * xps;
    const xy = xps * yps;
    const xz = xps * zps;
    const xw = xps * wps;
    const yy = yps * yps;
    const yz = yps * zps;
    const yw = yps * wps;
    const zz = zps * zps;
    const zw = zps * wps;

    // Initialize pitch, yaw, and roll
    let pitch, yaw, roll;

    // Compute the sine of pitch
    const sinp = -2.0 * (yz - xw);

    // Check if the pitch angle is within the range for asin
    if (Math.abs(sinp) < (1.0 - 0.00001)) {
        // Compute pitch using asin
        pitch = Math.asin(sinp);
        // Compute yaw using atan2
        yaw = Math.atan2(2.0 * (xz + yw), 1.0 - 2.0 * (xx + yy));
        // Compute roll using atan2
        roll = Math.atan2(2.0 * (xy + zw), 1.0 - 2.0 * (xx + zz));
    } else {
        // Handle gimbal lock scenario
        pitch = numb.copysign(numb.TWO_PI, sinp);
        yaw = 2.0 * Math.atan2(q[QY], q[QW]);
        roll = 0.0;
    }

    if (pitch == 0) pitch = 0;
    if (yaw == 0) yaw = 0;
    if (roll == 0) roll = 0;

    // Set the resulting Euler angles
    return euler_set(res, roll, pitch, yaw);
};


export const quat_from_euler = (e, res = new quatf()) => {

    const x = e.x, y = e.y, z = e.z, order = e.order;

    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);

    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);

    switch (order) {

        case 'XYZ':
            res[QX] = s1 * c2 * c3 + c1 * s2 * s3;
            res[QY] = c1 * s2 * c3 - s1 * c2 * s3;
            res[QZ] = c1 * c2 * s3 + s1 * s2 * c3;
            res[QW] = c1 * c2 * c3 - s1 * s2 * s3;
            break;

        case 'YXZ':
            res[QX] = s1 * c2 * c3 + c1 * s2 * s3;
            res[QY] = c1 * s2 * c3 - s1 * c2 * s3;
            res[QZ] = c1 * c2 * s3 - s1 * s2 * c3;
            res[QW] = c1 * c2 * c3 + s1 * s2 * s3;
            break;

        case 'ZXY':
            res[QX] = s1 * c2 * c3 - c1 * s2 * s3;
            res[QY] = c1 * s2 * c3 + s1 * c2 * s3;
            res[QZ] = c1 * c2 * s3 + s1 * s2 * c3;
            res[QW] = c1 * c2 * c3 - s1 * s2 * s3;
            break;

        case 'ZYX':
            res[QX] = s1 * c2 * c3 - c1 * s2 * s3;
            res[QY] = c1 * s2 * c3 + s1 * c2 * s3;
            res[QZ] = c1 * c2 * s3 - s1 * s2 * c3;
            res[QW] = c1 * c2 * c3 + s1 * s2 * s3;
            break;

        case 'YZX':
            res[QX] = s1 * c2 * c3 + c1 * s2 * s3;
            res[QY] = c1 * s2 * c3 + s1 * c2 * s3;
            res[QZ] = c1 * c2 * s3 - s1 * s2 * c3;
            res[QW] = c1 * c2 * c3 - s1 * s2 * s3;
            break;

        case 'XZY':
            res[QX] = s1 * c2 * c3 - c1 * s2 * s3;
            res[QY] = c1 * s2 * c3 - s1 * c2 * s3;
            res[QZ] = c1 * c2 * s3 + s1 * s2 * c3;
            res[QW] = c1 * c2 * c3 + s1 * s2 * s3;
            break;

        default: throw new Error(`quat_from_euler: Unknow order: ${order}`);

    }


    return res;
};

/**
 * Creates a quaternion representing the rotation from one unit vector to another.
 * @param {vec3} from - The starting unit vector.
 * @param {vec3} to - The target unit vector.
 * @param {quat} [res=new quatf()] - The result quaternion where the rotation will be stored.
 * @returns {quat} - The quaternion representing the rotation from 'from' to 'to'.
 */
export const quat_from_unit_vec = (from, to, res = new quatf()) => {
    // Compute the dot product of the two vectors and add 1
    let r = vec3_dot(from, to) + 1;

    // Check if the dot product is close to zero
    if (r < Number.EPSILON) {
        r = 0;
        // Determine the axis of rotation
        if (Math.abs(from[X_AXIS]) > Math.abs(from[Z_AXIS])) {
            res[QX] = -from[Y_AXIS];
            res[QY] = from[X_AXIS];
            res[QZ] = 0;
            res[QW] = r;
        } else {
            res[QX] = 0;
            res[QY] = -from[Z_AXIS];
            res[QZ] = from[Y_AXIS];
            res[QW] = r;
        }
    } else {
        // Compute the cross product of the two vectors
        res[QX] = from[Y_AXIS] * to[Z_AXIS] - from[Z_AXIS] * to[Y_AXIS];
        res[QY] = from[Z_AXIS] * to[X_AXIS] - from[X_AXIS] * to[Z_AXIS];
        res[QZ] = from[X_AXIS] * to[Y_AXIS] - from[Y_AXIS] * to[X_AXIS];
        res[QW] = r;
    }

    // Normalize the quaternion to ensure unit length
    return quat_normalize(res);
};
