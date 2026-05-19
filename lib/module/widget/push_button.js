//import { error, type_error } from "../../error.js";
import { kind_of, NULL } from "../../functions.js";
import { recti } from "../gui/rect.js";
import { text, text_to_xml, xml_to_text } from "../gui/text.js";
import { elem } from "../html.js";
import { numb } from "../math/number.js";
import { ctx_draw_img, ctx_fill_rect, ctx_restore, ctx_save, ctx_set_fill_color } from "../rendering/2d/contex2d.js";
import { new_xnode, xnode } from "../system/format/xml/xnode.js";
import { string } from "../text/string.js";
import { widget } from "./widget.js";

const pr = new recti();

export class push_button extends widget {
    #effect_layer = false;
    #text;
    #press_sound;
    #release_sound;
    #repeat;
    #repeat_delay;
    #repeat_time;

    /**
     * Creates an instance of the push_button class.
     * @param {string} name - The name of the button.
     * @param {number} x - The x-coordinate of the button.
     * @param {number} y - The y-coordinate of the button.
     * @param {number} width - The width of the button.
     * @param {number} height - The height of the button.
     */
    constructor(name, x, y, width, height) {
        super(name || `push_button_${string.uid()}`, x, y, width, height);
        this.#text = new text(this.name, 'center', 'middle');
        this.proprieties.press_tex = NULL;
        this.proprieties.effect_tex = NULL;
        this.#press_sound = '';
        this.#release_sound = '';
        this.#repeat = false;
        this.#repeat_delay = 1;
        this.#repeat_time = 0;
    }


    static get BACK_CMP() { return 0x1; };
    static get FRONT_CMP() { return 0x2; };
    static get EFFECT_CMP() { return 0x4; };

    /** @returns {String} */
    get kind() { return `push_button`; };

    get proprieties_names() { return Array.from(new Set([`text`, `press_tex`, `effect_tex`, `press_sound`, `release_sound`, `repeat`, ...super.proprieties_names])); };

