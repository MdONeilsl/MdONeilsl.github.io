import { type_error } from "../../../../error.js";
import { kind_of, type_of } from "../../../../functions.js";
import { string } from "../../../text/string.js";


export class xtext {
    #value;

    constructor(arg) {
        if (kind_of(arg) === `xtext`) {
            this.value = arg.value;
        }
        else {
            //console.log(arg, type_of(arg));
            switch (type_of(arg) ) {
                case `string`: this.value = arg; break;
                case `Text`: this.value = arg.textContent ? arg.textContent : arg.innerText; break;
                case `object`: {
                    if (arg.nodeType === 3) this.parse(arg);
                    else throw new type_error(`Wrong XML node type for xtext.`);
                } break;
                default: throw new type_error(`Wrong XML node type for xtext.`);
            }
        }

    };

    /** @returns {String} */
    get kind() { return `xtext`; };

    get value() { return this.#value; };
    set value(value) {
        if (type_of(value) !== `string`) throw new type_error(`xtext.value must be of type string.`);
        this.#value = value;
        //console.trace(this.#value);
    };

    /**
     * Checks if the value of the current xtext instance is equal to the value of the provided xtext instance.
     * @param {xtext} x - The xtext instance to compare with.
     * @returns {boolean} - True if the values are equal, otherwise false.
     */
    is(node) { return this.#value === node.value; };

    /**
     * Parses the provided XML element and sets the value of the current xtext instance after unescaping XML entities.
     * @param {Node} xelem - The XML element to parse.
     */
    parse(xelem) { this.#value = string.xml_unescape(xelem.data); };

    /**
     * Returns a new XML text node containing the XML-escaped value of the current xtext instance.
     * @param {Document} doc - The XML document in which the text node will be created.
     * @returns {Node} - The newly created XML text node containing the XML-escaped value.
     */
    xml(doc) { return doc.createTextNode(this.#value); };

};
