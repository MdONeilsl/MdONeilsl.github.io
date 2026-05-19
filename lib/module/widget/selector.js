
//import { error, type_error } from "../../error.js";
import { kind_of } from "../../functions.js";
import { recti } from "../gui/rect.js";
//import { elem } from "../html.js";
import { numb } from "../math/number.js";
import { ctx_draw_img, ctx_restore, ctx_save } from "../rendering/2d/contex2d.js";
import { new_xnode } from "../system/format/xml/xnode.js";
import { string } from "../text/string.js";
import { widget } from "./widget.js";

const pr = new recti();

export class selector extends widget {
    #columns;
    #rows;
    #totals;

    constructor(name, x, y, width, height) {
        super(name || `selector_${string.uid()}`, x, y, width, height);
        this.columns = 3;
        this.rows = 2;
        this.totals = 5;
    };

    static get BACK_CMP() { return 0x1; };
    static get FRONT_CMP() { return 0x2; };

    /** @returns {String} */
    get kind() { return `selector`; };

    get proprieties_names() { return Array.from(new Set([`columns_rows`, `total_cells`, ...super.proprieties_names])); };

    /** @returns {Boolean} */
    get is_container() { return false; };
    /** @returns {Array} */
    get childs() { return []; };

    get columns() { return this.#columns; };
    set columns(value) {
        if (kind_of(value) !== `number` || value <= 1) throw new type_error(`columns parameter must be a positive integer.`);
        this.#columns = value;
    };

    get rows() { return this.#rows; };
    set rows(value) {
        if (kind_of(value) !== `number` || value <= 1) throw new type_error(`rows parameter must be a positive integer.`);
        this.#rows = value;
    };

    get totals() { return this.#totals; };
    set totals(value) {
        if (kind_of(value) !== `number` || value <= 1) throw new type_error(`totals parameter must be a positive integer.`);
        this.#totals = value;
    };

    get cmp() { return [`front`]; };
    get act_cmp() {
        let arr = [];
        for (let i = 0, max = this.totals; i < max; i++)
            arr.push(`cell_${i + 1}`);
        return arr;
    };

    get signals() { return [`click`]; };

    get_event(cmp) {
        switch (cmp) {
            case `front`: return [`click`];
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
        //console.log(`push_button.draw(`, canv, press, `);`);
        ctx_save(canv);

        if (cmp & (selector.BACK_CMP | selector.FRONT_CMP)) {
            if (this.proprieties.back_image) {
                let bimg = this.proprieties.back_image;
                if (string.is_integer(bimg) && elem(bimg)) bimg = elem(bimg);

                //rect_set(pr, 0, 0, bimg.width, bimg.height);
                const source = new recti(0, 0, bimg.width, bimg.height);
                ctx_draw_img(canv.ctx, bimg, source, this.rect, this.proprieties.back_color.unit.alpha);
            }
            /*
            else {
                ctx_set_alpha(canv, this.proprieties.back_color.unit.alpha);

                const geo = this.proprieties.geometry;

                canv.ctx.strokeStyle = `rgb(0 0 256)`;
                ctx_set_line_width(canv, 1);
                canv.ctx.setLineDash([1, 1]);

                const cell_w = geo.width / this.#columns;
                const cell_h = geo.height / this.#rows;

                for (let x = 1; x < this.#rows; ++x) {
                    const h = geo.y + Math.round(cell_h * x);
                    ctx_draw_line(canv.ctx, geo.x, h, geo.x + geo.width, h);
                }

                for (let y = 1; y < this.#columns; ++y) {
                    const w = geo.x + Math.round(cell_w * y);
                    ctx_draw_line(canv.ctx, w, geo.y, w, geo.y + geo.height);
                }

                ctx_stoke_rect(canv.ctx, this.rect);
            }
            */
        }

        ctx_restore(canv);
    };

    to_xml() {
        const node = new_xnode(`widget`, { type: this.kind, name: this.name });

        const col_node = node.append_child(new_xnode(`property`, { name: `columns` }));
        col_node.append_child(new_xnode(`int`, {}, `${this.columns}`));

        const row_node = node.append_child(new_xnode(`property`, { name: `rows` }));
        row_node.append_child(new_xnode(`int`, {}, `${this.rows}`));

        const total_node = node.append_child(new_xnode(`property`, { name: `totals` }));
        total_node.append_child(new_xnode(`int`, {}, `${this.totals}`));

        this.property_to_xml(node, this);

        if (this.childs.length !== 0) {
            const childs = node.append_child(new xnode(`childs`));
            this.childs.map(e => childs.append_child(e.to_xml()));
        }

        return node;
    };

    /** @param {xnode} */
    from_xml(node) {
        this.xml_to_property(node);

        const col_node = node.child_by_attr(`name`, `columns`);
        if (col_node) this.columns = numb.parse(col_node.child_by_name(`int`).value);

        const row_node = node.child_by_attr(`name`, `rows`);
        if (row_node) this.rows = numb.parse(row_node.child_by_name(`int`).value);

        const total_node = node.child_by_attr(`name`, `totals`);
        if (total_node) this.totals = numb.parse(total_node.child_by_name(`int`).value);

    };
};

