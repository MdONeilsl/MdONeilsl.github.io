class SkylinePacker {
    /**
     * @constructor
     * @param {number} max_w - Maximum width
     * @param {number} max_h - Maximum height
     */
    constructor(max_w, max_h) {
        this.max_w = max_w;
        this.max_h = max_h;
        this.skyline = [];
        this.initialized = false;
    }

    /**
     * Adds a rectangle to the packer
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {Object} pos - Position object to update
     * @returns {boolean} Success
     */
    add(w, h, pos) {
        if (w === 0 || h === 0) return false;
        if (!this.initialized) {
            this.skyline = [{ x: 0, y: 0 }];
            this.initialized = true;
        }
        let best_idx = -1;
        let best_idx2 = -1;
        let best_x = Infinity;
        let best_y = Infinity;
        const skyline_len = this.skyline.length;
        for (let idx = 0; idx < skyline_len; ++idx) {
            let x = this.skyline[idx].x;
            let y = this.skyline[idx].y;
            if (w > this.max_w - x) break;
            if (y >= best_y) continue;
            const x_max = x + w;
            let idx2 = idx + 1;
            for (; idx2 < skyline_len; ++idx2) {
                if (x_max <= this.skyline[idx2].x) break;
                if (y < this.skyline[idx2].y) y = this.skyline[idx2].y;
            }
            if (y >= best_y) continue;
            if (h > this.max_h - y) continue;
            best_idx = idx;
            best_idx2 = idx2;
            best_x = x;
            best_y = y;
        }
        if (best_idx === -1) return false;
        const original_length = this.skyline.length;
        const b_bottom_right = (best_idx2 < original_length ? best_x + w < this.skyline[best_idx2].x : best_x + w < this.max_w);
        const span_last_y = this.skyline[best_idx2 - 1].y;
        const removed_count = best_idx2 - best_idx;
        this.skyline.splice(best_idx, removed_count);
        this.skyline.splice(best_idx, 0, { x: best_x, y: best_y + h });
        if (b_bottom_right) {
            this.skyline.splice(best_idx + 1, 0, { x: best_x + w, y: span_last_y });
        }
        pos.x = best_x;
        pos.y = best_y;
        return true;
    }
}

/**
 * Calculates next power of two
 * @param {number} n - Input number
 * @returns {number} Next power of two
 */
function next_power_of_2(n) {
    if (n <= 1) return 1;
    n = n | 0;
    n--;
    n |= n >> 1;
    n |= n >> 2;
    n |= n >> 4;
    n |= n >> 8;
    n |= n >> 16;
    return ++n;
}

/**
 * Clamps input value
 * @param {HTMLElement} el - Input element
 */
function clamp_input(el) {
    let v = parseInt(el.value) || 1;
    if (v < 1) v = 1;
    if (v > 2048) v = 2048;
    el.value = v;
}

/**
 * Trims trailing zeros from number
 * @param {number} n - Input number
 * @returns {string} Formatted string
 */
function trim_trailing_zeros(n) {
    return parseFloat(n.toFixed(6)).toString();
}

/**
 * Debounce function to limit calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executed_function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Converts filename to C variable name
 * @param {string} filename - Input filename
 * @returns {string} C variable name
 */
function to_c_variable_name(filename) {
    let base = filename.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
    base = base.replace(/[^a-zA-Z0-9_]/g, '_');
    if (!/^[a-zA-Z]/.test(base)) {
        base = 'v' + base;
    }
    return base;
}

let images = [];
const drop_zone = document.getElementById('dropZone');
const atlas_canvas = document.getElementById('atlasCanvas');
const canvas_size_el = document.getElementById('canvasSize');
const output_el = document.getElementById('output');
const errors_el = document.getElementById('errors');
const gap_input = document.getElementById('gap');
const output_type = document.getElementById('outputType');
const render_mode = document.getElementById('renderMode');
const max_size_el = document.getElementById('maxSize');
const full_canvas = document.createElement('canvas');

