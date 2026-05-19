import { error, type_error } from "../../../../error.js";
import { kind_of, type_of } from "../../../../functions.js";
import { string } from "../../../../module/text/string.js";

export class xattribute {
    #name;
    #value;

    constructor(name, value = ``) {
        if (kind_of(name)  === `xattribute`) {
            this.#name = name.name;
            this.#value = name.value;
        } else if (type_of(name)  === `string`) {
            this.#name = name;
            this.#value = string.empty(value) ? true : `${value}`;
        } else if (name.nodeType === 2) {
            this.parse(name);
        } else {
            throw new type_error(`Unknown parameter type.`);
        }
    }

    /** @returns {String} */
    get kind() { return `xattribute`; };

    get name() { return this.#name; };
    set name(name) {
        if (type_of(name) !== `string`) throw new error(`attributes name must be a string.`);
        if (string.empty(name)) throw new error(`attributes name can not be empty.`);
        this.#name = name;
    };

    get value() { return this.#value; };
    set value(value) { this.#value = value; };

    /**
     * Generates an XML attribute node based on the current xattribute instance.
     * @param {XMLDocument} doc - The XML document to which the attribute node will be added.
     * @returns {Attr} - The generated XML attribute node.
     * @throws {type_error} - If the provided doc is not of XMLDocument type.
     */
    xml(doc) {
        if (doc.nodeType !== Node.DOCUMENT_NODE)
            throw new type_error(`doc must be of XMLDocument type.`);
        const n = doc.createAttribute(this.#name);
        if (type_of(this.#value)  !== `boolean`) n.value = string.html_escape(this.#value);
        return n;
    }

    /**
     * Parses the provided XML attribute and sets the name and value accordingly.
     * @param {Attr} xatt - The XML attribute to be parsed.
     * @returns {void}
     */
    parse(xatt) {
        this.name = xatt.name;
        this.value = string.empty(xatt.value) ? true : string.html_unescape(`${xatt.value}`);
    };

};
