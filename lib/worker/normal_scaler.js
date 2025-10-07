import { GPGPU } from "../class/gpgpu.js";
import { scale_normal_array } from "../module/image.js";

let vs_source = ``;
let fs_source = ``;

const load_shader_source = async url => {
    const response = await fetch(url, { cache: 'no-store', priority: 'high' });
    return response.text();
};

const gpuscl = (gp, src_data, src_width, src_height, target_width, target_height) => {
    try {
        // Setup program with actual shader sources
        gp.setup_program(vs_source, fs_source, 'position');
        gp.prog.use();

        // Create source texture
        const source_tex = gp.create_texture('source_tex', 0, src_data, src_width, src_height);

        // Create destination texture
        gp.create_texture('dest_tex', 1, null, target_width, target_height);

        // Setup framebuffer
        gp.setup_frame('dest_tex');

        // Set uniforms using the new simplified API
        source_tex.activate();
        gp.prog.set('source_tex', 0);  // Simplified: just name and value
        gp.prog.set('source_size', src_width, src_height);
        gp.prog.set('target_size', target_width, target_height);

        // Execute and get result
        const result = gp.glexec(target_width, target_height);
        gp.clear_frame();

        return result;
    }
    catch (err) {
        gp.clear();
        console.error('GPU execution error:', err);
        throw err;
    }
};

const next_step_size = (current_width, current_height, target_width, target_height) => {
    const next_dim = (current, target) => {
        if (current === target) return target;
        if (current < target) {
            const doubled = Math.floor(current << 1);
            return doubled <= target ? doubled : target;
        } else {
            const halved = Math.floor(current >> 1);
            return halved >= target ? halved : target;
        }
    };

    return [
        next_dim(current_width, target_width),
        next_dim(current_height, target_height)
    ];
};

self.onmessage = async (e) => {
    if (e.data === 'test') {
        self.postMessage('test');
        return;
    }

    const { src, width, height, target_width, target_height } = e.data;

    if (!(src instanceof Uint8ClampedArray) ||
        src.length !== width * height * 4 ||
        !Number.isInteger(width) || width <= 0 ||
        !Number.isInteger(height) || height <= 0 ||
        !Number.isInteger(target_width) || target_width <= 0 ||
        !Number.isInteger(target_height) || target_height <= 0) {
        self.postMessage({
            error: `Invalid input parameters or data size mismatch`,
            result: src
        }, [src.buffer]);
        return;
    }

    let current_data = src;
    let current_width = width;
    let current_height = height;

    [vs_source, fs_source] = await Promise.all([
        load_shader_source(`../shaders/min.vert`),
        load_shader_source(`../shaders/normal_scaler.frag`),
    ]);

    // Create GPGPU with max dimensions to avoid resizes
    const max_width = Math.max(width, target_width);
    const max_height = Math.max(height, target_height);
    const gpgpu = new GPGPU(max_width, max_height);

    let temp_data = new Uint8ClampedArray(max_width * max_height * 4);

    // Progressive scaling
    while (current_width !== target_width || current_height !== target_height) {
        const [next_width, next_height] = next_step_size(current_width, current_height, target_width, target_height);

        try {
            if (gpgpu.gl) {
                // Use GPU acceleration
                temp_data = gpgpu.exec(gpuscl, current_data, current_width, current_height, next_width, next_height);
            } else {
                throw new Error('WebGL not available');
            }
        }
        catch (gpu_err) {
            console.warn('GPU scaling failed, falling back to CPU:', gpu_err.message);
            // Fallback to CPU implementation
            temp_data = scale_normal_array(current_data, current_width, current_height, next_width, next_height);
        }

        current_data = temp_data.slice(0, next_width * next_height * 4);
        current_width = next_width;
        current_height = next_height;
    }

    gpgpu.clear();

    // No need for final cleanup since last instance is cleared

    // Transfer result with proper message format
    self.postMessage({
        error: null,
        result: current_data
    }, [current_data.buffer]);
};
