import { array, pool } from "../array.js";
import { range_error, type_error } from "../../error.js";
import { classes, kind_of, NULL, type_of } from "../../functions.js"
import { numb } from "../math/number.js";
import { new_xnode, xnode } from "../system/format/xml/xnode.js";

export const WIDTH = 0;
export const HEIGHT = 1;

export const IGNORE_ASPECT_RATIO = 0;
export const KEEP_ASPECT_RATIO = 1;
export const KEEP_ASPECT_RATIO_BY_EXPANDING = 2;

/**
 * Represents the base class for size objects.
 */
class size_base {
    /**
     * Gets the type of the size object.
     * @returns {string} The type of the size object.
     */
    get kind() { return `size`; }

    /**
     * Gets the width of the size object.
     * @returns {number} The width of the size object.
     */
    get width() { return this[WIDTH]; }

    /**
     * Sets the width of the size object.
     * @param {number} x - The width value to be set.
     * @throws {type_error} Throws a type error if the provided width is not a number.
     */
    set width(x) {
        if (kind_of(x) !== `number`) throw new type_error(`Width must be a number.`);
        if (x < 0) throw new range_error(`Width must be a positive number.`);
        this[WIDTH] = x;
    }

    /**
     * Gets the height of the size object.
     * @returns {number} The height of the size object.
     */
    get height() { return this[HEIGHT]; }

    /**
     * Sets the height of the size object.
     * @param {number} x - The height value to be set.
     * @throws {type_error} Throws a type error if the provided height is not a number.
     */
    set height(x) {
        if (kind_of(x) !== `number`) throw new type_error(`Height must be a number.`);
        if (x < 0) throw new range_error(`Height must be a positive number.`);
        this[HEIGHT] = x;
    }
}

/**
 * Represents a size object using 16-bit integers.
 * @class sizei
 * @extends Int16Array
 * @extends size_base
 */
export class sizei extends classes(Int16Array, size_base) {

    /**
     * Constructs a sizei object with the specified width and height.
     * @param {number=} width - The width of the size object.
     * @param {number=} height - The height of the size object.
     */
    constructor(width = 0, height = 0) {
        super(2);
        if (array.is_array(width)) {
            this[WIDTH] = width[WIDTH];
            this[HEIGHT] = width[HEIGHT];
        }
        else {
            this[WIDTH] = width;
            this[HEIGHT] = height;
        }
    }

}

/**
 * Represents a size object using 32-bit floating point numbers.
 * @class sizef
 * @extends Float32Array
 * @extends size_base
 */
export class sizef extends classes(Float32Array, size_base) {
    /**
     * Constructs a sizef object with the specified width and height.
     * @param {number=} width - The width of the size object.
     * @param {number=} height - The height of the size object.
     */
    constructor(width = 0, height = 0) {
        super(2);
        if (array.is_array(width)) {
            this[WIDTH] = width[WIDTH];
            this[HEIGHT] = width[HEIGHT];
        }
        else {
            this[WIDTH] = width;
            this[HEIGHT] = height;
        }
    }
}

/**
 * Represents a size object using 16-bit integers.
 * @class size_i16p
 * @extends Int16Array
 * @extends size_base
 */
export class size_i16p extends classes(Int16Array, size_base) {

    /**
     * Constructs a size_i16p object with the specified width and height.
     * @param {pool|ArrayBuffer} obj - Data pool or another wrapper to build this object.
     * @param {number=} width - The width of the size object.
     * @param {number=} height - The height of the size object.
     */
    constructor(obj, width = 0, height = 0) {
        let p;
        if (obj instanceof pool) p = obj;
        else if (ArrayBuffer.isView(obj)) p = obj.buff;
        else throw new Error('Parameter is of the wrong type.');

        super(p.buffer, p.align(Int16Array, 2), 2);

        if (array.is_array(obj)) {
            this[WIDTH] = obj[width];
            this[HEIGHT] = obj[height];
        }
        else {
            this[WIDTH] = width;
            this[HEIGHT] = height;
        }
    }

    /**
     * Gets the length of the size_i16p object in bytes.
     * @returns {number} The length of the size_i16p object in bytes.
     */
    static get BYTES_LENGTH() { return Int16Array.BYTES_PER_ELEMENT * 2; }
}

