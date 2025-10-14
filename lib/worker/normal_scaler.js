/*
    Copyright (C) 2025  MdONeil 

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
	
	https://github.com/MdONeilsl
    secondlife:///app/agent/ae929a12-297c-45be-9748-562ee17e937e/about
*/

import { GPGPU } from "../class/gpgpu.js";
import { next_step_size, scale_normal_array } from "../module/image.js";

// Load shaders once when worker is created
const shaderLoadPromise = Promise.all([
    fetch('../shaders/normal_scaler.vert', { cache: 'no-store', priority: 'high' }).then(r => r.text()),
    fetch('../shaders/normal_scaler.frag', { cache: 'no-store', priority: 'high' }).then(r => r.text())
]);

let vs_source = ``;
let fs_source = ``;

// Initialize shaders immediately
shaderLoadPromise.then(([vert, frag]) => {
    vs_source = vert;
    fs_source = frag;
}).catch(err => {
    console.error('Failed to load shaders:', err);
});

const gpuscl = (gp, src_data, src_width, src_height, target_width, target_height) => {
    try {
        const prog = gp.setup_program('main_program', vs_source, fs_source, 'position');
        prog.use();

        const source_tex = gp.create_texture('source_tex', 0, src_data, src_width, src_height);
        gp.create_texture('dest_tex', 1, null, target_width, target_height);
        gp.setup_frame('main_frame', 'dest_tex');

        source_tex.activate();
        prog.set('source_tex', 0);
        prog.set('source_size', src_width, src_height);
        prog.set('target_size', target_width, target_height);

        gp.render(target_width, target_height);

        const result = gp.read_pixels(target_width, target_height);
        gp.clear_frame();

        return result;
    } catch (err) {
        gp.clear();
        console.error('GPU execution error:', err);
        throw err;
    }
};

self.onmessage = async e => {
    if (e.data === 'test') {
        self.postMessage('test');
        return;
    }

    const { src, width, height, target_width, target_height } = e.data;

    // Fast validation with early return
    if (!(src instanceof Uint8ClampedArray) ||
        src.length !== width * height * 4 ||
        width <= 0 || height <= 0 ||
        target_width <= 0 || target_height <= 0) {
        self.postMessage({
            error: 'Invalid input parameters or data size mismatch',
            result: src
        });
        return;
    }

    // Ensure shaders are loaded before processing
    await shaderLoadPromise;

    let current_data = src;
    let current_width = width;
    let current_height = height;

    // Precompute max dimensions
    const max_width = Math.max(width, target_width);
    const max_height = Math.max(height, target_height);
    const gpgpu = new GPGPU(max_width, max_height);
    const has_webgl = !!gpgpu.is_webgl_available;

    // Progressive scaling with minimal allocations
    while (current_width !== target_width || current_height !== target_height) {
        const [next_width, next_height] = [
            next_step_size(current_width, target_width),
            next_step_size(current_height, target_height)
        ];

        let temp_data;

        try {
            temp_data = has_webgl ?
                gpgpu.exec(gpuscl, current_data, current_width, current_height, next_width, next_height) :
                scale_normal_array(current_data, current_width, current_height, next_width, next_height);
        } catch (err) {
            if (has_webgl) {
                console.warn('GPU scaling failed, falling back to CPU:', err.message);
                temp_data = scale_normal_array(current_data, current_width, current_height, next_width, next_height);
            } else {
                throw err;
            }
        }

        current_data = temp_data;
        current_width = next_width;
        current_height = next_height;
    }

    gpgpu.clear();

    // Ensure we're sending a proper transferable object
    const result_to_send = current_data instanceof Uint8ClampedArray ? current_data : new Uint8ClampedArray(current_data);

    // Only transfer if it's a proper ArrayBuffer
    if (result_to_send.buffer && result_to_send.buffer instanceof ArrayBuffer) {
        self.postMessage({
            error: null,
            result: result_to_send
        }, [result_to_send.buffer]);
    } else {
        // Fallback without transfer
        self.postMessage({
            error: null,
            result: result_to_send
        });
    }
};
