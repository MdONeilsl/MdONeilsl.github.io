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

//import { fast_clamp } from "./math.js";

export const fast_clamp = (value) => {
    value += 0.5;
    if (value < 0) return 0;
    if (value > 255) return 255;
    return value | 0;
};

/**
 * sRGB to linear conversion
 * @param {number} c - sRGB value (0-255)
 * @returns {number} Linear value
 */
export const srgb_to_linear = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/**
 * Linear to sRGB conversion, optimized with fast_clamp for better performance.
 * @param {number} c - Linear value
 * @returns {number} sRGB value (0-255)
 */
export const linear_to_srgb = (c) => {
    const srgb = c <= 0.0031308 ? 12.92 * c : 1.055 * (c ** (1 / 2.4)) - 0.055;
    return fast_clamp(srgb * 255);
};