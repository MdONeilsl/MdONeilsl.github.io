import { type_error } from "../../error.js";
import { type_of } from "../../functions.js";
import { numb } from "../math/number.js";
import { string } from "../text/string.js";
import { uri } from "./uri.js";

var list = [];

/**
 * @class file
 */
export class uris {

    /**
     * Finds the index of a file URI in the files list.
     * @param {string} path - The URI of the file to find.
     * @returns {number} The index of the file URI in the files list, or -1 if not found.
     */
    static index(path) {
        if (type_of(path) !== 'string') return -1;
        if (string.empty(path) || list.length === 0) return -1;
        const std_uri = uri.std(path);
        if (string.empty(std_uri)) return -1;
        return list.indexOf(std_uri);
    }

    /**
     * Retrieves the file URI at the specified index in the files list.
     * @param {number} index - The index of the file URI to retrieve.
     * @returns {string} The file URI at the specified index, or an empty string if the index is -1.
     */
    static uri(index) {
        if (type_of(index) !== 'number' || numb.fast_nan(index)) {
            throw new type_error('index must be a number');
        }
        const int_index = Math.trunc(index);
        if (!numb.between(int_index, 0, list.length - 1)) return ``;
        return list[int_index];
    }

    /**
     * Checks if the standardized file URI exists in the files list.
     * @param {string} path - The URI of the file to check.
     * @returns {boolean} True if the file URI exists in the files list, otherwise false.
     */
    static contains(path) {
        if (type_of(path) !== 'string') return false;
        if (string.empty(path)) return false;
        const std_uri = uri.std(path);
        if (string.empty(std_uri)) return false;
        return list.includes(std_uri);
    }

    /**
     * Adds a file URI to the files list if it does not already exist and returns its index.
     * @param {string} path - The URI of the file to add.
     * @returns {number} The index of the added file URI in the files list, or -1 if the URI is invalid.
     */
    static add(path) {
        if (type_of(path) !== 'string') return -1;
        if (string.empty(path)) return -1;
        
        const std_uri = uri.std(path);
        if (string.empty(std_uri)) return -1;

        const existing_index = list.indexOf(std_uri);
        if (existing_index !== -1) return existing_index;

        return list.push(std_uri) - 1;
    }

    /**
     * Clears all entries from the files list.
     * This method resets the files list to an empty array, effectively removing all previously stored file URIs.
     */
    static clear() { list = []; };
}