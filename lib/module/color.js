/**
 * Color module
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

/**
 * Clamps and converts a numeric value to an integer between 0 and 255.
 * 
 * @param {number} value - The input value to process
 * @returns {number} Integer value clamped between 0 and 255
 */
export const fast_clamp = (value) => {
    const numeric_value = +value;
    if (numeric_value !== numeric_value) return numeric_value;

    const adjusted_value = numeric_value + 0.5;
    if (adjusted_value <= 0) return 0;
    if (adjusted_value >= 255) return 255;

    return adjusted_value | 0;
};

/**
 * sRGB to linear conversion
 * @param {number} c - sRGB value (0-255)
 * @returns {number} Linear value
 */
export const srgb_to_linear = c => {
    const numeric_c = +c;
    if (numeric_c !== numeric_c) return numeric_c;
    const c_norm = c * 0.00392156862745098;
    return c_norm <= 0.04045 ? c_norm * 0.07739938080495357 : ((c_norm + 0.055) * 0.9478672985781991) ** 2.4;
};

/**
 * Converts a linear-light value (0.0–1.0) to an 8-bit sRGB channel value (0–255).
 * Values below 0 return 0, values above 1 return 255.
 * @param {number} linear_channel - Linear component in range [0, 1]
 * @returns {number} Integer sRGB value in range [0, 255]
 */
export const linear_to_srgb = (linear_channel) => {
    if (linear_channel <= 0 || !Number.isFinite(linear_channel)) {
        return 0;
    }
    if (linear_channel >= 1) {
        return 255;
    }

    const threshold = 0.0031308;
    const linear_part = linear_channel * 12.92;
    if (linear_channel <= threshold) {
        return (linear_part * 255 + 0.5) | 0;
    }

    const powered = Math.pow(linear_channel, 0.4166666666666667); // 1/2.4
    const non_linear_part = 1.055 * powered - 0.055;
    return (non_linear_part * 255 + 0.5) | 0;
};

/**
 * Converts RGB components (0–1 range) to HSL where hue is 0–1, saturation and lightness are 0–1.
 * @param {number} red_channel - Red component (0 to 1).
 * @param {number} green_channel - Green component (0 to 1).
 * @param {number} blue_channel - Blue component (0 to 1).
 * @returns {number[]} Array containing [hue, saturation, lightness].
 * @throws {Error} If any channel is not a number or outside the range 0–1.
 */
export const rgb_to_hsl = (red_channel, green_channel, blue_channel) => {
    if (
        typeof red_channel !== 'number' || red_channel < 0 || red_channel > 1 ||
        typeof green_channel !== 'number' || green_channel < 0 || green_channel > 1 ||
        typeof blue_channel !== 'number' || blue_channel < 0 || blue_channel > 1
    ) {
        throw new Error('invalid_rgb_values');
    }

    let max = red_channel;
    let min = red_channel;
    if (green_channel > max) max = green_channel;
    if (blue_channel > max) max = blue_channel;
    if (green_channel < min) min = green_channel;
    if (blue_channel < min) min = blue_channel;

    const delta = max - min;
    const lightness = (max + min) * 0.5;

    if (delta === 0) {
        return [0, 0, lightness];
    }

    const saturation = lightness > 0.5
        ? delta / (2 - max - min)
        : delta / (max + min);

    let hue;
    if (max === red_channel) {
        hue = (green_channel - blue_channel) / delta + (green_channel < blue_channel ? 6 : 0);
    } else if (max === green_channel) {
        hue = (blue_channel - red_channel) / delta + 2;
    } else {
        hue = (red_channel - green_channel) / delta + 4;
    }
    hue /= 6;

    return [hue, saturation, lightness];
};

/**
 * Convert hue, saturation, and lightness values to red, green, and blue.
 *
 * @param {number} hue_value - A number between 0 and 1 representing hue.
 * @param {number} saturation_value - A number between 0 and 1 representing saturation.
 * @param {number} lightness_value - A number between 0 and 1 representing lightness.
 * @returns {number[]} An array containing red, green, and blue values.
 * @throws {Error} When values fall outside the accepted numeric range.
 */
export const hsl_to_rgb = (hue_value, saturation_value, lightness_value) => {
    if (
        typeof hue_value !== 'number' || hue_value < 0 || hue_value > 1 ||
        typeof saturation_value !== 'number' || saturation_value < 0 || saturation_value > 1 ||
        typeof lightness_value !== 'number' || lightness_value < 0 || lightness_value > 1
    ) {
        throw new Error('invalid_hsl_values');
    }

    if (saturation_value === 0) {
        return [lightness_value, lightness_value, lightness_value];
    }

    const hue_to_rgb = (primary_value, secondary_value, temp_value) => {
        if (temp_value < 0) temp_value += 1;
        else if (temp_value > 1) temp_value -= 1;

        if (temp_value < 0.16666666666666666) {
            return primary_value + (secondary_value - primary_value) * 6 * temp_value;
        }

        if (temp_value < 0.5) {
            return secondary_value;
        }

        if (temp_value < 0.6666666666666666) {
            return primary_value + (secondary_value - primary_value) * (0.6666666666666666 - temp_value) * 6;
        }

        return primary_value;
    };

    const secondary_value =
        lightness_value < 0.5
            ? lightness_value * (1 + saturation_value)
            : lightness_value + saturation_value - lightness_value * saturation_value;

    const primary_value = 2 * lightness_value - secondary_value;

    return [
        hue_to_rgb(primary_value, secondary_value, hue_value + 0.3333333333333333),
        hue_to_rgb(primary_value, secondary_value, hue_value),
        hue_to_rgb(primary_value, secondary_value, hue_value - 0.3333333333333333)
    ];
};

