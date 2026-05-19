
import { range_error, type_error } from '../../error.js';
import { kind_of } from '../../functions.js';
import { numb } from '../math/number.js';
import { any_white_space } from '../text/regex.js';
import { string } from '../text/string.js';
import { xnode } from '../system/format/xml/xnode.js';

const RED = 0;
const GREEN = 1;
const BLUE = 2;
const ALPHA = 3;

const ONE_THIRD = 1 / 3;
const TWO_THIRDS = 2 / 3;

const COL_RGB = 1;      // [Red: (0-255), Green: (0-255), Blue: (0-255)]
const COL_UNIT = 2;     // [Red: (0-1), Green: (0-1), Blue: (0-1)]
const COL_RGBA = 3;     // [Red: (0-255), Green: (0-255), Blue: (0-255), Alpha: (0-255)]
const COL_HEX = 4;      // string#R:(0-FF)G(0-FF)B(0-FF)
const COL_HSV = 5;      // [Hue: (0-360), Saturation: (0-100), Value: (0-100)]
const COL_HSL = 6;      // [Hue: (0-360), Saturation: (0-100), Lightness: (0-100)]

const UINT8_2_UNIT = numb.MAX_UNIT / numb.MAX_UINT8;
const UINT8_2_UINT16 = numb.MAX_UINT16 / numb.MAX_UINT8;
const UINT16_2_UINT8 = numb.MAX_UINT8 / numb.MAX_UINT16;
const UINT16_2_UNIT = numb.MAX_UNIT / numb.MAX_UINT16;
const DEG_2_UNIT = numb.MAX_UNIT / numb.MAX_DEG;
const PERCENT_2_UINT16 = numb.MAX_UINT16 / numb.MAX_PERCENT;
const PERCENT_2_UNIT = numb.MAX_UNIT / numb.MAX_PERCENT;

/**
 * Converts a unit value to a percentage.
 * 
 * @param {number} x - The unit value.
 * @returns {number} The equivalent percentage.
 */
export const unit_2_percent = (x) => numb.clamp(x, 0, numb.MAX_UNIT) * numb.MAX_PERCENT;

/**
 * Converts a unit value to degrees.
 * 
 * @param {number} x - The unit value.
 * @returns {number} The equivalent degrees.
 */
export const unit_2_degrees = (x) => {
    let r = numb.clamp(x, 0, numb.MAX_UNIT) * numb.MAX_DEG;
    return r === 0 ? numb.MAX_DEG : r;
}

/**
 * Converts a unit value to an 8-bit unsigned integer.
 * 
 * @param {number} x - The unit value.
 * @returns {number} The equivalent 8-bit unsigned integer.
 */
export const unit_2_u8 = (x) => numb.rounded(numb.clamp(x, 0, numb.MAX_UNIT) * numb.MAX_UINT8);

/**
 * Converts a unit value to a 16-bit unsigned integer.
 * 
 * @param {number} x - The unit value.
 * @returns {number} The equivalent 16-bit unsigned integer.
 */
export const unit_2_u16 = (x) => numb.rounded(numb.clamp(x, 0, numb.MAX_UNIT) * numb.MAX_UINT16);

/**
 * Converts a percentage value to a unit.
 * 
 * @param {number} x - The percentage value.
 * @returns {number} The equivalent unit.
 */
export const percent_2_unit = (x) => numb.clamp(x, 0, numb.MAX_PERCENT) * PERCENT_2_UNIT;

/**
 * Converts a percentage value to a 16-bit unsigned integer.
 * 
 * @param {number} x - The percentage value.
 * @returns {number} The equivalent 16-bit unsigned integer.
 */
export const percent_2_u16 = (x) => numb.rounded(numb.clamp(x, 0, numb.MAX_PERCENT) * PERCENT_2_UINT16);

/**
 * Converts degrees to a unit value.
 * 
 * @param {number} x - The degrees value.
 * @returns {number} The equivalent unit.
 */
