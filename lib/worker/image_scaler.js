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

import * as resizer from '../class/image_resizer.js';
import { GPGPU } from "../class/gpgpu.js";
import { next_step_size } from "../module/image.js";

const FILTERS = {
    box: 0, hamming: 1, lanczos2: 2,
    lanczos3: 3, mks2013: 4, bicubic: 5
};

// Load shaders once when worker is created
const shader_load_promise = Promise.all([
    fetch('../shaders/image_resizer.vert', { cache: 'no-cache' }).then(r => r.text()),
    fetch('../shaders/image_resizer.frag', { cache: 'no-cache' }).then(r => r.text())
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


const gpu_scl = (gp, srcData, srcW, srcH, dstW, dstH, options = {}) => {
    const gl = gp.gl;

    const {
        filter = "lanczos3",
        gamma_correct = true,
        unsharp = null,
        keepTextures = false,
        baseTextureUnit = 0,
        keepOnGPU = false,
        readFloat = true,
    } = options;

    const filter_type = FILTERS[filter] ?? FILTERS.lanczos3;

    const OP_RESIZE = 0;
    const OP_UNSHARP = 3;
    const OP_GAUSSIAN_BLUR = 4;
    const OP_QUANTIZE = 5;

    // Texture naming (uses internal pooling)
    const prefix = `resizer_${baseTextureUnit}`;
    const tex_names = {
        src: `${prefix}_src`,
        mid: `${prefix}_mid`,
        work: `${prefix}_work`,
        blur_h: `${prefix}_blurH`,
        blur_v: `${prefix}_blurV`,
        final: `${prefix}_final`,
        quant: `${prefix}_quant`,
    };

    const desired_type = gl.UNSIGNED_BYTE;
    const prog = gp.setup_program('image_resizer_prog', vs_source, fs_source, 'a_position');
    if (!prog) throw new Error("Program 'image_resizer_prog' not found");

    const IMAGE_UNIT = baseTextureUnit + 1;
    const AUX_UNIT = baseTextureUnit + 2;
    const TEMP_UNIT = baseTextureUnit + 10;

    const perform_render_pass = ({
        operation,
        src_tex_name,
        dest_tex_name,
        dest_w,
        dest_h,
        src_w,
        src_h,
        is_horizontal,
        aux_tex_name,
        extra_uniforms = {},
        gamma_correct: pass_gamma_correct = false
    }) => {
        gp.create_texture(dest_tex_name, TEMP_UNIT, null, dest_w, dest_h, gl.RGBA, gl.RGBA, desired_type);
        gp.setup_frame(`${dest_tex_name}_f`, dest_tex_name);

        const src_t = gp.get_texture(src_tex_name);
        if (!src_t) throw new Error(`Source texture is null: ${src_tex_name}`);
        src_t.activate(IMAGE_UNIT);

        if (aux_tex_name) {
            const aux_t = gp.get_texture(aux_tex_name);
            if (!aux_t) throw new Error(`Aux texture is null: ${aux_tex_name}`);
            aux_t.activate(AUX_UNIT);
        }

        prog.use();
        prog.set("u_image", IMAGE_UNIT);
        if (aux_tex_name) prog.set("u_aux_image", AUX_UNIT);
        prog.set("u_src_size", src_w, src_h);
        prog.set("u_dest_size", dest_w, dest_h);
        prog.set("u_operation", operation);
        prog.set("u_filter_type", filter_type);
        prog.set("u_gamma_correct", pass_gamma_correct);
        if (is_horizontal !== undefined) prog.set("u_is_horizontal", is_horizontal);
        prog.set("u_amount", 0.0);
        prog.set("u_threshold", 0.0);
        prog.set("u_sigma", 0.0);

        Object.entries(extra_uniforms).forEach(([key, value]) => {
            prog.set(key, value);
        });

        gp.render(dest_w, dest_h);
    };

    // 1. Upload source texture
    gp.create_texture(tex_names.src, TEMP_UNIT, srcData, srcW, srcH, gl.RGBA, gl.RGBA, desired_type);

    // Current working texture
    let cur_w = srcW;
    let cur_h = srcH;
    let cur_tex_name = tex_names.src;

    // 2. Multi-step resize
    while (cur_w !== dstW || cur_h !== dstH) {
        const next_w = next_step_size(cur_w, dstW);
        const next_h = next_step_size(cur_h, dstH);

        // Horizontal pass
        perform_render_pass({
            operation: OP_RESIZE,
            src_tex_name: cur_tex_name,
            dest_tex_name: tex_names.mid,
            dest_w: next_w,
            dest_h: cur_h,
            src_w: cur_w,
            src_h: cur_h,
            is_horizontal: 1,
            gamma_correct: gamma_correct
        });

        // Vertical pass
        perform_render_pass({
            operation: OP_RESIZE,
            src_tex_name: tex_names.mid,
            dest_tex_name: tex_names.work,
            dest_w: next_w,
            dest_h: next_h,
            src_w: next_w,
            src_h: cur_h,
            is_horizontal: 0,
            gamma_correct: gamma_correct
        });

        cur_w = next_w;
        cur_h = next_h;
        cur_tex_name = tex_names.work;
    }

    // 3. Optional unsharp mask (with auto-blur)
    if (unsharp && unsharp.amount > 0) {
        // 1) Quantize the texture to simulate 8-bit (stays on GPU but rounded)
        perform_render_pass({
            operation: OP_QUANTIZE,
            src_tex_name: cur_tex_name,
            dest_tex_name: tex_names.quant,
            dest_w: dstW,
            dest_h: dstH,
            src_w: dstW,
            src_h: dstH
        });

        // Compute sigma (like CPU)
        const sigma = Math.min(Math.max(unsharp.radius, 0.5), 2.0);

        // 3a. Gaussian blur (horizontal then vertical)
        perform_render_pass({
            operation: OP_GAUSSIAN_BLUR,
            src_tex_name: tex_names.quant,
            dest_tex_name: tex_names.blur_h,
            dest_w: dstW,
            dest_h: dstH,
            src_w: dstW,
            src_h: dstH,
            is_horizontal: 1,
            extra_uniforms: { "u_sigma": sigma }
        });

        perform_render_pass({
            operation: OP_GAUSSIAN_BLUR,
            src_tex_name: tex_names.blur_h,
            dest_tex_name: tex_names.blur_v,
            dest_w: dstW,
            dest_h: dstH,
            src_w: dstW,
            src_h: dstH,
            is_horizontal: 0,
            extra_uniforms: { "u_sigma": sigma }
        });

        // 3b. Unsharp mask (using blurred and original)
        perform_render_pass({
            operation: OP_UNSHARP,
            src_tex_name: tex_names.blur_v,
            dest_tex_name: tex_names.final,
            dest_w: dstW,
            dest_h: dstH,
            src_w: dstW,
            src_h: dstH,
            aux_tex_name: tex_names.quant,
            extra_uniforms: {
                "u_amount": unsharp.amount || 1.0,
                "u_threshold": (unsharp.threshold || 0) / 255.0
            }
        });

        cur_tex_name = tex_names.final;
    }

    // 4. Readback or keep on GPU
    const final_tex = gp.get_texture(cur_tex_name);
    if (!final_tex) throw new Error("Final texture missing");

    if (keepOnGPU) {
        return { pixels: null, width: dstW, height: dstH, textureName: cur_tex_name };
    }

    const supports_float = final_tex.supports_float;
    const read_type = (readFloat && supports_float) ? gl.FLOAT : gl.UNSIGNED_BYTE;
    const pixels = gp.read_pixels(dstW, dstH, gl.RGBA, read_type);

    gp.clear_frame();
    if (!keepTextures) {
        Object.values(tex_names).forEach(n => {
            const t = gp.get_texture(n);
            if (t) { t.clear(); gp.textures.delete(n); }
        });
    }

    return { pixels, width: dstW, height: dstH, textureName: cur_tex_name };
};

self.onmessage = async e => {
    if (e.data == `test`) {
        self.postMessage(e.data);
        return;
    }

    const { src, width, height, target_width, target_height, options } = e.data;
    const { filter, gamma_correct, unsharp_amount, unsharp_radius, unsharp_threshold } = options;
    //console.log(`image_scaler.js`, src, width, height, target_width, target_height, filter, gamma_correct, unsharp_amount, unsharp_radius, unsharp_threshold);

    try {
        if (!(src instanceof Uint8ClampedArray) && !(src instanceof Float32Array)) {
            throw new Error('src must be Uint8ClampedArray or Float32Array');
        }
        if (!Number.isInteger(width) || width <= 0) throw new Error('width must be positive integer');
        if (!Number.isInteger(height) || height <= 0) throw new Error('height must be positive integer');
        if (!Number.isInteger(target_width) || target_width < 0) throw new Error('to_width must be non-negative integer');
        if (!Number.isInteger(target_height) || target_height < 0) throw new Error('to_height must be non-negative integer');
        const filter_idx = FILTERS[filter];
        if (filter_idx < 0 || filter_idx >= FILTERS.length) throw new Error(`unsupported filter: ${filter}`);
        if (unsharp_amount < 0) throw new Error('unsharp_amount must be >= 0');
        if (unsharp_radius < 0) throw new Error('unsharp_radius must be >= 0');
        if (unsharp_threshold < 0 || unsharp_threshold > 255) throw new Error('unsharpThreshold must be 0-255');
    } catch (error) {
        console.error('Failed to load shaders:', error);
        self.postMessage({ src }, [src.buffer]);
        return;
    }



    await shader_load_promise;

    const max_width = Math.max(width, target_width);
    const max_height = Math.max(height, target_height);
    let temp_data = new Uint8ClampedArray(max_width * max_height * 4);
    const gpgpu = new GPGPU(max_width, max_height, true);

    const max_tex_size = gpgpu.max_tex_size;
    if (max_tex_size < width || max_tex_size < height) {
        console.warn(`Request to scale the image that exceeds your hardware's maximum texture size. Performing software prepass. This might be slow`);

        const temp_width = Math.min(max_tex_size, width);
        const temp_height = Math.min(max_tex_size, height);

        const opts = {
            src, width, height,
            to_width: temp_width,
            to_height: temp_height,
            filter: filter,
            unsharp_amount,
            unsharp_radius,
            unsharp_threshold,
            gamma_correct,
            temp_data
        };

        temp_data = resizer.image_resizer.resize(opts);
        src = temp_data.slice(0, temp_width * temp_height * 4);
        width = temp_width;
        height = temp_height;
    }


    try {
        if (gpgpu.is_webgl_available) {
            // Use GPU acceleration
            //throw new Error('Dummy error');
            const opts = { filter, gamma_correct, readFloat: false };
            if (unsharp_amount > 0) {
                opts.unsharp = { amount: unsharp_amount, radius: unsharp_radius, threshold: unsharp_threshold };
            }

            const res = gpgpu.exec(gpu_scl, src, width, height, target_width, target_height, opts);
            temp_data = res.pixels;
        } else {
            throw new Error('WebGL not available');
        }
    }
    catch (gpu_err) {
        console.warn('GPU resizer failed, falling back to CPU:', gpu_err.message);
        // Fallback to CPU implementation

        // src, width, height, target_width, target_height, options

        const opts = {
            src,
            width,
            height,
            to_width: target_width,
            to_height: target_height,
            filter: filter,
            unsharp_amount,
            unsharp_radius,
            unsharp_threshold,
            gamma_correct,
            temp_data
        };

        temp_data = resizer.image_resizer.resize(opts);
    }

    const result = temp_data.slice(0, target_width * target_height * 4);

    gpgpu.clear();

    self.postMessage({ result }, [result.buffer]);
};
