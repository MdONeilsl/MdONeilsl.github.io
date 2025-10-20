/** 
 * Images worker
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

import * as resizer from '../class/image_resizer.js';
import { GPGPU } from "../class/gpgpu.js";
import { next_step_size } from "../module/image.js";

const FILTERS = { 
    box: 0, hamming: 1, lanczos2: 2, lanczos3: 3, mks2013: 4, bicubic: 5 
};

/** @type {GPGPU|null} */
let gpgpu = null;
/** @type {number} */
let max_tex_size = 0;

/**
 * Initializes WebGL context and shaders
 * @returns {Promise<void>}
 */
const init_promise = (async () => {
    try {
        const temp_gp = new GPGPU(1, 1, true);
        max_tex_size = temp_gp.max_tex_size;
        temp_gp.clear();

        gpgpu = new GPGPU(max_tex_size, max_tex_size, true);

        /**
         * Fetches shader source code
         * @param {string} url - Shader file URL
         * @returns {Promise<string>} Shader source code
         */
        const fetch_shader = (url) => fetch(url, { cache: 'no-store' }).then(r => r.text());

        const [image_resizer_vs, image_resizer_fs] = await Promise.all([
            fetch_shader('../shaders/image_resizer.vert'),
            fetch_shader('../shaders/image_resizer.frag'),
        ]);

        // Setup all shader programs in parallel
        const [image_resizer] = await Promise.all([
            (() => {
                //console.log(image_resizer_vs, image_resizer_fs);
                const program = gpgpu.setup_program('image_resizer', image_resizer_vs, image_resizer_fs, 'a_position');
                if (!program) throw new Error("Failed to setup program 'image_resizer'");
                return program;
            })(),
        ]);

        self.postMessage({ type: 'ready' });
    } catch (err) {
        console.error('Initialization failed:', err);
    }
})();


const gpu_scl = (gp, srcData, srcW, srcH, dstW, dstH, options = {}) => {
    //console.log(srcData, srcW, srcH, dstW, dstH, options);
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
    const prog = gp.get_program('image_resizer');
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
    
    return { pixels, width: dstW, height: dstH, textureName: cur_tex_name };
};

/**
 * Clears GPU resources between passes
 */
const clear_pass_resources = () => {
    gpgpu.textures.forEach(tex => tex.clear());
    gpgpu.textures.clear();
    gpgpu.frames.forEach(frame => frame.clear());
    gpgpu.frames.clear();
};

/**
 * Validates image data parameters
 * @param {Object} data - Image data to validate
 * @param {string} name - Data name for error messages
 * @returns {boolean} True if valid
 */
const validate_image_data = (data, name = 'data') => {
    if (!(data.data instanceof ArrayBuffer)) {
        throw new Error(`${name}.data is not an ArrayBuffer`);
    }
    if (data.width <= 0) throw new Error(`Invalid ${name}.width: must be > 0`);
    if (data.height <= 0) throw new Error(`Invalid ${name}.height: must be > 0`);
    if (data.data.byteLength !== data.width * data.height * 4) {
        throw new Error(`Data size mismatch: ${name} length does not equal width * height * 4`);
    }
    return true;
};

/**
 * Handles scale operation request
 * @param {MessageEvent} e - Message event
 */
const handle_scale_operation = async (e) => {
    const { src, target, options, id, extra } = e.data;
    const { filter, gamma_correct, unsharp_amount, unsharp_radius, unsharp_threshold } = options;
    //console.log(src, target, options, id, extra);
    //console.log(filter, gamma_correct, unsharp_amount, unsharp_radius, unsharp_threshold);

    try {
        validate_image_data(src, 'src');
        if (target.width <= 0) throw new Error('Invalid target.width: must be > 0');
        if (target.height <= 0) throw new Error('Invalid target.height: must be > 0');

        src.data = new Uint8ClampedArray(src.data);
        let temp_data;
        const has_webgl = !!gpgpu?.is_webgl_available;
        
        try {
            if (gpgpu?.is_webgl_available) {
                // Use GPU acceleration
                //throw new Error('Dummy error');
                const opts = { filter, gamma_correct, readFloat: false };
                if (unsharp_amount > 0) {
                    opts.unsharp = { amount: unsharp_amount, radius: unsharp_radius, threshold: unsharp_threshold };
                }

                const res = gpgpu.exec(gpu_scl, src.data, src.width, src.height, target.width, target.height, opts);
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
                src: src.data,
                width: src.width,
                height: src.height,
                to_width: target.width,
                to_height: target.height,
                filter,
                unsharp_amount,
                unsharp_radius,
                unsharp_threshold,
                gamma_correct,
                temp_data
            };

            temp_data = resizer.image_resizer.resize(opts);
        }

        const ret = temp_data.slice(0, target.width * target.height * 4);

        clear_pass_resources();

        self.postMessage({
            type: 'scale', id,
            result: { data: ret.buffer, width: target.width, height: target.height },
            extra,
        }, [ret.buffer]);

    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    }
};

self.onmessage = async e => {
    await init_promise;
    const { type } = e.data;

    const handler_map = {
        'test': () => self.postMessage({ type: 'test' }),
        'shutdown': () => {
            if (gpgpu) {
                gpgpu.clear();
                gpgpu = null;
            }
            self.postMessage({ type: 'shutdown' });
            self.close();
        },
        'scale': handle_scale_operation,
    };

    const handler = handler_map[type];
    if (handler) {
        handler(e);
    }

};

self.onerror = (e) => {
    console.error('normal_map_ww.test.js worker error:', e);
};