drop_zone.addEventListener('dragover', (e) => e.preventDefault());
drop_zone.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;

    const processed_files = new Set();
    let files_processed = 0;

    files.forEach(file => {
        const file_key = `${file.name}_${file.size}_${file.lastModified}`;
        if (processed_files.has(file_key)) return;
        processed_files.add(file_key);

        const reader = new FileReader();
        reader.onload = (e) => {
            const loaded_img = new Image();
            loaded_img.onload = () => {
                const ow = loaded_img.naturalWidth;
                const oh = loaded_img.naturalHeight;
                let dw = ow;
                let dh = oh;
                let data_url = e.target.result;
                if (ow > 2048 || oh > 2048) {
                    const scale = 2048 / Math.max(ow, oh);
                    dw = Math.floor(ow * scale);
                    dh = Math.floor(oh * scale);
                    const temp_c = document.createElement('canvas');
                    temp_c.width = dw;
                    temp_c.height = dh;
                    const ctx = temp_c.getContext('2d');
                    ctx.drawImage(loaded_img, 0, 0, dw, dh);
                    data_url = temp_c.toDataURL(file.type);
                    loaded_img.src = data_url;
                }
                let name_base = file.name.split('.')[0].slice(0, 10);
                let name = to_c_variable_name(name_base);
                let cnt = 1;
                while (images.some(im => im.name === name && im.name !== '')) {
                    name = name_base + '_' + cnt++;
                }
                const id = images.length;
                const img_obj = { id, name, w: dw, h: dh, data_url, img: loaded_img };
                images.push(img_obj);
                add_card(img_obj);
                files_processed++;
                if (files_processed === files.length) {
                    debounced_optimize();
                }
            };
            loaded_img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
});

/**
 * Adds image card to UI
 * @param {Object} img_obj - Image object
 */
function add_card(img_obj) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.dataset.id = img_obj.id;
    const preview = document.createElement('img');
    preview.className = 'image-preview';
    preview.src = img_obj.data_url;
    const inputs = document.createElement('div');
    inputs.className = 'card-inputs';
    const name_in = document.createElement('input');
    name_in.type = 'text';
    name_in.value = img_obj.name;
    name_in.maxLength = 20;
    name_in.oninput = () => {
        img_obj.name = name_in.value;
        debounced_optimize();
    };
    const size_inputs = document.createElement('div');
    size_inputs.className = 'size-inputs';
    const w_label = document.createElement('label');
    w_label.textContent = 'W:';
    const w_in = document.createElement('input');
    w_in.type = 'number';
    w_in.min = '1';
    w_in.max = '2048';
    w_in.value = img_obj.w;
    w_in.oninput = () => {
        clamp_input(w_in);
        img_obj.w = parseInt(w_in.value);
        debounced_optimize();
    };
    const h_label = document.createElement('label');
    h_label.textContent = 'H:';
    const h_in = document.createElement('input');
    h_in.type = 'number';
    h_in.min = '1';
    h_in.max = '2048';
    h_in.value = img_obj.h;
    h_in.oninput = () => {
        clamp_input(h_in);
        img_obj.h = parseInt(h_in.value);
        debounced_optimize();
    };
    const remove_btn = document.createElement('span');
    remove_btn.className = 'remove-btn';
    remove_btn.textContent = 'X';
    remove_btn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        remove_card(img_obj.id);
    };
    size_inputs.append(w_label, w_in, h_label, h_in);
    inputs.append(name_in, size_inputs);
    card.append(preview, inputs, remove_btn);
    drop_zone.append(card);
}

/**
 * Removes image card
 * @param {number} id - Image ID
 */
function remove_card(id) {
    const idx = images.findIndex(i => i.id === id);
    if (idx > -1) {
        images.splice(idx, 1);
        const card = drop_zone.querySelector(`[data-id="${id}"]`);
        if (card) card.remove();
        debounced_optimize();
    }
}

/**
 * Updates preview canvas
 * @param {CanvasRenderingContext2D} atlas_ctx - Atlas context
 * @param {HTMLCanvasElement} full_canvas - Full canvas
 * @param {number} canvas_w - Canvas width
 * @param {number} canvas_h - Canvas height
 */
function update_preview(atlas_ctx, full_canvas, canvas_w, canvas_h) {
    const max_w = 800;
    const max_h = window.innerHeight * 0.4;
    const scale = Math.min(max_w / canvas_w, max_h / canvas_h, 1);
    const display_w = canvas_w * scale;
    const display_h = canvas_h * scale;
    atlas_canvas.width = display_w;
    atlas_canvas.height = display_h;
    atlas_ctx.clearRect(0, 0, display_w, display_h);
    atlas_ctx.drawImage(full_canvas, 0, 0, display_w, display_h);
}

