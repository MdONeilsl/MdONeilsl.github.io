import { array } from "../array.js";
import { error, type_error } from "../../error.js";
import { kind_of, type_of } from "../../functions.js";
import { uri_sep_exp } from "../text/regex.js";
import { string } from "../text/string.js";

const HAS_FILE_NAME = 1;
const HAS_DIR = 2;
const IS_DIR = 4;

/**
 * A class representing a uniform resource identifier.
 */
export class uri {
    #flags = 0;
    #driver = ``;
    #cmp = [];
    #params = new Map();

    /**
     * Constructs a new uri object.
     * @param {string} path_value - The string to be parsed into a uri.
     * @throws {type_error} If the input is not a string.
     * @throws {error} If the input string is empty.
     */
    constructor(path_value) {
        if (kind_of(path_value) === `uri`) path_value = path_value.path;
        if (type_of(path_value) !== 'string') {
            throw new type_error(`uri must be a string.`);
        }
        
        path_value = path_value.trim();
        if (string.empty(path_value)) {
            throw new error(`uri must not be empty.`);
        }

        // Store original path for encoding purposes
        const original_path = path_value;
        
        path_value = string.uri_unescape(path_value);

        const driver_match = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/{2,3}/.exec(path_value);
        if (driver_match) {
            this.#driver = driver_match[0];
            path_value = path_value.substring(this.#driver.length);
        }

        let base_part = path_value;
        let params_part = ``;
        const question_mark_index = path_value.indexOf(`?`);
        if (question_mark_index !== -1) {
            base_part = path_value.substring(0, question_mark_index);
            params_part = path_value.substring(question_mark_index + 1);
        }

        base_part = base_part.replace(/\\/g, `/`);
        
        // Store whether the original path ended with slash
        const original_ends_with_slash = original_path.replace(/\\/g, `/`).endsWith(`/`);
        
        this.#cmp = base_part.split(uri_sep_exp).filter(
            x => !string.empty(x) && x !== `.`
        );

        const final_components = [];
        for (const component of this.#cmp) {
            if (component === `..`) {
                if (final_components.length > 0) {
                    final_components.pop();
                }
            } else {
                final_components.push(component);
            }
        }
        this.#cmp = final_components;

        if (this.#cmp.length === 0) {
            this.#flags = IS_DIR;
            this.#cmp = [``];
        } else {
            const last_component = array.last(this.#cmp);
            
            // Check if it's a file based on extension presence
            const has_extension = last_component.includes(`.`) && 
                                 !last_component.endsWith(`.`) &&
                                 last_component !== `.`;
            
            if (has_extension) {
                this.#flags = HAS_FILE_NAME;
            } else {
                // Check if it's explicitly a directory (ends with slash)
                // or if it's a hidden file without extension (starts with dot)
                if (original_ends_with_slash || last_component.startsWith(`.`)) {
                    this.#flags = IS_DIR;
                } else {
                    // For names without dots that don't end with slash, treat as directory
                    // This handles the 'dir' case from tests
                    this.#flags = IS_DIR;
                }
            }

            if (this.#cmp.length > 1) this.#flags |= HAS_DIR;
        }

        if (params_part && !string.empty(params_part)) {
            const param_pairs = [];
            for (const entry of params_part.split(`&`)) {
                if (entry.includes(`=`)) {
                    param_pairs.push(entry.split(`=`));
                }
            }
            this.#params = new Map(param_pairs);
        }
    }

    static get HAS_FILE_NAME() { return HAS_FILE_NAME; }
    static get HAS_DIR() { return HAS_DIR; }
    static get IS_DIR() { return IS_DIR; }

    get kind() { return `uri`; }

    /**
     * Returns the full path of the uri.
     * @returns {string} The full path of the uri.
     */
    get path() {
        if (this.#cmp.length === 1 && this.#cmp[0] === ``) {
            return `${this.#driver}/`;
        }
        
        const path_string = this.#cmp.join(`/`);
        
        // Add trailing slash for directories
        if ((this.#flags & IS_DIR) && !path_string.endsWith(`/`)) {
            return `${this.#driver}${path_string}/`;
        }
        
        return `${this.#driver}${path_string}`;
    }

    /**
     * Returns the name of the file without the extension.
     * @throws {error} If the uri is not a file.
     * @returns {string} The name of the file.
     */
    get file_name() {
        if (!this.is_file) {
            throw new error(`The uri is not a file.`);
        }
        const str = array.last(this.#cmp);
        const last_dot_index = str.lastIndexOf(`.`);
        if (last_dot_index <= 0) {
            // Handle hidden files or files without extension
            return str;
        }
        return str.substring(0, last_dot_index);
    }

    /**
     * Returns the full name of the file including the extension.
     * @throws {error} If the uri is not a file.
     * @returns {string} The full name of the file.
     */
    get file_full_name() {
        if (!this.is_file) {
            throw new error(`The uri is not a file: "${this.path}"`);
        }
        return array.last(this.#cmp);
    }

    /**
     * Returns the name of the directory.
     * @throws {error} If the uri has no directory.
     * @returns {string} The name of the directory.
     */
    get dir_name() {
        if ((this.#flags & HAS_DIR) !== HAS_DIR) {
            throw new error(`The uri has no directory.`);
        }
        const offset = this.is_file ? 2 : 1;
        return this.#cmp[this.#cmp.length - offset];
    }

    /**
     * Returns the path of the directory.
     * @throws {error} If the uri has no directory.
     * @returns {string} The path of the directory.
     */
    get dir_path() {
        if ((this.#flags & HAS_DIR) !== HAS_DIR) {
            throw new error(`The uri has no directory.`);
        }
        const offset = this.is_file ? 1 : 1; // Always remove last component
        const dir_components = this.#cmp.slice(0, this.#cmp.length - offset);
        const path_string = dir_components.length > 0 ? dir_components.join(`/`) : ``;
        const needs_trailing_slash = (dir_components.length > 0 && this.#driver) || 
                                    (!this.#driver && path_string !== ``);
        return `${this.#driver}${path_string}${needs_trailing_slash ? `/` : ``}`;
    }

    /**
     * Returns the extension of the file.
     * @throws {error} If the uri is not a file.
     * @returns {string} The extension of the file.
     */
    get ext() {
        if (!this.is_file) {
            throw new error(`The uri is not a file.`);
        }
        const str = array.last(this.#cmp);
        const last_dot_index = str.lastIndexOf(`.`);
        if (last_dot_index <= 0) {
            throw new error(`The uri is not a file.`);
        }
        return str.substring(last_dot_index);
    }

    get flags() { return this.#flags; }
    get is_file() { 
        return (this.#flags & HAS_FILE_NAME) === HAS_FILE_NAME; 
    }

    static is_file_name(path_value) {
        const components = path_value.split(uri_sep_exp).filter(
            x => !string.empty(x) && x !== `.`
        );
        if (components.length === 0) return false;
        const last = array.last(components);
        return last.includes(`.`) && !last.endsWith(`.`);
    }

    /**
     * Returns the standardized path of the input string.
     * @param {string} path_value - The string to be standardized.
     * @throws {type_error} If the input is not a string.
     * @returns {string} The standardized path.
     */
    static std(path_value) {
        if (type_of(path_value) !== 'string') {
            throw new type_error(`path must be a string.`);
        }
        const u = new uri(path_value);
        return u.path;
    }

    static encoded(path_value) {
        if (type_of(path_value) !== 'string') {
            throw new type_error(`path must be a string.`);
        }
        const u = new uri(path_value);
        // Encode each component separately, then join with slashes
        const encoded_components = u.#cmp.map(component => 
            encodeURIComponent(component).replace(/%2E/g, `.`).replace(/%2F/g, `/`)
        );
        
        let encoded_path = encoded_components.join(`/`);
        
        // Add trailing slash for directories
        if ((u.#flags & IS_DIR) && !encoded_path.endsWith(`/`)) {
            encoded_path += `/`;
        }
        
        return `${u.#driver}${encoded_path}`;
    }

    is(path_value) {
        if (kind_of(path_value) === `uri`) {
            return this.path === path_value.path;
        }
        if (type_of(path_value) === 'string') {
            return this.path === new uri(path_value).path;
        }
        return false;
    }
}
