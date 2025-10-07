
import { merge_normal_array } from "../module/image.js";
import { GPGPU } from "../class/gpgpu.js";

let vs_source = ``;
let fs_source = ``;

const load_shader_source = async url => {
    const response = await fetch(url, { cache: 'no-store', priority: 'high' });
    return response.text();
};

/**
 * Executes GPU merging of normal maps using provided GPGPU instance and shader sources.
 * @param {GPGPU} gp - Instance of the GPGPU class
 * @param {ArrayBuffer} base_data - Base normal map buffer
 * @param {ArrayBuffer} add_data - Additional normal map buffer to merge
 * @param {ArrayBuffer} mask_data - Mask buffer controlling merge blending
 * @param {number} width - Width of the maps
 * @param {number} height - Height of the maps
 * @returns {Uint8Array|Float32Array} Resulting pixel data from GPU execution
 */
const gpu_mrg = (gp, base_data, add_data, mask_data, width, height) => {
    try {
        gp.setup_program(vs_source, fs_source, 'position');
        gp.prog.use();

        const base_tex = gp.create_texture('base_tex', 0, base_data, width, height);
        const add_tex = gp.create_texture('add_tex', 1, add_data, width, height);
        const mask_tex = gp.create_texture('mask_tex', 2, mask_data, width, height);
        gp.create_texture('dest_tex', 3, null, width, height);

        gp.setup_frame('dest_tex');

        base_tex.activate();
        add_tex.activate();
        mask_tex.activate();

        gp.prog.set('base_tex', 0);
        gp.prog.set('add_tex', 1);
        gp.prog.set('mask_tex', 2);
        gp.prog.set('y_sign', 1.0);

        const pixel_data = gp.glexec(width, height);
        gp.clear_frame();

        return pixel_data;
    } catch (err) {
        console.error('gpu execution error:', err);
        throw err;
    }
};


self.onmessage = async e => {
    if (e.data == `test`) {
        self.postMessage(e.data);
        return;
    }
    const { base_data, add_data, mask_data, width, height } = e.data;

    [vs_source, fs_source] = await Promise.all([
        load_shader_source(`../shaders/normal_merger.vert`),
        load_shader_source(`../shaders/normal_merger.frag`),
    ]);

    let temp_data = new Uint8ClampedArray(width * height * 4);
    const gpgpu = new GPGPU(width, height);

    try {
        if (gpgpu.gl) {
            // Use GPU acceleration
            temp_data = gpgpu.exec(gpu_mrg, base_data, add_data, mask_data, width, height);

        } else {
            throw new Error('WebGL not available');
        }
    }
    catch (gpu_err) {
        console.warn('GPU mergin failed, falling back to CPU:', gpu_err.message);
        // Fallback to CPU implementation
        merge_normal_array(base_data, add_data, mask_data, width, height, temp_data);
    }

    const result = temp_data.slice(0, width * height * 4);

    gpgpu.clear();

    self.postMessage({ result }, [result.buffer]);
};