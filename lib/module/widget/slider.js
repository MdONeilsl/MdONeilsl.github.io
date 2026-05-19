//import { error, type_error } from "../../error.js";
import { kind_of, NULL } from "../../functions.js";
//import { canvas } from "../gui/canvas.js";
import { recti } from "../gui/rect.js";
import { elem } from "../html.js";
import { numb } from "../math/number.js";
import { ctx_draw_img, ctx_restore, ctx_save } from "../rendering/2d/contex2d.js";
import { new_xnode } from "../system/format/xml/xnode.js";
import { string } from "../text/string.js";
import { widget } from "./widget.js";

const pr = new recti();

export class slider extends widget {
    #min_value;
    #max_value;
    #value;
    #vertical = false;
    #tic_sound;

    constructor(name, x, y, width, height) {
        super(name || `slider_${string.uid()}`, x, y, width, height);
        this.#min_value = 0;
        this.#max_value = 100;
        this.#value = 50;
        this.proprieties.chariot_tex = NULL;
        this.#tic_sound = ``;
    };

    static get BACK_CMP() { return 0x1; };
    static get FRONT_CMP() { return 0x2; };

    /** @returns {String} */
    get kind() { return `slider`; };

    get proprieties_names() { return Array.from(new Set([`value`, `min_max_value`, `chariot_tex`, `vertical`, `tic_sound`, ...super.proprieties_names])); };

    /** @returns {Boolean} */
    get is_container() { return false; };
    /** @returns {Array} */
    get childs() { return []; };

