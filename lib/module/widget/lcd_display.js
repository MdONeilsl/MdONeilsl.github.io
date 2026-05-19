//import { error, range_error, type_error } from "../../error.js";
import { kind_of, NULL } from "../../functions.js";
import { pointi } from "../gui/point.js";
import { rect_move_center, recti } from "../gui/rect.js";
//import { elem } from "../html.js";
import { ctx_draw_img, ctx_fill_rect, ctx_restore, ctx_save, ctx_set_fill_color } from "../rendering/2d/contex2d.js";
import { new_xnode, xnode } from "../system/format/xml/xnode.js";
import { string } from "../text/string.js";
import { widget } from "./widget.js";


export class lcd_display extends widget {
    #digits_numb;
    #value;
    #cmp = [`numb0`];
    #digits = [
        new recti(0, 0, 1, 2),
        new recti(0, 0, 1, 2),
        new recti(0, 0, 1, 2),
        new recti(0, 0, 1, 2)
    ];

    constructor(name, x, y, width, height) {
        super(name || `lcd_display_${string.uid()}`, x, y, width, height);
        this.digits_numb = 3;
        this.#value = 0;
        this.proprieties.font_tex = NULL; // Full texture with all numbers.
        this.proprieties.digit_tex = NULL; // The 8 sub-texture for this app.
    }

    static get BACK_CMP() { return 0x1; };
    static get FRONT_CMP() { return 0x2; };

    /** @returns {String} */
    get kind() { return `lcd_display`; };

    get proprieties_names() { return Array.from(new Set([`digits`, `value`, `font_tex`, ...super.proprieties_names])); };

    /** @returns {Boolean} */
    get is_container() { return false; };
    /** @returns {Array} */
    get childs() { return []; };

    get value() { return this.#value; };
    set value(value) {
        if (kind_of(value) === `number`) this.#value = value;
        else throw new type_error(`value parameter must be a number.`);
    }

    get digits_numb() { return this.#digits_numb; };
    set digits_numb(value) {
        if (kind_of(value) !== `number`) throw new type_error(`digits parameter must be a number.`);
        this.#digits_numb = value;

        this.#cmp = [];
        for (let i = 0; i < this.#digits_numb; i++) {
            this.#cmp.push(`numb${i}`);
        }

        this.#divide_rectangle(this.rect, this.#digits_numb, 2);
    }

    get cmp() { return this.#cmp; };
    get signals() { return [`changed`]; };
    get slots() { return [`value`]; };

    digits(index) {
        if (index < 0 || index >= this.#digits_numb) throw new range_error(`index out of bounds.`);
        //console.log(index, this.#digits);
        return this.#digits[index];
    };

    get_event(cmp) {
        switch (cmp) {
            //case `check`: return [`checked`, `unchecked`];
            default: throw new error(`Unknow component. ${cmp}`);
        }
    };

    append_child(obj) {
        let p = this.parent;
        while (p && !p.is_container) p = p.parent;
        if (p) p.append_child(obj);
        else throw new error(`Error while appending child widget.`);
    };

    /**
 * @param {canvas} canv 
 * @param {Boolean} press 
 */
    draw(canv, cmp) {
        ctx_save(canv);

        ctx_set_fill_color(canv.ctx, this.proprieties.back_color);

        if (cmp & lcd_display.BACK_CMP) {
            const back_image = this.proprieties.back_image;
            if (back_image) {
                const bimg = string.is_integer(back_image) ? elem(back_image) : back_image;
                const source = new recti(0, 0, bimg.width, bimg.height);
                ctx_draw_img(canv.ctx, bimg, source, this.rect, this.proprieties.back_color.unit.alpha);
            } else {
                ctx_set_fill_color(canv.ctx, this.proprieties.back_color);
                ctx_fill_rect(canv.ctx, this.proprieties.geometry);
            }
        }

        if (cmp & lcd_display.FRONT_CMP) {
            const digit_tex = this.proprieties.digit_tex;
            if (digit_tex) {
                const bimg = string.is_integer(digit_tex) ? elem(digit_tex) : digit_tex;
                //console.log(digit_tex);

                this.#divide_rectangle(this.rect, this.#digits_numb, 2);
                const source = new recti(0, 0, bimg.width, bimg.height);
                for (let i = 0; i < this.#digits_numb; ++i) {
                    ctx_draw_img(canv.ctx, bimg, source, this.#digits[i], this.proprieties.back_color.unit.alpha);
                }
            }
        }

        ctx_restore(canv);
    }


    #divide_rectangle(rect, n, margin) {
        // Ensure the margin is respected
        const margin_w = (rect.width * (margin / 54));
        const margin_h = (rect.height * (margin / 33));
        //console.log(margin_w, margin_h);

        const inner_width = Math.floor(rect.width - (2 * margin_w));
        const inner_height = Math.floor(rect.height - (2 * margin_h));
        //console.log(inner_width, inner_height);

        const sub_width = Math.round(inner_width / n);

        for (let i = 0; i < n; i++) {
            const left = rect.left + margin_w + Math.floor(sub_width * 0.5);
            const top = rect.top + Math.floor(margin_h);

            this.#digits[i].width = sub_width;
            this.#digits[i].height = inner_height;

            rect_move_center(this.#digits[i], new pointi(left + (i * sub_width), top + (inner_height * 0.5)));
        }
    };

    to_xml() {
        const node = new_xnode(`widget`, { type: this.kind, name: this.name });

        this.property_to_xml(node, this);

        const digit_node = node.append_child(new_xnode(`property`, { name: `digits` }));
        digit_node.append_child(new_xnode(`int`, {}, `${this.digits_numb}`));

        const value_node = node.append_child(new_xnode(`property`, { name: `value` }));
        value_node.append_child(new_xnode(`int`, {}, `${this.value}`));

        

        if (this.childs.length !== 0) {
            const childs = node.append_child(new xnode(`childs`));
            this.childs.map(e => childs.append_child(e.to_xml()));
        }

        return node;
    };

    /** @param {xnode} */
    from_xml(node) {
        this.xml_to_property(node);

        const digit_node = node.child_by_attr(`name`, `digits`);
        if (digit_node) this.digits_numb = parseInt(digit_node.child_by_name(`int`).value);

        const value_node = node.child_by_attr(`name`, `value`);
        if (value_node) this.value = parseInt(value_node.child_by_name(`int`).value);
    };
};


