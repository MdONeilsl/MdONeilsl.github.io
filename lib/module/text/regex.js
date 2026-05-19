

/* =========== Precompile Regexp =========== */
// const re = new RegExp("pattern", "flags");

/**
 * Regular expression to match one or more whitespace characters globally.
 * @type {RegExp}
 */
export const any_white_space = /\p{White_Space}+/gu;
//export const any_white_space = RegExp(`\\s+`, `g`);

/**
 * Regular expression to match control characters as formatter characters with Unicode support.
 * @type {RegExp}
 */
export const any_formater_char = /[\u0007-\u000D]/ug;
//export const any_formater_char = RegExp(`[\u0007-\u000D]`, `ug`);


/**
 * Regular expression for matching escape characters in C strings.
 * Matches either an octal (starting with 0) or a hexadecimal escape sequence
 * (starting with 'x' or 'u') surrounded by word boundaries, or single/double quotes.
 * 
 * @type {RegExp}
 * @constant
 */
export const c_escape_char = /\b(?<!\\)(0[0-7]{1,2}|[ux][0-9a-f]{1,8})\b|['"]/gi;
//export const c_escape_char = RegExp(`\\b(?<!\\\\)(0[0-7]{1,2}|[ux][0-9a-f]{1,8})\\b|['"]`, `ig`);



/**
 * Regular expression for matching HTML escape characters.
 * Matches a wide range of special characters, mathematical symbols, arrows, etc.
 * 
 * @type {RegExp}
 * @constant
 */
export const html_escape_char = /(?<!&)(["'&<>ŒœŠ-Ÿƒˆ˜‌‍–—‘’‚“”„†‡•…‰′″‹›‾€™←-↵⌈-⌋◊♠-♦∀-∇∈-∩∪∫∴∼≅≈≠≡≤≥⊂-⊇⊕⊗⊥Α-Ωα-ωϑϒϖÀ-ÿ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿×÷])/g;
//export const html_escape_char = RegExp(`["'&<>ŒœŠšŸƒˆ˜‌‍–—‘’‚“”„†‡•…‰′″‹›‾€™←↑→↓↔↵⌈⌉⌊⌋◊♠♣♥♦∀∂∃∅∇∈∉∋∏∑−∗√∝∞∠∧∨∩∪∫∴∼≅≈≠≡≤≥⊂⊃⊄⊆⊇⊕⊗⊥ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρςστυφχψωϑϒϖÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿×÷]`, `g`);


/**
 * A regular expression pattern to match XML special characters.
 *
 * @constant {RegExp} xml_special_chars
 * @description This pattern matches the following XML special characters:
 * - & (ampersand)
 * - < (less than)
 * - > (greater than)
 * - " (double quote)
 * - ' (single quote)
 *
 * @example
 * const text = "This is a <test> string with &amp; special characters.";
 * const matches = text.match(regex.xml_special_chars);
 * console.log(matches); // Output: ["<", "&", "'"]
 */
export const xml_special_chars = /[&<>"']/g;

/**
 * Regular expression for matching unprintable characters.
 * @type {RegExp}
 * @constant
 */
export const unprintable_char = /[\x00-\x1F\x7F-\x9F\u0007\u0008\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u200B-\u200D\u2028\u2029\uFDD0-\uFDD8\u2060-\u206F\uFFF0-\uFFFF]/g;
//export const unprintable_char = RegExp(`[\u0007-\u000D\u0020\u00A0\u2028\u2029\uFDD0-\uFDD8]`, `g`);

/**
 * Regular expression for matching C string literal prefixes.
 * 
 * The string literal prefix is an optional part of C string literals that can specify
 * character encoding and raw string literals. It includes the following options:
 * 
 * - u: Unicode character encoding.
 * - u8: UTF-8 character encoding.
 * - U: 32-bit Unicode character encoding.
 * - L: Wide character encoding.
 * - R: Raw string literal.
 * 
 * Examples of valid prefixes:
 * 
 * - u
 * - u8
 * - U
 * - L
 * - R
 * - Ru
 * - uR
 * - u8LR
 * 
 * @type {RegExp}
 * @constant
 */
export const string_literal_prefix = /^(u8?|U|L)?R?$/;
//export const string_literal_prefix = RegExp(`^(u8?|U|L)?R?$`);

/**
 * Regular expression for matching every printable ASCII character but not control characters.
 * 
 * This regular expression matches any single printable ASCII character in the range from `\x20` (space)
 * to `\x7E` (tilde), excluding control characters.
 * 
 * @type {RegExp}
 * @constant
 */
export const ASCII_exp = /^[\x20-\x7E]+$/;
//export const ASCII_exp = RegExp(`^[\x20-\x7E]+$`, `u`);


/**
 * Regular expression for matching trailing zeroes that are not preceded by a dot.
 * 
 * This regular expression utilizes a negative lookbehind assertion to ensure that the match 
 * is not preceded by a dot ('.'). It matches one or more zeroes at the end of the string.
 * 
 * @type {RegExp}
 * @constant
 */
export const trailing_zeroes = /(?<!\.)0+$/g;
//export const trailling_zero = /(?<!\.)0+$/;

/**
 * Regular expression for matching binary notation strings.
 * 
 * This regular expression matches binary notation strings that start with either '0b' or '0B',
 * followed by one or more binary digits (0 or 1), and optional single quotation marks ('), 
 * allowing for binary numbers with or without single quotation marks.
 * 
 * @type {RegExp}
 * @constant
 */
export const binary_regexp = /^0b[01']+$/i;

/**
 * Regular expression for matching octal notation strings.
 * 
 * This regular expression matches octal notation strings that represent
 * integers in octal notation. It allows an optional positive or negative sign,
 * followed by a single '0' and one or more octal digits (0-7).
 * 
 * @type {RegExp}
 * @constant
 */
export const octal_regexp = /^[+-]?0[0-7]+$/;

/**
 * Regular expression for matching integer notation strings.
 * 
 * This regular expression matches integer notation strings that represent
 * integers in decimal notation. It allows an optional positive or negative sign,
 * followed by either a single '0' or a non-zero digit (1-9) followed by zero or
 * more digits, and an optional single quotation mark ('), followed by optional 
 * characters 'u' or 'l', repeated zero to three times.
 * 
 * @type {RegExp}
 * @constant
 */
export const int_regexp = /^[+-]?(0|[1-9][\d\']*)[ul]{0,3}$/i;

/**
 * Regular expression for matching hexadecimal integer notation strings.
 * 
 * This regular expression matches hexadecimal integer notation strings that represent
 * integers in hexadecimal notation. It allows an optional positive or negative sign,
 * followed by '0x' or '0X', and one or more hexadecimal digits (0-9, a-f, A-F).
 * 
 * @type {RegExp}
 * @constant
 */
export const hex_int_regexp = /^[+-]?0x[a-f\d]+$/i;

/**
 * Regular expression for matching fixed-point floating point notation strings.
 * 
 * This regular expression matches fixed-point floating point notation strings that represent
 * floating point numbers in decimal notation with a fixed number of digits after the decimal point.
 * It allows an optional positive or negative sign, followed by either:
 * 1. A non-zero integer followed by an optional suffix 'f', 'fl', or 'fll'.
 * 2. An optional integer part followed by a decimal point and one or more digits,
 *    optionally followed by a suffix 'f', 'l', 'fl', or 'fll'.
 * 
 * @type {RegExp}
 * @constant
 */
export const fix_float_regexp = /^[+-]?(?=\d|\.\d)([1-9]\d*(f|fl|fll)|\d*\.\d*?(f|l|fl|fll)?)$/i;

/**
 * Regular expression for matching scientific notation floating point notation strings.
 * 
 * This regular expression matches scientific notation floating point notation strings that represent
 * floating point numbers in decimal notation with scientific notation.
 * It allows an optional positive or negative sign, followed by either:
 * - An optional integer part.
 * - An optional fractional part.
 * - A mandatory exponent part, represented by 'e' or 'E', followed by an optional positive or negative exponent.
 * - An optional suffix 'f', 'l', 'fl', or 'fll'.
 * 
 * @type {RegExp}
 * @constant
 */
export const sci_float_regexp = /^[+-]?(?=\d|\.\d)\d*(\.\d*)?(e[-+]?\d+)(f|l{0,2})?$/i;
//export const sci_float_regexp = /^[+-]?(?=\d|\.\d)\d*(\.\d*)?(e[-+]?\d+)(f|l|fl|fll)?$/i;

/**
 * Regular expression for matching hexadecimal floating point notation strings.
 * 
 * This regular expression matches hexadecimal floating point notation strings that represent
 * floating point numbers in hexadecimal notation.
 * It allows an optional positive or negative sign, followed by '0x' or '0X',
 * and a hexadecimal number that may include a fractional part, represented by a decimal point.
 * An optional suffix 'f', 'l', 'fl', or 'fll' can be included at the end.
 * 
 * @type {RegExp}
 * @constant
 */
export const hex_float_regexp = /^[+-]?(0x[a-f\d]+\.[a-f\d]*)(f|l{0,2})?$/i;
//export const hex_float_regexp = /^[+-]?(?=\d|\.\d)(0x(?=[a-f\d]|.[a-f\d])[a-f\d]*\.([a-f\d]*)?)(f|l|fl|fll)?$/i;

/**
 * Regular expression for matching hexadecimal scientific notation floating point notation strings.
 * 
 * This regular expression matches hexadecimal scientific notation floating point notation strings that represent
 * floating point numbers in hexadecimal notation with scientific notation.
 * It allows an optional positive or negative sign, followed by '0x' or '0X',
 * a hexadecimal number that may include a fractional part, represented by a decimal point,
 * and an exponent part represented by 'p' or 'P', followed by an optional positive or negative exponent.
 * An optional suffix 'f', 'l', 'fl', or 'fll' can be included at the end.
 * 
 * @type {RegExp}
 * @constant
 */
export const sci_hex_float_regexp = /^[-+]?0x[a-f\d]+(\.[a-f\d]*)?(p[-+]?\d+)(f|l{0,2})?$/i;
//export const sci_hex_float_regexp = /^[-+]?0x(?=[a-f\d]|.[a-f\d])[a-f\d]*(\.[a-f\d]*)?(p[-+]?\d+)(f|l|fl|fll)?$/i;


/**
 * Regular expression for matching any type of floating point notation strings.
 * 
 * This regular expression matches floating point notation strings that represent
 * floating point numbers in various formats: decimal, hexadecimal, or scientific notation.
 * It allows an optional positive or negative sign, followed by either:
 * - A hexadecimal floating point number in the format '0x...', followed by an optional exponent part,
 *   represented by 'p' or 'P', followed by an optional positive or negative exponent.
 * - A decimal floating point number in the format '...', optionally followed by an exponent part,
 *   represented by 'e' or 'E', followed by an optional positive or negative exponent.
 * 
 * @type {RegExp}
 * @constant
 */
export const any_float_regexp = /^[-+]?(0x[\da-f]+\.[\da-f]+(?:[pP][-+]?\d+)?|\d+(?:\.\d*)?(?:[eE][-+]?\d+)?)/i;
//export const any_float_regexp = /^[-+]?(0x(?=[a-f\d]|\.[a-f\d])[a-f\d]*\.[a-f\d]*(p[-+]?\d+)?|(?=\d|\.\d)\d*(\.\d*)?(e[-+]?\d+)?)$/i

/**
 * Regular expression for matching any type of hexadecimal notation strings.
 * 
 * This regular expression matches hexadecimal notation strings that represent
 * integers or floating-point numbers in hexadecimal notation.
 * It allows an optional positive or negative sign, followed by either:
 * - A hexadecimal floating point number in the format '0x...', followed by an optional exponent part,
 *   represented by 'p' or 'P', followed by an optional positive or negative exponent.
 * - A hexadecimal integer in the format '[a-f\d]+'.
 * 
 * @type {RegExp}
 * @constant
 */
export const any_hexadecimal_regexp = /^[+-]?(0x[a-f\d]+(?:\.[a-f\d]*)?(?:p[-+]?\d+)?|[a-f\d]+)$/i;
//export const any_hexadecimal_regexp = /^[-+]?(0x(?=[a-f\d]|\.[a-f\d])([a-f\d]*(\.[a-f\d]*)?(p[-+]?\d+)?|[a-f\d]+))$/i;


/**
 * Regular expression pattern to match percentage numbers.
 * 
 * This regular expression matches strings representing percentage numbers, 
 * allowing for an optional negative sign at the beginning, followed by one or more digits, 
 * an optional decimal point and one or more digits after the decimal point, and a percent symbol at the end.
 * 
 * @type {RegExp}
 * @constant
 */
export const percent_regex = /^-?\d+(\.\d+)?%$/;

/**
 * Regular expression pattern to match strings representing positive or negative infinity.
 * @type {RegExp}
 */
export const infinity_regexp = /^[+-]?(infinity|inf(?![io]))/i;

/**
 * Regular expression pattern to match strings representing NaN (Not a Number).
 * @type {RegExp}
 */
export const nan_regexp = /^[+-]?nan$/i;

/**
 * Regular expression pattern to match numeric strings, including integers, floating-point numbers,
 * positive/negative infinity, and NaN (Not a Number).
 * @type {RegExp}
 */
export const numb_exp = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+|inf(?:inity)?|nan)$/i;
//export const numb_exp = RegExp(`^[-+]?(\\.?[0-9]|inf(inity)?$|nan)`, `i`);

/**
 * Regular expression pattern to match valid names following the given rules:
 * - Must start with an underscore (_) or a lowercase letter (a-z).
 * - Can be followed by any combination of Unicode letters or digits.
 * @type {RegExp}
 */
export const name_exp = /^[_a-z][\p{L}\p{N}_]*$/ui;
//export const name_exp = RegExp(`^[_a-z][_\\p{L}\\p{N}]*$`, `ui`);

/**
 * Regular expression pattern to match symbols commonly used in programming languages.
 * @type {RegExp}
 */
export const symbol_exp = /^[@\-+*\/%<>=!&|^?:.,;()[\]{}~#]+$/;
//export const symbol_exp = RegExp(`^[@;\\{\\}\\[\\]\\(\\)<>!~+\\-\\*/%=&:\\.\\^?,#|]{1,3}$`);

/**
 * Regular expression pattern to match operators commonly used in programming languages.
 * @type {RegExp}
 */
export const operator_exp = /^[[\]()!~*#@\/%\-+<>=&^:|?.,;]{1,3}$/i;
//export const operator_exp = RegExp(`^[[\\]()!~\\*#@\/%\\-+<>=&^:|\\.?,;]{1,3}$`, `i`);

/**
 * Regular expression pattern to match comments in code, including both multi-line (/* * /) and single-line (//) comments.
 * @type {RegExp}
 */
export const comments_exp = RegExp(`((\\/\\*(\\n|\\r|.)*?\\*\\/)|(\\/\\/.*[\\n\\r]*?$))`, `i`);

/**
 * Regular expression pattern to match Universally Unique Identifiers (UUIDs) in the format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.
 * @type {RegExp}
 */
export const uuid_exp = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
//export const uuid_exp = /^[0-9a-f]{8}(\-[0-9a-f]{4}){3}\-[0-9a-f]{12}$/i;

/**
 * Regular expression pattern to match URI separators (backslash or forward slash).
 * @type {RegExp}
 */
export const uri_sep_exp = /[\/\\]/g;
//export const uri_sep_exp = RegExp(`\u005C\u005C|\u002F`, `gu`);

/**
 * Regular expression pattern to match alphanumeric characters (letters a-z and digits 0-9).
 * @type {RegExp}
 */
export const char_alphnumb_char = /[a-z0-9]/i;
//export const char_alphnumb_char = RegExp(`[\da-z]`, `i`);

/**
 * Regular expression pattern to match non-alphanumeric characters (characters other than letters a-z and digits 0-9).
 * @type {RegExp}
 */
export const char_nalphnumb_char = RegExp(`([^0-9a-z])`, `i`);

/**
 * Regular expression pattern to match printable characters.
 * @type {RegExp}
 */
export const char_printable_char = /^[^\p{Cc}\p{Cn}\p{Cs}]$/u;
//export const char_printable_char = RegExp(`^[\\P{Cc}\\P{Cn}\\P{Cs}]$`, `u`);

/**
 * Regular expression pattern to match visible characters.
 * @type {RegExp}
 */
export const char_visible_char = /^[^\p{C}]$/u;
//export const char_visible_char = RegExp(`^\\P{C}$`, `u`);

/**
 * Regular expression pattern to match JSON characters.
 * @type {RegExp}
 */
export const char_json_char = /^[\uFDD0-\uFDD8]$/u;
//export const char_json_char = RegExp(`^[\\uFDD0-\\uFDD8]$`, `u`);

/**
 * Regular expression pattern to match number characters from various scripts.
 * @type {RegExp}
 */
export const char_number_char = /^[\u0030-\u0039\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\uFF10-\uFF19]$/u;
//export const char_number_char = RegExp(`[\u0030-\u0039\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\uFF10-\uFF19]`, `u`);

/**
 * Regular expression pattern to match single symbol characters.
 * @type {RegExp}
 */
export const char_symbol_char = /^[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]$/;
//export const char_symbol_char = RegExp(`[!\\"#\\$%&\\'\\(\\)\\*\\+,\\-\\.\\/:;<=>\\?@\\[\\]\^_\`\\\\{\\|\\}~]`, `g`);

/**
 * Regular expression pattern to match single delimiter characters.
 * @type {RegExp}
 */
export const delimiter_char = /^[(){}[\]<>]$/;
//export const delimiter_char = RegExp("^[\\(\\{\\[\\<\\>\\]\\}\\)]$");

/**
 * Regular expression pattern to match Base64 format.
 * @type {RegExp}
 */
export const b64_format_exp = /^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2,3})?/i;
//export const b64_format_exp = RegExp(`^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2,3})?`, `i`);


/**
 * Class containing utility methods for regular expressions.
 * @class regex
 */
export class regex {
    /**
     * Escapes special characters in a string to be used in a regular expression.
     * @param {String} str The string to escape.
     * @returns {String} The escaped string.
     */
    static escape(str) {
        // Use regex to replace special characters with their escaped versions.
        return str.replace(/[.*+\-?^${}()|[\]\\]/g, `\\$&`);
    }

    /**
     * Converts a string to a regular expression pattern.
     * @param {String} str The string to convert.
     * @returns {String} The regular expression pattern.
     */
    static from_string(str) {
        // Escape special characters and replace whitespace with optional whitespace.
        return regex.escape(str).replace(/\s+/g, `\\s*`);
    }
};



/** @class regex 
export class regex {

    static escape(str) {
        return str.replace(/[.*\-+?^${}()|[\]\\]/g, `\\$&`);
    }

    static from_string(str) {
        return regex.escape(str).replace(/\s+/g, `\\s*`);
    }
};
*/