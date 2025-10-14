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
 * High-performance image resizing module with advanced optimizations and quality improvements
 * @module image_resizer
 */

/**
 * Fast clamping function optimized for performance using bitwise operations where possible.
 * Enhanced for speed by using conditional checks and bitwise OR for integer conversion,
 * which is faster in major browsers like Chrome and Firefox for high-volume operations.
 * @param {number} value - Value to clamp
 * @returns {number} Clamped value between 0-255
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

/**
 * Precomputed filter configurations for optimal performance
 */
export const resize_filters = {
    box: {
        support: 0.5,
        factor: 1.0,
        fn: (x) => (Math.abs(x) <= 0.5 ? 1.0 : 0.0)
    },
    hamming: {
        support: 1.0,
        factor: 1.0,
        fn: (x) => {
            const abs_x = Math.abs(x);
            return abs_x >= 1.0 ? 0.0 : 0.54 + 0.46 * Math.cos(Math.PI * abs_x);
        }
    },
    lanczos2: {
        support: 2.0,
        factor: 2.0,
        fn: (x) => {
            if (x === 0) return 1.0;
            if (Math.abs(x) >= 2.0) return 0.0;
            const xpi = Math.PI * x;
            const xpi2 = xpi / 2;
            return (Math.sin(xpi) * Math.sin(xpi2)) / (xpi * xpi2);
        }
    },
    lanczos3: {
        support: 3.0,
        factor: 3.0,
        fn: (x) => {
            if (x === 0) return 1.0;
            if (Math.abs(x) >= 3.0) return 0.0;
            const xpi = Math.PI * x;
            const xpi3 = xpi / 3;
            return (Math.sin(xpi) * Math.sin(xpi3)) / (xpi * xpi3);
        }
    },
    mks2013: {
        support: 2.0,
        factor: 1.0,
        fn: (x) => {
            const abs_x = Math.abs(x);
            const B = 1 / 3, C = 1 / 3; // Standard Mitchell–Netravali parameters
            if (abs_x < 1) {
                return ((12 - 9 * B - 6 * C) * abs_x ** 3 +
                    (-18 + 12 * B + 6 * C) * abs_x ** 2 +
                    (6 - 2 * B)) / 6;
            } else if (abs_x < 2) {
                return ((-B - 6 * C) * abs_x ** 3 +
                    (6 * B + 30 * C) * abs_x ** 2 +
                    (-12 * B - 48 * C) * abs_x +
                    (8 * B + 24 * C)) / 6;
            } else return 0;
        }
    },
    bicubic: {
        support: 2.0,
        factor: 2.0,
        fn: (x) => {
            const abs_x = Math.abs(x);
            if (abs_x <= 1.0) return (1.5 * abs_x ** 3 - 2.5 * abs_x ** 2 + 1);
            if (abs_x < 2.0) return (-0.5 * abs_x ** 3 + 2.5 * abs_x ** 2 - 4 * abs_x + 2);
            return 0.0;
        }
    }
};

/**
 * Color conversion utilities
 */
export const color_converter = {
    /**
     * Convert sRGB data to linear space
     * @param {Uint8ClampedArray} src - Source data
     * @returns {Float32Array} Linear data
     */
    to_linear: (src) => {
        if (!(src instanceof Uint8ClampedArray)) {
            throw new Error('src must be Uint8ClampedArray');
        }
        const linear_data = new Float32Array(src.length);
        for (let i = 0, len = src.length; i < len; i += 4) {
            linear_data[i] = srgb_to_linear(src[i]);
            linear_data[i + 1] = srgb_to_linear(src[i + 1]);
            linear_data[i + 2] = srgb_to_linear(src[i + 2]);
            linear_data[i + 3] = src[i + 3] / 255;
        }
        return linear_data;
    },

    /**
     * Convert linear data back to sRGB
     * @param {Float32Array} linear_data - Linear data
     * @returns {Uint8ClampedArray} sRGB data
     */
    to_srgb: (linear_data) => {
        if (!(linear_data instanceof Float32Array)) {
            throw new Error('linear_data must be Float32Array');
        }
        const output = new Uint8ClampedArray(linear_data.length);
        for (let i = 0, len = linear_data.length; i < len; i += 4) {
            output[i] = linear_to_srgb(linear_data[i]);
            output[i + 1] = linear_to_srgb(linear_data[i + 1]);
            output[i + 2] = linear_to_srgb(linear_data[i + 2]);
            output[i + 3] = fast_clamp(linear_data[i + 3] * 255);
        }
        return output;
    }
};

