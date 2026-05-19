import { error } from "../../error.js";
import { kind_of } from "../../functions.js";
import { string } from "../text/string.js";
import { xnode } from "../system/format/xml/xnode.js";
//import { canvas } from "./canvas.js";
import { pointi } from "./point.js";
import { rect_center } from "./rect.js";
import { ctx_set_composite_operation } from "../rendering/2d/contex2d.js";

const align_list = [`left`, `right`, `center`, `start`, `end`];
const baseline_list = [`top`, `hanging`, `middle`, `alphabetic`, `ideographic`, `bottom`];
const direction_list = [`ltr`, `rtl`, `inherit`];

const anchor = new pointi();
const pp = new pointi();

export class text {
    /** @type {String} */
    #string;

    /** @type {String} */
    #align;

    /** @type {String} */
    #baseline;

    /** @type {String} */
    #direction;

    /**
     * Constructor for the text class.
     * @param {String} str - The text string.
     * @param {String} aling - The text alignment. Default is 'left'.
     * @param {String} baseline - The text baseline. Default is 'alphabetic'.
     * @param {String} direction - The text direction. Default is 'inherit'.
     */
    constructor(str = ``, aling = `left`, baseline = `alphabetic`, direction = `inherit`) {
        this.string = str;
        this.align = aling;
        this.baseline = baseline;
        this.direction = direction;
    };

    /** @returns {String} */
    get kind() { return `text`; };

    /** @returns {Array} */
    get proprieties_list() { return [`text`, `align`, `baseline`, `direction`]; };

    /** @returns {String} */
    get string() { return this.#string; };
    /** @param {String} x */
    set string(x) {
        if (kind_of(x) !== `string`) throw new error(`text must be string.`);
        this.#string = x;
    };

    /** @returns {String} */
    get align() { return this.#align; };
    /** @param {String} x */
    set align(x) {
        if (!align_list.includes(x)) throw new error(`invalid text-align string.`);
        this.#align = x;
    };

    /** @returns {String} */
    get baseline() { return this.#baseline; };
    /** @param {String} x */
    set baseline(x) {
        if (!baseline_list.includes(x)) throw new error(`invalid text-baseline string.`);
        this.#baseline = x;
    };

    /** @returns {String} */
    get direction() { return this.#direction; };
    /** @param {String} x */
    set direction(x) {
        if (!direction_list.includes(x)) throw new error(`invalid text-direction string.`);
        this.#direction = x;
    };

    /**
     * Draws the text on the canvas at the specified position.
     * @param {canvas} canv - The canvas object to draw on.
     * @param {rect} box - The rectangle that defines the drawing area.
     */
    draw(canv, box) {
        canv.ctx.save();

        ctx_set_composite_operation(canv.ctx, `source-over`);
        // Set the text alignment based on the specified property.
        canv.ctx.textAlign = this.#align;
        switch (this.#align) {
            case `left`: case `start`: anchor.x = box.left; break;
            case `center`: anchor.x = rect_center(box, pp).x; break;
            case `right`: case `end`: anchor.x = box.right; break;
        }

        // Set the text baseline based on the specified property.
        canv.ctx.textBaseline = this.#baseline;
        switch (this.#baseline) {
            case `top`: case `hanging`: anchor.y = box.top; break;
            case `middle`: case `alphabetic`: anchor.y = rect_center(box, pp).y; break;
            case `ideographic`: case `bottom`: anchor.y = box.bottom; break;
        }

        // Set the text direction based on the specified property.
        canv.ctx.direction = this.#direction;
        const metric = canv.ctx.measureText(this.#string);
        if (this.#direction === `rtl`) anchor.x += metric.width;

        // Draw the text at the specified position.
        canv.ctx.fillText(this.#string, anchor.x, anchor.y);
        canv.ctx.restore();
    };

};

/**
 * Function that converts a text object into an XML node.
 * @param {text} x - The text object to be converted.
 * @returns {xnode} - An XML node representing the text object.
 */
export const text_to_xml = x => {
    // Create a new XML node with the tag 'text'
    const node = new xnode('text');

    // Append a child node representing the string value after escaping HTML characters
    node.append_child(new xnode('string')).value = string.html_escape(x.string);

    // Append child nodes for non-default attributes if they differ from default values
    if (x.align !== 'left')
        node.append_child(new xnode('align')).value = x.align;

    if (x.baseline !== 'alphabetic')
        node.append_child(new xnode('baseline')).value = x.baseline;

    if (x.direction !== 'inherit')
        node.append_child(new xnode('direction')).value = x.direction;

    // Return the constructed XML node
    return node;
};


/**
 * Function that converts an XML node into a text object.
 * @param {xnode} x - The XML node to be converted.
 * @returns {text} - A text object representing the XML node.
 */
export const xml_to_text = x => {
    // Create a new text object
    const t = new text();

    // Extract and assign values from child nodes if they exist
    let child = x.child_by_name(`string`);
    if (child) t.string = child.value;

    child = x.child_by_name(`align`);
    if (child) t.align = child.value;

    child = x.child_by_name(`baseline`);
    if (child) t.baseline = child.value;

    child = x.child_by_name(`direction`);
    if (child) t.direction = child.value;

    // Return the text object
    return t;
};

