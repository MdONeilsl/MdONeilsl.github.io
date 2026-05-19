
import { flag } from '../../functions.js';
import { char_json_char, char_number_char, char_printable_char, char_visible_char, regex } from "./regex.js";


export class char {
    /**
     * Checks if a character is printable.
     * @param {string} ch - The character to check.
     * @returns {boolean} - True if the character is printable, false otherwise.
     */
    static printable(ch) {
        return `${ch}`.length !== 0 && char_printable_char.test(ch);
    };

    /**
     * Checks if a character is a visible character.
     * @param {string} ch - The character to check.
     * @returns {boolean} - True if the character is visible, otherwise false.
     */
    static visible(ch) {
        return `${ch}`.length !== 0 && char_visible_char.test(ch);
    }

    /**
     * Determines if the character is a JSON special character.
     * @param {string} ch - The character to check.
     * @returns {boolean} - True if the character is a JSON special character, false otherwise.
     */
    static json_spec(ch) {
        return `${ch}`.length !== 0 && char_json_char.test(ch);
    }

    /**
     * Checks if a character is a whitespace character.
     * @param {string} ch - The character to check.
     * @returns {boolean} - True if the character is a whitespace character, false otherwise.
     */
    static space(ch) {
        return `${ch}`.length !== 0 && /^[ \f\n\r\t\v\u00A0\u2028\u2029]+$/u.test(ch);
    }


    /**
     * Checks if a character is a new line character.
     * @param {string} ch - The character to check.
     * @returns {boolean} - True if the character is a new line character, false otherwise.
     */
    static is_new_line(ch) {
        return `${ch}`.length !== 0 && /^[\n\r\u2028\u2029]$/u.test(ch);
    }

    /**
     * Checks if the character is a valid name character.
     * @param {String} ch - The character to check.
     * @returns {Boolean} - True if the character is a valid name character, false otherwise.
     */
    static is_name(ch) {
        return `${ch}`.length !== 0 && /^\w$/.test(ch);
    }

    /**
     * Checks if a character is a number.
     * @param {string} ch - The character to check.
     * @returns {boolean} - True if the character is a number, false otherwise.
     */
    static is_number(ch) {
        return `${ch}`.length !== 0 && char_number_char.test(ch);
    }

    /**
     * Checks if a character is a quote.
     * @param {string} ch - The character to check.
     * @returns {boolean} - True if the character is a quote, false otherwise.
     */
    static is_quote(ch) {
        return `${ch}`.length !== 0 && /^[`"']$/.test(ch);
    }

    /**
     * Checks if a character is one of the specified characters.
     * @param {string} ch - The character to check.
     * @param {string} inst - The list of characters to compare against.
     * @param {number} [cs=1] - Flag to indicate whether to perform a case-sensitive comparison (1) or not (0).
     * @returns {boolean} - True if the character is one of the specified characters, false otherwise.
     */
    static is_one_of = (ch, inst, cs = flag.CASE_SENSITIVE) => {
        if (`${ch}`.length === 0) return false;
        if (cs & flag.CASE_SENSITIVE) return inst.includes(ch);
        return RegExp(`^[${regex.escape(inst)}]$`, 'i').test(ch);
    };

    /**
     * Checks if a character is a valid float suffix ('f' or 'l').
     * @param {string} ch - The character to check.
     * @returns {boolean} - True if the character is a valid float suffix, false otherwise.
     */
    static is_float_suffix(ch) {
        // Ensure the input character is not empty
        if (`${ch}`.length == 0) return false;

        // Check if the character is 'f' or 'l'
        return ch === 'f' || ch === 'l';
    }

    /**
     * Returns the corresponding closing character for the given opening character.
     * @param {string} ch - The opening character.
     * @returns {string} - The corresponding closing character, or an empty string if not found.
     */
    static closing_char(ch) {
        if (`${ch}`.length !== 1 || `[{(<`.indexOf(ch) === -1) return ``;
        return `]})>`[`[{(<`.indexOf(ch)] || ``;
    }

    /**
     * Returns the corresponding opening character for the given closing character.
     * @param {string} ch - The closing character.
     * @returns {string} - The corresponding opening character, or an empty string if not found.
     */
    static opening_char(ch) {
        if (`${ch}`.length !== 1 || `]})>`.indexOf(ch) === -1) return ``;
        return `[{(<`[`]})>`.indexOf(ch)] || ``;
    }
};