/**
 * Filter contributions utilities with caching for performance
 */
export const filter_contributions = {
    cache: new Map(),

    /**
     * Calculate filter contributions, cached for reuse to improve speed on repeated resizes.
     * @param {number} dest_size - Destination size
     * @param {number} src_size - Source size
     * @param {number} scale - Scale factor
     * @param {number} support - Filter support
     * @param {Object} filter_config - Filter configuration
     * @returns {Array} Precomputed contributions
     */
    calculate: (dest_size, src_size, scale, support, filter_config) => {
        const cache_key = `${dest_size}_${src_size}_${scale.toFixed(4)}_${support.toFixed(4)}_${filter_config.support}`;
        if (filter_contributions.cache.has(cache_key)) return filter_contributions.cache.get(cache_key);

        const contributions = new Array(dest_size);
        for (let dest_index = 0; dest_index < dest_size; dest_index++) {
            const center = (dest_index + 0.5) / scale;
            const start = Math.max(0, Math.floor(center - support));
            const end = Math.min(src_size - 1, Math.ceil(center + support));

            const indices = [];
            const weights = [];
            let weight_sum = 0.0;

            for (let src_index = start; src_index <= end; src_index++) {
                const weight = filter_config.fn((center - src_index - 0.5) * scale);
                if (Math.abs(weight) > 1e-6) {
                    indices.push(src_index);
                    weights.push(weight);
                    weight_sum += weight;
                }
            }

            if (Math.abs(weight_sum) > 1e-6) {
                for (let i = 0, len = weights.length; i < len; i++) weights[i] /= weight_sum;
            } else {
                const nearest = Math.min(src_size - 1, Math.max(0, Math.round(center - 0.5)));
                indices.push(nearest);
                weights.push(1.0);
            }

            contributions[dest_index] = { indices, weights };
        }

        filter_contributions.cache.set(cache_key, contributions);
        return contributions;
    },

    /**
     * Clear contributions cache to free memory
     */
    clear_cache: () => {
        filter_contributions.cache.clear();
    }
};

/**
 * Gaussian kernel utilities with caching
 */
export const gaussian_kernel = {
    cache: new Map(),

    /**
     * Create Gaussian kernel, cached for performance on multiple blurs with same sigma.
     * @param {number} sigma - Gaussian sigma value
     * @returns {Float32Array} Precomputed kernel
     */
    create: (sigma) => {
        sigma = Math.max(sigma, 0);
        const cache_key = `gaussian_${sigma.toFixed(2)}`;
        if (gaussian_kernel.cache.has(cache_key)) return gaussian_kernel.cache.get(cache_key);

        if (sigma === 0) {
            const singleKernel = new Float32Array([1]);
            gaussian_kernel.cache.set(cache_key, singleKernel);
            return singleKernel;
        }

        const radius = Math.ceil(sigma * 3);
        const size = radius * 2 + 1;
        const kernel = new Float32Array(size);
        let sum = 0;
        const sigma2 = 2 * sigma * sigma;

        for (let i = -radius; i <= radius; i++) {
            const val = Math.exp(-(i * i) / sigma2);
            kernel[i + radius] = val;
            sum += val;
        }

        for (let i = 0; i < size; i++) kernel[i] /= sum;

        gaussian_kernel.cache.set(cache_key, kernel);
        return kernel;
    },

    /**
     * Clear Gaussian cache to free memory
     */
    clear_cache: () => {
        gaussian_kernel.cache.clear();
    }
};