/**
 * Represents a reference to a size object using 16-bit integers.
 * @class size_i16p_ref
 * @extends Int16Array
 * @extends size_base
 */
export class size_i16p_ref extends classes(Int16Array, size_base) {
    /**
     * Constructs a size_i16p_ref object with the specified buffer and offset.
     * @param {ArrayBuffer} buffer - The buffer for the size object.
     * @param {number} offset - The offset within the buffer.
     */
    constructor(buffer, offset) {
        super(buffer, offset, 2);
    }
}

/**
 * Represents a size object using 32-bit floating point numbers.
 * @class size_f32p
 * @extends Float32Array
 * @extends size_base
 */
export class size_f32p extends classes(Float32Array, size_base) {

    /**
     * Constructs a size_f32p object with the specified width and height.
     * @param {pool|ArrayBuffer} obj - Data pool or another wrapper to build this object.
     * @param {number=} width - The width of the size object.
     * @param {number=} height - The height of the size object.
     */
    constructor(obj, width = 0, height = 0) {
        let p;
        if (obj instanceof pool) p = obj;
        else if (ArrayBuffer.isView(obj)) p = obj.buff;
        else throw new Error('Parameter is of the wrong type.');

        super(p.buffer, p.align(Float32Array, 2), 2);

        if (array.is_array(obj)) {
            this[WIDTH] = obj[width];
            this[HEIGHT] = obj[height];
        }
        else {
            this[WIDTH] = width;
            this[HEIGHT] = height;
        }
    }

    /**
     * Gets the length of the size_f32p object in bytes.
     * @returns {number} The length of the size_f32p object in bytes.
     */
    static get BYTES_LENGTH() { return Float32Array.BYTES_PER_ELEMENT * 2; }
}

/**
 * Represents a reference to a size object using 32-bit floating point numbers.
 * @class size_f32p_ref
 * @extends Float32Array
 * @extends size_base
 */
export class size_f32p_ref extends classes(Float32Array, size_base) {
    /**
     * Constructs a size_f32p_ref object with the specified buffer and offset.
     * @param {ArrayBuffer} buffer - The buffer for the size object.
     * @param {number} offset - The offset within the buffer.
     */
    constructor(buffer, offset) {
        super(buffer, offset, 2);
    }
}

/**
 * Returns true if both size objects are equal; otherwise returns false.
 * @param {size} s1 - The first size object.
 * @param {size} s2 - The second size object.
 * @returns {boolean} True if both size objects are equal; otherwise false.
 */
export const size_equals = (s1, s2) => s1[WIDTH] == s2[WIDTH] && s1[HEIGHT] == s2[HEIGHT];

/**
 * Returns true if both size objects are almost equal; otherwise returns false.
 * @param {size} s1 - The first size object.
 * @param {size} s2 - The second size object.
 * @returns {boolean} True if both size objects are almost equal; otherwise false.
 */
export const size_fuzzy_equals = (s1, s2) =>
    numb.fuzzy_comparef(s1[WIDTH], s2[WIDTH]) && numb.fuzzy_comparef(s1[HEIGHT], s2[HEIGHT]);

/**
 * Returns true if both the width and height of the size object are 0; otherwise returns false.
 * @param {size} s - The size object to check.
 * @returns {boolean} True if both the width and height are 0; otherwise false.
 */
export const size_is_null = s => s[WIDTH] === 0 && s[HEIGHT] === 0;

/**
 * Returns true if both the width and height of the size object are almost 0; otherwise returns false.
 * @param {size} s - The size object to check.
 * @returns {boolean} True if both the width and height are almost 0; otherwise false.
 */
export const size_fuzzy_null = s => numb.fuzzy_null(s[WIDTH]) && numb.fuzzy_null(s[HEIGHT]);

/**
 * Sets the width and height of the size object.
 * If the second parameter is a size object, it sets the width and height of the size object to match the provided size object.
 * Otherwise, it sets the width and height to the provided values.
 * @param {size} s - The size object to modify.
 * @param {number|size} w - The width value or a size object.
 * @param {number} h - The height value.
 * @returns {size} The modified size object.
 */
