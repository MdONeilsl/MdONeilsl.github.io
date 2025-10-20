/** 
 * Normal map worker
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

import { GPGPU } from "../class/gpgpu.js";
import { merge_normal_array, next_step_size, normal_from_height_map_array, resize_img_canv, scale_image_array, scale_normal_array } from "../module/image.js";

/** @type {GPGPU|null} */
let gpgpu = null;
/** @type {number} */
let max_tex_size = 0;

/**
 * Initializes WebGL context and shaders
 * @returns {Promise<void>}
 */
const init_promise = (async () => {
    const temp_gp = new GPGPU(1, 1, true);
    max_tex_size = temp_gp.max_tex_size;
    temp_gp.clear();

    gpgpu = new GPGPU(max_tex_size, max_tex_size, true);

    const fetch_shader = url => fetch(url, { cache: 'no-store' }).then(r => r.text());

    const [normal_scaler_vs, normal_scaler_fs, normal_merger_vs, normal_merger_fs, norm_height_vs, norm_height_fs] = await Promise.all([
        fetch_shader('../shaders/normal_scaler.vert'),
        fetch_shader('../shaders/normal_scaler.frag'),

        fetch_shader('../shaders/normal_merger.vert'),
        fetch_shader('../shaders/normal_merger.frag'),
        
        fetch_shader('../shaders/norm_from_height.vert'),
        fetch_shader('../shaders/norm_from_height.frag'),
    ]);

    const [normal_scaler, normal_merger, norm_from_height] = await Promise.all([
        (() => {
            const program = gpgpu.setup_program('normal_scaler', normal_scaler_vs, normal_scaler_fs, 'position');
            if (!program) throw new Error("Failed to setup program 'normal_scaler'");
            return program;
        })(),
        (() => {
            const program = gpgpu.setup_program('normal_merger', normal_merger_vs, normal_merger_fs, 'a_position');
            if (!program) throw new Error("Failed to setup program 'normal_merger'");
            return program;
        })(),
        (() => {
            const program = gpgpu.setup_program('norm_height', norm_height_vs, norm_height_fs, 'a_position');
            if (!program) throw new Error("Failed to setup program 'norm_from_height'");
            return program;
        })(),
    ]);

    self.postMessage({ type: 'ready' });
})();

/**
 * Generates normal map from height map using GPU
 * @param {GPGPU} gp - GPGPU instance
 * @param {Uint8ClampedArray} src_data - Source height map data
 * @param {number} src_width - Source width
 * @param {number} src_height - Source height
 * @param {Object} options - Processing options
 * @returns {Uint8ClampedArray} Generated normal map data
 */
const gpu_height = (gp, src_data, src_width, src_height, options = {}) => {
    const program = gp.get_program('norm_height');
    program.use();

    const source_tex = gp.create_texture('source_tex', 0, src_data, src_width, src_height);
    gp.create_texture('dest_tex', 1, null, src_width, src_height);
    gp.setup_frame('main_frame', 'dest_tex');

    source_tex.activate(0);
    program.set('u_heightMap', 0);
    program.set('u_resolution', src_width, src_height);
    program.set('u_texelSize', 1 / src_width, 1 / src_height);
    program.set('u_strength', options.strength || 3.0);
    program.set('u_smoothing', options.smoothing || 1);
    program.set('u_useScharr', options.use_scharr ? 1 : 0);
    program.set('u_invertRed', options.invert_red ? 1 : 0);
    program.set('u_invertGreen', options.invert_green ? 1 : 0);

    gp.render(src_width, src_height);
    const result = gp.read_pixels(src_width, src_height);
    gp.clear_frame();

    return result;
};

/**
 * Scales normal map using GPU
 * @param {GPGPU} gp - GPGPU instance
 * @param {Uint8ClampedArray} src_data - Source data
 * @param {number} src_width - Source width
 * @param {number} src_height - Source height
 * @param {number} target_width - Target width
 * @param {number} target_height - Target height
 * @returns {Uint8ClampedArray} Scaled normal map data
 */
const gpu_scale = (gp, src_data, src_width, src_height, target_width, target_height) => {
    const program = gp.get_program('normal_scaler');
    program.use();

    const source_tex = gp.create_texture('source_tex', 0, src_data, src_width, src_height);
    gp.create_texture('dest_tex', 1, null, target_width, target_height);
    gp.setup_frame('main_frame', 'dest_tex');

    source_tex.activate();
    program.set('source_tex', 0);
    program.set('source_size', src_width, src_height);
    program.set('target_size', target_width, target_height);

    gp.render(target_width, target_height);
    const result = gp.read_pixels(target_width, target_height);
    gp.clear_frame();

    return result;
};

/**
 * Merges normal maps using GPU
 * @param {GPGPU} gp - GPGPU instance
 * @param {Uint8ClampedArray} base_data - Base normal map data
 * @param {Uint8ClampedArray} add_data - Additional normal map data
 * @param {Uint8ClampedArray} mask_data - Mask data
 * @param {number} width - Texture width
 * @param {number} height - Texture height
 * @returns {Uint8ClampedArray} Merged normal map data
 */
