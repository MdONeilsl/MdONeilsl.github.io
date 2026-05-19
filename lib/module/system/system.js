import { kind_of, NULL } from "../../functions.js";
import { clear_element, elem, ev, new_node } from "../html.js";

if (!elem(`sys_worker`)) {
    document.body.appendChild(new_node(`div`, { id: `sys_worker`, style: `display:none` }));
}

const glb_error = (msg, e) => console.error(msg, e);


/**
 * Triggers a download of a file with the specified name and data.
 * 
 * @param {string} name - The name of the file to be saved.
 * @param {string} data - The data (URL or Blob) for the file content.
 * @returns {Promise} - A promise that resolves when the download is triggered.
 */
export const save_file_on_disk = async (name, data) => {
    return new Promise((resolve, reject) => {
        const worker = elem(`sys_worker`);
        clear_element(worker);

        const link = worker.appendChild(new_node(`a`, { download: name, href: data }));
        requestAnimationFrame(e => { link.click(); resolve(); });
    });
};

/**
 * Opens a file selection dialog and triggers the provided callback on file selection.
 * 
 * @param {string} accept - A string specifying the file types the server accepts.
 * @param {boolean} [multiple=false] - Whether the dialog allows multiple files to be selected.
 * @param {Function|null} [cb=null] - A callback function to be invoked when files are selected.
 * @returns {Promise} - A promise that resolves when the file selection dialog is triggered.
 */
export const request_files_dialog = async (accept, multiple = false, cb = NULL) => {
    return new Promise((resolve, reject) => {
        const worker = elem(`sys_worker`);
        clear_element(worker);

        const input = worker.appendChild(new_node(`input`, { type: `file`, accept: accept, multiple: multiple }));
        ev(input, `change`, evt => {
            if (evt.target.files.length > 0 && cb) cb(evt);
            resolve(evt);
        });
        requestAnimationFrame(e => { input.click(); resolve(); });
    });
};

/**
 * Reads the contents of a text file and invokes a callback or resolves the promise with the result.
 * 
 * @param {File} file - The file to be read.
 * @param {Function|null} [cb=null] - A callback function to be invoked when the file is read.
 * @returns {Promise<string>} - A promise that resolves with the file's text content.
 */
export const read_text_file = async (file, cb = NULL) => {
    return new Promise((resolve, glb_error) => {
        const reader = new FileReader();
        ev(reader, `load`, evt => { if (cb) cb(evt); resolve(reader); });
        ev(reader, `error`, err => glb_error(err));
        reader.readAsText(file);
    });
};

/**
 * Loads an image from a file and triggers a callback or resolves the promise with the event.
 * 
 * @param {File|string} file - The image file or URL to load.
 * @param {Function|null} [cb=null] - A callback function to be invoked when the image is loaded.
 * @returns {Promise<Event>} - A promise that resolves with the load event when the image is successfully loaded.
 */
export const load_img_file = async (file, cb = NULL) => {
    //console.log(`load_img_file`, file);
    return new Promise((resolve, glb_error) => {
        const img = new Image();
        ev(img, `load`, evt => {
            img.setAttribute(`width`, `${img.naturalWidth}`);
            img.setAttribute(`height`, `${img.naturalHeight}`);
            if (cb) cb(evt);
            resolve(evt);
        });
        ev(img, `error`, evt => glb_error(`There was a problem with the image.`, evt));
        img.src = kind_of(file) === `string` ? file : URL.createObjectURL(file);
    });
};



