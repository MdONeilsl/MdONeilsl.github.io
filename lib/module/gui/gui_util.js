import { string } from "../text/string.js";

export const div_worker_id = string.uid();

export const init_gui_worker = () => {
    const div = document.body.appendChild(document.createElement('div'));
    div.id = div_worker_id;
    div.style.display = `none`;
};
