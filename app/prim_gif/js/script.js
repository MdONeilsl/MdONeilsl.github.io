/**
 * Media to Prim: Extracts frames from video and GIF images for use in Second Life.
 * Copyright (C) 2025 MdONeil
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 * 
 * secondlife:///app/agent/ae929a12-297c-45be-9748-562ee17e937e/about
 */

if (typeof SuperGif === 'undefined') {
    console.error('libgif-js failed to load.');
    show_error('Failed to load required library for GIFs. Videos may still work.');
}

const input = document.getElementById('input');
const max_canvas_size_select = document.getElementById('maxCanvasSize');
const max_frame_size_select = document.getElementById('maxFrameSize');
const video_fps_select = document.getElementById('videoFps');
const container = document.getElementById('canvasContainer');
const canvas_info = document.getElementById('canvasInfo');
const progress_bar = document.getElementById('progressBar');
const hidden_image = document.getElementById('hiddenImage');
const hidden_video = document.getElementById('hiddenVideo');
const message_container = document.getElementById('messageContainer');
const save_btn = document.querySelector('#button-save');

let out_datas = [];

/**
 * Displays an error message to the user
 * @param {string} message - The error message to display
 */
const show_error = (message) => {
    container.innerHTML = '';
    canvas_info.value = '';
    progress_bar.style.display = 'none';

    message_container.innerHTML = '';
    const error_div = document.createElement('div');
    error_div.id = 'errorMessage';
    error_div.textContent = message;
    message_container.appendChild(error_div);
};

/**
 * Displays a success message to the user
 */
const show_success = () => {
    progress_bar.style.display = 'none';

    message_container.innerHTML = '';
    const success_div = document.createElement('div');
    success_div.id = 'successMessage';
    success_div.textContent = 'File loaded and parsed successfully';
    message_container.appendChild(success_div);
};

/**
 * Clears all media and resets the interface
 */
const clear_media = () => {
    hidden_image.src = '';
    hidden_video.src = '';
    hidden_video.removeAttribute('src');
    hidden_video.load();
    container.innerHTML = '';
    canvas_info.value = '';
    progress_bar.style.display = 'none';
    progress_bar.value = 0;
    input.value = '';
    hidden_image.onload = null;
    hidden_image.onerror = null;
    hidden_video.onloadedmetadata = null;
    hidden_video.onseeked = null;
    hidden_video.onerror = null;
    save_btn.disabled = true;
    out_datas = {};
};

let input_type;
let data_url;

input.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        show_error('No file selected.');
        return;
    }

    clear_media();
    progress_bar.style.display = 'block';
    progress_bar.value = 0;

    const reader = new FileReader();
    reader.onload = (e) => {
        data_url = e.target.result;
        if (file.type.startsWith('image/gif')) {
            input_type = 'image/gif';
            process_gif(data_url);
        } else if (file.type.startsWith('video/')) {
            input_type = 'video/';
            process_video(data_url);
        } else {
            show_error('Please select a GIF or video file.');
        }
    };
    reader.readAsDataURL(file);
});

/**
 * Processes the current media file based on input type
 */
const process = () => {
    clear_media();
    progress_bar.style.display = 'block';
    progress_bar.value = 0;

    if (input_type === 'image/gif') {
        process_gif(data_url);
    } else if (input_type === 'video/') {
        process_video(data_url);
    } else {
        show_error('Please select a GIF or video file.');
    }
};

max_canvas_size_select.addEventListener('change', process);
max_frame_size_select.addEventListener('change', process);
video_fps_select.addEventListener('change', process);

/**
 * Processes a GIF file and extracts its frames
 * @param {string} data_url - The data URL of the GIF file
 */
const process_gif = (data_url) => {
    try {
        hidden_image.src = data_url;
        hidden_image.onload = () => {
            const gif = new SuperGif({ gif: hidden_image });
            gif.load(() => {
                const canvas = gif.get_canvas();
                const width = canvas.width;
                const height = canvas.height;
                const frame_count = gif.get_length();

                if (frame_count === 0) {
                    show_error('No frames found in the GIF.');
                    return;
                }

                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const frames = [];
                const frame_delays = [];

                for (let i = 0; i < frame_count; i++) {
                    gif.move_to(i);
                    const image_data = ctx.getImageData(0, 0, width, height);
                    frames.push({
                        width,
                        height,
                        pixels: image_data.data
                    });
                    const frame_info = gif.get_frames()[i];
                    frame_delays.push(frame_info.delay || 100);
                    progress_bar.value = ((i + 1) / frame_count) * 100;
                }

                show_success();
                draw_frames(frames, width, height, frame_delays, null);
                save_btn.disabled = false;
            }, (error) => {
                console.error('libgif-js load error:', error);
                show_error('Error loading GIF. Please try another file.');
            });
        };
        hidden_image.onerror = () => {
            show_error('Error loading GIF image data.');
        };
    } catch (error) {
        console.error('Error processing GIF:', error);
        show_error('Error processing GIF file.');
    }
};

