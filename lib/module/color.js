/**
 * Color module
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

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
export const srgb_to_linear = c => {
    const c_norm = c * 0.00392156862745098;
    return c_norm <= 0.04045 ? c_norm * 0.07739938080495357 : ((c_norm + 0.055) * 0.9478672985781991) ** 2.4;
};

/**
 * Linear to sRGB conversion
 * @param {number} c - Linear value
 * @returns {number} sRGB value (0-255)
 */
export const linear_to_srgb = c => {
    const srgb = c <= 0.0031308 ? c * 3294.6 : 269.025 * (c ** 0.4166666666666667) - 14.025;
    return srgb < 0 ? 0 : srgb > 255 ? 255 : srgb;
};
