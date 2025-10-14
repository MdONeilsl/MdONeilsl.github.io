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

import { merge_normal_array } from "../module/image.js";
import { GPGPU } from "../class/gpgpu.js";

// Load shaders once when worker is created
const shader_load_promise = Promise.all([
    fetch('../shaders/normal_merger.vert', { cache: 'no-cache' }).then(r => r.text()),
    fetch('../shaders/normal_merger.frag', { cache: 'no-cache' }).then(r => r.text())
]);

let vs_source = ``;
let fs_source = ``;

// Initialize shaders immediately
shader_load_promise.then(([vert, frag]) => {
    vs_source = vert;
    fs_source = frag;
}).catch(err => {
    console.error('Failed to load shaders:', err);
});

/**
 * Executes GPU merging of normal maps using provided GPGPU instance.
 * @param {GPGPU} gp - GPGPU instance
 * @param {Uint8ClampedArray} base_data - Base normal map data
 * @param {Uint8ClampedArray} add_data - Additional normal map data to merge
 * @param {Uint8ClampedArray} mask_data - Mask data controlling merge blending
 * @param {number} width - Width of the maps
 * @param {number} height - Height of the maps
 * @returns {Uint8ClampedArray} Resulting pixel data from GPU execution
 */
const gpu_merge = (gp, base_data, add_data, mask_data, width, height) => {
    try {
        //console.log(`source:`, vs_source, fs_source);
        const prog = gp.setup_program('merge_program', vs_source, fs_source, 'a_position');
        prog.use();

        const base_tex = gp.create_texture('base_tex', 0, base_data, width, height);
        const add_tex = gp.create_texture('add_tex', 1, add_data, width, height);
        const mask_tex = gp.create_texture('mask_tex', 2, mask_data, width, height);
        gp.create_texture('dest_tex', 3, null, width, height);

        gp.setup_frame('merge_frame', 'dest_tex');

        base_tex.activate();
        add_tex.activate();
        mask_tex.activate();

        prog.set('base_tex', 0);
        prog.set('add_tex', 1);
        prog.set('mask_tex', 2);
        prog.set('y_sign', 1.0);

        gp.render(width, height);

        const result = gp.read_pixels(width, height);
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

    const { base_data, add_data, mask_data, width, height } = e.data;

    // Input validation with early return
    if (!(base_data instanceof Uint8ClampedArray) || 
        !(add_data instanceof Uint8ClampedArray) || 
        !(mask_data instanceof Uint8ClampedArray) ||
        base_data.length !== width * height * 4 ||
        add_data.length !== width * height * 4 ||
        mask_data.length !== width * height * 4  ||
        width <= 0 || height <= 0) {
        
        self.postMessage({ 
            error: 'Invalid input parameters' 
        });
        return;
    }

    // Ensure shaders are loaded
    await shader_load_promise;

    const gpgpu = new GPGPU(width, height);
    const has_webgl = !!gpgpu.is_webgl_available;
    let result_data;

    try {
        if (has_webgl) {
            result_data = gpgpu.exec(gpu_merge, base_data, add_data, mask_data, width, height);
        } else {
            throw new Error('WebGL not available');
        }
    } catch (gpu_err) {
        console.warn('GPU merging failed, falling back to CPU:', gpu_err.message);
        result_data = new Uint8ClampedArray(width * height * 4);
        merge_normal_array(base_data, add_data, mask_data, width, height, result_data);
    }

    gpgpu.clear();

    // Transfer result efficiently
    self.postMessage({ 
        error: null, 
        result: result_data 
    }, [result_data.buffer]);
};
