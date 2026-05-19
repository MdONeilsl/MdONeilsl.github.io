import { array } from "../../../array.js";
import { error, type_error } from "../../../../error.js";
import { kind_of, type_of } from "../../../../functions.js";
import { string } from "../../../text/string.js";
import { xattribute } from "./xattributes.js";
import { xtext } from "./xtext.js";



export class xnode {
    #name;
    #attributes = [];
    #childs = [];

    /** @param {string|xnode} name */
    constructor(arg) {
        if (kind_of(arg) === `xnode`) {
            this.name = arg.name;
            this.value = arg.value;
            arg.attributes.forEach(att => this.#attributes.push(new xattribute(att)));
            arg.childrens.forEach(node => this.#childs.push(new xnode(node)));
        } else if (type_of(arg) === `string`) {
            this.name = arg;
        } else if (arg && arg.nodeType === 1) {
            this.parse(arg);
        } else {
            throw new type_error(`Invalid parameter type.`);
        }
    };

    /** @returns {String} */
    get kind() { return `xnode`; };

    get name() { return this.#name; };
    set name(name) {
        if (type_of(name) !== `string`) throw new type_error(`Node name must be a string.`);
        if (string.empty(name)) throw new error(`Node element must be named.`);
        this.#name = name;
    };

    get value() {
        let value = ``;
        this.#childs.forEach(n => {
            if (kind_of(n) === `xtext`) value += n.value;
        });
        return value;
    };
    set value(x) {
        this.#childs = this.#childs.filter(n => kind_of(n) !== `xtext`);
        this.#childs.push(new xtext(`${x}`));
    };

    /** @returns {xattribute[]} */
    get attributes() { return this.#attributes; }
    /** @returns {Number} */
    get attribute_count() { return this.#attributes.length; }

    /** @returns {xnode[]} */
    get childrens() { return this.#childs; }
    /** @returns {Number} */
    get childs_count() { return this.#childs.length; }

    /**
     * Checks if the current xnode has an attribute with the given name.
     * @param {String} name - The name of the attribute to check for existence.
     * @returns {Boolean} - Returns true if the xnode has an attribute with the given name, otherwise false.
     */
    has_attribute(name) {
        return this.#attributes.some(e => e.name === name);
    };

    /**
     * Gets the value of the attribute with the given name.
     * @param {String} name - The name of the attribute to retrieve the value for.
     * @returns {String|null} - The value of the attribute if found, otherwise null.
     */
    get_attribute(name) {
        const attr = this.#attributes.find(e => e.name === name);
        return attr ? attr.value : null;
    }

    /**
     * Sets or updates the attribute with the given name and value.
     * If the attribute with the given name does not exist, a new attribute is added.
     * If the attribute with the given name already exists, its value is updated.
     * @param {String} name - The name of the attribute to be set or updated.
     * @param {String} [value=""] - The value to be assigned to the attribute. Defaults to an empty string if not provided.
     * @returns {xattribute} - The added or updated xattribute object.
     */
    set_attribute(name, value = ``) {
        const index = this.#attributes.findIndex(e => e.name === name);
        if (index === -1) {
            this.#attributes.push(new xattribute(name, value));
            return array.last(this.#attributes);
        }
        else {
            this.#attributes[index].value = value;
            return this.#attributes[index];
        }
    }

    /**
     * Appends a child node to the current xnode.
     * @param {xnode|xtext} node - The node to be appended as a child. It must be an instance of xnode or xtext.
     * @throws {error} - Throws an error if the provided node is not an instance of xnode or xtext.
     * @returns {xnode|xtext} - The appended child node.
     */
    append_child(node) {
        const kind = kind_of(node);
        if (kind !== `xnode` && kind !== `xtext`) throw new error(`Fail to add child node.`);
        this.#childs.push(node);
        return array.last(this.#childs);
    };

    /**
     * Checks if the current xnode contains the given xnode.
     * @param {xnode} node - The xnode to check for containment.
     * @returns {Boolean} - Returns true if the current xnode contains the given xnode, otherwise false.
     */
    contains(node) {
        return this.#childs.some(child => child.is(node));
    };

    /**
     * Creates a new xnode instance that is a copy of the current xnode.
     * @returns {xnode} - A new xnode instance that is a copy of the current xnode.
     */
    clone() {
        return new xnode(this);
    };

    /**
     * Checks if the current xnode is equal to the given xnode.
     * @param {xnode} node - The xnode to compare with.
     * @returns {Boolean} - Returns true if the xnodes are equal, otherwise false.
     */
    is(node) {
        if (this.name !== node.name) return false;
        if (this.childs_count !== node.childs_count) return false;
        if (this.attribute_count !== node.attribute_count) return false;

        for (const attribute of node.attributes)
            if (!this.has_attribute(attribute.name) || this.get_attribute(attribute.name) !== node.get_attribute(attribute.name)) return false;

        for (let it = this.childs_count; it--;) 
            if (!this.#childs[it].is(node.childrens[it])) return false;

        return true;
    };

    /**
     * Retrieves a child node of the current xnode based on the specified name.
     * @param {String} name - The name of the child node to search for.
     * @returns {xnode|undefined} - The child node with the specified name, or undefined if not found.
     */
    child_by_name(name) { return this.#childs.find(e => e.name === name); };

    /**
     * Retrieves a child node of the current xnode based on the specified attribute and its value.
     * If a child node with the specified attribute and value is found, it is returned; otherwise, undefined is returned.
     * @param {String} attr - The name of the attribute to search for.
     * @param {String} value - The value of the attribute to match.
     * @returns {xnode|undefined} - The child node with the specified attribute and value, or undefined if not found.
     */
    child_by_attr(attr, value) {
        for (const node of this.#childs) {
            if (kind_of(node) === `xnode`) {
                if (node.get_attribute(attr) === value) return node;
                const sub = node.child_by_attr(attr, value);
                if (sub) return sub;
            }
        }
        return undefined;
    };

    /**
     * Generates an XML representation of the xnode and its descendants.
     * @param {Document} doc - The XML document to create the XML representation.
     * @returns {Element} - The XML element representing the xnode and its descendants.
     */
    xml(doc) {
        const node = doc.createElement(this.#name);
        this.#attributes.forEach(e => node.setAttributeNode(e.xml(doc)));
        this.#childs.forEach(e => node.appendChild(e.xml(doc)));
        return node;
    };

    /**
     * Parses the given XML element and populates the xnode instance with its data.
     * @param {Element} xelem - The XML element to be parsed.
     * @returns {void}
     */
    parse(xelem) {
        this.name = xelem.nodeName;

        // Parse attributes
        Array.from(xelem.attributes).forEach(att => this.#attributes.push(new xattribute(att)));

        // Parse child nodes
        Array.from(xelem.childNodes).forEach(node => {
            if (node.nodeType === 1) { // Element node
                this.#childs.push(new xnode(node));
            } else if (node.nodeType === 3 && node.data.trim()) { // Text node
                this.#childs.push(new xtext(node));
            }
        });
    };

};


export const new_xnode = (name, att, value) => {
    const node = new xnode(name);

    if (att) {
        for (const [key, value] of Object.entries(att)) {
            node.set_attribute(key, value);
        }
    }

    if (value) {
        if (kind_of(value) === 'xnode')
            node.append_child(value);
        else node.value = `${value}`;
    }

    return node;
};