    get text() { return this.#text; };

    /** @returns {Boolean} */
    get is_container() { return false; };
    /** @returns {Array} */
    get childs() { return []; };

    get effect() { return this.#effect_layer; };
    set effect(value) {
        if (kind_of(value) !== `boolean`) throw new type_error(`effect parameter must be a boolean.`);
        this.#effect_layer = value;
    }

    get press_sound() { return this.#press_sound; };
    set press_sound(value) {
        if (kind_of(value) === `string`) this.#press_sound = value;
        else throw new type_error(`press_sound must be a string.`);
    }

    get release_sound() { return this.#release_sound; };
    set release_sound(value) {
        if (kind_of(value) === `string`) this.#release_sound = value;
        else throw new type_error(`release_sound must be a string.`);
    }

    get repeat() { return this.#repeat; };
    set repeat(value) {
        if (kind_of(value) === `boolean`) this.#repeat = value;
        else throw new type_error(`repeat must be a boolean.`);
    }

    get repeat_delay() { return this.#repeat_delay; };
    set repeat_delay(value) {
        if (kind_of(value) === `number` && value >= 0) this.#repeat_delay = value;
        else throw new type_error(`repeat_delay must be a number.`);
    }

    get repeat_time() { return this.#repeat_time; };
    set repeat_time(value) {
        if (kind_of(value) === `number` && value >= 0) this.#repeat_time = value;
        else throw new type_error(`repeat_time must be a number.`);
    }

    get cmp() { return [`button`, `effect`]; };
    get act_cmp() { return this.effect ? [`effect`] : [`front`]; };
    get signals() { return [`click`, `click hold`, `repeat`]; };
    get slots() { return [`effect_color`]; };
    get_event(cmp) {
        switch (cmp) {
            case `button`: case `effect`: return [`click`, `double click`, `hold`];
            default: throw new error(`Unknow component. ${cmp}`);
        }
    };

    append_child(obj) {
        let p = this;
        while (p && !p.is_container) p = p.parent;
        console.log(p);
        if (p) p.append_child(obj);
        else throw new error(`Error while appending child widget.`);
        console.log(obj);
    };

    /**
     * @param {canvas} canv 
     * @param {Boolean} press 
     */
    draw(canv, cmp) {
        ctx_save(canv);

        if (cmp & push_button.BACK_CMP) {
            if (this.proprieties.back_image) {
                let bimg = this.proprieties.back_image;
                if (string.is_integer(bimg) && elem(bimg)) bimg = elem(bimg);
                const source = new recti(0, 0, bimg.width, bimg.height);
                ctx_draw_img(canv, bimg, source, this.rect, this.proprieties.back_color.unit.alpha);
            }
            else {
                ctx_set_fill_color(canv, this.proprieties.back_color);
                ctx_fill_rect(canv, this.proprieties.geometry);
            }
        }

        if (cmp & push_button.FRONT_CMP && this.proprieties.press_tex) {
            let bimg = this.proprieties.press_tex;
            if (string.is_integer(bimg) && elem(bimg)) bimg = elem(bimg);
            const source = new recti(0, 0, bimg.width, bimg.height);
            ctx_draw_img(canv, bimg, source, this.rect, this.proprieties.back_color.unit.alpha);
        }

        if (cmp & (push_button.BACK_CMP | push_button.FRONT_CMP)) {
            if (!string.empty(this.#text.string)) {
                canv.ctx.font = this.proprieties.font.css;
                ctx_set_fill_color(canv, this.proprieties.color);
                this.#text.draw(canv, this.proprieties.geometry);
            }
        }

        if (cmp & push_button.EFFECT_CMP && this.effect && this.proprieties.effect_tex) {
            let bimg = this.proprieties.effect_tex;
            if (string.is_integer(bimg) && elem(bimg)) bimg = elem(bimg);
            //console.log(bimg);
            const source = new recti(0, 0, bimg.width, bimg.height);
            ctx_draw_img(canv, bimg, source, this.rect, this.proprieties.back_color.unit.alpha);
        }

        ctx_restore(canv);
    };

    /**
     * Converts the current object to an XML node representation.
     * 
     * @returns {xnode} The XML node representing the widget.
     */
    to_xml() {
        const node = new_xnode(`widget`, { type: this.kind, name: this.name });

        this.property_to_xml(node, this);

        const pt = this.proprieties.press_tex;
        if (string.is_integer(this.proprieties.press_tex)) {
            const press_tex = node.append_child(new_xnode(`property`, { name: `press_tex` }));
            press_tex.append_child(new_xnode(`string`, {}, pt));
        }

        const et = this.proprieties.effect_tex;
        if (string.is_integer(this.proprieties.effect_tex)) {
            const effect_tex = node.append_child(new_xnode(`property`, { name: `effect_tex` }));
            effect_tex.append_child(new_xnode(`string`, {}, et));
        }

        node.append_child(text_to_xml(this.#text));
        if (this.childs.length !== 0) {
            const childs = node.append_child(new xnode(`childs`));
            this.childs.map(e => childs.append_child(e.to_xml()));
        }

        if (this.effect) {
            const effect_node = node.append_child(new_xnode(`property`, { name: `effect` }));
            effect_node.append_child(new_xnode(`bool`, {}, this.effect ? `true` : `false`));
        }

        if (this.#press_sound) {
            const press_sound_node = node.append_child(new_xnode(`property`, { name: `press_sound` }));
            press_sound_node.append_child(new_xnode(`string`, {}, string.html_escape(this.#press_sound)));
        }

        if (this.#release_sound) {
            const release_sound_node = node.append_child(new_xnode(`property`, { name: `release_sound` }));
            release_sound_node.append_child(new_xnode(`string`, {}, string.html_escape(this.#release_sound)));
        }

        const repeat_node = node.append_child(new_xnode(`property`, { name: `repeat` }));
        repeat_node.append_child(new_xnode(`bool`, {}, this.#repeat ? 'true' : 'false'));
        
        if (this.#repeat) {
            const repeat_delay_node = node.append_child(new_xnode(`property`, { name: `repeat_delay` }));
            repeat_delay_node.append_child(new_xnode(`number`, {}, `${this.#repeat_delay}`));

            const repeat_time_node = node.append_child(new_xnode(`property`, { name: `repeat_time` }));
            repeat_time_node.append_child(new_xnode(`number`, {}, `${this.#repeat_time}`));
        }

        return node;
    };

    /**
     * Parses an XML node and sets properties accordingly.
     * 
     * @param {xnode} node - The XML node to parse.
     */
    from_xml(node) {
        this.xml_to_property(node);

        const ntext = node.child_by_name(`text`);
        if (ntext) this.#text = xml_to_text(ntext);

        const press_sound_node = node.child_by_attr(`name`, `press_sound`);
        if (press_sound_node) {
            const txt = press_sound_node.child_by_name(`string`).value;
            this.#press_sound = string.html_unescape(txt);
        }

        const release_sound_node = node.child_by_attr(`name`, `release_sound`);
        if (release_sound_node) {
            const txt = release_sound_node.child_by_name(`string`).value;
            this.#release_sound = string.html_unescape(txt);
        }

        const effect_node = node.child_by_attr(`name`, `effect`);
        if (effect_node) {
            const txt = effect_node.child_by_name(`bool`).value;
            this.effect = txt.toLowerCase() === `true`;
        }

        const repeat_node = node.child_by_attr(`name`, `repeat`);
        if (repeat_node) {
            const txt = repeat_node.child_by_name(`bool`).value;
            this.repeat = txt == `true`;
        }

        const repeat_delay_node = node.child_by_attr(`name`, `repeat_delay`);
        if (repeat_delay_node) {
            const txt = repeat_delay_node.child_by_name(`number`).value;
            this.repeat_delay = numb.parse(txt);
        }

        const repeat_time_node = node.child_by_attr(`name`, `repeat_time`);
        if (repeat_time_node) {
            const txt = repeat_time_node.child_by_name(`number`).value;
            this.repeat_time = numb.parse(txt);
        }

    };

};

