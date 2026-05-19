import { flag, type_of } from "../../functions.js";
import { numb } from "../math/number.js";
import {
    any_formater_char, any_white_space, b64_format_exp, binary_regexp, c_escape_char, char_nalphnumb_char, comments_exp, fix_float_regexp, hex_float_regexp,
    hex_int_regexp, html_escape_char, infinity_regexp, int_regexp, name_exp, nan_regexp, octal_regexp, operator_exp, percent_regex, regex, sci_float_regexp, sci_hex_float_regexp,
    string_literal_prefix, unprintable_char, uuid_exp
} from "./regex.js";


const c_char_esc = { '\u000A': '\\n', '\u000C': '\\f', '\u000D': '\\r', '\u0009': '\\t', '\u000B': '\\v', '\u0008': '\\b', '\u0007': '\\a' };

/**
 * Object mapping unprintable characters to their printable equivalents.
 * @type {Object}
 * @constant
 */
const print_char = {
    '\u0007': '[bel]', '\u0008': '[bs]', '\u0009': '[ht]', '\u000A': '[lf]', '\u000B': '[vt]', '\u000C': '[ff]', '\u000D': '[cr]', '\u0020': '[sp]',
    '\u00A0': '[nbsp]', '\u2028': '[lsep]', '\u2029': '[psep]', '\uFDD0': '[json_invalid]', '\uFDD1': '[json_object]', '\uFDD2': '[json_array]',
    '\uFDD2': '[json_array]', '\uFDD3': '[json_number]', '\uFDD4': '[json_string]', '\uFDD5': '[json_null]', '\uFDD6': '[json_true]',
    '\uFDD7': '[json_false]', '\uFDD8': '[json_delete]'
};

const alp_str = `_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`;
export const alpnum_str = `0123456789abcdefghijklmnopqrstuvwxyz`;
var letter_index = 0;
export const reset_index = () => letter_index = 0;

const perc_numb = (m, p, o, s) => `%${p.charCodeAt(0).toString(16).toUpperCase()}`;

/**
 * Utility class for string manipulation.
 * @class string
 */
export class string {

    /**
     * Checks if a string is empty.
     * @param {string} s - The string to check.
     * @returns {boolean} - Returns true if the string is empty, otherwise false.
     */
    static empty(s) {
        // Check if the input is a string and has zero length
        return (type_of(s) === `string` && s.length === 0);
    };

    /**
     * Simplifies a string by replacing any whitespace characters with space and trimming the result.
     * @param {string} s - The string to simplify.
     * @returns {string} - The simplified string.
     */
    static simplify(s) {
        // Check if the input string is empty
        if (!s || !s.length || s.length === 0) return ``;

        // Replace any whitespace characters with space and trim the result
        return `${s}`.replace(any_white_space, `\u0020`).trim();
    };

    /**
     * Escapes percentage characters in a string.
     * @param {string} str - The input string.
     * @returns {string} - The string with percentage characters escaped.
     */
    static esc_perc(str) {
        if (!str || !str.length) return ``;
        return str.replace(char_nalphnumb_char, perc_numb);
    };

    /**
     * Escapes special characters in a C-style string.
     * @param {string} str - The input string to escape.
     * @returns {string} - The escaped string.
     */
    static c_escape(str) {
        if (!str || !str.length) return ``;
        // Replace special characters with their escaped equivalents using regex.
        return str.replace(any_formater_char, m => c_char_esc[m]).replace(c_escape_char, `\\$&`);
    };

    /**
     * Escapes special characters in a string to their corresponding HTML entities.
     * @param {string} str - The input string to be escaped.
     * @returns {string} - The escaped HTML string.
     */
    static html_escape(str) {
        if (!str || !str.length) return ``;
        //console.assert(str && str.length, `Invalid parameter. ${str}`);
        return str.replace(html_escape_char, m => `&#${m.codePointAt(0)};`);
    };

