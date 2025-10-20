/** 
 * Worker module
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

import { worker_pool } from "../class/worker_pool.js";
import { get_file_name_from_url } from "./files.js";
import { merge_normal_array, scale_normal_array } from "./image.js";
import { image_resizer } from "../class/image_resizer.js";

/**
 * Initializes workers pool by creating workers for each argument asynchronously
 * @param {Array<{url: string, type: string}>} arg - Array of objects with url and type
 * @returns {Promise<string[]>} Promise resolving to array of worker names
 */
export const init_workers_pool = async arg => {
    const results = [];
    const len = arg.length;

    for (let i = 0; i < len; i++) {
        const item = arg[i];
        const name = get_file_name_from_url(item.url);
        console.log({ name });
        await worker_pool.create(name, item.url, { type: item.type });
        if (worker_pool.get_status(name) !== 'active') throw new Error('Failed to create worker');
        results[i] = name;
    }

    return results;
};

/**
 * Executes normal map operation via worker or fallback
 * @param {string} worker_name - Worker name
 * @param {string} type - Operation type
 * @param {Object} data - Operation data
 * @param {Function} fallback - Fallback function
 * @param {Array} transfer_list - Transferable objects
 * @returns {Promise<Uint8ClampedArray>} Operation result
 */
const execute_worker = (worker_name, type, data, fallback, transfer_list = []) => {
    const worker = worker_pool.get_worker(worker_name);
    if (!worker) return Promise.resolve(fallback());

    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
        const on_message = ({ data: event_data = {} }) => {
            const { result, id: res_id } = event_data;
            if (res_id !== id) return;

            worker_pool.remove_listener(worker_name, "message", on_message);
            worker_pool.remove_listener(worker_name, "error", on_error);
            resolve(new Uint8ClampedArray(result.data));
        };

        const on_error = (error) => {
            worker_pool.remove_listener(worker_name, "message", on_message);
            worker_pool.remove_listener(worker_name, "error", on_error);
            reject(error);
        };

        worker_pool.add_listener(worker_name, "message", on_message);
        worker_pool.add_listener(worker_name, "error", on_error);

        data.type = type;
        data.id = id;
        data.extra = null;
        worker.postMessage(data, transfer_list);
    });
};

/**
 * Scales normal map data using worker or CPU fallback
 * @param {Uint8ClampedArray} src_data - Source image data
 * @param {number} natural_width - Source width
 * @param {number} natural_height - Source height
 * @param {number} scale_width - Target width
 * @param {number} scale_height - Target height
 * @returns {Promise<Uint8ClampedArray>} Scaled normal map
 */
export const scale_normal_map = (src_data, natural_width, natural_height, scale_width, scale_height) =>
    execute_worker(
        "normal_map_ww", "scale",
        {
            src: {
                data: src_data.buffer,
                width: natural_width,
                height: natural_height
            },
            target: {
                width: scale_width,
                height: scale_height
            }
        },
        () => scale_normal_array(src_data, natural_width, natural_height, scale_width, scale_height),
        [src_data.buffer]
    );

/**
 * Merges multiple normal maps using worker or CPU fallback
 * @param {Uint8ClampedArray} base_data - Base normal map
 * @param {Uint8ClampedArray} add_data - Additional normal map
 * @param {Uint8ClampedArray} mask_data - Blend mask
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Promise<Uint8ClampedArray>} Merged normal map
 */
export const merge_normal_map = (base, add, mask) =>
    execute_worker(
        "normal_map_ww", "merge",
        {
            base: { data: base.data.buffer, width: base.width, height: base.height },
            add: { data: add.data.buffer, width: add.width, height: add.height },
            mask: { data: mask.data.buffer, width: mask.width, height: mask.height },
        },
        () => merge_normal_array(base.data, add.data, mask.data, base.width, base.height),
        [base.data.buffer, add.data.buffer, mask.data.buffer]
    );


export const scale_image_map = (src_data, src_width, src_height, target_width, target_height, options) =>
    execute_worker(
        "image_ww", "scale",
        {
            src: { data: src_data.buffer, width: src_width, height: src_height },
            target: { width: target_width, height: target_height },
            options
        },
        () => {
            console.log(`fallback`);
            return image_resizer.resize({
                src: src_data,
                width: src_width,
                height: src_height,
                to_width: target_width,
                to_height: target_height,
                filter: options.filter,
                unsharp_amount: options.unsharp_amount,
                unsharp_radius: options.unsharp_radius,
                unsharp_threshold: options.unsharp_threshold,
                gamma_correct: options.gamma_correct
            });
        },
        [src_data.buffer]
    );