export const degrees_2_unit = (x) => numb.clamp(x, 0, numb.MAX_DEG) * DEG_2_UNIT;

/**
 * Converts an 8-bit unsigned integer to a unit value.
 * 
 * @param {number} x - The 8-bit unsigned integer value.
 * @returns {number} The equivalent unit.
 */
export const u8_2_unit = (x) => numb.clamp(x, 0, numb.MAX_UINT8) * UINT8_2_UNIT;

/**
 * Converts an 8-bit unsigned integer to a 16-bit unsigned integer.
 * 
 * @param {number} x - The 8-bit unsigned integer value.
 * @returns {number} The equivalent 16-bit unsigned integer.
 */
export const u8_2_u16 = (x) => numb.rounded(numb.clamp(x, 0, numb.MAX_UINT8) * UINT8_2_UINT16);

/**
 * Converts a 16-bit unsigned integer to a unit value.
 * 
 * @param {number} x - The 16-bit unsigned integer value.
 * @returns {number} The equivalent unit.
 */
export const u16_2_unit = (x) => numb.clamp(x, 0, numb.MAX_UINT16) * UINT16_2_UNIT;

/**
 * Converts a 16-bit unsigned integer to an 8-bit unsigned integer.
 * 
 * @param {number} x - The 16-bit unsigned integer value.
 * @returns {number} The equivalent 8-bit unsigned integer.
 */
export const u16_2_u8 = (x) => numb.rounded(numb.clamp(x, 0, numb.MAX_UINT16) * UINT16_2_UINT8);


/*******************************************************
* class color 
*******************************************************/

export class color extends Uint16Array {

    /**
     * Uint16Array [red, green, blue, alpha]
     * @param {number} type - The color type.
     * @param  {...any} arg - The color values.
     */
    constructor(type, ...arg) {
        if (kind_of(type) === `color`) {
            super(type);
        } else {
            super([0, 0, 0, numb.MAX_UINT16]);

            switch (type) {
                case COL_RGB: {
                    this.set([
                        u8_2_u16(arg[RED]), 
                        u8_2_u16(arg[GREEN]), 
                        u8_2_u16(arg[BLUE]), 
                        numb.MAX_UINT16
                    ]);
                } break;
                case COL_UNIT: {
                    this.set([
                        unit_2_u16(arg[RED]), 
                        unit_2_u16(arg[GREEN]), 
                        unit_2_u16(arg[BLUE]), 
                        arg.length > 3 ? unit_2_u16(arg[ALPHA]) : numb.MAX_UINT16
                    ]);
                } break;
                case COL_RGBA: {
                    this.set([
                        u8_2_u16(arg[RED]), 
                        u8_2_u16(arg[GREEN]), 
                        u8_2_u16(arg[BLUE]), 
                        u8_2_u16(arg[ALPHA])
                    ]);
                } break;
                case COL_HEX: this.hex = arg[0]; break;
                case COL_HSV: { 
                    this.set(hsv_2_color(arg)); 
                } break;
                case COL_HSL: { 
                    this.set(hsl_2_color(arg)); 
                } break;
            }
        }
    }

    /** @returns {string} */
    get kind() { return 'color'; }

    /** @returns {number} */
    static get RGB() { return COL_RGB; }
    /** @returns {number} */
    static get UNIT() { return COL_UNIT; }
    /** @returns {number} */
    static get RGBA() { return COL_RGBA; }
    /** @returns {number} */
    static get HEX() { return COL_HEX; }
    /** @returns {number} */
    static get HSV() { return COL_HSV; }
    /** @returns {number} */
    static get HSL() { return COL_HSL; }

    get hex() {
        return `#
            ${u16_2_u8(this[ALPHA]).toString(16).padStart(2, '0').toUpperCase()}
            ${u16_2_u8(this[RED]).toString(16).padStart(2, '0').toUpperCase()}
            ${u16_2_u8(this[GREEN]).toString(16).padStart(2, '0').toUpperCase()}
            ${u16_2_u8(this[BLUE]).toString(16).padStart(2, '0').toUpperCase()}`
            .replace(/\s+/g, '');
    }