    /**
     * Unescapes HTML entities in a string.
     * @param {string} str - The input string containing HTML entities.
     * @returns {string} - The unescaped string.
     */
    static html_unescape(str) {
        if (!str || !str.length) return ``;
        // Parse the input string as HTML using DOMParser
        const doc = new DOMParser().parseFromString(str, 'text/html');
        // Extract the text content from the parsed document
        return doc.documentElement.textContent;
    };


    /**
     * Escapes XML special characters in a string.
     *
     * This function replaces certain characters with their corresponding XML entities.
     *
     * @param {string} str - The input string to be escaped.
     * @returns {string} - The escaped string with XML special characters replaced.
     *
     * @example
     * xml_escape("Hello <World>") // Returns "Hello &lt;World&gt;"
     */
    static xml_escape(str) {
        if (!str || !str.length) return ``;

        return str.replace(/(?:^|[^&])([&<>" ])/g, (match, char) => {
            switch (char) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&apos;';
                case ' ': return '&nbsp;';
                default: return char; // Although this case will never occur
            }
        });
    }

    /**
     * Unescapes XML special characters in a given string.
     *
     * @param {string} str - The input string containing XML special characters.
     * @returns {string} - The unescaped string with XML special characters replaced by their corresponding characters.
     *
     * @example
     * xml_unescape('&lt;div&gt;Hello World&lt;/div&gt;')
     * // Returns: '<div>Hello World</div>'
     */
    static xml_unescape(str) {
        if (!str || !str.length) return ``;

        const map = {
            amp: '&',
            lt: '<',
            gt: '>',
            quot: '"',
            apos: "'",
            nbsp: ' ',
        };

        return str.replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, match => map[match.slice(1, -1)]);
    }

    /**
     * Escapes special characters in a string for use in a URI.
     *
     * @param {string} str - The input string to be escaped.
     * @returns {string} - The escaped string.
     */
    static uri_escape(str) {
        if (!str || !str.length) return ``;
        let val = "";

        // Map for special characters to their escaped representations
        //const ue = { '\\n': '\u000A', '\\f': '\u000C', '\\r': '\u000D', '\\t': '\u0009', '\\v': '\u000B', '\\b': '\u0008' };

        // Replace special characters with their escaped representations
        str = str.replace(/\\[nfrtvb]/g, m => c_char_esc[m]);

        // Create a Uint8Array and a DataView for encoding
        const arr = new Uint8Array(1),
            view = new DataView(arr.buffer);

        // Iterate through the encoded characters of the input string
        for (const code of new TextEncoder().encode(str)) {
            // If the character is alphanumeric, add it to the result string
            if (numb.between(code, 0x30, 0x39) || numb.between(code, 0x41, 0x5A) || numb.between(code, 0x61, 0x7A))
                val += String.fromCodePoint(code);
            else {
                // If the character is not alphanumeric, escape it using the '%' symbol and its hexadecimal representation
                view.setUint8(0, code, true);
                val += `%${code.toString(16).toUpperCase().padStart(2, '0')}`;
            }
        }
        return val;
    };

    /**
     * Decodes a percent-encoded string, replacing any percent-encoded characters with their corresponding ASCII characters.
     *
     * @param {string} str - The percent-encoded string to be decoded.
     * @returns {string} - The decoded string with percent-encoded characters replaced by their corresponding ASCII characters.
     */
    static uri_unescape(str) {
        if (!str || !str.length) return '';
        const encoder = new TextEncoder();

        let ret = [];
        let i = 0;

        const fail = ch => {
            ret.push('%'.charCodeAt(0));
            ret.push(ch.charCodeAt(0));
        };

        while (i < str.length) {
            let c = str[i++];

            if (c !== '%' || i >= str.length) {
                ret.push(encoder.encode(c));
                continue;
            }

            if (i >= str.length) {
                ret.push(encoder.encode(c));
                continue;
            }

            let v = 0;
            if (/[a-f0-9]/i.test(str[i])) {
                v |= parseInt(str[i++], 16) << 4;
            } else {
                fail(str[i - 1]);
                continue;
            }

            if (i >= str.length) {
                fail(str[i - 1]);
                continue;
            }

            if (/[a-f0-9]/i.test(str[i])) {
                v |= parseInt(str[i++], 16);
            } else {
                fail(str[i - 1]);
                continue;
            }

            if (v === 0) break;
            ret.push(v);
        }

        return new TextDecoder().decode(Uint8Array.from(ret));
    };

    /**
     * Counts the occurrences of a substring in a string.
     * @param {string} str - The input string to search.
     * @param {string} inst - The substring to count occurrences of.
     * @param {flag} [cs=flag.CASE_SENSITIVE] - Flag indicating whether the search should be case-sensitive.
     * @returns {number} - The number of occurrences of the substring in the string.
     */
    static count(str, inst, cs = flag.CASE_SENSITIVE) {
        // Check if either the input string or the substring is empty
        if (!str || !str.length || !inst || !inst.length) return 0;

        // Create a regular expression pattern to match the substring
        const pattern = regex.escape(inst);
        // Create a regular expression object with optional case sensitivity based on the flag
        const re = new RegExp(pattern, cs === flag.CASE_SENSITIVE ? 'g' : 'gi');
        // Use the regular expression to find matches in the input string and return the count
        return (str.match(re) || []).length;
    };

    /**
     * Utility method to remove a substring from a string.
     * @param {string} str - The original string.
     * @param {string} inst - The substring to be removed.
     * @param {flag} [cs=flag.CASE_SENSITIVE] - Flag indicating whether the search should be case-sensitive.
     * @returns {string} - The string after removing the specified substring.
     * @throws {AssertionError} - If the input string or the substring is empty.
     */
    static remove(str, inst, cs = flag.CASE_SENSITIVE) {
        if (!str || !str.length || !inst || !inst.length) return str;
        const re = RegExp(`${regex.escape(inst)}`, `${(cs == flag.CASE_SENSITIVE) ? `` : `i`}g`);
        return str.replace(re, ``);
    }

    /**
     * Converts unprintable characters in a string to their printable representations.
     * This method is useful for displaying strings that may contain non-printable characters
     * in a way that can be easily read and understood.
     * 
     * @param {String} str - The input string to be processed.
     * @returns {String} - The modified string with unprintable characters replaced by their printable equivalents.
     */
    static printable(str) {
        if (!str || !str.length) return str;
        return str.replaceAll(unprintable_char, m => print_char[m]);
    };

    /**
     * Checks if a string is a literal prefix.
     * @param {String} str - The string to be checked.
     * @returns {Boolean} - Returns true if the string is a literal prefix, otherwise false.
     */
    static is_literal_prefix(str) {
        return (!string.empty(str) && string_literal_prefix.test(str));
    };

    /**
     * Checks if a string starts with any of the characters in the provided set.
     * @param {String} str - The input string to be checked.
     * @param {String} inst - The set of characters to check for at the beginning of the string.
     * @param {flag} [cs=flag.CASE_SENSITIVE] - Flag indicating whether the search should be case-sensitive.
     * @returns {Boolean} - Returns true if the string starts with any of the characters in the set, otherwise false.
     */
    static starts_with_one_of(str, inst, cs = flag.CASE_SENSITIVE) {
        if (!str || !inst || str.length == 0 || inst.length == 0) return false;
        const re = RegExp(`^[${regex.escape(inst)}]`, `${(cs == flag.CASE_SENSITIVE) ? `` : `i`}`);
        return re.test(str);
    }

    /**
     * Checks if a string represents an infinity value.
     * 
     * @param {String} str - The input string to be checked.
     * @returns {Boolean} - Returns true if the input string represents an infinity value, otherwise false.
     */
    static is_inf(str) { return (!string.empty(`${str}`) && infinity_regexp.test(`${str}`)); };

    /**
     * Checks if a string represents a binary value.
     * 
     * @param {String} str - The input string to be checked.
     * @returns {Boolean} - Returns true if the input string represents a binary value, otherwise false.
     */
    static is_bin(str) { return (!string.empty(str) && binary_regexp.test(str)); };

    /**
     * Checks if a string represents an octal value.
     * 
     * @param {String} str - The input string to be checked.
     * @returns {Boolean} - Returns true if the input string represents an octal value, otherwise false.
     */
    static is_oct(str) { return (!string.empty(str) && octal_regexp.test(str)); };

    /**
     * Checks if a string represents an integer value.
     * 
     * @param {String} str - The input string to be checked.
     * @returns {Boolean} - Returns true if the input string represents an integer value, otherwise false.
     */
    static is_integer(str) { return (!string.empty(str) && int_regexp.test(str)); };

    /**
     * Checks if a string represents a hexadecimal value.
     * 
     * @param {String} str - The input string to be checked.
     * @returns {Boolean} - Returns true if the input string represents a hexadecimal value, otherwise false.
     */
    static is_hex(str) {
        if (string.empty(str)) return false;
        if (hex_int_regexp.test(str)) return true;
        if (hex_float_regexp.test(str)) return true;
        if (sci_hex_float_regexp.test(str)) return true;
        return false;
    };

    /**
     * Checks if a string represents a floating-point number.
     * 
     * @param {String} str - The input string to be checked.
     * @returns {Boolean} - Returns true if the input string represents a floating-point number, otherwise false.
     */
    static is_float(str) {
        if (string.empty(str)) return false;
        if (nan_regexp.test(str) || infinity_regexp.test(str)) return true;
        if (fix_float_regexp.test(str)) return true;
        if (sci_float_regexp.test(str)) return true;
        if (hex_float_regexp.test(str)) return true;
        if (sci_hex_float_regexp.test(str)) return true;
        return false;
    };

    /**
     * Checks if a string represents a numeric value, including integers and various types of floating-point numbers.
     * 
     * @param {String} str - The input string to be checked for numeric representation.
     * @returns {Boolean} - Returns true if the input string represents a numeric value, otherwise false.
     */
    static is_numb(str) {
        if (string.empty(str)) return false;
        if (nan_regexp.test(str) || infinity_regexp.test(str)) return true;
        if (binary_regexp.test(str)) return true;
        if (octal_regexp.test(str)) return true;
        if (int_regexp.test(str)) return true;
        if (hex_int_regexp.test(str)) return true;
        if (fix_float_regexp.test(str)) return true;
        if (sci_float_regexp.test(str)) return true;
        if (hex_float_regexp.test(str)) return true;
        if (sci_hex_float_regexp.test(str)) return true;
        return false;
    }

    /**
     * Checks if a string represents a valid name (word).
     * 
     * @param {String} str - The input string to be checked for validity as a name.
     * @returns {Boolean} - Returns true if the input string represents a valid name, otherwise false.
     */
    static is_name(str) {
        if (!str || !str.length) return false;
        return (!string.empty(str) && name_exp.test(str));
    };

    /**
     * Checks if a string represents an operator.
     * An operator is a symbol that represents an operation, such as addition (+), subtraction (-), etc.
     * 
     * @param {String} str - The input string to be checked for operator representation.
     * @returns {Boolean} - Returns true if the input string represents an operator, otherwise false.
     */
    static is_operator(str) { return (!string.empty(str) && operator_exp.test(str)); };

    /**
     * Checks if a string represents a comment.
     * A comment is a piece of text in a program that is intended for the human reader and is ignored by the compiler or interpreter.
     * 
     * @param {String} str - The input string to be checked for comment representation.
     * @returns {Boolean} - Returns true if the input string represents a comment, otherwise false.
     */
    static is_comment(str) { return (!string.empty(str) && comments_exp.test(str)); };

    /**
     * Checks if a string represents a key according to the specified UUID pattern.
     * A key is a unique identifier typically represented as a UUID (Universally Unique Identifier).
     * 
     * @param {String} str - The input string to be checked for key representation.
     * @returns {Boolean} - Returns true if the input string represents a key, otherwise false.
     */
    static is_key(str) { return (!string.empty(str) && uuid_exp.test(str)); };

    /**
     * Checks if a string represents a valid token, which can be a name, number, operator, or comment.
     * 
     * @param {String} str - The input string to be checked for token validity.
     * @returns {Boolean} - Returns true if the input string represents a valid token, otherwise false.
     */
    static is_valide_token(str) {
        if (string.empty(str)) return false;
        if (string.is_name(str)) return true;
        if (string.is_numb(str)) return true;
        if (string.is_operator(str)) return true;
        if (string.is_comment(str)) return true;
        return false;
    };

    /**
     * Checks if a string contains a percentage character.
     * 
     * @param {string} str - The input string to be checked for the presence of a percentage character.
     * @returns {boolean} - Returns true if the input string is not empty and contains a percentage character, otherwise false.
     */
    static is_percent(str) { return (!string.empty(str) && percent_regex.test(str)); };

    /**
     * Returns the last character of the input string.
     * 
     * @param {string} str - The input string from which to retrieve the last character.
     * @returns {string} - The last character of the input string.
     */
    static last_char(str) { return str[str.length - 1] || ``; };

    /**
     * Generates a unique identifier (UID) using a combination of alphanumeric characters.
     * The UID is generated based on the current value of the `letter_index` and the characters in `alp_str`.
     * If the generated UID matches any of the reserved keywords (`EOF`, `PI`, `Pop`, `do`, `for`, `if`, `key`), a new UID is generated until a unique one is obtained.
     * 
     * @returns {string} - The generated unique identifier (UID).
     */
    static uid() {
        const base = alp_str.length;
        let num = letter_index++;
        let id = '';
        const reserved_set = new Set([
            // C, C++, C#, JavaScript, Lua reserved words under 5 characters
            'auto', 'break', 'case', 'char', 'const', 'do', 'for', 'if', 'int', 'long', 'else', 'enum',
            'goto', 'new', 'try', 'var', 'let', 'null', 'true', 'void', 'with', 'byte', 'bool', 'catch',
            'class', 'this', 'super', 'false', 'nil', 'and', 'end', 'not', 'key', 'pop', 'pi', 'eof',
            // LSL common constants & keywords under 5 chars
            'TRUE', 'FALSE', 'null', 'key', 'end', 'add', 'and', 'run', 'set', 'get', 'rot', 'pos', 'cam',
            'bin', 'sit', 'tap', 'rez', 'say', 'shout', 'listen', 'touch', 'timer', 'link', 'stop', 'll',
            'llay', 'llset', 'llget',`EOF`, `PI`, `Pop`
        ]);

        do {
            id = alp_str[num % base] + id;
            num = (num / base) | 0;
        } while (num > 0);

        if (reserved_set.has(id)) {
            return this.uid();
        }

        return id;
        /*
        let idxs = numb.index_2_3d(letter_index++, alp_str.length);

        let name = alp_str[idxs[0]];
        if (letter_index > alp_str.length)
            name = `${alp_str[idxs[1]]}${name}`;
        if (letter_index > (alp_str.length * alp_str.length))
            name = `${alp_str[idxs[2]]}${name}`;

        while ([`EOF`, `PI`, `Pop`, `do`, `for`, `if`, `key`].includes(name)) {
            name = string.uid();
        }

        return name;
        */
    };

    /**
     * Replaces a character at the specified index in the input string with the given character.
     * 
     * @param {string} str - The original input string.
     * @param {number} index - The index at which the character should be replaced.
     * @param {string} ch - The character to replace at the specified index.
     * @returns {string} - The modified string with the character replaced at the specified index.
     */
    static replace_at(str, index, ch) {
        const a = str.split(``);
        a[index] = ch;
        return a.join(``);
    };

    /**
     * Extracts a substring from the input string, excluding the first and last characters.
     * 
     * @param {string} str - The input string from which to extract the substring.
     * @returns {string} - The extracted substring, excluding the first and last characters of the input string.
     */
    static clip(str) {
        if (!str || str.length === 0) return ``;
        if (str.length === 1) return str;
        return str.substring(1, str.length - 1);
    };

    /**
     * Formats a Base64 string by adding padding characters ('=') to ensure the length is a multiple of 4.
     * @param {string} str - The input Base64 string to be formatted.
     * @returns {string} - The formatted Base64 string with added padding characters.
     */
    static format_b64(str) {
        const raw = str.replace(/=+$/g, ``).match(b64_format_exp)[0];
        return raw + ''.padEnd(-raw.length & 3, `=`);
    };

    /**
     * Finds the index of the first occurrence of a pattern within a string, starting from the specified position.
     * 
     * @param {string} str - The input string to search within.
     * @param {string} pattern - The pattern to search for within the input string.
     * @param {number} [start=0] - The position within the input string to start the search from.
     * @returns {number} - The index of the first occurrence of the pattern within the string, or -1 if the pattern is not found.
     */
    static index_of(str, pattern, start = 0) {
        const ls = str.length + 1 - pattern.length;
        top: for (let i = start; i < ls; ++i) {
            for (let j = 0; j < pattern.length; ++j) {
                if (str[i + j] != pattern[j]) continue top;
            }
            return i;
        }
        return -1;
    };

    /**
     * Finds the index of the last occurrence of a pattern within a string, starting from the specified position and moving backwards.
     * 
     * @param {string} str - The input string to search within.
     * @param {string} pattern - The pattern to search for within the input string.
     * @param {number} [end=0] - The position within the input string to start the search from, counting backwards.
     * @returns {number} - The index of the last occurrence of the pattern within the string, or -1 if the pattern is not found.
     */
    static last_index_of(str, pattern, end = 0) {
        //console.log(`last_index_of("${str}", "${pattern}", ${end})`);
        const ls = str.length - (end - str.length);
        //console.log(`ls:`, ls);
        top: for (let i = ls; i > 0; --i) {
            for (let j = i; j < i - pattern.length; --j) {
                if (str[i - j] != pattern[j]) continue top;
            }
            return i;
        }
        return -1;
    };

    /**
     * Generates a unique identifier (UUID).
     * 
     * @returns {string} - The generated unique identifier (UID).
     */
    static uuid() { return crypto.randomUUID(); }

    static bytes_length(str) {
        const encoder = new TextEncoder();
        return encoder.encode(str).length;
    }
}