    get min_value() { return this.#min_value; };
    set min_value(value) {
        if (numb.fast_nan(value)) value = 0;
        if (kind_of(value) === `number`) this.#min_value = value;
        else throw new type_error(`min_value parameter must be a number.`);
    };

    get max_value() { return this.#max_value; };
    set max_value(value) {
        if (numb.fast_nan(value)) value = 100;
        if (kind_of(value) === `number`) this.#max_value = value;
        else throw new type_error(`max_value parameter must be a number.`);
    };

    get value() { return this.#value; };
    set value(value) {
        if (numb.fast_nan(value)) value = 500;
        if (kind_of(value) === `number`) this.#value = value;
        else throw new type_error(`value parameter must be a number.`);
    };

    get vertical() { return this.#vertical; };
    set vertical(value) {
        //const mem = this.#vertical;
        if (kind_of(value) === `boolean`) this.#vertical = value;
        else throw new type_error(`vertical parameter must be a boolean.`);
        //if (mem !== this.#vertical) this.#flip_axis(this.#vertical ? -1 : 1);
    };

    get tic_sound() { return this.#tic_sound; };
    set tic_sound(value) {
        if (kind_of(value) === `string`) this.#tic_sound = value;
        else throw new type_error(`tic_sound parameter must be a string.`);
    };

    get cmp() { return [`chariot`]; };
    get act_cmp() { return [`chariot`]; };
    get signals() { return [`input`]; };
    get slots() { return [`value`]; };


    get_event(cmp) {
        switch (cmp) {
            case `chariot`: return [`changed`];
            default: throw new error(`Unknow component. ${cmp}`);
        }
    };

    append_child(obj) {
        let p = this.parent;
        while (p && !p.is_container) p = p.parent;
        if (p) p.append_child(obj);
        else throw new error(`Error while appending child widget.`);
    };

    /*
    async #flip_axis(ori) {

        const flipped = (canv, img, ori, name) => {
            if (!img) return;
            if (string.is_integer(img) && elem(img)) img = elem(img);

            canv_set_pixel_ratio(canv, img.height, img.width);

            canv.ctx.translate(canv.width / 2, canv.height / 2);
            canv.ctx.rotate(numb.copysign(Math.PI, ori) / 2);
            canv.ctx.drawImage(img, -img.width / 2, -img.height / 2);
            canv.ctx.resetTransform();

            const hash = image_hash(canv.ctx.getImageData(0, 0, canv.height, canv.width));
            const el = elem(hash);
            
            const new_img = new Image();
            if (!el) {
                new_img.id = hash;
                new_img.width = img.height;
                new_img.height = img.width;
                new_img.dataset.name = name;
                new_img.dataset.type = `png`;
                new_img.src = canv.elem.toDataURL(`image/png`, 1.0);
                elem('imgs_assets').appendChild(new_img);
            }

            //console.log(canv.elem.toDataURL());
            return hash;
        };

        const canv = new canvas(`flip_canv`, `2d`, { willReadFrequently: true });
        canv.ctx.globalAlpha = 0;

        let bimg = this.proprieties.back_image;
        this.proprieties.back_image = flipped(canv, bimg, ori, `${this.name}bi_${ori < 0 ? `v` : `h`}`);

        bimg = this.proprieties.chariot_tex;
        this.proprieties.chariot_tex = flipped(canv, bimg, ori, `${this.name}ct_${ori < 0 ? `v` : `h`}`);

        console.log(this.proprieties.back_image);

        const center = rect_center(this.rect, new pointi());
        [this.rect.width, this.rect.height] = [this.rect.height, this.rect.width];
        rect_move_center(this.rect, center);
    }
*/
    /**
     * @param {canvas} canv 
     * @param {Boolean} press 
     */
    draw(canv, cmp, full = false) {
        //console.log(`push_button.draw(`, canv, press, `);`);
        ctx_save(canv);

        //console.log(this.proprieties.back_image);
        //ctx_set_fill_color(canv.ctx, this.proprieties.back_color);
        //ctx_fill_rect(canv.ctx, this.proprieties.geometry);

        //ctx_set_composite_operation(canv.ctx, `multiply`);

        if (cmp & slider.BACK_CMP) {
            if (this.proprieties.back_image) {
                let bimg = this.proprieties.back_image;
                if (string.is_integer(bimg) && elem(bimg)) bimg = elem(bimg);

                //const img_elem = elem(this.proprieties.back_image);
                //rect_set(pr, 0, 0, bimg.width, bimg.height);
                const source = new recti(0, 0, bimg.width, bimg.height);
                ctx_draw_img(canv.ctx, bimg, source, this.rect, this.proprieties.back_color.unit.alpha);
            }

        }


        //ctx_set_composite_operation(canv.ctx, `source-over`);

        if (cmp & slider.FRONT_CMP && this.proprieties.chariot_tex) {
            let bimg = this.proprieties.chariot_tex;
            if (string.is_integer(bimg) && elem(bimg)) bimg = elem(bimg);

            //const img_elem = elem(this.proprieties.press_tex);
            const off = bimg.width / 4;
            //rect_set(pr, off, 0, off * 3, bimg.height);
            const source = new recti(0, 0, bimg.width, bimg.height);
            ctx_draw_img(canv.ctx, bimg, source, this.rect, this.proprieties.back_color.unit.alpha);
        }

        ctx_restore(canv);
    };

    to_xml() {
        const node = new_xnode(`widget`, { type: this.kind, name: this.name });

        this.property_to_xml(node, this);

        const pt = this.proprieties.chariot_tex;
        if (string.is_integer(this.proprieties.chariot_tex)) {
            const press_tex = node.append_child(new_xnode(`property`, { name: `chariot_tex` }));
            press_tex.append_child(new_xnode(`string`, {}, pt));
        }

        const min_node = node.append_child(new_xnode(`property`, { name: `min` }));
        min_node.append_child(new_xnode(`int`, {}, `${this.#min_value}`));

        const max_node = node.append_child(new_xnode(`property`, { name: `max` }));
        max_node.append_child(new_xnode(`int`, {}, `${this.#max_value}`));

        const start_node = node.append_child(new_xnode(`property`, { name: `value` }));
        start_node.append_child(new_xnode(`int`, {}, `${this.#value}`));

        const vertical_node = node.append_child(new_xnode(`property`, { name: `vertical` }));
        vertical_node.append_child(new_xnode(`bool`, {}, this.#vertical ? `true` : `false`));

        if (this.#tic_sound) {
            const tic_sound_node = node.append_child(new_xnode(`property`, { name: `tic_sound` }));
            tic_sound_node.append_child(new_xnode(`string`, {},  string.html_escape(this.#tic_sound)));
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

        const min_node = node.child_by_attr(`name`, `min`);
        if (min_node) {
            const txt = min_node.child_by_name(`int`).value;
            this.#min_value = numb.parse(txt);
            if (numb.fast_nan(this.#min_value)) this.#min_value = 0;
        }

        const max_node = node.child_by_attr(`name`, `max`);
        if (max_node) {
            const txt = max_node.child_by_name(`int`).value;
            this.#max_value = numb.parse(txt);
            if (numb.fast_nan(this.#max_value)) this.#max_value = 100;
        }

        const start_node = node.child_by_attr(`name`, `value`);
        if (start_node) {
            const txt = start_node.child_by_name(`int`).value;
            this.#value = numb.parse(txt);
            if (numb.fast_nan(this.#value)) this.#value = 50;
        }

        const vertical_node = node.child_by_attr(`name`, `vertical`);
        if (vertical_node) {
            const txt = vertical_node.child_by_name(`bool`).value;
            this.#vertical = txt == `true`;
        }

        const tic_sound_node = node.child_by_attr(`name`, `tic_sound`);
        if (tic_sound_node) {
            const txt = tic_sound_node.child_by_name(`string`).value;
            this.#tic_sound = string.html_unescape(txt);
        }

    };
};