/**
 * Converts a hex color string to RGBA components in 0–1 range.
 * Accepts 6-digit (#RRGGBB or RRGGBB) or 8-digit (#RRGGBBAA or RRGGBBAA) formats.
 * @param {string} hex_string - Hex color string.
 * @returns {number[]} Array of [r, g, b] or [r, g, b, a] values (0–1).
 * @throws {Error} Throws exactly 'invalid_hex_values' on invalid input.
 */
export const hex_to_rgb = (hex_string) => {
    if (typeof hex_string !== 'string') throw new Error('invalid_hex_values');

    const hex = hex_string[0] === '#' ? hex_string.slice(1) : hex_string;
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) throw new Error('invalid_hex_values');

    const n = parseInt(hex, 16);
    const f = 1 / 255;

    return hex.length === 8
        ? [((n >>> 24) & 255) * f, ((n >>> 16) & 255) * f, ((n >>> 8) & 255) * f, (n & 255) * f]
        : [((n >>> 16) & 255) * f, ((n >>> 8) & 255) * f, (n & 255) * f];
};

/**
 * Converts RGB components (0–1) to a six-character uppercase hex string (no # prefix).
 * @param {number} red_channel - Red component in range 0–1.
 * @param {number} green_channel - Green component in range 0–1.
 * @param {number} blue_channel - Blue component in range 0–1.
 * @returns {string} Uppercase hex string RRGGBB.
 * @throws {Error} Throws exactly 'invalid_rgb_values' on invalid input.
 */
export const rgb_to_hex = (red_channel, green_channel, blue_channel) => {
    const valid = c => typeof c === 'number' && c >= 0 && c <= 1 && c === c;
    if (!valid(red_channel) || !valid(green_channel) || !valid(blue_channel)) {
        throw new Error('invalid_rgb_values');
    }

    const r = (red_channel * 255 + 0.5) | 0;
    const g = (green_channel * 255 + 0.5) | 0;
    const b = (blue_channel * 255 + 0.5) | 0;

    return ((r << 16) + (g << 8) + b)
        .toString(16)
        .toUpperCase()
        .padStart(6, '0');
};

/**
 * Converts a hex color string to an rgba() CSS string.
 * Supports 6-digit and 8-digit hex (with alpha).
 * @param {string} hex_string - Hex color string (with or without #).
 * @returns {string|null} rgba() string or null if hex_to_rgb returns null.
 */
export const hex_to_rgba = (hex_string) => {
    const values = hex_to_rgb(hex_string);
    if (values === null) {
        return null;
    }
    return values.length === 4
        ? `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${values[3]})`
        : `rgba(${values[0]}, ${values[1]}, ${values[2]}, 1)`;
};

/**
 * Creates darker and lighter variants of a 6-character hex color (no #).
 * @param {string} hex_color_string - Six-character hex string.
 * @returns {string[]|null} [darker, lighter] hex strings or null if invalid.
 */
export const extrapolate_gradient = (hex_color_string) => {
    if (typeof hex_color_string !== 'string' || hex_color_string.length !== 6) return null;

    const hex = hex_color_string.toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(hex)) return null;

    const rgb = hex_to_rgb(hex);
    if (rgb === null) return null;

    const hsl = rgb_to_hsl(rgb[0], rgb[1], rgb[2]);
    const h = hsl[0];
    const s = hsl[1];
    const l = hsl[2];

    const factor = 0.2;
    const dark_l = l < factor ? 0 : l - factor;
    const light_l = l > 1 - factor ? 1 : l + factor;

    const dark_rgb = hsl_to_rgb(h, s, dark_l);
    const light_rgb = hsl_to_rgb(h, s, light_l);

    return [
        rgb_to_hex(dark_rgb[0], dark_rgb[1], dark_rgb[2]),
        rgb_to_hex(light_rgb[0], light_rgb[1], light_rgb[2])
    ];
};

/**
 * Convert rgb values to grayscale using the luminosity approach.
 * @param {number} red_channel - Red component in the range 0–1
 * @param {number} green_channel - Green component in the range 0–1
 * @param {number} blue_channel - Blue component in the range 0–1
 * @returns {number[]} Array containing grayscale rgb values [gray, gray, gray]
 */
export const rgb_to_grayscale = (red_channel, green_channel, blue_channel) => {
    const gray = 0.299 * +red_channel + 0.587 * +green_channel + 0.114 * +blue_channel;
    return [gray, gray, gray];
};

/**
 * Darkens a hex color by reducing its lightness value.
 *
 * @param {string} hex_color_value - The hex color value to darken
 * @returns {string|null} The darkened hex color value, or null if input is invalid
 */
export const darken_hex_color = (hex_color_value) => {
    if (hex_color_value.startsWith('#')) {
        hex_color_value = hex_color_value.substr(1);
    }
    const rgb_values = hex_to_rgb(hex_color_value);
    if (rgb_values === null) {
        return null;
    }

    const [hue_value, saturation_value, lightness_value] = rgb_to_hsl(
        rgb_values[0],
        rgb_values[1],
        rgb_values[2]
    );

    const dark_lightness_value = Math.max(0, lightness_value - 0.15);
    const dark_rgb = hsl_to_rgb(hue_value, saturation_value, dark_lightness_value);

    return rgb_to_hex(dark_rgb[0], dark_rgb[1], dark_rgb[2]);
};
