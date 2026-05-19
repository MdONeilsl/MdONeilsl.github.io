//import { error, range_error, type_error } from "../../error.js";
//import { kind_of } from "../../functions.js";
//import { uri_sep_exp } from "../text/regex.js";
//import { string } from "../text/string.js";
//import { uri } from "./uri.js";

export const FILTER_FILE = 1;
export const FILTER_FOLDER = 2;

export class dir {
    /** @type string */
    #name;

    /** @type dir */
    #parent;

    /** @type Array<uri> */
    #content = [];

    constructor(name, parent, content) {
        if (name) {
            const kind = kind_of(name);
            if (kind === `string`) this.name = name;
            else if (kind === `uri`) this.name = name.dir_name;
            else if (kind=== `dir`) {
                this.name = name.name;
                this.parent = name.parent;
                content = name.content;
            }
        }

        if (parent) this.parent = parent;

        if (content)
            content.forEach(child => this.append(child));
    };

    get kind() { return `dir`; };

    get name() { return this.#name; };
    set name(name) {
        if (kind_of(name) !== `string`) throw new type_error(`Name must be a string.`);
        this.#name = name;
    };

    get path() {
        const path = [];
        for (let curr = this; curr; curr = curr.parent) {
            path.unshift(curr.name);
        }
        return uri.std(path.join('/'));
    };

    get parent() { return this.#parent; };
    set parent(path) {
        if (kind_of(path) !== `dir`) throw new type_error(`Path must be a dir.`);
        this.#parent = path;
    };

    empty() { return this.#content.length === 0; };

    contains(name) {
        if (kind_of(name) !== 'string') throw new type_error('Name must be a string.');
        return this.#content.some(entry => entry.name === name);
    };

    append(obj) {
        const kind = kind_of(obj);
        if (kind !== `file` && kind !== `dir`) throw new type_error(`Path must be a file or a directory.`);
        if (this.contains(obj.name)) return this.index(obj.name);
        this.#content.push(obj);
        return this.#content[this.#content.length - 1];
    };

    index(name, filter = FILTER_FILE | FILTER_FOLDER) {
        if (kind_of(name) !== 'string') throw new type_error('Name must be a string.');
        return this.#content.findIndex(entry => 
            entry.name === name && 
            ((kind_of(entry) === 'file' && filter & FILTER_FILE) || 
            (kind_of(entry) === 'dir' && filter & FILTER_FOLDER))
        );
    };

    at(index, filter = FILTER_FILE | FILTER_FOLDER) {
        if (kind_of(index) !== 'number') throw new type_error('Index must be a number.');
        if (index < 0 || index >= this.#content.length) throw new range_error(`Index out of range: ${index}`);

        let idx = 0;
        for (const entry of this.#content) {
            const kind = kind_of(entry);
            if ((kind === `file` && filter & FILTER_FILE) || (kind === `dir` && filter & FILTER_FOLDER)) {
                if (idx === index) return entry;
                idx++;
            }
        }

        return undefined;
    };

    filtered(filter) {
        if (kind_of(filter) !== `number`) throw new type_error(`Flag must be a number.`);
        return this.#content.filter(entry => 
            ((kind_of(entry) === 'file' && filter & FILTER_FILE) || 
            (kind_of(entry) === 'dir' && filter & FILTER_FOLDER))
        );
    };

    cd(path) {
        const cmds = path.split(uri_sep_exp).filter(x => !string.empty(x));
        let curr = this;
        for (const cmd of cmds) {
            if (cmd === '.') continue;
            if (cmd === '..') {
                if (!curr.parent) throw new error(`Folder out of range: ${curr.path}`);
                curr = curr.parent;
            } else {
                const idx = curr.index(cmd);
                if (idx === -1) throw new error(`Entry not found: ${cmd}`);
                curr = curr.at(idx);
            }
        }
        return curr;
    };

    mkdir(name) {
        if (kind_of(name) !== 'string') throw new type_error('Name must be a string.');
        if (this.contains(name)) return this.at(this.index(name));
        return this.append(new dir(name, this));
    };

    mkpath(path) {
        if (kind_of(path) !== 'string') throw new type_error('Path must be a string.');
        const cmds = path.split(uri_sep_exp).filter(x => !string.empty(x) && x !== '.');
        return cmds.reduce((curr, cmd) => cmd === '..' ? (curr.parent || curr) : curr.mkdir(cmd), this);
    };

    rmdir(name) {
        if (kind_of(name) !== 'string') throw new type_error('Name must be a string.');
        const index = this.index(name);
        if (index === -1) throw new error(`Folder does not exist: ${name}`);
        this.#content.splice(index, 1);
    };

    clear() {  this.#content.length = 0; };

};