const gpu_merge = (gp, base_data, add_data, mask_data, width, height) => {
    const program = gp.get_program('normal_merger');
    program.use();

    const base_tex = gp.create_texture('base_tex', 0, base_data, width, height);
    const add_tex = gp.create_texture('add_tex', 1, add_data, width, height);
    const mask_tex = gp.create_texture('mask_tex', 2, mask_data, width, height);
    gp.create_texture('dest_tex', 3, null, width, height);

    gp.setup_frame('merge_frame', 'dest_tex');

    base_tex.activate();
    add_tex.activate();
    mask_tex.activate();

    program.set('base_tex', 0);
    program.set('add_tex', 1);
    program.set('mask_tex', 2);
    program.set('y_sign', 1.0);

    gp.render(width, height);
    const result = gp.read_pixels(width, height);
    gp.clear_frame();

    return result;
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
 * Scales normal map data with progressive scaling
 * @param {Object} src - Source image data
 * @param {Object} target - Target dimensions
 * @returns {Object} Scaled image data with dimensions
 */
const local_normal_map_scale = (src, target) => {
    let current_data = src.data;
    let current_width = src.width;
    let current_height = src.height;
    const has_webgl = !!gpgpu?.is_webgl_available;

    while (current_width !== target.width || current_height !== target.height) {
        const next_width = next_step_size(current_width, target.width);
        const next_height = next_step_size(current_height, target.height);

        let temp_data;
        try {
            temp_data = has_webgl ?
                gpgpu.exec(gpu_scale, current_data, current_width, current_height, next_width, next_height) :
                scale_normal_array(current_data, current_width, current_height, next_width, next_height);
        } catch {
            temp_data = scale_normal_array(current_data, current_width, current_height, next_width, next_height);
        }

        current_data = temp_data;
        current_width = next_width;
        current_height = next_height;
    }

    clear_pass_resources();
    return { data: current_data, width: current_width, height: current_height };
};

/**
 * Validates image data parameters
 * @param {Object} data - Image data to validate
 * @param {string} name - Data name for error messages
 * @returns {boolean} True if valid
 */
const validate_image_data = (data, name = 'data') => {
    if (!data.data) throw new Error(`${name}.data is missing`);
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
const handle_scale_operation = async e => {
    const { src, target, id, extra } = e.data;
    
    try {
        validate_image_data(src, 'src');
        if (target.width <= 0) throw new Error('Invalid target.width: must be > 0');
        if (target.height <= 0) throw new Error('Invalid target.height: must be > 0');

        src.data = new Uint8ClampedArray(src.data);
        const result = local_normal_map_scale(src, target);

        self.postMessage({
            type: 'scale', id,
            result: { data: result.data.buffer, width: result.width, height: result.height },
            extra,
        }, [result.data.buffer]);
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    }
};

/**
 * Handles merge operation request
 * @param {MessageEvent} e - Message event
 */
const handle_merge_operation = async e => {
    const { base, add, mask, id, extra } = e.data;
    
    try {
        validate_image_data(base, 'base');
        validate_image_data(add, 'add');
        validate_image_data(mask, 'mask');

        base.data = new Uint8ClampedArray(base.data);
        add.data = new Uint8ClampedArray(add.data);
        mask.data = new Uint8ClampedArray(mask.data);

        if (add.width !== base.width || add.height !== base.height) {
            const scaled = local_normal_map_scale(
                { data: add.data, width: add.width, height: add.height },
                { width: base.width, height: base.height }
            );
            add.data = scaled.data;
            add.width = scaled.width;
            add.height = scaled.height;
        }

        if (mask.width !== base.width || mask.height !== base.height) {
            mask.data = scale_image_array(mask.data, mask.width, mask.height, base.width, base.height);
            mask.width = base.width;
            mask.height = base.height;
        }

        const has_webgl = !!gpgpu?.is_webgl_available;
        let result;

        try {
            result = has_webgl ?
                gpgpu.exec(gpu_merge, base.data, add.data, mask.data, base.width, base.height) :
                merge_normal_array(base.data, add.data, mask.data, base.width, base.height);
        } catch {
            result = new Uint8ClampedArray(base.width * base.height * 4);
            merge_normal_array(base.data, add.data, mask.data, base.width, base.height, result);
        }

        clear_pass_resources();

        self.postMessage({
            type: 'merge', id,
            result: { data: result.buffer, width: base.width, height: base.height },
            extra,
        }, [result.buffer]);
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    }
};

/**
 * Handles normal from height operation request
 * @param {MessageEvent} e - Message event
 */
const handle_normal_height_operation = async e => {
    const { src, options, id, extra } = e.data;
    
    try {
        validate_image_data(src, 'src');
        src.data = new Uint8ClampedArray(src.data);

        const has_webgl = !!gpgpu?.is_webgl_available;
        let result;

        try {
            result = has_webgl ?
                gpgpu.exec(gpu_height, src.data, src.width, src.height, options) :
                normal_from_height_map_array(src.data, src.width, src.height, options);
        } catch {
            result = new Uint8ClampedArray(src.width * src.height * 4);
            normal_from_height_map_array(src.data, src.width, src.height, options, result);
        }

        clear_pass_resources();

        self.postMessage({
            type: 'norm_height', id,
            result: { data: result.buffer, width: src.width, height: src.height },
            extra,
        }, [result.buffer]);
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
            gpgpu?.clear();
            gpgpu = null;
            self.postMessage({ type: 'shutdown' });
            self.close();
        },
        'scale': handle_scale_operation,
        'merge': handle_merge_operation,
        'norm_height': handle_normal_height_operation
    };

    const handler = handler_map[type];
    if (handler) handler(e);
};

self.onerror = e => {
    console.error('normal_map_ww.test.js worker error:', e);
};
