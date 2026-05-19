import { error } from "../../error.js";
import { checkbox } from "./checkbox.js";
import { floating_panel } from "./floating_panel.js";
import { label } from "./label.js";
import { lcd_display } from "./lcd_display.js";
import { push_button } from "./push_button.js";
import { selector } from "./selector.js";
import { slider } from "./slider.js";
import { widget } from "./widget.js";

export const parse_xml = (node, root) => {
    //console.log(`parse_xml`, node, root);
    let obj;

    const name = node.get_attribute(`name`);
    switch (node.get_attribute(`type`)) {
        case `widget`: obj = new widget(name); break;
        case `fpanel`: obj = new floating_panel(name); break;
        case `label`: obj = new label(name); break;
        case `push_button`: obj = new push_button(name); break;
        case `checkbox`: obj = new checkbox(name); break;
        case `slider`: obj = new slider(name); break;
        case `lcd_display`: obj = new lcd_display(name); break;
        case `selector`: obj = new selector(name); break;
        default: throw new error(`Unknow widget type.`);
    }

    if (root) {
        obj = root.append_child(obj);
        if (!obj.parent) throw new error(`Fail to ineritate childs widget.`);
    }
    obj.from_xml(node);

    const subs = node.child_by_name(`childs`);
    if (subs) subs.childrens.map(c => parse_xml(c, obj));

    return obj;
};