export const size_set = (s, w, h) => {
    if (kind_of(w) === `size`) {
        s.width = w.width;
        s.height = w.height;
    }
    else {
        s.width = w;
        s.height = h;
    }
    return s;
}

/**
 * Returns a size object holding the minimum width and height of s1 and s2.
 * @param {size} s1 - The first size object.
 * @param {size} s2 - The second size object.
 * @param {size} result - The result object to store the minimum size.
 * @returns {size} The result object containing the minimum width and height.
 */
export const size_bounded_to = (s1, s2, result) => {
    result[WIDTH] = (s1[WIDTH] < s2[WIDTH]) ? s1[WIDTH] : s2[WIDTH];
    result[HEIGHT] = (s1[HEIGHT] < s2[HEIGHT]) ? s1[HEIGHT] : s2[HEIGHT];
    return result;
}

/**
 * Returns a size holding the maximum width and height of s1 and s2.
 * @param {size} s1 - The first size object.
 * @param {size} s2 - The second size object.
 * @param {size} result - The result object to store the maximum size.
 * @returns {size} The result object containing the maximum width and height.
 */
export const size_expanded_to = (s1, s2, result) => {
    result[WIDTH] = (s1[WIDTH] > s2[WIDTH]) ? s1[WIDTH] : s2[WIDTH];
    result[HEIGHT] = (s1[HEIGHT] > s2[HEIGHT]) ? s1[HEIGHT] : s2[HEIGHT];
    return result;
}

/**
 * Swaps the width and height values of the size object.
 * @param {size} s1 - The size object to transpose.
 */
export const size_transpose = s1 => s1.reverse();

/**
 * Returns a size object with width and height swapped.
 * @param {size} s1 - The input size object.
 * @param {size} result - The result size object.
 * @returns {size} The result size object with swapped width and height.
 */
export const size_transposed = (s1, result) => {
    result[WIDTH] = s1[HEIGHT];
    result[HEIGHT] = s1[WIDTH];
    return result;
}

/**
 * Scales the size to a rectangle with the given width and height, according to the specified mode.
 * @param {size} s - The size to scale.
 * @param {number|size} w - The width or a size object.
 * @param {number} h - The height or aspect ratio mode.
 * @param {number} [mode=IGNORE_ASPECT_RATIO] - Aspect ratio mode.
 */
export const size_scale = (s, w, h, mode = IGNORE_ASPECT_RATIO) => {
    // If w is an array, call size_scale recursively with individual width and height values
    if (array.is_array(w)) return size_scale(s, w[WIDTH], w[HEIGHT], h);

    // If mode is IGNORE_ASPECT_RATIO or the size has zero width or height, set width and height to the provided values
    if (mode === IGNORE_ASPECT_RATIO || s[WIDTH] === 0 || s[HEIGHT] === 0) {
        s[WIDTH] = w;
        s[HEIGHT] = h;
        return;
    }

    // Calculate scaled width and height based on aspect ratio mode
    let sw = numb.parse(s[WIDTH]);
    let sh = numb.parse(s[HEIGHT]);
    w = numb.parse(w);
    h = numb.parse(h);
    let uh, rw = h * sw / sh;
    if (mode === KEEP_ASPECT_RATIO) uh = (rw <= w);
    else uh = (rw >= w);

    // Set the size object's width and height based on the calculated values
    if (uh) {
        s[WIDTH] = rw;
        s[HEIGHT] = h;
    } else {
        s[WIDTH] = w;
        s[HEIGHT] = w * sh / sw;
    }
}

/**
 * Scales the size to a rectangle with the given width and height, according to the specified mode and stor the result in result.
 * @param {size} s the size to scale.
 * @param {number|size} w the width or a size object.
 * @param {number|size} h the height or the result object.
 * @param {number|size} result the result object or the  aspect ratio mode..
 * @param {number} mode  aspect ratio mode.
 * @returns {size} the result object.
 */
