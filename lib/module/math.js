/** 
 * Math module
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

/**
 * Normalizes 3D vector to unit length
 * @param {number[]} v - Input vector [x, y, z]
 * @returns {number[]} Normalized vector [x, y, z]
 */
export const normalize = v => {
    if (!v || !Array.isArray(v)) return v;

    const x = +v[0] || 0;
    const y = +v[1] || 0;
    const z = +v[2] || 0;

    const len_sq = x * x + y * y + z * z;

    if (len_sq < 1e-8) return [x, y, z];

    const len_inv = 1 / Math.sqrt(len_sq);
    return [x * len_inv, y * len_inv, z * len_inv];
};

/**
 * Computes cross product of two 3D vectors
 * @param {number[]} a - First vector [x, y, z]
 * @param {number[]} b - Second vector [x, y, z]
 * @returns {number[]} Cross product vector [x, y, z]
 */
export const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
];

/**
 * Computes dot product of two 3D vectors
 * @param {number[]} a - First vector [x, y, z]
 * @param {number[]} b - Second vector [x, y, z]
 * @returns {number} Dot product result
 */
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Rotates vector around axis by angle using Rodrigues' rotation formula
 * @param {number[]} vec - Input vector [x, y, z]
 * @param {number[]} axis - Rotation axis [x, y, z]
 * @param {number} angle - Rotation angle in radians
 * @returns {number[]} Rotated vector [x, y, z]
 */
export const rotate_vector = (vec, axis, angle) => {
    const cos_a = Math.cos(angle);
    const sin_a = Math.sin(angle);
    const k = 1 - cos_a;

    const x = vec[0], y = vec[1], z = vec[2];
    const ux = axis[0], uy = axis[1], uz = axis[2];

    const ux2 = ux * ux, uy2 = uy * uy, uz2 = uz * uz;
    const ux_uy = ux * uy, ux_uz = ux * uz, uy_uz = uy * uz;

    const rx = x * (cos_a + ux2 * k) + y * (ux_uy * k - uz * sin_a) + z * (ux_uz * k + uy * sin_a);
    const ry = x * (ux_uy * k + uz * sin_a) + y * (cos_a + uy2 * k) + z * (uy_uz * k - ux * sin_a);
    const rz = x * (ux_uz * k - uy * sin_a) + y * (uy_uz * k + ux * sin_a) + z * (cos_a + uz2 * k);

    const len_sq = rx * rx + ry * ry + rz * rz;
    if (len_sq < 1e-8) return [rx, ry, rz];

    const len_inv = 1 / Math.sqrt(len_sq);
    return [rx * len_inv, ry * len_inv, rz * len_inv];
};

/**
 * Finds closest power of 2 to given number
 * @param {number} number - Input number
 * @returns {number} Closest power of 2
 */
export const nearest_power_of_2 = number => {
    if ((number | 0) !== number || number < 1) return 1;

    if (number <= 1073741824) {
        const floor_log = 31 - Math.clz32(number);
        const floor_power = 1 << floor_log;
        const next_power = floor_power << 1;
        return number - floor_power <= next_power - number ? floor_power : next_power;
    }

    const floor_log = Math.floor(Math.log2(number));
    const floor_power = 2 ** floor_log;
    const next_power = floor_power * 2;
    return number - floor_power <= next_power - number ? floor_power : next_power;
};

/**
 * Finds largest power of 2 less than or equal to given number
 * @param {number} number - Input number
 * @returns {number} Floor power of 2
 */
export const floor_power_of_2 = number => {
    if (typeof number !== 'number' || !isFinite(number) || number < 1) return 1;

    number = Math.floor(number);

    if (number <= 1073741824) {
        return 1 << (31 - Math.clz32(number));
    }

    return 2 ** Math.floor(Math.log2(number));
};

/**
 * Finds smallest power of 2 greater than or equal to given number
 * @param {number} number - Input number
 * @returns {number} Ceiling power of 2
 */
export const ceil_power_of_2 = number => {
    if (typeof number !== 'number' || !isFinite(number) || number <= 1) return 1;

    number = Math.floor(number);

    if (number <= 1073741824) {
        const floor_power = 1 << (31 - Math.clz32(number));
        return number === floor_power ? floor_power : floor_power << 1;
    }

    const log_val = Math.log2(number);
    return 2 ** (log_val === Math.floor(log_val) ? log_val : Math.ceil(log_val));
};

/**
 * Clamps value between minimum and maximum bounds
 * @param {number} val - Value to clamp
 * @param {number} min - Minimum bound
 * @param {number} max - Maximum bound
 * @returns {number} Clamped value
 */
export const clamp = (val, min, max) => val < min ? min : val > max ? max : val;