/**
 * Processes a video file and extracts frames at target FPS
 * @param {string} data_url - The data URL of the video file
 */
const process_video = async (data_url) => {
    try {
        hidden_video.src = data_url;
        await new Promise((resolve, reject) => {
            hidden_video.onloadedmetadata = resolve;
            hidden_video.onerror = () => reject(new Error('Error loading video metadata.'));
        });

        const width = hidden_video.videoWidth;
        const height = hidden_video.videoHeight;
        const duration = hidden_video.duration;

        if (!width || !height || !duration) {
            show_error('Invalid video dimensions or duration.');
            return;
        }

        const target_fps = parseInt(video_fps_select.value);
        const frame_time = 1 / target_fps;
        const total_frames = Math.floor(duration * target_fps);
        
        if (total_frames > 1000) {
            show_error(`Video has ${total_frames} frames, which may be too many to process. Consider a shorter video or lower FPS.`);
            return;
        }

        const frames = [];
        const frame_delays = new Array(total_frames).fill(frame_time * 1000);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        for (let i = 0; i < total_frames; i++) {
            const time = i * frame_time;
            await new Promise((resolve, reject) => {
                const seek_handler = () => {
                    ctx.drawImage(hidden_video, 0, 0, width, height);
                    const image_data = ctx.getImageData(0, 0, width, height);
                    frames.push({
                        width,
                        height,
                        pixels: image_data.data
                    });
                    progress_bar.value = (frames.length / total_frames) * 100;
                    hidden_video.onseeked = null;
                    hidden_video.onerror = null;
                    resolve();
                };
                
                const error_handler = () => {
                    hidden_video.onseeked = null;
                    hidden_video.onerror = null;
                    reject(new Error('Error seeking video.'));
                };

                hidden_video.onseeked = seek_handler;
                hidden_video.onerror = error_handler;
                hidden_video.currentTime = time;
            });
        }

        show_success();
        draw_frames(frames, width, height, frame_delays, target_fps);
        save_btn.disabled = false;
    } catch (error) {
        console.error('Error processing video:', error);
        show_error('Error processing video file. Please ensure it is a valid video.');
    }
};

/**
 * Draws frames onto canvases and arranges them in a grid layout
 * @param {Array} frames - Array of frame data objects
 * @param {number} input_width - Original width of the frames
 * @param {number} input_height - Original height of the frames
 * @param {Array} frame_delays - Array of frame delay times
 * @param {number|null} target_fps - Target frames per second for video
 */
