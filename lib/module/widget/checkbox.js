//import { error, type_error } from "../../error.js";
import { kind_of, NULL } from "../../functions.js";
import { recti } from "../gui/rect.js";
//import { elem } from "../html.js";
import { ctx_draw_img, ctx_restore, ctx_save, ctx_set_alpha, ctx_set_fill_color } from "../rendering/2d/contex2d.js";
import { new_xnode, xnode } from "../system/format/xml/xnode.js";
import { string } from "../text/string.js";
import { widget } from "./widget.js";

const pr = new recti();

export class checkbox extends widget {
    #checked;
    #group = ``;
    #click_sound;
    #container = false;

    constructor(name, x, y, width, height) {
        super(name || `checkbox_${string.uid()}`, x, y, width, height);
        this.#checked = false;
        this.proprieties.press_tex = NULL;
        this.#click_sound = ``;
    }
    

    static get BACK_CMP() { return 0x1; };
    static get FRONT_CMP() { return 0x2; };

    /** @returns {String} */
    get kind() { return `checkbox`; };

    get proprieties_names() { return Array.from(new Set([`checked`, `group`, `press_tex`, `click_sound`, ...super.proprieties_names])); };

    /** @returns {Boolean} */
    get is_container() { return false; };
    /** @returns {Array} */
    get childs() { return []; };

    get checked() { return this.#checked; };
    set checked(value) {
        if (kind_of(value) !== `boolean`) throw new type_error(`effect parameter must be a boolean.`);
        this.#checked = value;
    }

    get group() { return this.#group; };
    set group(value) {
        if (kind_of(value) !== `string`) throw new type_error(`group must be a string.`);
        this.#group = value;
    }

    get click_sound() { return this.#click_sound; };
    set click_sound(value) {
        if (kind_of(value) === `string`) this.#click_sound = value;
        else throw new type_error(`click_sound must be a string.`);
    }

    get cmp() { return [`check`]; };
    get act_cmp() { return [`check`]; };
    get states() { return [`checked`, `unchecked`]; };
    get signals() { return [`check`, `uncheck`, `changed`]; };
    get slots() { return [`checked`]; };

    get_event(cmp) {
        if (cmp === 'check') return ['checked', 'unchecked'];
        throw new error(`Unknown component: ${cmp}`);
    }
    

    append_child(obj) {
        let p = this.parent;
        while (p && !p.is_container) p = p.parent;
        if (p) {
            p.append_child(obj);
        } else {
            throw new error('Error while appending child widget.');
        }
    }
    

     /**
     * Draws the button on the specified canvas.
     * 
     * @param {canvas} canv - The canvas to draw on.
     * @param {Boolean} cmp - A bitmask indicating which components to draw.
     */
     draw(canv, cmp) {
        ctx_save(canv);
        
        const { back_color } = this.proprieties;
        ctx_set_alpha(canv, back_color.unit.alpha);
        ctx_set_fill_color(canv, back_color);

        // Draw background image or fill rectangle
        if (cmp & checkbox.BACK_CMP) {
            const bimg = this.proprieties.back_image;
            if (bimg) {
                const img = string.is_integer(bimg) ? elem(bimg) : bimg;
                const source = new recti(0, 0, img.width, img.height);
                ctx_draw_img(canv.ctx, img, source, this.rect, back_color.unit.alpha);
            } else {
                ctx_fill_rect(canv, this.proprieties.geometry);
            }
        } 

        // Draw pressed texture if checked
        if (this.#checked && cmp & checkbox.FRONT_CMP && this.proprieties.press_tex) {
            const bimg = this.proprieties.press_tex;
            const img = string.is_integer(bimg) ? elem(bimg) : bimg;
            const source = new recti(0, 0, img.width, img.height);
            ctx_draw_img(canv.ctx, img, source, this.rect, back_color.unit.alpha);
        }

        ctx_restore(canv);
    }

    to_xml() {
        const node = new_xnode(`widget`, { type: this.kind, name: this.name });

        this.property_to_xml(node, this);

        const pt = this.proprieties.press_tex;
        if (string.is_integer(this.proprieties.press_tex)) {
            const press_tex = node.append_child(new_xnode(`property`, { name: `press_tex` }));
            press_tex.append_child(new_xnode(`string`, {}, pt));
        }

        const checked_node = node.append_child(new_xnode(`property`, { name: `checked` }));
        checked_node.append_child(new_xnode(`bool`, {}, `${this.checked ? `true` : `false`}`));

        const group_node = node.append_child(new_xnode(`property`, { name: `group` }));
        group_node.append_child(new_xnode(`string`, {}, string.html_escape(this.group)));

        if (this.click_sound) {
            const click_sound_node = node.append_child(new_xnode(`property`, { name: `click_sound` }));
            click_sound_node.append_child(new_xnode(`string`, {}, string.html_escape(this.click_sound)));
        }
        

        if (this.childs.length !== 0) {
            const childs = node.append_child(new xnode(`childs`));
            this.childs.map(e => childs.append_child(e.to_xml()));
        }

        return node;
    };

    /** @param {xnode} */
    from_xml(node) {
        this.xml_to_property(node);

        const checked_node = node.child_by_attr(`name`, `checked`);
        if (checked_node) this.checked = checked_node.child_by_name(`bool`).value === `true`;

        const group_node = node.child_by_attr(`name`, `group`);
        if (group_node) this.group =  string.html_unescape(group_node.child_by_name(`string`).value);

        const click_sound_node = node.child_by_attr(`name`, `click_sound`);
        if (click_sound_node) {
            const txt = click_sound_node.child_by_name(`string`).value;
            this.#click_sound = string.html_unescape(txt);
        }
    };
};

