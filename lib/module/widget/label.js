import { color, color_set } from "../gui/color.js";
import { recti } from "../gui/rect.js";
import { text, text_to_xml, xml_to_text } from "../gui/text.js";
//import { elem } from "../html.js";
import { ctx_draw_img, ctx_fill_rect, ctx_restore, ctx_save, ctx_set_alpha, ctx_set_fill_color, ctx_set_font } from "../rendering/2d/contex2d.js";
import { xnode } from "../system/format/xml/xnode.js";
import { string } from "../text/string.js";
import { widget } from "./widget.js";

const pr = new recti();

export class label extends widget {
    #text;

    constructor(name, x, y, width, height) {
        super(name || `label_${string.uid()}`, x, y, width, height);
        this.#text = new text(this.name, `center`, `middle`);
    }

    /** @returns {String} */
    get kind() { return `label`; };

    get proprieties_names() { return Array.from(new Set([`text`, ...super.proprieties_names])); };

    get text() { return this.#text; };


    /** @param {canvas} canv */
    /** @param {canvas} canv */
draw(canv) {
    ctx_save(canv);

    const { back_color, back_image, geometry, font, color } = this.proprieties;
    ctx_set_alpha(canv, back_color.unit.alpha);
    ctx_set_fill_color(canv, back_color);

    let bimg = back_image;
    if (string.is_integer(bimg) && elem(bimg)) bimg = elem(bimg);

    if (bimg) {
        const source = new recti(0, 0, bimg.width, bimg.height);
        ctx_draw_img(canv.ctx, bimg, source, this.rect);
    } else {
        ctx_fill_rect(canv, geometry);
    }

    if (!string.empty(this.#text.string)) {
        ctx_set_font(canv, font);
        ctx_set_alpha(canv, color.unit.alpha);
        ctx_set_fill_color(canv, color);
        this.#text.draw(canv, geometry);
    }

    ctx_restore(canv);
}


    /** @param {widget} from */
    inherit(from) {
        this.parent = from;

        const bc = from.proprieties.back_color.rgba;
        color_set(this.proprieties.back_color, color.RGBA, bc.red, bc.green, bc.blue, bc.alpha);

        const tc = from.proprieties.color.rgba;
        color_set(this.proprieties.color, color.RGBA, tc.red, tc.green, tc.blue, tc.alpha);

        this.proprieties.font.from(from.proprieties.font);
    };

    to_xml() {
        const node = new xnode(`widget`);
        node.set_attribute(`type`, this.kind);
        node.set_attribute(`name`, this.name);
    
        this.property_to_xml(node, this);
        node.append_child(text_to_xml(this.#text));
    
        if (this.childs.length) { // Changed condition for efficiency
            const childs = node.append_child(new xnode(`childs`));
            for (const e of this.childs) { // Changed to for..of for performance
                childs.append_child(e.to_xml());
            }
        }
    
        return node;
    }
    

    /** @param {xnode} */
    from_xml(node) {
        this.xml_to_property(node);
    
        const ntext = node.child_by_name(`text`);
        if (ntext) { 
            this.#text = xml_to_text(ntext);
        }
    }
    
};

