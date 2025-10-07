


/**
 * Runs a web worker with the provided script and message, returning a Promise with the result.
 * Handles worker termination and error cleanup.
 *
 * @param {string} worker_script_url - URL of the worker script module
 * @param {Object} message - Data message to post to the worker
 * @param {Transferable[]} [transfer=[]] - Optional array of Transferable objects
 * @returns {Promise<any>} Resolves with worker result or rejects on error
 */
const run_worker_task = async (worker_script_url, message, transfer = []) => {
    const worker = new Worker(new URL(worker_script_url, import.meta.url), { type: 'module' });

    return new Promise((resolve, reject) => {
        const cleanup = () => {
            worker.removeEventListener('message', message_handler);
            worker.removeEventListener('error', error_handler);
            worker.terminate();
        };

        const message_handler = e => {
            cleanup();

            if (e.data.error) {
                reject(new Error(e.data.error));
            } else {
                resolve(e.data.result);
            }
        };

        const error_handler = err => {
            cleanup();
            reject(err);
        };

        worker.addEventListener('message', message_handler, { once: true });
        worker.addEventListener('error', error_handler, { once: true });

        worker.postMessage(message, transfer);
    });
};

/**
 * Scales a normal map image using a worker.
 *
 * @param {ArrayBuffer} src - Source buffer of the normal map
 * @param {number} width - Source width
 * @param {number} height - Source height
 * @param {number} target_width - Target width
 * @param {number} target_height - Target height
 * @returns {Promise<any>} Scaled normal map result
 */
export const scale_normal_map_worker = async (src, width, height, target_width, target_height) =>
    run_worker_task(
        '../worker/normal_scaler.min.js',
        { src, width, height, target_width, target_height },
        [src.buffer]
    );

/**
 * Merges two normal maps with an optional mask using a worker.
 * @param {ArrayBuffer} base - Base normal map buffer
 * @param {ArrayBuffer} add - Additional normal map buffer to merge
 * @param {ArrayBuffer} mask - Mask buffer controlling merge blending
 * @param {number} width - Width of the maps
 * @param {number} height - Height of the maps
 * @returns {Promise<any>} Merged normal map result
 */
export const merge_normal_map_worker = async (base_data, add_data, mask_data, width, height) => {
    //console.log(`worker.js`, base_data, add_data, mask_data, width, height);
    return run_worker_task(
        '../worker/normal_merger.min.js',
        { base_data, add_data, mask_data, width, height }
    );
}

