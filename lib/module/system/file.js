import { type_error } from "../../error.js";
import { kind_of } from "../../functions.js";
import { string } from "../text/string.js";
import { uri } from "./uri.js";

export class file {
    #file;
    #dir;
    #uri;

    constructor(file, dir) {
        if (file instanceof File === false) throw new type_error(`File must be a File.`);
        this.#file = file;
        this.#uri = new uri(string.empty(file.webkitRelativePath) ? file.name : file.webkitRelativePath);
        this.#dir = dir;
    };

    get kind() { return `file`; };

    get name() { return this.#uri.file_full_name; };
    get path() { return this.#uri.path; };
    get dir() { return this.#dir; };

    get last_modified() { return this.#file.lastModified; };
    get obj() { return this.#file; };

    /**
     * Checks if a file exists at the given path by sending a HEAD request.
     *
     * @param {string} path - The file path to check.
     * @returns {Promise<boolean>} A promise that resolves to true if the file exists, otherwise false.
     */
    static async exists(path) {
        if (string.empty(path)) return false;
        try {
            const response = await fetch(uri.std(path), { method: `HEAD`, cache: `no-cache` });
            return response.ok;
        } catch (error) {
            console.error(`Error checking file existence: ${error}`);
            return false;
        }
    }

    static async load_text(arg) {
        //console.log(arg);
        if (kind_of(arg) === `string`) {
            if (string.empty(arg)) return "";
            arg = uri.std(arg);
            if (!file.exists(arg)) return ``;

            const response = await fetch(arg);
            const result = await response.text();
            return result;
        }
        else if (kind_of(arg) === `File`) {
            const result = await new Promise(resolve => {
                const freader = new FileReader();
                freader.onload = e => resolve(freader.result);
                freader.readAsText(arg);
            });
            return result;
        }
        return""
    };
};