// https://marc.durdin.net/2012/04/a-more-utf-32-aware-javascript-string-library/
// https://github.com/Stenway/ReliableTXT-TS/tree/main
// https://github.com/ashtuchkin/iconv-lite

export class ucs2 {

    /**
     * Decodes a string into a Uint8Array, handling surrogate pairs for UTF-16 characters.
     * 
     * @param {string} str - The input string to be decoded.
     * @returns {Uint8Array} - The Uint8Array containing the decoded UTF-16 characters.
     */
    static decode(str) {
        let output = [];
        let counter = 0;
        // Iterate through the input string
        while (counter < str.length) {
            let value = str.charCodeAt(counter++);
            // Check for surrogate pairs
            if (value >= 0xD800 && value <= 0xDBFF && counter < str.length) {
                let extra = str.charCodeAt(counter++);
                // Handle surrogate pairs
                if ((extra & 0xFC00) == 0xDC00)
                    output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
                else {
                    output.push(value);
                    counter--;
                }
            }
            else output.push(value);
        }
        // Convert the output array to Uint8Array and return
        return new Uint8Array(output);
    }

};

export class u8 extends Uint8Array {
    _length = 0;
    _byte_count = 0;
    _byte_index = 0;

    constructor(input) {

    };

    read_continuation_byte() {

    };

    decode_symbol() {

    };

    decode(str) {

    };

    get length() { return this._length; };
}

export class u32 extends Uint32Array {
    #length = 0;
    constructor(str) {
        super(str.length);
        const dv = new DataView(this.buffer);

        this.#length = 0;
        for (let i = 0, cpi = 0; i < str.length; ++i, ++cpi) {
            let cp = str.charCodeAt(i);
            if (cp >= 0xD800 && cp <= 0xDBFF) {
                ++i;
                const scp = str.charCodeAt(i);
                cp = (cp - 0xD800) * 0x400 + scp - 0xDC00 + 0x10000;

            }
            dv.setUint32(cpi * 4, cp, true);
            ++this.#length;
        }
    }

    get length() { return this.#length; }

};