/**
 * Image blurring utilities
 */
export const image_blurer = {
    /**
     * Apply Gaussian blur with separable passes and reflect padding for edge handling.
     * Optimized with cached kernel and reflect padding to avoid branches in inner loops.
     * @param {Uint8ClampedArray} src - Source data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} radius - Blur radius
     * @returns {Uint8ClampedArray} Blurred data
     */
    blur: (src, width, height, radius) => {
        const sigma = Math.max(radius, 0.5);
        const kernel = gaussian_kernel.create(sigma);
        const half = Math.floor(kernel.length / 2);
        const temp = new Uint8ClampedArray(src.length);

        // Horizontal pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                for (let k = -half; k <= half; k++) {
                    let px = x + k;
                    if (px < 0) px = -px;
                    if (px >= width) px = (width * 2) - px - 1;
                    const weight = kernel[k + half];
                    const idx = (y * width + px) * 4;
                    r += src[idx] * weight;
                    g += src[idx + 1] * weight;
                    b += src[idx + 2] * weight;
                    a += src[idx + 3] * weight;
                }
                const idx = (y * width + x) * 4;
                temp[idx] = fast_clamp(r);
                temp[idx + 1] = fast_clamp(g);
                temp[idx + 2] = fast_clamp(b);
                temp[idx + 3] = fast_clamp(a);
            }
        }

        // Vertical pass
        const output = new Uint8ClampedArray(src.length);
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let r = 0, g = 0, b = 0, a = 0;
                for (let k = -half; k <= half; k++) {
                    let py = y + k;
                    if (py < 0) py = -py;
                    if (py >= height) py = (height * 2) - py - 1;
                    const weight = kernel[k + half];
                    const idx = (py * width + x) * 4;
                    r += temp[idx] * weight;
                    g += temp[idx + 1] * weight;
                    b += temp[idx + 2] * weight;
                    a += temp[idx + 3] * weight;
                }
                const idx = (y * width + x) * 4;
                output[idx] = fast_clamp(r);
                output[idx + 1] = fast_clamp(g);
                output[idx + 2] = fast_clamp(b);
                output[idx + 3] = fast_clamp(a);
            }
        }

        return output;
    }
};

/**
 * Image sharpening utilities
 */
export const image_sharpener = {
    /**
     * Apply unsharp mask for sharpening, using optimized blur and fast_clamp.
     * @param {Uint8ClampedArray} src - Source data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} amount - Sharpening amount
     * @param {number} radius - Blur radius
     * @param {number} threshold - Sharpening threshold
     * @returns {Uint8ClampedArray} Sharpened data
     */
    unsharp: (src, width, height, amount, radius, threshold) => {
        const blurred = image_blurer.blur(src, width, height, Math.min(radius, 2.0));
        const output = new Uint8ClampedArray(src.length);
        const amount_value = amount / 100;

        for (let i = 0, len = src.length; i < len; i += 4) {
            const src_r = src[i], src_g = src[i + 1], src_b = src[i + 2], src_a = src[i + 3];
            const blur_r = blurred[i], blur_g = blurred[i + 1], blur_b = blurred[i + 2];

            let diff_r = src_r - blur_r, diff_g = src_g - blur_g, diff_b = src_b - blur_b;

            if (Math.abs(diff_r) < threshold) diff_r = 0;
            if (Math.abs(diff_g) < threshold) diff_g = 0;
            if (Math.abs(diff_b) < threshold) diff_b = 0;

            output[i] = fast_clamp(src_r + diff_r * amount_value);
            output[i + 1] = fast_clamp(src_g + diff_g * amount_value);
            output[i + 2] = fast_clamp(src_b + diff_b * amount_value);
            output[i + 3] = src_a;
        }

        return output;
    }
};

/**
 * Image resizing utilities, optimized with typed arrays, caching, and efficient loops for cross-browser performance.
 */