/** Optimizes the atlas packing */
function optimize() {
    errors_el.innerHTML = '';
    const g = parseInt(gap_input.value) || 2;
    if (g < 1) gap_input.value = 1;
    const padding = Math.max(1, Math.floor(g / 2));
    const max_size = parseInt(max_size_el.value);
    let cw = 8;
    let ch = 8;
    let increased_width_this_time = false;
    let placements = [];
    let all_fit = false;
    const max_attempts = 20;
    let attempts = 0;
    while (!all_fit && attempts < max_attempts) {
        attempts++;
        const packer = new SkylinePacker(cw, ch);
        placements = [];
        all_fit = true;
        const sorted_images = images.slice().sort((a, b) => (b.w * b.h) - (a.w * a.h));
        for (let i = 0; i < sorted_images.length; i++) {
            const img = sorted_images[i];
            const pw = img.w + 2 * padding;
            const ph = img.h + 2 * padding;
            const pos = {};
            if (!packer.add(pw, ph, pos)) {
                all_fit = false;
                break;
            }
            placements.push({
                img,
                actual_x: pos.x + padding,
                actual_y: pos.y + padding
            });
        }
        if (!all_fit) {
            let can_grow = false;
            if (!increased_width_this_time && cw * 2 <= max_size) {
                cw = next_power_of_2(cw * 2);
                increased_width_this_time = true;
                can_grow = true;
            } else if (ch * 2 <= max_size) {
                ch = next_power_of_2(ch * 2);
                increased_width_this_time = false;
                can_grow = true;
            }
            if (!can_grow) {
                all_fit = false;
                break;
            }
        }
    }
    if (!all_fit) {
        errors_el.innerHTML = 'Error: No more space on the final image';
        canvas_size_el.textContent = '';
        output_el.value = images.length === 0 ? 'Upload images to see output' : output_el.value;
        return;
    }
    let used_w = 0;
    let used_h = 0;
    for (let i = 0; i < placements.length; i++) {
        const p = placements[i];
        used_w = Math.max(used_w, p.actual_x + p.img.w);
        used_h = Math.max(used_h, p.actual_y + p.img.h);
    }
    const canvas_w = used_w > 0 ? next_power_of_2(used_w) : 8;
    const canvas_h = used_h > 0 ? next_power_of_2(used_h) : 8;
    full_canvas.width = canvas_w;
    full_canvas.height = canvas_h;
    const full_ctx = full_canvas.getContext('2d');
    full_ctx.clearRect(0, 0, canvas_w, canvas_h);
    for (let i = 0; i < placements.length; i++) {
        const p = placements[i];
        full_ctx.drawImage(p.img.img, p.actual_x, p.actual_y, p.img.w, p.img.h);
    }
    const atlas_ctx = atlas_canvas.getContext('2d');
    update_preview(atlas_ctx, full_canvas, canvas_w, canvas_h);
    canvas_size_el.textContent = `${canvas_w} x ${canvas_h}`;
    let out = images.length === 0 ? 'Upload images to see output' : '';
    if (images.length > 0) {
        const type = output_type.value;
        const render = render_mode.value;
        const width = canvas_w;
        const height = canvas_h;
        const wf = 1 / width;
        const hf = 1 / height;
        if (type === 'array') {
            out = 'list uvs = [\n';
            for (let i = 0; i < images.length; i++) {
                const p = placements[i];
                const w = p.img.w;
                const h = p.img.h;
                const px_from_x = p.actual_x;
                const px_from_y = p.actual_y;
                const scale_x = trim_trailing_zeros(w * wf);
                const scale_y = trim_trailing_zeros(h * hf);
                let offset_x, offset_y;
                if (render === 'opengl') {
                    offset_x = trim_trailing_zeros(-0.5 + ((px_from_x + w * 0.5) * wf));
                    offset_y = trim_trailing_zeros(0.5 - ((px_from_y + h * 0.5) * hf));
                } else {
                    offset_x = trim_trailing_zeros(px_from_x * wf);
                    offset_y = trim_trailing_zeros(px_from_y * hf);
                }
                out += `/*${i}: ${p.img.name}*/<${scale_x}, ${scale_y}, ${offset_x}, ${offset_y}>`;
                if (i < images.length - 1) out += ',';
                out += '\n';
            }
            out += '];';
        } else {
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                if (!img.name) continue;
                const p = placements.find(pl => pl.img.id === img.id);
                const w = img.w;
                const h = img.h;
                const px_from_x = p.actual_x;
                const px_from_y = p.actual_y;
                const scale_x = trim_trailing_zeros(w * wf);
                const scale_y = trim_trailing_zeros(h * hf);
                let offset_x, offset_y;
                if (render === 'opengl') {
                    offset_x = trim_trailing_zeros(-0.5 + ((px_from_x + w * 0.5) * wf));
                    offset_y = trim_trailing_zeros(0.5 - ((px_from_y + h * 0.5) * hf));
                } else {
                    offset_x = trim_trailing_zeros(px_from_x * wf);
                    offset_y = trim_trailing_zeros(px_from_y * hf);
                }

                let str = `<${scale_x}, ${scale_y}, ${offset_x}, ${offset_y}>`;
                if (type === 'define') {
                    str = `#define ${img.name.toLocaleUpperCase()} ${str}\n`;
                } else {
                    str = `quaternion ${img.name} = ${str};\n`;
                }
                out += str;
            }
        }
    }
    output_el.value = out;
}

const debounced_optimize = debounce(optimize, 100);

document.getElementById('clearAll').addEventListener('click', () => {
    images = [];
    drop_zone.innerHTML = '';
    debounced_optimize();
});

document.getElementById('copyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(output_el.value).then(() => {
        alert('Copied to clipboard!');
    });
});

document.getElementById('saveBtn').addEventListener('click', () => {
    const fmt = document.getElementById('imageType').value;
    const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
    const data = full_canvas.toDataURL(mime, 1.0);
    const a = document.createElement('a');
    a.href = data;
    a.download = 'uv_atlas.' + fmt;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

gap_input.addEventListener('input', debounced_optimize);
output_type.addEventListener('change', debounced_optimize);
render_mode.addEventListener('change', debounced_optimize);
max_size_el.addEventListener('change', debounced_optimize);

debounced_optimize();