export const size_scaled = (s, w, h, result, mode = IGNORE_ASPECT_RATIO) => {
    if (array.is_array(w)) return size_scaled(s, w[WIDTH], w[HEIGHT], h, result);

    if (mode == IGNORE_ASPECT_RATIO || s[WIDTH] == 0 || s[HEIGHT] == 0) {
        result[WIDTH] = w;
        result[HEIGHT] = h;
    }
    else {
        result[WIDTH] = s[WIDTH];
        result[HEIGHT] = s[HEIGHT];
        size_scale(result, w, h, mode);
    }
    return result;
}

/**
 * Returns the sum of s and s2 or w/h; each component is added separately.
 * @param {size} s1 starting size.
 * @param {number|size} w the width or a size object to add.
 * @param {number|size} h the height to add or the result object.
 * @param {size} result the result object.
 * @returns {size} the result object.
 */
export const size_add = (s1, w, h, result) => {
    if (array.is_array(w)) return size_add(s1, w[WIDTH], w[HEIGHT], h);
    result[WIDTH] = s1[WIDTH] + w;
    result[HEIGHT] = s1[HEIGHT] + h;
    return result;
}

/**
 * Returns the result of subtracting the provided width and height, or another size object, from the size; each component is subtracted separately.
 * @param {size} s1 - The starting size.
 * @param {number|size} w - The width or a size object to subtract.
 * @param {number|size} h - The height to subtract or the result object.
 * @param {size} result - The result object.
 * @returns {size} The result object containing the subtracted sizes.
 */
export const size_rem = (s1, w, h, result) => {
    if (array.is_array(w)) return size_rem(s1, w[WIDTH], w[HEIGHT], h);
    result[WIDTH] = s1[WIDTH] - w;
    result[HEIGHT] = s1[HEIGHT] - h;
    return result;
}

/**
 * Multiplies the given size by the given factor, and returns the result.
 * @param {size} s1 - The size to scale.
 * @param {number} factor - The scalar factor to multiply the size by.
 * @param {size} result - The result object to store the multiplied size.
 * @returns {size} The result object containing the multiplied size.
 */
export const size_mult = (s1, factor, result) => {
    result[WIDTH] = s1[WIDTH] * factor;
    result[HEIGHT] = s1[HEIGHT] * factor;
    return result;
}

/**
 * Divides the given size by the given divisor, and returns the result.
 * @param {size} s1 - The size to scale.
 * @param {number} factor - The scalar factor to divide the size by.
 * @param {size} result - The result object to store the divided size.
 * @returns {size} The result object containing the divided size.
 */
export const size_div = (s1, factor, result) => {
    // Calculate the new width and height by dividing the original size's width and height by the factor
    if (numb.fuzzy_null(factor))
        return size_set(result, Infinity, Infinity);

    let w = s1[WIDTH] / factor;
    let h = s1[HEIGHT] / factor;

    // Round the values if the original size is an Int16Array
    if (s1[Symbol.toStringTag] === "Int16Array") {
        result[WIDTH] = numb.rounded(w, numb.rounding_mode.away_from_zero);
        result[HEIGHT] = numb.rounded(h, numb.rounding_mode.away_from_zero);
    } else {
        result[WIDTH] = w;
        result[HEIGHT] = h;
    }

    return result;
}

/**
 * Returns a string that can be used in a CSS rule to set the width and height.
 * @param {size} s1 - The size object.
 * @returns {string} A string representing the width and height in pixels.
 */
export const size_to_css = s1 => {
    // Round the width and height values and format them into a CSS rule string
    return `width:${Math.round(s1[WIDTH])}px;height:${Math.round(s1[HEIGHT])}px;`;
}

/**
 * Returns a string representing the size object in the format (width, height).
 * @param {size} s1 - The size object.
 * @returns {string} A string representing the size object in the format (width, height).
 */
export const size_to_string = s1 => {
    return `(${s1[WIDTH]},${s1[HEIGHT]})`;
}


export const size_to_xml = s1 => {
    const node = new xnode('size');
    node.append_child(new_xnode(`width`, NULL, `${s1.width}`));
    node.append_child(new_xnode(`height`, NULL, `${s1.height}`));
    return node;
};

export const xml_to_sizei = node => {
    const s = new sizei();
    s.width = numb.parse(node.child_by_name(`width`).value);
    s.height = numb.parse(node.child_by_name(`height`).value);
    return s;
};    