    set hex(value) {
        value = parseInt(value.replace(/[^0-9a-f]|0x/gi, ''), 16);
        this.set([
            u8_2_u16((value >> 16) & 0xFF), 
            u8_2_u16((value >> 8) & 0xFF), 
            u8_2_u16(value & 0xFF), 
            u8_2_u16((value >> 24) & 0xFF)
        ]);
    }

    get rgb() { return new rgb(this); }
    get unit() { return new unit(this); }
    get rgba() { return new rgba(this); }
    get hsl() { return new hsl(this); }
    get hsv() { return new hsv(this); }
}

/*******************************************************
* rgb 
*******************************************************/

export class rgb {
    #p;

    /**
     * Represents an RGB color.
     * @param {color} col - The color components.
     */
    constructor(col) {
        this.#p = col;
    }

    /** @returns {string} */
    get type() { return 'rgb'; }
    get kind() { return 'rgb'; }

    /** @returns {number} */
    get red() { return u16_2_u8(this.#p[RED]); }
    set red(value) {
        if (kind_of(value) !== 'number') throw new type_error('RGB component must be a number.');
        if (!numb.between(value, 0, 0xff, true)) throw new range_error('Red component outside of uint8 range.');
        this.#p[RED] = u8_2_u16(value);
    }

    /** @returns {number} */
    get green() { return u16_2_u8(this.#p[GREEN]); }
    set green(value) {
        if (kind_of(value) !== 'number') throw new type_error('RGB component must be a number.');
        if (!numb.between(value, 0, 0xff, true)) throw new range_error('Green component outside of uint8 range.');
        this.#p[GREEN] = u8_2_u16(value);
    }

    /** @returns {number} */
    get blue() { return u16_2_u8(this.#p[BLUE]); }
    set blue(value) {
        if (kind_of(value) !== 'number') throw new type_error('RGB component must be a number.');
        if (!numb.between(value, 0, 0xff, true)) throw new range_error('Blue component outside of uint8 range.');
        this.#p[BLUE] = u8_2_u16(value);
    }

    get hex() {
        return `#
            ${u16_2_u8(this.#p[RED]).toString(16).padStart(2, '0').toUpperCase()}
            ${u16_2_u8(this.#p[GREEN]).toString(16).padStart(2, '0').toUpperCase()}
            ${u16_2_u8(this.#p[BLUE]).toString(16).padStart(2, '0').toUpperCase()}`
            .replace(/\s+/g, '');
    }

    set hex(value) {
        value = parseInt(value.replace(/[^0-9a-f]|0x/gi, ''), 16);
        this.#p.set([
            u8_2_u16((value >> 16) & 0xFF), 
            u8_2_u16((value >> 8) & 0xFF), 
            u8_2_u16(value & 0xFF)
        ]);
    }

    /** @returns {string} */
    get css() {
        return `rgb(${u16_2_u8(this.#p[RED])}, ${u16_2_u8(this.#p[GREEN])}, ${u16_2_u8(this.#p[BLUE])})`;
    }
}

/*******************************************************
* unit 
*******************************************************/

class unit {
    #p;

    /**
     * Represents a unit color.
     * @param {Uint16Array} col - The color components.
     */
    constructor(col) {
        this.#p = col;
    }

    /** @returns {string} */
    get type() { return 'unit';}
    get kind() { return 'unit';}

    /** @returns {number} */
    get red() {
        return u16_2_unit(this.#p[RED]);
    }
    
    set red(value) {
        if (kind_of(value) !== 'number') throw new type_error('UNIT component must be a number.');
        if (!numb.between(value, 0, 1, true)) throw new range_error('Red component outside of range.');
        this.#p[RED] = unit_2_u16(value);
    }

    /** @returns {number} */
    get green() {
        return u16_2_unit(this.#p[GREEN]);
    }
    
    set green(value) {
        if (kind_of(value) !== 'number') throw new type_error('UNIT component must be a number.');
        if (!numb.between(value, 0, 1, true)) throw new range_error('Green component outside of range.');
        this.#p[GREEN] = unit_2_u16(value);
    }

    /** @returns {number} */
    get blue() {
        return u16_2_unit(this.#p[BLUE]);
    }
    
    set blue(value) {
        if (kind_of(value) !== 'number') throw new type_error('UNIT component must be a number.');
        if (!numb.between(value, 0, 1, true)) throw new range_error('Blue component outside of range.');
        this.#p[BLUE] = unit_2_u16(value);
    }

    /** @returns {number} */
    get alpha() {
        return u16_2_unit(this.#p[ALPHA]);
    }
    
    set alpha(value) {
        if (kind_of(value) !== 'number') throw new type_error('UNIT component must be a number.');
        if (!numb.between(value, 0, 1, true)) throw new range_error('ALPHA component outside of range.');
        this.#p[ALPHA] = unit_2_u16(value);
    }
}

/*******************************************************
* rgba 
*******************************************************/
class rgba extends rgb {
    #p;
    constructor(col) { super(col); this.#p = col; };

    get type() { return `rgba`; };

    get alpha() { return u16_2_u8(this.#p[ALPHA]); };
    set alpha(x) {
        if (kind_of(x) !== `number`) throw new type_error(`RGBA component must be number.`);
        if (!numb.between(x, 0, 0xff, true)) throw new range_error(`Alpha component outside of uint8 range: ${x}.`);
        this.#p[ALPHA] = u8_2_u16(x);
    };

    get hex() {
        return `#
            ${u16_2_u8(this.#p[RED]).toString(16).padStart(2, '0').toUpperCase()}
            ${u16_2_u8(this.#p[GREEN]).toString(16).padStart(2, '0').toUpperCase()}
            ${u16_2_u8(this.#p[BLUE]).toString(16).padStart(2, '0').toUpperCase()}
            ${u16_2_u8(this.#p[ALPHA]).toString(16).padStart(2, '0').toUpperCase()}`
            .replace(/\s+/g, '');
    }

    set hex(value) {
        value = parseInt(value.replace(/[^0-9a-f]|0x/gi, ''), 16);
        this.#p.set([
            u8_2_u16((value >> 24) & 0xFF),
            u8_2_u16((value >> 16) & 0xFF), 
            u8_2_u16((value >> 8) & 0xFF), 
            u8_2_u16(value & 0xFF)
        ]);
    }

    get css() { return `rgba(${u16_2_u8(this.#p[RED])}, ${u16_2_u8(this.#p[GREEN])}, ${u16_2_u8(this.#p[BLUE])}, ${u16_2_unit(this.#p[ALPHA]).toFixed(4)})`; };
};

/*******************************************************
* hsl 
*******************************************************/

/**
 * Converts a color from RGB to HSL.
 * @param {Uint16Array} col - The color components in Uint16 format.
 * @returns {Array<number>} The HSL components as [hue, saturation, lightness].
 */
const color_2_hsl = col => {
    const red = u16_2_unit(col[RED]);
    const green = u16_2_unit(col[GREEN]);
    const blue = u16_2_unit(col[BLUE]);
    
    const min = Math.min(red, green, blue);
    const max = Math.max(red, green, blue);
    let hue = 0, sat = 0, lum = (max + min) / 2;
    const del = max - min;

    if (!numb.fuzzy_null(del)) {
        sat = (lum > 0.5) ? del / (2 - max - min) : del / (max + min);
        switch (max) {
            case red: 
                hue = (green - blue) / del + ((green < blue) ? 6 : 0);
                break;
            case green: 
                hue = (blue - red) / del + 2;
                break;
            case blue: 
                hue = (red - green) / del + 4;
                break;
        }
        hue /= 6;
    }

    return [
        unit_2_degrees(hue),
        unit_2_percent(sat),
        unit_2_percent(lum)
    ];
};

/**
 * Converts HSL color components to RGB.
 * @param {Array<number>} hsl - The HSL components as [hue, saturation, lightness].
 * @returns {Array<number>} The RGB components as [red, green, blue] in Uint16 format.
 */
const hsl_2_color = hsl => {
    const hue = degrees_2_unit(hsl[0]);
    const sat = percent_2_unit(hsl[1]);
    const lum = percent_2_unit(hsl[2]);
    
    const v2 = (lum < 0.5) ? lum * (1 + sat) : (lum + sat) - (sat * lum);
    const v1 = 2 * lum - v2;

    const hue_2_rgb = (v1, v2, vh) => {
        if (vh < 0) vh += 1;
        if (vh > 1) vh -= 1;
        if ((6 * vh) < 1) return v1 + (v2 - v1) * 6 * vh;
        if ((2 * vh) < 1) return v2;
        if ((3 * vh) < 2) return v1 + (v2 - v1) * (TWO_THIRDS - vh) * 6;
        return v1;
    };

    return [
        unit_2_u16(hue_2_rgb(v1, v2, hue + ONE_THIRD)),
        unit_2_u16(hue_2_rgb(v1, v2, hue)),
        unit_2_u16(hue_2_rgb(v1, v2, hue - ONE_THIRD))
    ];
};

/**
 * Represents an HSL color.
 */
class hsl {
    #p;
    #buff;

    /**
     * Constructs an HSL instance from a color.
     * @param {Uint16Array} col - The color components.
     */
    constructor(col) {
        this.#p = col;
        this.#buff = color_2_hsl(this.#p);
    }

    /** @returns {string} */
    get type() { return 'hsl'; }
    get kind() { return 'hsl'; }

    /** @returns {number} */
    get hue() { return Math.round(this.#buff[0]); }
    
    set hue(value) {
        if (kind_of(value) !== 'number') throw new TypeError('HSL component must be a number.');
        if (!numb.between(value, 0, 360, true)) throw new RangeError('Hue component outside of range.');
        this.#buff[0] = value;
        color_set(this.#p, color.HSL, ...this.#buff);
    }

    /** @returns {number} */
    get saturation() { return Math.round(this.#buff[1]); }
    
    set saturation(value) {
        if (kind_of(value) !== 'number') throw new TypeError('HSL component must be a number.');
        if (!numb.between(value, 0, 100, true)) throw new RangeError('Saturation component outside of range.');
        this.#buff[1] = value;
        color_set(this.#p, color.HSL, ...this.#buff);
    }

    /** @returns {number} */
    get light() { return Math.round(this.#buff[2]); }
    
    set light(value) {
        if (kind_of(value) !== 'number') throw new TypeError('HSL component must be a number.');
        if (!numb.between(value, 0, 100, true)) throw new RangeError('Lightness component outside of range.');
        this.#buff[2] = value;
        color_set(this.#p, color.HSL, ...this.#buff);
    }

    /** @returns {number} */
    get alpha() { return numb.round_2_dec(u16_2_unit(this.#p[ALPHA]), 2); }
    
    set alpha(value) {
        if (kind_of(value) !== 'number') throw new TypeError('HSL component must be a number.');
        if (!numb.between(value, 0, 1, true)) throw new RangeError('Alpha component outside of range.');
        this.#p[ALPHA] = unit_2_u16(value);
    }

    /** @returns {string} */
    get css() { return `hsla(${this.hue}, ${this.saturation}%, ${this.light}%, ${this.alpha})`; }
}

/*******************************************************
* hsv 
*******************************************************/

const color_2_hsv = col => {
    let red = u16_2_unit(col[RED]), green = u16_2_unit(col[GREEN]), blue = u16_2_unit(col[BLUE]);
    let min = Math.min(red, green, blue), max = Math.max(red, green, blue);
    let del = (max - min), hue = 0, sat = 0, val = max;

    if (!numb.fuzzy_null(del)) {
        sat = del / max;

        let del_r = (((max - red) / 6) + (del / 2)) / del,
            del_g = (((max - green) / 6) + (del / 2)) / del,
            del_b = (((max - blue) / 6) + (del / 2)) / del;

        switch (max) {
            case red: hue = del_b - del_g; break;
            case green: hue = ONE_THIRD + del_r - del_b; break;
            case blue: hue = TWO_THIRDS+ del_g - del_r; break;
        }

        if (hue < 0) hue += 1;
        if (hue > 1) hue -= 1;
    }

    return [
        unit_2_degrees(hue),
        unit_2_percent(sat),
        unit_2_percent(val)
    ];
};

const hsv_2_color = hsv => {
    let hue = degrees_2_unit(hsv[0]), sat = percent_2_unit(hsv[1]), val = percent_2_unit(hsv[2]);

    let h = hue * 6;
    if (h == 6) h = 0;      //H must be < 1
    let i = Math.floor(h),
        v1 = val * (1 - sat),
        v2 = val * (1 - sat * (h - i)),
        v3 = val * (1 - sat * (1 - (h - i))),
        red = 0, green = 0, blue = 0;

    switch (i) {
        case 0: red = val; green = v3; blue = v1; break;
        case 1: red = v2; green = val; blue = v1; break;
        case 2: red = v1; green = val; blue = v3; break;
        case 3: red = v1; green = v2; blue = val; break;
        case 4: red = v3; green = v1; blue = val; break;
        default: red = val; green = v1; blue = v2; break;
    }

    return [
        unit_2_u16(red),
        unit_2_u16(green),
        unit_2_u16(blue)
    ];
};

class hsv {
    #p;
    #buff;
    constructor(col) {
        this.#p = col;
        this.#buff = color_2_hsv(this.#p);
    };

    get type() { return `hsv`; };

    get hue() { return Math.round(this.#buff[0]); };
    set hue(x) {
        if (kind_of(x) !== `number`) throw new type_error(`HSV component must be number.`);
        if (!numb.between(x, 0, 360, true)) throw new range_error(`HUE component outside of range.`);
        this.#buff[0] = x;
        color_set(this.#p, color.HSV, ...this.#buff);
    };

    get saturation() { return Math.round(this.#buff[1]); };
    set saturation(x) {
        if (kind_of(x) !== `number`) throw new type_error(`HSV component must be number.`);
        if (!numb.between(x, 0, 100, true)) throw new range_error(`Saturation component outside of range.`);
        this.#buff[1] = x;
        color_set(this.#p, color.HSV, ...this.#buff);
    };

    get value() { return Math.round(this.#buff[2]); };
    set value(x) {
        if (kind_of(x) !== `number`) throw new type_error(`HSV component must be number.`);
        if (!numb.between(x, 0, 100, true)) throw new range_error(`Light component outside of range.`);
        this.#buff[2] = x;
        color_set(this.#p, color.HSV, ...this.#buff);
    };

    get alpha() { return numb.round_2_dec(u16_2_unit(this.#p[ALPHA]), 2); };
    set alpha(x) {
        if (kind_of(x) !== `number`) throw new type_error(`HSV component must be number.`);
        if (!numb.between(x, 0, 1, true)) throw new range_error(`ALPHA component outside of range.`);
        this.#p[ALPHA] = unit_2_u16(x);
    };
};

/*******************************************************
* hex 
*******************************************************/

/*******************************************************
* function 
*******************************************************/

/**
 * Sets the color of the provided color object based on the given type and arguments.
 *
 * @param {color} c - The color object to be set.
 * @param {number} type - The type of color representation to be used.
 * @param  {...any} arg - The arguments required for the specified color type.
 * @returns {color} - The modified color object.
 */
export const color_set = (c, type, ...arg) => {
    //console.log(type);
    if (kind_of(c) !== `color`) throw new type_error(`Parameter c must be a color ${c}`);
    switch (type) {
        case color.RGB:
            c.set([
                u8_2_u16(arg[RED]), 
                u8_2_u16(arg[GREEN]), 
                u8_2_u16(arg[BLUE]), 
                numb.MAX_UINT16
            ]);
            break;
        case color.UNIT:
            c.set([
                unit_2_u16(arg[RED]), 
                unit_2_u16(arg[GREEN]), 
                unit_2_u16(arg[BLUE]), 
                arg.length > 3 ? unit_2_u16(arg[ALPHA]) : numb.MAX_UINT16
            ]);
            break;
        case color.RGBA:
            c.set([
                u8_2_u16(arg[RED]), 
                u8_2_u16(arg[GREEN]), 
                u8_2_u16(arg[BLUE]), 
                u8_2_u16(arg[ALPHA])
            ]);
            break;
        case color.HEX:
            c.hex = arg[0];
            break;
        case color.HSV:
            c.set(hsv_2_color(arg));
            break;
        case color.HSL:
            c.set(hsl_2_color(arg));
            break;
        default:
            throw new RangeError('Unsupported color type.');
    }
    return c;
};

/**
 * Compares two color objects for equality.
 *
 * @param {color} c0 - The first color object to compare.
 * @param {color} c1 - The second color object to compare.
 * @returns {Boolean} - True if the color objects are equal, false otherwise.
 */
export const color_equals = (c0, c1) => {
    return c0.every((e, i) => e === c1[i]);
};

/**
 * Copies the color values from the 'from' color object to the 'to' color object.
 *
 * @param {color} to - The color object to receive the copied color values.
 * @param {color} from - The color object from which the color values will be copied.
 *
 * @returns {void} - The function does not return any value.
 */
export const color_copy = (to, from) => {
    to.set(from);
};

/**
 * Darken a color by a fixed amount
 * @param {color} col - Color to darken
 * @returns {color} Darkened color
 */
export const darken_color = (col) => {
    const hsl = col.hsl;
    const light = Math.max(0, hsl.light - 10);
    return new color(color.HSL, hsl.hue, hsl.saturation, light);
};

/**
 * Convert color to grayscale
 * @param {color} col - Color to convert
 * @returns {color} Grayscale color
 */
export const color_to_grayscale = (col) => {
    const rgb = col.rgb;
    const gray_value = Math.round(0.299 * rgb.red + 0.587 * rgb.green + 0.114 * rgb.blue);
    return new color(color.RGB, gray_value, gray_value, gray_value);
};

/**
 * Converts a color object to an XML node representation.
 *
 * @param {color} c - The color object to convert.
 * @returns {xnode} - A new xnode representing the color data.
 */
export const color_to_xml = c => {
    const node = new xnode('color');
    const u = c.unit;
    
    node.value = [
        numb.parse(numb.f32s(u.red)),
        numb.parse(numb.f32s(u.green)),
        numb.parse(numb.f32s(u.blue)),
        numb.parse(numb.f32s(u.alpha))
    ].join(' ');

    return node;
};

/**
 * Converts an XML node to a color object.
 *
 * @param {xnode} x - The XML node to convert.
 * @returns {color} - A new color object representing the color data from the XML node.
 * @throws {type_error} - If the provided argument is not an xnode object.
 */
export const xml_to_color = x => {
    if (kind_of(x) !== 'xnode') throw new type_error('Function call on non-xnode object.');
    
    const arr = x.value.split(any_white_space).filter(m => !string.empty(m));
    
    return new color(color.UNIT, 
        numb.parse(arr[0]), 
        numb.parse(arr[1]), 
        numb.parse(arr[2]), 
        numb.parse(arr[3])
    );
};

