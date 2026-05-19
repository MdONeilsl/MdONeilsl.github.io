//import { type_error } from "../../error.js";
//import { type_of } from "../../functions.js";
//import { string } from "../text/string.js";
import { widget } from "./widget.js";


export class floating_panel extends widget {
    #display;

    constructor(name, x, y, width, height) {
        super(name || `fpanel_${string.uid()}`, x, y, width, height);
        this.#display = false;
    }

    /** @returns {String} */
    get kind() { return `fpanel`; };

    get display() { return this.#display; };
    set display(value) {
        if (type_of(value) !== `boolean`) throw new type_error(`floating_panel display must be a boolean.`);
        this.#display = value;
    };
};