const draw_frames = (frames, input_width, input_height, frame_delays, target_fps) => {
    const max_canvas_size = parseInt(max_canvas_size_select.value);
    const max_frame_size = parseInt(max_frame_size_select.value);
    const powers_of_2 = [64, 128, 256, 512, 1024, 2048].filter(p => p <= max_canvas_size);
    let canvas_index = 0;

    const avg_frame_delay = (frame_delays.reduce((sum, delay) => sum + delay, 0) / frame_delays.length) / 1000;
    const min_frame_width = input_width / 2;
    const min_frame_height = input_height / 2;
    const total_frames = frames.length;

    const sqrt_frames = Math.ceil(Math.sqrt(total_frames));
    const max_frames_per_row = Math.floor(max_canvas_size / Math.min(max_frame_size, min_frame_width));
    const max_frames_per_col = Math.floor(max_canvas_size / Math.min(max_frame_size, min_frame_height));
    const frames_per_row_initial = Math.min(sqrt_frames, max_frames_per_row);
    const frames_per_col_initial = Math.min(Math.ceil(total_frames / frames_per_row_initial), max_frames_per_col);

    const frame_width = Math.min(Math.max(Math.ceil(max_canvas_size / frames_per_row_initial), Math.ceil(min_frame_width)), max_frame_size);
    const frame_height = Math.min(Math.max(Math.ceil(max_canvas_size / frames_per_col_initial), Math.ceil(min_frame_height)), max_frame_size);

    /**
     * Evaluates the optimal layout for frames on a canvas
     * @param {number} total_frames - Total number of frames to layout
     * @returns {Object} Layout configuration object
     */
    const evaluate_layout = (total_frames) => {
        let frames_per_row = Math.floor(max_canvas_size / frame_width);
        let frames_per_col = Math.floor(max_canvas_size / frame_height);
        
        if (frames_per_row === 0 || frames_per_col === 0) {
            return {
                frames_per_row: 1,
                frames_per_col: 1,
                frames_per_canvas: 1,
                canvas_width: frame_width,
                canvas_height: frame_height
            };
        }

        const actual_rows_needed = Math.ceil(total_frames / frames_per_row);
        const frames_per_col_adjusted = Math.min(frames_per_col, actual_rows_needed);
        const frames_per_canvas = frames_per_row * frames_per_col_adjusted;

        let canvas_width = frames_per_row * frame_width;
        let canvas_height = frames_per_col_adjusted * frame_height;

        if (canvas_width > max_canvas_size) {
            frames_per_row = Math.floor(max_canvas_size / frame_width);
            canvas_width = frames_per_row * frame_width;
        }
        
        if (canvas_height > max_canvas_size) {
            frames_per_col_adjusted = Math.floor(max_canvas_size / frame_height);
            canvas_height = frames_per_col_adjusted * frame_height;
            frames_per_canvas = frames_per_row * frames_per_col_adjusted;
        }

        return { 
            frames_per_row, 
            frames_per_col: frames_per_col_adjusted, 
            frames_per_canvas, 
            canvas_width, 
            canvas_height 
        };
    };

    /**
     * Draws a subset of frames onto a canvas
     * @param {number} start_frame - Index of the first frame to draw
     * @param {number} remaining_frames - Number of frames remaining to draw
     */
    const draw_canvas = (start_frame, remaining_frames) => {
        const { frames_per_row, frames_per_col, frames_per_canvas, canvas_width, canvas_height } = evaluate_layout(remaining_frames);
        const frames_to_draw = Math.min(remaining_frames, frames_per_canvas);

        if (frames_to_draw === 0) {
            show_error('No frames can be drawn. Please use a smaller file or fewer frames.');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvas_width;
        canvas.height = canvas_height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        for (let i = 0; i < frames_to_draw; i++) {
            const frame_index = start_frame + i;
            const frame = frames[frame_index];
            const row = Math.floor(i / frames_per_row);
            const col = i % frames_per_row;
            const x = col * frame_width;
            const y = row * frame_height;

            const image_data = ctx.createImageData(frame_width, frame_height);
            const pixels = render_frame(frame, frame_width, frame_height);
            image_data.data.set(pixels);
            ctx.putImageData(image_data, x, y);
        }

        const new_width = powers_of_2.find(p => p >= canvas_width) || max_canvas_size;
        const new_height = powers_of_2.find(p => p >= canvas_height) || max_canvas_size;
        
        const resized_canvas = document.createElement('canvas');
        resized_canvas.width = new_width;
        resized_canvas.height = new_height;
        const resized_ctx = resized_canvas.getContext('2d');
        resized_ctx.drawImage(canvas, 0, 0, new_width, new_height);

        resized_canvas.id = `canvas-${canvas_index}`;
        container.appendChild(resized_canvas);
        canvas_index++;

        out_datas.frames.push({
            id: resized_canvas.id,
            time: frames_to_draw * avg_frame_delay,
            frame: frames_to_draw,
            row: frames_per_col,
            col: frames_per_row
        });

        if (start_frame + frames_to_draw < frames.length) {
            draw_canvas(start_frame + frames_to_draw, frames.length - (start_frame + frames_to_draw));
        }
    };

    const selected_fps = parseInt(video_fps_select.value);
    const selected_side = parseInt(document.getElementById('objectSide').value);
    out_datas.global = { side: selected_side, fps: selected_fps };
    out_datas.frames = [];

    draw_canvas(0, frames.length);
};

/**
 * Renders a frame to the target dimensions using nearest-neighbor scaling
 * @param {Object} frame - Frame data object
 * @param {number} target_width - Target width for the rendered frame
 * @param {number} target_height - Target height for the rendered frame
 * @returns {Uint8ClampedArray} Scaled pixel data
 */
const render_frame = (frame, target_width, target_height) => {
    const { width, height, pixels } = frame;
    const scale_x = width / target_width;
    const scale_y = height / target_height;
    const output = new Uint8ClampedArray(target_width * target_height * 4);

    for (let y = 0; y < target_height; y++) {
        const src_y = Math.floor(y * scale_y);
        const src_y_offset = src_y * width;
        
        for (let x = 0; x < target_width; x++) {
            const src_x = Math.floor(x * scale_x);
            const src_idx = (src_y_offset + src_x) * 4;
            const dst_idx = (y * target_width + x) * 4;

            if (src_x < width && src_y < height && src_idx < pixels.length - 3) {
                output[dst_idx] = pixels[src_idx];
                output[dst_idx + 1] = pixels[src_idx + 1];
                output[dst_idx + 2] = pixels[src_idx + 2];
                output[dst_idx + 3] = pixels[src_idx + 3];
            }
        }
    }

    return output;
};

/**
 * Handles saving all processed frames as a ZIP file
 */
save_btn.addEventListener('click', async (e) => {
    const zip = new JSZip();
    const target = out_datas.global.side;
    const fps = out_datas.global.fps;

    const save_promises = out_datas.frames.map(async (frame, index) => {
        const canvas = document.querySelector(`#${frame.id}`);
        const fname = `${frame.id.replace('canvas', 'img')}_${target}_${fps}_${frame.time.toFixed(4)}_${frame.frame}_${frame.row}_${frame.col}.png`;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1));
        zip.file(fname, blob);
    });

    await Promise.all(save_promises);
    
    zip.generateAsync({ type: 'blob' }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prim-media.zip';
        a.click();
        URL.revokeObjectURL(url);
    });
});