export const image_resizer = {
    /**
     * Validate resize options
     * @param {Object} options - Resize options
     * @returns {Object} Validated options
     */
    validate_options: (options) => {
        const {
            src,
            width,
            height,
            to_width,
            to_height,
            filter = 'lanczos3',
            unsharp_amount = 0,
            unsharp_radius = 0.5,
            unsharp_threshold = 0,
            gamma_correct = true,
            dest
        } = options;

        if (!(src instanceof Uint8ClampedArray) && !(src instanceof Float32Array)) {
            throw new Error('src must be Uint8ClampedArray or Float32Array');
        }
        if (!Number.isInteger(width) || width <= 0) throw new Error('width must be positive integer');
        if (!Number.isInteger(height) || height <= 0) throw new Error('height must be positive integer');
        if (!Number.isInteger(to_width) || to_width < 0) throw new Error('to_width must be non-negative integer');
        if (!Number.isInteger(to_height) || to_height < 0) throw new Error('to_height must be non-negative integer');
        if (!resize_filters[filter]) throw new Error(`unsupported filter: ${filter}`);
        if (unsharp_amount < 0) throw new Error('unsharp_amount must be >= 0');
        if (unsharp_radius < 0) throw new Error('unsharp_radius must be >= 0');
        if (unsharp_threshold < 0 || unsharp_threshold > 255) throw new Error('unsharp_threshold must be 0-255');

        // Only validate length for Uint8ClampedArray, not Float32Array
        if (src instanceof Uint8ClampedArray && src.length !== width * height * 4) {
            throw new Error('src length mismatch');
        }

        return {
            src, width, height, to_width, to_height, filter,
            unsharp_amount, unsharp_radius, unsharp_threshold, gamma_correct, dest
        };
    },

    /**
     * Resize image with optimizations for large downscales and gamma correction.
     * Enhanced speed through multi-step resizing for scales <0.5 to reduce computations,
     * and typed arrays for efficient memory access in browsers.
     * @param {Object} options - Resize configuration
     * @returns {Uint8ClampedArray} Resized data
     */
    resize: (options) => {
        const {
            src,
            width,
            height,
            to_width,
            to_height,
            filter,
            unsharp_amount,
            unsharp_radius,
            unsharp_threshold,
            gamma_correct,
            dest
        } = image_resizer.validate_options(options);

        if (to_width === 0 || to_height === 0) return dest || new Uint8ClampedArray(0);
        if (width === to_width && height === to_height) {
            const output = dest || new Uint8ClampedArray(src.length);
            output.set(src);
            return output;
        }

        let working_src = src;
        let is_linear = false;

        if (gamma_correct) {
            if (src instanceof Float32Array) {
                working_src = src;
                is_linear = true;
            } else {
                working_src = color_converter.to_linear(src);
                is_linear = true;
            }
        } else {
            is_linear = src instanceof Float32Array;
        }

        const scale_x = to_width / width;
        const scale_y = to_height / height;
        const filter_config = resize_filters[filter];
        const ArrayType = is_linear ? Float32Array : Uint8ClampedArray;

        let intermediate = working_src;
        let current_width = width;
        let current_height = height;

        // Handle horizontal resize
        if (current_width !== to_width) {
            const needs_multi_horizontal = (scale_x < 1 && current_width / 2 > to_width) || (scale_x > 1 && current_width * 2 < to_width);
            let temp_horizontal;
            if (needs_multi_horizontal) {
                temp_horizontal = image_resizer.multi_step_horizontal(intermediate, current_width, current_height, to_width, filter_config, is_linear);
            } else {
                temp_horizontal = new ArrayType(to_width * current_height * 4);
                image_resizer.resize_horizontal(intermediate, temp_horizontal, current_width, current_height, to_width, filter_config, is_linear);
            }
            intermediate = temp_horizontal;
            current_width = to_width;
        }

        // Handle vertical resize
        if (current_height !== to_height) {
            const needs_multi_vertical = (scale_y < 1 && current_height / 2 > to_height) || (scale_y > 1 && current_height * 2 < to_height);
            let temp_vertical;
            if (needs_multi_vertical) {
                temp_vertical = image_resizer.multi_step_vertical(intermediate, current_width, current_height, to_height, filter_config, is_linear);
            } else {
                temp_vertical = new ArrayType(current_width * to_height * 4);
                image_resizer.resize_vertical(intermediate, temp_vertical, current_width, current_height, to_height, filter_config, is_linear);
            }
            intermediate = temp_vertical;
            current_height = to_height;
        }

        let result = intermediate;

        if (gamma_correct && !(src instanceof Float32Array)) {
            result = color_converter.to_srgb(result);
        }

        if (unsharp_amount > 0 && unsharp_radius >= 0.5) {
            result = image_sharpener.unsharp(result, to_width, to_height, unsharp_amount, unsharp_radius, unsharp_threshold);
        }

        if (dest) {
            dest.set(result);
            return dest;
        }

        return result;
    },

    /**
     * Multi-step horizontal resize for large scales
     * @param {TypedArray} src - Source data
     * @param {number} src_width - Source width
     * @param {number} src_height - Source height
     * @param {number} dest_width - Destination width
     * @param {Object} filter_config - Filter config
     * @param {boolean} is_linear - If data is linear
     * @returns {TypedArray} Resized data
     */
    multi_step_horizontal: (src, src_width, src_height, dest_width, filter_config, is_linear) => {
        const ArrayType = is_linear ? Float32Array : Uint8ClampedArray;
        let current_width = src_width;
        let current_data = src;
        const is_downscale = dest_width < src_width;

        while (true) {
            let next_width;
            if (is_downscale) {
                if (current_width / 2 <= dest_width) break;
                next_width = Math.max(dest_width, Math.floor(current_width / 2));
            } else {
                if (current_width * 2 >= dest_width) break;
                next_width = Math.min(dest_width, current_width * 2);
            }
            const next_data = new ArrayType(next_width * src_height * 4);
            image_resizer.resize_horizontal(current_data, next_data, current_width, src_height, next_width, filter_config, is_linear);
            current_data = next_data;
            current_width = next_width;
        }

        const final_data = new ArrayType(dest_width * src_height * 4);
        image_resizer.resize_horizontal(current_data, final_data, current_width, src_height, dest_width, filter_config, is_linear);
        return final_data;
    },

    /**
     * Multi-step vertical resize for large scales
     * @param {TypedArray} src - Source data
     * @param {number} src_width - Source width
     * @param {number} src_height - Source height
     * @param {number} dest_height - Destination height
     * @param {Object} filter_config - Filter config
     * @param {boolean} is_linear - If data is linear
     * @returns {TypedArray} Resized data
     */
    multi_step_vertical: (src, src_width, src_height, dest_height, filter_config, is_linear) => {
        const ArrayType = is_linear ? Float32Array : Uint8ClampedArray;
        let current_height = src_height;
        let current_data = src;
        const is_downscale = dest_height < src_height;

        while (true) {
            let next_height;
            if (is_downscale) {
                if (current_height / 2 <= dest_height) break;
                next_height = Math.max(dest_height, Math.floor(current_height / 2));
            } else {
                if (current_height * 2 >= dest_height) break;
                next_height = Math.min(dest_height, current_height * 2);
            }
            const next_data = new ArrayType(src_width * next_height * 4);
            image_resizer.resize_vertical(current_data, next_data, src_width, current_height, next_height, filter_config, is_linear);
            current_data = next_data;
            current_height = next_height;
        }

        const final_data = new ArrayType(src_width * dest_height * 4);
        image_resizer.resize_vertical(current_data, final_data, src_width, current_height, dest_height, filter_config, is_linear);
        return final_data;
    },

    /**
     * Horizontal resize pass, optimized with precomputed contributions and tight loops.
     * @param {TypedArray} src - Source data
     * @param {TypedArray} dest - Destination data
     * @param {number} src_width - Source width
     * @param {number} src_height - Source height
     * @param {number} dest_width - Destination width
     * @param {Object} filter_config - Filter config
     * @param {boolean} is_linear - If data is linear
     */
    resize_horizontal: (src, dest, src_width, src_height, dest_width, filter_config, is_linear) => {
        const scale = dest_width / src_width;
        const support = scale < 1.0 ? filter_config.support / scale : filter_config.support;
        const contributions = filter_contributions.calculate(dest_width, src_width, scale, support, filter_config);
        const src_stride = src_width * 4;
        const dest_stride = dest_width * 4;
        const clamp_fn = is_linear ? (v) => v : fast_clamp;

        for (let y = 0; y < src_height; y++) {
            const src_row_offset = y * src_stride;
            const dest_row_offset = y * dest_stride;
            for (let x = 0; x < dest_width; x++) {
                const contrib = contributions[x];
                let r = 0, g = 0, b = 0, a = 0;
                const indices_len = contrib.indices.length;
                for (let i = 0; i < indices_len; i++) {
                    const src_x = contrib.indices[i];
                    const weight = contrib.weights[i];
                    const src_idx = src_row_offset + src_x * 4;
                    r += src[src_idx] * weight;
                    g += src[src_idx + 1] * weight;
                    b += src[src_idx + 2] * weight;
                    a += src[src_idx + 3] * weight;
                }
                const dest_idx = dest_row_offset + x * 4;
                dest[dest_idx] = clamp_fn(r);
                dest[dest_idx + 1] = clamp_fn(g);
                dest[dest_idx + 2] = clamp_fn(b);
                dest[dest_idx + 3] = clamp_fn(a);
            }
        }
    },

    /**
     * Vertical resize pass, optimized similarly with cached lengths and efficient access.
     * @param {TypedArray} src - Source data
     * @param {TypedArray} dest - Destination data
     * @param {number} src_width - Source width
     * @param {number} src_height - Source height
     * @param {number} dest_height - Destination height
     * @param {Object} filter_config - Filter config
     * @param {boolean} is_linear - If data is linear
     */
    resize_vertical: (src, dest, src_width, src_height, dest_height, filter_config, is_linear) => {
        const scale = dest_height / src_height;
        const support = scale < 1.0 ? filter_config.support / scale : filter_config.support;
        const contributions = filter_contributions.calculate(dest_height, src_height, scale, support, filter_config);
        const stride = src_width * 4;
        const clamp_fn = is_linear ? (v) => v : fast_clamp;

        for (let x = 0; x < src_width; x++) {
            for (let y = 0; y < dest_height; y++) {
                const contrib = contributions[y];
                let r = 0, g = 0, b = 0, a = 0;
                const indices_len = contrib.indices.length;
                for (let i = 0; i < indices_len; i++) {
                    const src_y = contrib.indices[i];
                    const weight = contrib.weights[i];
                    const src_idx = src_y * stride + x * 4;
                    r += src[src_idx] * weight;
                    g += src[src_idx + 1] * weight;
                    b += src[src_idx + 2] * weight;
                    a += src[src_idx + 3] * weight;
                }
                const dest_idx = y * stride + x * 4;
                dest[dest_idx] = clamp_fn(r);
                dest[dest_idx + 1] = clamp_fn(g);
                dest[dest_idx + 2] = clamp_fn(b);
                dest[dest_idx + 3] = clamp_fn(a);
            }
        }
    },

    /**
     * Get filter information
     * @returns {Object} Filter info
     */
    get_filter_info: () => {
        return {
            box: { support: 0.5, description: 'fast box filter for nearest neighbor scaling' },
            hamming: { support: 1.0, description: 'good balance of speed and quality' },
            lanczos2: { support: 2.0, description: 'high quality lanczos with 2 lobe window' },
            lanczos3: { support: 3.0, description: 'very high quality lanczos with 3 lobe window' },
            mks2013: { support: 3.0, description: 'mitchell netravali based filter with built in sharpening' },
            bicubic: { support: 2.0, description: 'bicubic filter, good for downscaling with sharpening' }
        };
    }
};
