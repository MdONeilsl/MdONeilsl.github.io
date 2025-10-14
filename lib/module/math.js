/*
    Copyright (C) 2025  MdONeil 

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
	
	https://github.com/MdONeilsl
    secondlife:///app/agent/ae929a12-297c-45be-9748-562ee17e937e/about
*/
/**
 * Normalizes a 3D vector to unit length
 * @param {number[]} v - Input vector as [x, y, z]
 * @returns {number[]} Normalized vector as [x, y, z]
 */
export const normalize = v => {
    if (!v || !Array.isArray(v)) return v;

    const x = Number(v[0]) || 0;
    const y = Number(v[1]) || 0;
    const z = Number(v[2]) || 0;

    const len_sq = x * x + y * y + z * z;

    if (!isFinite(len_sq) || len_sq <= 1e-8) {
        if (x === Infinity || x === -Infinity) return [x > 0 ? 1 : -1, 0, 0];
        if (y === Infinity || y === -Infinity) return [0, y > 0 ? 1 : -1, 0];
        if (z === Infinity || z === -Infinity) return [0, 0, z > 0 ? 1 : -1];
        return [x, y, z];
    }

    const len_inv = 1 / Math.sqrt(len_sq);
    return [x * len_inv, y * len_inv, z * len_inv];
};

/**
 * Computes the cross product of two 3D vectors
 * @param {number[]} a - First vector as [x, y, z]
 * @param {number[]} b - Second vector as [x, y, z]
 * @returns {number[]} Cross product vector as [x, y, z]
 */
export const cross = (a, b) => {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];

    return [
        a1 * b2 - a2 * b1,
        a2 * b0 - a0 * b2,
        a0 * b1 - a1 * b0
    ];
};

/**
 * Computes the dot product of two 3D vectors
 * @param {number[]} a - First vector as [x, y, z]
 * @param {number[]} b - Second vector as [x, y, z]
 * @returns {number} Dot product result
 */
export const dot = (a, b) => {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];

    return a0 * b0 + a1 * b1 + a2 * b2;
};

/**
 * Rotates a vector around an axis by specified angle using Rodrigues' rotation formula
 * @param {number[]} vec - Input vector to rotate as [x, y, z]
 * @param {number[]} axis - Rotation axis as [x, y, z]
 * @param {number} angle - Rotation angle in radians
 * @returns {number[]} Rotated vector as [x, y, z]
 */
export const rotate_vector = (vec, axis, angle) => {
    const cos_a = Math.cos(angle);
    const sin_a = Math.sin(angle);
    const k = 1 - cos_a;

    const x = vec[0];
    const y = vec[1];
    const z = vec[2];
    const ux = axis[0];
    const uy = axis[1];
    const uz = axis[2];

    const ux2 = ux * ux;
    const uy2 = uy * uy;
    const uz2 = uz * uz;
    const ux_uy = ux * uy;
    const ux_uz = ux * uz;
    const uy_uz = uy * uz;

    const ux_uy_k = ux_uy * k;
    const ux_uz_k = ux_uz * k;
    const uy_uz_k = uy_uz * k;
    const ux_sin = ux * sin_a;
    const uy_sin = uy * sin_a;
    const uz_sin = uz * sin_a;

    return normalize([
        x * (cos_a + ux2 * k) + y * (ux_uy_k - uz_sin) + z * (ux_uz_k + uy_sin),
        x * (ux_uy_k + uz_sin) + y * (cos_a + uy2 * k) + z * (uy_uz_k - ux_sin),
        x * (ux_uz_k - uy_sin) + y * (uy_uz_k + ux_sin) + z * (cos_a + uz2 * k)
    ]);
};

/**
 * Finds the closest power of 2 to a given number (rounds up or down based on proximity).
 * @param {number} number - The input number.
 * @returns {number} The closest power of 2, or 1 if input is invalid or non-positive.
 */
export const nearest_power_of_2 = (number) => {
    number = Math.floor(number);
    if (!Number.isFinite(number) || number <= 0) return 1;
    if (number <= 2147483647) { // 2^31 - 1
        const floor_log = Math.floor(Math.log2(number));
        const floor_power = 1 << floor_log;
        const next_power = floor_power << 1;
        return number < (floor_power + next_power) / 2 ? floor_power : next_power;
    }
    const floor_log = Math.floor(Math.log2(number));
    const floor_power = Math.pow(2, floor_log);
    const next_power = floor_power * 2;
    return number < (floor_power + next_power) / 2 ? floor_power : next_power;
};

/**
 * Finds the largest power of 2 less than or equal to the given number.
 * @param {number} number - The input number.
 * @returns {number} The floor power of 2, or 1 if input is invalid or zero.
 */
export const floor_power_of_2 = (number) => {
    number = Math.floor(number);
    if (!Number.isFinite(number) || number <= 0) return 1;
    if (number <= 2147483647) { // 2^31 - 1
        let power = 1;
        while (number > 1) {
            number = Math.floor(number / 2);
            power <<= 1;
        }
        return power;
    }
    return Math.pow(2, Math.floor(Math.log2(number)));
};

/**
 * Finds the smallest power of 2 greater than or equal to the given number.
 * @param {number} number - The input number.
 * @returns {number} The ceiling power of 2, or 1 if input is invalid or <= 1.
 */
export const ceil_power_of_2 = (number) => {
    number = Math.floor(number);
    if (!Number.isFinite(number) || number <= 1) return 1;
    if (number <= 2147483647) { // 2^31 - 1
        number--;
        number |= number >> 1;
        number |= number >> 2;
        number |= number >> 4;
        number |= number >> 8;
        number |= number >> 16;
        return number + 1;
    }
    return Math.pow(2, Math.ceil(Math.log2(number)));
};


export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);