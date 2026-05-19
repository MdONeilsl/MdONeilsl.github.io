import { type_error } from "../../error.js";
import { kind_of, type_of } from "../../functions.js";
import { infinity_regexp } from "../text/regex.js";
import { string } from "../text/string.js";

var hexfre = RegExp(`
    (?<sign>[+-])?
    (?:
      (?<inf>Infinity) | (?<nan>NaN) |  # for round-trip with print_float
      (?<type>0[xX])
      (?= [0-9a-fA-F] | \\.[0-9a-fA-F] )  # force at least 1 digit
      (?<int>[0-9a-fA-F]*)
      (?:\\.(?<frac>[0-9a-fA-F]*))?
      (?:[pP]
        (?<esign>[+-])?
        (?<exp>[0-9]+)
      )? # required by the spec, but optional here
    )
  `.replace(/[#].*$|\s/gm, ''));

const b64Alph = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=`;
// binary to string lookup table
const b2s = b64Alph.split('');

// string to binary lookup table
// 123 == 'z'.charCodeAt(0) + 1
const s2b = new Array(123);
for (let i = 0; i < b64Alph.length; i++) {
    s2b[b64Alph.charCodeAt(i)] = i;
}


export class numb {

    static get FLOAT_THRESHOLD() { return 0.000001; }
    static get TWO_PI() { return 6.283185307179586476925286766559; }

    static get DEG_2_RAD() { return 0.0174532925199432957692369076848; }
    static get RAD_2_DEG() { return 57.295779513082320876798154814105; }

    static get MAX_UNIT() { return 1; };
    static get MAX_UINT8() { return 0xFF; };
    static get MAX_UINT16() { return 0xFFFF; };
    static get MAX_DEG() { return 360; };
    static get MAX_PERCENT() { return 100; };

    static get MIN_INT32() { return -4294967295; };
    static get MAX_INT32() { return 4294967295; };

    static get MAX_UINT32() { return 4294967295; };

    static get MAX_FLOAT32() { return 3.40282347E+38; };
    static get MIN_FLOAT32() { return -3.40282347E+38; };

    /**
     * Generates a random number between the specified minimum and maximum values.
     * @param {number} min - The minimum value (inclusive).
     * @param {number} max - The maximum value (exclusive).
     * @returns {number} A random number within the specified range.
     */
    static rand(min, max) {
        if (numb.fast_nan(min) || numb.fast_nan(max)) throw new type_error(`min and max must be number`);
        // Swap min and max if min is greater than max
        if (min > max) [min, max] = [max, min];
        // Calculate a random number within the range [min, max)
        return Math.random() * (max - min) + min;
    };

    /**
     * Generates a random single-precision floating-point number between the specified minimum and maximum values.
     * @param {number} min - The minimum value (inclusive).
     * @param {number} max - The maximum value (exclusive).
     * @returns {number} A random single-precision floating-point number within the specified range.
     */
    static frand(min, max) {
        // Generate a random number within the range [min, max) and convert it to single-precision floating-point
        return Math.fround(numb.rand(min, max));
    };

    /**
     * Generates a random integer between the specified minimum and maximum values (inclusive).
     * @param {number} min - The minimum value.
     * @param {number} max - The maximum value.
     * @returns {number} A random integer within the specified range.
     */
    static irand(min, max) {
        return Math.floor(numb.rand(min, max + 1));
    };

    /**
     * Checks if a given value is close to zero within a small threshold.
     * @param {number} val - The value to check.
     * @returns {boolean} True if the value is close to zero within the threshold, false otherwise.
     */
    static fuzzy_null(val) {
        // Compare the absolute value of the input value to the predefined float threshold
        return Math.abs(val) <= numb.FLOAT_THRESHOLD;
    };

    /**
     * Performs a fuzzy comparison between two floating-point numbers.
     * @param {number} a - The first floating-point number.
     * @param {number} b - The second floating-point number.
     * @returns {boolean} True if the absolute difference between `a` and `b` is within 0.00001% of the smaller of the two values, false otherwise.
     */
    static fuzzy_comparef(a, b) {
        if (numb.fast_nan(a) || numb.fast_nan(b)) return false;
        return Math.abs(a - b) * 1e6 <= 1;
    };

    /**
     * Compares two numbers to determine if they are fuzzy equal.
     * 
     * Two numbers are considered fuzzy equal if the absolute difference 
     * between them multiplied by 1e12 is less than or equal to the minimum 
     * of the absolute values of the two numbers.
     * 
     * @param {number} a - The first number to compare.
     * @param {number} b - The second number to compare.
     * @returns {boolean} - True if the numbers are fuzzy equal, false otherwise.
     */
    static fuzzy_compared(a, b) {
        if (numb.fast_nan(a) || numb.fast_nan(b)) return false;
        return Math.abs(a - b) * 1e12 <= 1;
    };

    /**
     * Checks if a value is NaN (Not-a-Number) in a fast and optimized way.
     * 
     * The function leverages the fact that NaN is the only value in JavaScript 
     * that is not equal to itself. It also ensures the value is not a hexadecimal string.
     * 
     * @param {any} v - The value to check.
     * @returns {boolean} - True if the value is NaN, false otherwise.
     */
    static fast_nan(v) {
        if (v === null || v === undefined || v === "" || Array.isArray(v)) return true;
        // Check if the value is not less than or equal to 0 and not greater than 0,
        // which means it's not a number. Also, ensure it's not a hexadecimal string.
        return !(v <= 0) && !(v > 0) && !string.is_hex(`${v}`);
    };

    /**
     * Checks if a value is infinity (positive or negative).
     * 
     * @param {any} v - The value to check.
     * @returns {boolean} - True if the value is infinity, false otherwise.
     */
    static is_inf(v) {
        // Check if the value is positive or negative infinity
        return v === Infinity || v === -Infinity;
    };

    /**
     * Checks if a value is finite (not NaN or infinity).
     * 
     * @param {any} v - The value to check.
     * @returns {boolean} - True if the value is finite, false otherwise.
     */
    static is_finite(v) {
        // Ensure the value is not NaN and not infinity
        return !numb.fast_nan(v) && !string.is_inf(`${v}`);
    };

    /**
     * Compares two values for equality.
     * 
     * If either value is not finite, it compares their absolute values.
     * 
     * @param {any} left - The left value to compare.
     * @param {any} right - The right value to compare.
     * @returns {boolean} - True if the values are equal, false otherwise.
     */
    static equals(left, right) {
        if (!numb.is_finite(left) || !numb.is_finite(right)) {
            if (numb.fast_nan(left)) return numb.fast_nan(right);
            return Math.abs(left) === Math.abs(right);
        }
        return left === right;
    };

    /**
     * Rounds a number to a specified number of decimal places.
     * 
     * @param {number} val - The value to round.
     * @param {number} dec - The number of decimal places to round to.
     * @returns {number} - The rounded number.
     */
    static round_2_dec(val, dec) {
        // Calculate the multiplier factor
        const fac = 10 ** dec;
        // Round the absolute value of the number to the specified decimal places
        const num = Math.round(Math.abs(val) * fac) / fac;
        // Multiply by the sign of the original value to preserve sign
        return Math.sign(val) * num;
    };

    /**
     * Converts radians to degrees.
     * 
     * @param {number} x - The value in radians to convert to degrees.
     * @returns {number} - The value in degrees.
     */
    static to_deg = (x) => {
        // Multiply the value by the constant RAD_2_DEG to convert radians to degrees
        return x * numb.RAD_2_DEG;
    };

    /**
     * Converts degrees to radians.
     * 
     * @param {number} x - The value in degrees to convert to radians.
     * @returns {number} - The value in radians.
     */
    static to_rad(x) {
        // Multiply the value by the constant DEG_2_RAD to convert degrees to radians
        return x * numb.DEG_2_RAD;
    };

    /**
     * Converts an unsigned 8-bit integer to its hexadecimal representation.
     * 
     * @param {number} x - The unsigned 8-bit integer to convert.
     * @returns {string} - The hexadecimal representation of the integer.
     */
    static u8_to_hex(x) {
        // Convert the integer to hexadecimal string, pad with '0' if necessary, and convert to uppercase
        return x.toString(16).padStart(2, '0').toUpperCase();
    };

    /**
     * Checks if a number is within a specified range.
     * 
     * @param {number} numb - The number to check.
     * @param {number} min - The minimum value of the range.
     * @param {number} max - The maximum value of the range.
     * @param {boolean} [include=true] - Whether to include the minimum and maximum values in the range.
     * @returns {boolean} - True if the number is within the range, false otherwise.
     */
    static between(numb, min, max, include = true) {
        // Check if the number is within the specified range
        if (include) {
            return numb >= min && numb <= max;
        } else {
            return numb > min && numb < max;
        }
    };

    /**
     * Clamps a number within a specified range.
     * 
     * @param {number} numb - The number to clamp.
     * @param {number} min - The minimum value of the range.
     * @param {number} max - The maximum value of the range.
     * @returns {number} - The clamped number.
     */
    static clamp(numb, min, max) {
        // Clamp the number within the specified range
        return Math.min(max, Math.max(numb, min));
    };

    /**
     * Copies the sign of one number onto another.
     * 
     * @param {number} x - The number whose sign is to be copied.
     * @param {number} y - The number whose sign should be copied onto.
     * @returns {number} - The number with the sign of the other number.
     */
    static copysign(x, y) {
        if (numb.fast_nan(x) || numb.fast_nan(y)) return NaN
        // Check if the signs of x and y are different
        if ((x < 0 && y >= 0) || (x >= 0 && y < 0)) {
            // Return -x with the sign of y
            return -x;
        } else {
            // Return x with its original sign
            return x;
        }
    };

    /**
     * Specifies rounding behaviors.
     */
    static get rounding_mode() {
        return {
            away_from_zero: 0,
            to_even: 1,
            to_negative_infinity: 2,
            to_positive_infinity: 3,
            to_zero: 4
        };
    }

    /**
     * Rounds a number using specified behavior.
     * 
     * @param {number} num - The number to round.
     * @param {number} mode - The rounding mode to use.
     * @returns {number} - The rounded number.
     */
    static rounded(num, mode = numb.rounding_mode.away_from_zero) {
        const t = Math.trunc(num);
        const d = num - t;
        const s = numb.copysign(1, num);
        switch (mode) {
            case numb.rounding_mode.away_from_zero:
                if ((num < 0 && d <= -0.5) || (num > 0 && d >= 0.5)) num = t + s;
                else num = t;
                break;

            case numb.rounding_mode.to_even:
                const e = ((t % 2) == 0);
                if (e) {
                    if ((num < 0 && d < -0.5) || (num > 0 && d > 0.5)) num = t + s;
                    else num = t;
                } else {
                    if ((num < 0 && d <= -0.5) || (num > 0 && d >= 0.5)) num = t + s;
                    else num = t;
                }
                break;

            case numb.rounding_mode.to_negative_infinity:
                if (t < 0) num = t + s;
                else num = t;
                break;

            case numb.rounding_mode.to_positive_infinity:
                if (t > 0) num = t + s;
                else num = t;
                break;

            case numb.rounding_mode.to_zero:
                if (Math.abs(d) > 0.5) num = t + s;
                else num = t;
                break;

            default:
                num = Math.round(num);
        }
        if (num === -0) num = 0;
        return num;
    };

    /**
     * Parses a string argument and returns an integer of the specified radix.
     * 
     * @param {string} str - The string to parse.
     * @param {number} base - The radix (an integer between 2 and 36).
     * @returns {number} - The integer parsed from the string. Returns 0 if parsing fails.
     */
    static parse_int(str, base = 10) {
        if (numb.fast_nan(base) || base < 2 || base > 36) return 0;
        const parsed = parseInt(str, base);
        if (numb.fast_nan(parsed)) return 0;
        return parsed;
    };

    /**
     * Parses a hexadecimal floating-point string and returns the floating-point number it represents.
     * 
     * @param {string} str - The hexadecimal floating-point string to parse.
     * @returns {number} - The floating-point number parsed from the string.
     */
    static parse_hexfl(str) {
        // Regular expression to extract components of the hexadecimal floating-point string
        const groups = hexfre.exec(str)?.groups;

        if (!groups) return NaN; // Return NaN if string doesn't match the expected format

        const sign = groups.sign === '-' ? -1 : 1;
        if (groups.nan === 'NaN') return NaN; // Return NaN if string represents NaN
        if (groups.inf === 'Infinity') return Infinity * sign; // Return Infinity if string represents Infinity

        // Parse components and calculate the floating-point number
        const int = groups.int ? parseInt(groups.int, 16) : 0;
        const frac = groups.frac ? parseInt(groups.frac, 16) * (16 ** -groups.frac.length) : 0;
        const exp = groups.exp ? parseInt(groups.exp, 10) * (groups.esign === '-' ? -1 : 1) : 0;

        return sign * (int + frac) * (2 ** exp);
    };
    /* 
    static parseHexFloat(str) {
        const grp = hexfre.exec(str).groups;
        const sign = (grp.sign === '-') ? -1 : 1;
        if (grp.nan === 'NaN') return NaN;
        if (grp.inf === 'Infinity') return Infinity * sign;
        const int = grp.int ? parseInt(grp.int, 16) : 0;
        const frac = grp.frac ? parseInt(grp.frac, 16) * 16 ** (-grp.frac.length) : 0;
        const exp = grp.exp ? parseInt(grp.exp, 10) * (grp.esign === '-' ? -1 : 1) : 0;
        return sign * (int + frac) * 2 ** exp;
    };
*/
    /**
     * Parses a string to a numeric value.
     * 
     * @param {string | number} str - The string to parse.
     * @returns {number} - The parsed numeric value.
     */
    static parse(str) {
        if (type_of(str) === 'number') return str;

        if (string.is_inf(str)) {
            if (str.startsWith('-')) return Number.NEGATIVE_INFINITY;
            return Number.POSITIVE_INFINITY;
        }

        if (numb.fast_nan(str)) return NaN;

        if (string.is_hex(str)) {
            if (string.is_float(str))
                return numb.parse_hexfl(str);
            return numb.parse_int(str, 16);
        }

        if (string.is_float(str)) return parseFloat(str);
        return numb.parse_int(str, 10);
    };

    /**
     * Returns the sign of a numeric value.
     * 
     * @param {number} n - The numeric value to check.
     * @returns {number} - 1 if the value is positive, -1 if the value is negative, or 0 if the value is zero or NaN.
     */
    static sign(n) {
        if (n === Infinity) return 1; // Return 1 if the value is positive infinity
        if (n === -Infinity) return -1; // Return -1 if the value is negative infinity
        if (numb.fast_nan(n)) return 0; // Return 0 if the value is NaN
        return (n >= 0) ? 1 : -1; // Return 1 for positive values, -1 for negative values, and 0 for zero or NaN
    };

    /**
     * Parses a string to a number, handling special cases for infinity and numeric substrings.
     * 
     * @param {string} str - The string to parse.
     * @returns {number} - The parsed number, or NaN if parsing fails.
     */
    static from_str(str) {
        // Check for infinity representations
        if (/^[+-]?inf/i.test(str)) {
            return infinity_regexp.test(str) ? (str[0] === `-` ? -Infinity : Infinity) : NaN;
        }

        // Attempt to parse numeric substrings
        let last = str.length;
        while (last > 0) {
            const sub = str.substring(0, last).trimStart();
            if (string.is_numb(sub)) return numb.parse(sub);
            last--;
        }

        return NaN; // Return NaN if no valid number is found
    };

    /**
     * @param {Number} val 
     * @returns {Number}
     */
    /**
     * Converts a value to a 32-bit floating-point number.
     * 
     * @param {any} val - The value to convert.
     * @returns {number} - The converted 32-bit floating-point number.
     */
    static float32(val) {
        if (type_of(val) === `string`) val = numb.parse(val);

        // Handle non-finite values
        if (!numb.is_finite(val)) {
            return numb.fast_nan(val) ? NaN : numb.copysign(Infinity, val);
        }

        // Handle overflow cases
        if (val > 3.40282346639e38 || val < -3.40282346639e38) {
            return numb.copysign(Infinity, val);
        }

        // Convert to 32-bit float and return
        return Math.fround(val);
    };

    /**
     * Converts a value to a 32-bit integer.
     * 
     * @param {any} val - The value to convert.
     * @returns {number} - The converted 32-bit integer.
     */
    static int32(val) {
        // Parse the value if it's a string
        if (type_of(val) === `string`) val = parseInt(val);

        // Handle non-finite values
        if (!numb.is_finite(val)) {
            return numb.fast_nan(val) ? NaN : numb.copysign(Infinity, val);
        }

        // Check if the value is within the 32-bit integer range
        if (numb.between(val, -2147483648, 2147483647, true)) return val;

        // Adjust value to fit within 32-bit integer range
        val &= 0xFFFFFFFF;
        if (val > 2147483647) val -= 4294967296;

        return Math.trunc(val);
    };

    /**
     * Converts a number to a base-64 encoded string.
     * 
     * @param {number} number - The number to convert.
     * @returns {string} - The base-64 encoded string.
     */
    static ntob(number) {
        if (number < 0) return `-${numb.ntob(-number)}`; // Handle negative numbers

        let lo = number >>> 0;
        let hi = (number / 4294967296) >>> 0;

        // Convert the high part of the number to a base-64 string
        let right = '';
        while (hi > 0) {
            right = `${b2s[0x3f & lo]}${right}`;
            lo >>>= 6;
            lo |= (0x3f & hi) << 26;
            hi >>>= 6;
        }

        // Convert the low part of the number to a base-64 string
        let left = '';
        do {
            left = `${b2s[0x3f & lo]}${left}`;
            lo >>>= 6;
        } while (lo > 0);

        return left + right;
    };

    /**
     * Converts a 1D index to a 3D index.
     * 
     * @param {number} idx - The 1D index to convert.
     * @param {number} max - The maximum value for each dimension.
     * @returns {number[]} - An array representing the 3D index [x, y, z].
     */
    static index_2_3d(idx = 0, max = 52) {
        const x = idx % max;
        const y = Math.floor(idx / max) % max;
        const z = Math.floor(idx / (max * max));
        return [x, y, z];
    };

    /**
     * Maps a value from one range to another.
     * 
     * @param {number} val - The value to map.
     * @param {number} old_min - The minimum value of the original range.
     * @param {number} old_max - The maximum value of the original range.
     * @param {number} new_min - The minimum value of the new range.
     * @param {number} new_max - The maximum value of the new range.
     * @returns {number} - The mapped value in the new range.
     */
    static map(val, old_min, old_max, new_min, new_max) {
        const or = old_max - old_min;
        return !numb.fuzzy_null(or) ? ((val - old_min) * (new_max - new_min)) / or + new_min : new_min;
    };

    /**
     * Scales a value from its original maximum range to a new maximum range.
     * 
     * @param {number} val - The value to scale.
     * @param {number} old_max - The original maximum value of the range.
     * @param {number} new_max - The new maximum value of the range.
     * @returns {number} - The scaled value.
     */
    static scale(val, old_max, new_max) { return val * (new_max / old_max); };

    static iscale(val, old_max, new_max) { return Math.round(val / old_max) * new_max; };

    /**
     * Converts a number or string to its hexadecimal representation.
     * 
     * @param {number|string} x - The input value to convert to hexadecimal.
     * @returns {string} - The hexadecimal representation of the input value.
     */
    static hexi(x) {
        let val = numb.u8_to_hex(numb.parse(x) >>> 0);
        return val.length % 2 ? `0${val}` : val;
    };

    /**
     * Calculates the percentage of a number and optionally rounds the result.
     * 
     * @param {number} num - The base number.
     * @param {number} perc - The percentage to calculate.
     * @param {boolean} [rond=false] - Whether to round the result.
     * @returns {number} - The calculated percentage, optionally rounded.
     */
    static percent(num, perc, rond = false) {
        const result = (num * 0.01) * perc;
        return rond ? Math.round(result) : result;
    };

    /**
     * Formats a floating-point number into a string with the specified length.
     * 
     * @param {number} num - The number to format.
     * @param {number} [len=16] - The desired length of the formatted string.
     * @returns {string} - The formatted string.
     * @throws {TypeError} - If `num` is not a number.
     */
    static format_float(num, len = 8) {
        if (type_of(num) !== 'number') throw new type_error('num is not a number.');

        if (num == 0) return `0.`;
        if (!numb.is_finite(num)) return `${num}`;

        let lit = num.toFixed(len).replace(/0+$/, '');
        lit = lit.replace(/(?<!\.)0+$/, '');
        lit = `${lit}${/\./.test(lit) ? '' : '.'}`;

        let exp = num.toExponential(len);
        exp = exp.replace(/((?<=e)\+|(?<!\.)0+(?=e)|e0+)/g, '');
        exp = `${exp}${/[\.e]/.test(exp) ? '' : '.'}`;

        //console.log(lit, exp);
        return (lit.length > exp.length || numb.fuzzy_null(num)) ? exp : lit;
    };

    /**
     * Converts a floating-point number to a formatted string with specified decimal places.
     * 
     * @param {number} val - The floating-point number to convert.
     * @param {number} dp - The number of decimal places (default is 6).
     * @returns {string} - The formatted string representation of the number.
     */

    static f32s(val, dp = 6) {
        if (val == 0) return `0.${`0`.repeat(dp)}`;

        val = Math.fround(val).toExponential();
        //console.log(val);

        if (!numb.is_finite(val)) {
            if (numb.fast_nan(val)) return `NaN`;
            return `${(val < 0) ? "-" : ""}Infinity`;
        }

        if (val > 3.4028237e38 || val < -3.4028237e38)
            return `${(val < 0) ? "-" : ""}Infinity`;

        let cut = val.split(`e`);
        // 0.0000014999994 is rounded as 0.000001
        // 0.0000014999995 is rounded as 0.000002

        const sgn = (cut[0] < 0) ? `-` : ``;
        let e = parseInt(cut[1]);
        let m = `${numb.round_2_dec(Math.abs(cut[0]), 6)}`;
        if (m > 0 && parseInt(m) >= 10) {
            while (m > 0 && m.indexOf(`.`) != 1) { m = `${m / 10}`; e++; };
        }

        m = `0${m[0]}${m.substring(2, m.length).replace(`.`, ``).padEnd(6, `0`)}`;

        let i = (m[0] == `0`) ? 1 : 0;
        if (e < -(dp + 1) || (e == -(dp + 1) && +m[i] < 5)) {
            return `0.${`0`.repeat(dp)}`;
        }

        i = dp + e + 2;
        if (numb.between(i, 0, 7, true) && +m[i] >= 5) {
            i -= 1;
            while (m[i] == 9) {
                m = string.replace_at(m, i, `0`);
                i -= 1;
            }
            m = string.replace_at(m, i, `${Number(m[i]) + 1}`);
        }

        if (m.startsWith(`0`))
            m = m.replace(/^0/, ``);
        else {
            m = m.substring(0, 7);
            e++;
        }

        if (e >= 6) m = `${m}${`0`.repeat(e - 6)}.${`0`.repeat(dp)}`;
        else if (e < 0) m = `0.${`0`.repeat((-1 - e))}${m}`;
        else {
            const trail = e - m.length + dp + 1;
            m = `${m.substring(0, e + 1)}.${m.substring(e + 1, m.length)}${`0`.repeat(trail > 0 ? trail : 0)}`;
        }

        const dot = m.indexOf(`.`);
        return `${sgn}${m.substring(0, dot + dp + 1)}`.replace(/^0(?=\d)/, ``);
    };

    static sf32(str) {
        if (type_of(str) !== 'string') throw new type_error('str is not a string.');
        const val = numb.parse(str);
        if (numb.fast_nan(val)) return NaN;
        if (val < numb.MIN_FLOAT32 || val > numb.MAX_FLOAT32) return Infinity * Math.sign(val);
        return Math.fround(val);
    }

    static f32s_formatted(val, len = 6) {
        if (type_of(val) !== 'number') throw new type_error('val is not a number.');

        if (!numb.is_finite(val)) return `${val}`;


        let sval = numb.f32s(val, len);
        if (string.is_inf(sval)) return sval;
        return sval.replace(/0+$/, '');
    };

    static b2i(val) {
        const kind = kind_of(val);
        if (kind === `boolean`) return val ? 1 : 0;
        else if (kind === `string`) return string.simplify(val).toLowerCase() === `true` ? 1 : 0;
        throw new type_error(`Unknow type ${kind}.`);
    }

    /**
     * Finds the nearest power of 2.
     * 
     * @param {number} n - The input number.
     * @returns {number} - The nearest power of 2 less than or equal to n.
     */
    static pow2near(n) {
        n |= n >> 1;
        n |= n >> 2;
        n |= n >> 4;
        n |= n >> 8;
        n |= n >> 16;
        n |= n >> 32;
        return n - (n >> 1);
    };

    /**
     * Calculates the largest power of 2 less than or equal to a given number.
     * 
     * @param {number} n - The input number.
     * @returns {number} - The largest power of 2 less than or equal to n.
     */
    static pow2floor(n) {
        let p = 1;
        while (n >>= 1) p <<= 1;
        return p;
    };

    /**
     * Calculates the smallest power of 2 greater than or equal to a given number.
     * 
     * @param {number} n - The input number.
     * @returns {number} - The smallest power of 2 greater than or equal to n.
     */
    static pow2ceil(num) {
        // Handle edge cases
        if (num <= 0) return 1;
        if (num === 1) return 1;

        // Subtract 1 and use bitwise operations to set all bits to 1
        num--;
        num |= num >> 1;
        num |= num >> 2;
        num |= num >> 4;
        num |= num >> 8;
        num |= num >> 16;

        // Add 1 to get the next power of 2
        return num + 1;
    };
};


/*
/**
 * Formats a float32 number to a specified number of decimal places.
 * @param {number} val - The input value to format.
 * @param {number} [dp=6] - The number of decimal places (default: 6).
 * @returns {string} The formatted number as a string.
 * /
function formatFloat32(val, dp = 6) {
    // Validate inputs
    if (typeof val !== 'number' || typeof dp !== 'number' || dp < 0) {
        throw new TypeError('Invalid input types. Expected numbers.');
    }

    // Handle special cases
    if (!Number.isFinite(val)) {
        return val === 0 ? `0.${'0'.repeat(dp)}` : val < 0 ? '-Infinity' : 'Infinity';
    }

    // Round and format
    const rounded = roundToDecimal(val, dp);
    const [integerPart, fractionalPart, exponent] = splitParts(rounded);

    // Format result based on exponent
    let result;
    if (exponent >= dp || exponent < 0) {
        result = formatExponent(integerPart, fractionalPart, exponent, dp);
    } else {
        result = `${integerPart}${fractionalPart ? `.${fractionalPart}` : ''}`;
    }

    return result;
}

function roundToDecimal(val, dp) {
    const rounded = Math.fround(val).toFixed(dp + 1); // Round to ensure precision
    return rounded.slice(0, dp + 2); // Include one extra digit for precise rounding
}

function splitParts(rounded) {
    const [integerPart, fractionalPartWithExponent] = rounded.split('e');
    const [fractionalPart, exponent] = fractionalPartWithExponent.split('.');
    return [integerPart, fractionalPart, parseInt(exponent || '0', 10)];
}

function formatExponent(integerPart, fractionalPart, exponent, dp) {
    if (exponent >= dp) {
        const paddingZeros = exponent - dp;
        return `${integerPart}${fractionalPart ? `.${fractionalPart}` : ''}${'0'.repeat(paddingZeros)}`;
    } else {
        const leadingZeros = '0'.repeat(-exponent - 1);
        return `0.${leadingZeros}${integerPart}${fractionalPart ? fractionalPart.slice(0, dp - exponent) : ''}`;
    }
}

// Example usage:
console.log(formatFloat32(3.14159, 2));  // "3.14"
console.log(formatFloat32(0.0000014999995, 6));  // "0.000002"
console.log(formatFloat32(1234567, 2));  // "1234567"

*/
