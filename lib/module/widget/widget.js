//import { error, type_error } from '../../error.js';
import { kind_of, NULL } from '../../functions.js';
import { color, color_equals, color_set, color_to_xml, xml_to_color } from '../gui/color.js';
import { font, font_to_xml, xml_to_font } from '../gui/font.js';
import { pointi } from '../gui/point.js';
import {
    rect_contains_point, rect_from_xml, rect_move_top_left,
    rect_set_size, rect_size, rect_to_xml, rect_top_left, recti
} from '../gui/rect.js';
import { sizei } from '../gui/size.js';
import { elem } from '../html.js';
import { numb } from '../math/number.js';
import { ctx_draw_img, ctx_fill_rect, ctx_restore, ctx_save, ctx_set_fill_color } from '../rendering/2d/contex2d.js';
import { new_xnode, xnode } from '../system/format/xml/xnode.js';
import { string } from '../text/string.js';

const pr = new recti();

export class widget {
    #name;
    #uuid;
    #parent = NULL;
    #proprieties = {
        geometry: NULL,
        enable: true,
        //icon: undefined,
        back_color: NULL,
        back_image: NULL,
        color: NULL,
        font: NULL,
        z_offset: 0,
    };
    #childs = [];
    #container = true;

    /**
     * @param {String} name 
     * @param {point} pos 
     */
    constructor(name, x = 0, y = 0, width = 5, height = 5) {
        this.#name = name || `widget_${string.uid()}`;
        this.#proprieties.geometry = new recti(x, y, width, height);
        this.#proprieties.back_color = new color(color.RGBA, 255, 255, 255, 255);
        this.#proprieties.color = new color(color.RGBA, 0, 0, 0, 255);
        this.#proprieties.font = new font(`Georgia, serif`, 12);
        this.#uuid = crypto.randomUUID();
    }


    /** @returns {String} */
    get kind() { return `widget`; };

    /** @returns {Array} */
    get proprieties_names() { return [`name`, ...Object.keys(this.#proprieties)]; };
    /** @returns {Object} */
    get proprieties() { return this.#proprieties; };

    /** @returns {String} */
    get name() { return this.#name; };
    /** @param {String} name*/
    set name(name) {
        if (kind_of(name) !== `string`) throw new type_error(`widget name must be string.`);
        if (string.is_key(name)) throw new error(`widget name can not be a uuid.`);
        this.#name = name;
    };

    /** @returns {Object} */
    get parent() { return this.#parent; };
    /** @param {Object} name*/
    set parent(x) { this.#parent = x; };

    /** @returns {Boolean} */
    get enable() { return this.#proprieties.enable; };
    /** @param {Boolean} is*/
    set enable(is) {
        if (kind_of(is) !== `boolean`) throw new type_error(`param must be a boolean type`);
        this.#proprieties.enable = is;
    };

    /** @returns {point} */
    get pos() { return rect_top_left(this.#proprieties.geometry, new pointi()); };
    /** @param {point} p*/
    set pos(p) {
        if (kind_of(p) !== `point`) throw new type_error(`position must be a point type`);
        rect_move_top_left(this.#proprieties.geometry, p);
    };

    /** @returns {size} */
    get size() { return rect_size(this.#proprieties.geometry, new sizei()); };
    /** @param {size} s*/
    set size(s) {
        if (kind_of(s) === `size`) rect_set_size(this.#proprieties.geometry, s);
        else throw new type_error(`size must be a size type`);
    };

    /** @returns {rect} */
    get rect() { return this.#proprieties.geometry; };

    get width() { return this.#proprieties.geometry.width; };
    get height() { return this.#proprieties.geometry.height; };

    get z_offset() { return this.#proprieties.z_offset; };
    set z_offset(value) {
        if (kind_of(value) === `number`) {
            if (!this.parent) return;

            if (value < 0) value = 0;
            for (const child of this.#childs) {
                const offset = child.z_offset - this.z_offset;
                child.z_offset = offset + value;
            }
            this.#proprieties.z_offset = value;
        }
        else throw new type_error(`z_offset must be a number type.`);
    };

    /** @returns {Boolean} */
    get is_container() { return this.#container; };
    /** @returns {Array} */
    get childs() { return this.#childs; };

    get uuid() { return this.#uuid; };

    get cmp() { return []; };
    get act_cmp() { return []; };
    get states() { return []; };
    get signals() { return []; };
    get slots() { return []; };
    get_event(cmp) { throw new error(`Unknow component.`); };

    /** @returns {Boolean} */
    has_childs() { return this.#childs.length !== 0; };

    /**
     * Retrieves a child widget by its name.
     *
     * This method searches through the child widgets of the current widget.
     * If the widget with the specified name is not found among the immediate children,
     * it recursively searches through the child widgets.
     *
     * @param {String} name - The name of the child widget to search for.
     * @returns {widget|undefined} - Returns the child widget if found; otherwise, returns undefined.
     */
    child_by_name(name) {
        for (const child of this.#childs) {
            if (child.name === name) return child;
            const found = child.child_by_name(name);
            if (found) return found;
        }
        return NULL;
    }

    /**
     * Retrieves a child widget by its UUID.
     *
     * This method searches through the child widgets of the current widget.
     * If the widget with the specified UUID is not found among the immediate children,
     * it recursively searches through the child widgets.
     *
     * @param {String} uuid - The UUID of the child widget to search for.
     * @returns {widget|undefined} - Returns the child widget if found; otherwise, returns undefined.
     */
    child_by_uuid(uuid) {
        for (const child of this.#childs) {
            if (child.uuid === uuid) return child;
            const found = child.child_by_uuid(uuid);
            if (found) return found;
        }
        return NULL;
    }

    /**
     * Retrieves a child widget by its position.
     *
     * This method searches through the child widgets of the current widget
     * and returns the first child that contains the specified position.
     * If no child contains the position, it recursively searches through 
     * the child widgets.
     *
     * @param {Object} pos - The position to search for, with x and y coordinates.
     * @returns {widget|undefined} - Returns the child widget if found; otherwise, returns undefined.
     */
    child_by_pos(pos) {
        for (const child of this.#childs) {
            const ret = child.child_by_pos(pos);
            if (ret) return ret;

            if (rect_contains_point(child.proprieties.geometry, pos)) {
                return child;
            }
        }
        return NULL;
    }

    /**
     * Checks if a child widget or its descendants include the specified identifier.
     *
     * @param {String} id - The identifier (UUID or name) to search for.
     * @returns {Boolean} - Returns true if the identifier is found; otherwise, false.
     */
    includes(id) {
        if (!this.#container || this.#childs.length === 0) return false;

        const is_uuid = string.is_key(id);
        for (const child of this.#childs) {
            if ((is_uuid ? child.uuid === id : child.name === id) || child.includes(id)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Appends a child widget to the current widget.
     *
     * @param {widget} obj - The child widget to be appended.
     * @returns {widget} - The appended child widget.
     * @throws {error} - Throws an error if the widget cannot contain children or if a child with the same name already exists.
     */
    append_child(obj) {
        if (!this.#container) throw new error(`This widget cannot contain child widget.`);
        //console.log(this);
        if (this.includes(obj.name)) throw new error(`This widget already contains a child widget named: "${obj.name}".`);
        obj.inherit(this);
        return this.#childs[this.#childs.push(obj) - 1]; // Optimize push and return last item
    }

    /**
     * Removes a child widget by name.
     *
     * @param {String} name - The name of the child widget to remove.
     */
    remove_child(name) {
        const index = this.#childs.findIndex(obj => obj.name === name);
        if (index !== -1) {
            this.#childs.splice(index, 1);
        }
    }

    /**
     * Calculates and returns the bounding box (bb) of the widget and its child widgets.
     * The bounding box is the smallest rectangle that encloses all child widgets.
     *
     * @returns {recti} The bounding box of the widget and its child widgets.
     */
    bb() {
        let width = this.width, height = this.height;
        for (const child of this.children) {
            const geo = child.proprieties.geometry;
            width = Math.max(width, geo.x + geo.width);
            height = Math.max(height, geo.y + geo.height);
        }
        return new recti(0, 0, width, height);
    }

    /**
     * Draws the widget onto the specified canvas.
     *
     * @param {canvas} canv - The canvas object where the widget will be drawn.
     * @returns {canvas} The canvas object after drawing the widget.
     */
    draw(canv) {
        ctx_save(canv);

        const back_image = this.proprieties.back_image;
        if (back_image) {
            let bimg = kind_of(back_image) === `string` ? elem(back_image) : back_image;

            const source = new recti(0, 0, bimg.width, bimg.height);
            ctx_draw_img(canv, bimg, source, this.rect, this.proprieties.back_color.unit.alpha);
        } else {
            ctx_set_fill_color(canv, this.proprieties.back_color);
            ctx_fill_rect(canv, this.proprieties.geometry);
        }

        ctx_restore(canv);
        return canv;
    }

    /**
     * Inherits properties from parent widget.
     *
     * @param {widget} from - The widget to inherit properties from.
     * This method sets the parent widget, copies the background color, text color,
     * font properties, and adjusts the z-index offset.
     */
    inherit(from) {
        this.#parent = from;

        const { back_color, color, font } = from.proprieties;
        const bc = back_color.rgba;
        color_set(this.proprieties.back_color, 3, bc.red, bc.green, bc.blue, bc.alpha);

        const tc = color.rgba;
        color_set(this.proprieties.color, 3, tc.red, tc.green, tc.blue, tc.alpha);

        this.proprieties.font.from(font);
        this.z_offset = from.z_offset + 1;
    }

    /**
     * Converts the widget and its properties into an XML node representation.
     *
     * @returns {xnode} An xnode representing the widget with its attributes and children.
     */
    to_xml() {
        const node = new xnode(`widget`);
        node.set_attribute(`type`, this.kind);
        node.set_attribute(`name`, this.name);

        this.property_to_xml(node, this);

        if (this.#childs.length) {
            const childs = node.append_child(new xnode(`childs`));
            for (const e of this.#childs) {
                childs.append_child(e.to_xml());
            }
        }

        return node;
    }


    /**
     * Converts properties of the given object into XML format and appends them to the provided node.
     *
     * @param {xnode} node - The XML node to which properties will be appended.
     * @param {Object} obj - The object containing properties to convert.
     */
    property_to_xml(node, obj) {
        const parent = obj.parent;

        node.append_child(
            new_xnode(`property`, { name: `geometry` }, rect_to_xml(obj.rect))
        );

        if (string.is_integer(obj.proprieties?.icon)) {
            const icon = node.append_child(new_xnode(`property`, { name: `icon` }));
            icon.append_child(new_xnode(`string`, NULL, obj.proprieties.icon));
        }

        const bc = obj.proprieties?.back_color;
        if (!parent || !color_equals(bc, parent.proprieties.back_color)) {
            node.append_child(new_xnode(`property`, { name: `back_color` }, color_to_xml(bc)));
        }

        if (string.is_integer(obj.proprieties.back_image)) {
            const back_image = node.append_child(new_xnode(`property`, { name: `back_image` }));
            back_image.append_child(new_xnode(`string`, NULL, obj.proprieties.back_image));
        }

        if (string.is_integer(obj.proprieties.font_tex)) {
            const font_tex = node.append_child(new_xnode(`property`, { name: `font_tex` }));
            font_tex.append_child(new_xnode(`string`, NULL, obj.proprieties.font_tex));
        }

        const font = obj.proprieties.font;
        if (!parent || !font.same(parent.proprieties.font)) {
            node.append_child(new_xnode(`property`, { name: `font` }, font_to_xml(font)));
        }

        const c = obj.proprieties?.color;
        if (!parent || !color_equals(c, parent.proprieties.color)) {
            node.append_child(new_xnode(`property`, { name: `color` }, color_to_xml(c)));
        }

        const z = obj.proprieties?.z_offset;
        if (z) {
            const z_node = new_xnode(`int`, {}, `${z}`);
            node.append_child(new_xnode(`property`, { name: `z_offset` }, z_node));
        }
    }


    /** @param {xnode} */
    from_xml(node) {
        this.xml_to_property(node);
    };

    /** @param {xnode} */
    xml_to_property(node) {
        this.name = node.get_attribute(`name`);

        for (const child of node.childrens) {
            if (child.name !== `property`) continue;

            switch (child.get_attribute(`name`)) {
                case `geometry`: {
                    this.proprieties.geometry = rect_from_xml(child.child_by_name(`rect`));
                } break;
                case `icon`: {
                    this.proprieties.icon = child.child_by_name(`string`).value;
                } break;
                case `back_color`: {
                    this.proprieties.back_color = xml_to_color(child.child_by_name(`color`));
                } break;
                case `back_image`: {
                    this.proprieties.back_image = child.child_by_name(`string`).value;
                } break;
                case `press_tex`: {
                    this.proprieties.press_tex = child.child_by_name(`string`).value;
                } break;
                case `effect_tex`: {
                    this.proprieties.effect_tex = child.child_by_name(`string`).value;
                } break;
                case `chariot_tex`: {
                    this.proprieties.chariot_tex = child.child_by_name(`string`).value;
                } break;
                case `font_tex`: {
                    this.proprieties.font_tex = child.child_by_name(`string`).value;
                } break;
                case `font`: {
                    this.proprieties.font = xml_to_font(child.child_by_name(`font`));
                } break;
                case `color`: {
                    this.proprieties.color = xml_to_color(child.child_by_name(`color`));
                } break;
                case `z_offset`: {
                    this.proprieties.z_offset = numb.parse(child.child_by_name(`int`).value);
                } break;
                //default: throw new error(`Unknow property type.`);
            }

        }
    };

};


