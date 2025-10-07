
/*
    Normal Map Merger: A tool for merging two normal maps.
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

    secondlife:///app/agent/ae929a12-297c-45be-9748-562ee17e937e/about
*/

import { save_file } from "../../../lib/module/files.js";
import { canvas_to_blob, get_image_data, has_transparency, load_image, resize_img_canv } from "../../../lib/module/image.js";
import { merge_normal_map_worker, scale_normal_map_worker } from "../../../lib/module/worker.js";

/**
 * Normal map merger tool for combining normal maps with alpha channel blending
 * Optimized for performance across major browsers
 */
class NormalMapMerger {
    constructor() {
        this.base_input = null;
        this.add_input = null;
        this.intensity_input = null;
        this.fallback_alpha_input = null;
        this.merge_button = null;
        this.preview_canvas = null;
        this.error_message = null;
        this.download_button = null;

        this.datas = {
            base: null,
            add: null,
            mask: null
        };

        this.is_processing = false;
        this.result_image_data = null;
        this.canvas_ctx = null;

        // Cache DOM events and reusable objects
        this.event_handlers = new Map();
        this.drag_events = ['dragenter', 'dragover', 'dragleave', 'drop'];
    }

    /**
     * Initialize the application and set up event listeners
     */
    init = () => {
        this.base_input = document.getElementById('baseInput');
        this.add_input = document.getElementById('addInput');
        this.intensity_input = document.getElementById('intensity');
        this.fallback_alpha_input = document.getElementById('fallbackAlpha');
        this.merge_button = document.getElementById('process-btn');
        this.preview_canvas = document.getElementById('preview');
        this.error_message = document.getElementById('error-message');
        this.download_button = document.getElementById('download');

        // Pre-get canvas context for reuse
        this.canvas_ctx = this.preview_canvas.getContext('2d', { willReadFrequently: false });

        this.setup_dropzone('baseDropzone', 'baseInput', 'base');
        this.setup_dropzone('addDropzone', 'addInput', 'add');
        this.setup_dropzone('maskDropzone', 'maskInput', 'mask');

        this.merge_button.addEventListener('click', this.merge_normal_maps);
        this.download_button.addEventListener('click', this.download_result);

        // Hide download button initially
        this.download_button.style.display = 'none';
        this.preview_canvas.style.display = 'none';
    }

    /**
     * Display error message to user
     * @param {string} message - Error message to display
     */
    show_error = (message) => {
        this.error_message.textContent = message;
        this.error_message.style.display = 'block';
    }

    /**
     * Clear any displayed error messages
     */
    clear_error = () => {
        this.error_message.textContent = '';
        this.error_message.style.display = 'none';
    }

    /**
     * Create preview image element for dropzone
     * @param {string} dropzone_id - ID of the dropzone element
     * @returns {HTMLImageElement} Preview image element
     */
    create_preview_image = (dropzone_id) => {
        const preview_img = document.createElement('img');
        preview_img.className = 'dropzone-preview';
        preview_img.style.maxWidth = '100%';
        preview_img.style.maxHeight = '100%';
        preview_img.style.objectFit = 'contain';
        preview_img.style.display = 'none';
        return preview_img;
    }

    /**
     * Create canvas-based preview to avoid blob URL issues
     * @param {HTMLImageElement} image - Loaded image for preview
     * @param {number} max_size - Maximum dimension for preview
     * @returns {HTMLCanvasElement} Canvas element with preview
     */
    create_canvas_preview = (image, max_size = 100) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate scaled dimensions while maintaining aspect ratio
        let width = image.width;
        let height = image.height;

        if (width > height && width > max_size) {
            height = (height * max_size) / width;
            width = max_size;
        } else if (height > max_size) {
            width = (width * max_size) / height;
            height = max_size;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);

        return canvas;
    }

    /**
     * Update dropzone preview with selected image
     * @param {string} dropzone_id - ID of the dropzone element
     * @param {HTMLImageElement} image - Loaded image for preview
     * @param {string} file_name - Name of the selected file
     */
    update_dropzone_preview = (dropzone_id, image, file_name) => {
        const dropzone = document.getElementById(dropzone_id);
        const existing_preview = dropzone.querySelector('.dropzone-preview');
        const existing_text = dropzone.querySelector('.dropzone-text');

        // Create canvas preview to avoid blob URL issues
        const canvas_preview = this.create_canvas_preview(image);

        if (existing_preview) {
            existing_preview.src = canvas_preview.toDataURL();
            existing_preview.style.display = 'block';
            existing_preview.alt = file_name;
        } else {
            const preview_img = this.create_preview_image(dropzone_id);
            preview_img.src = canvas_preview.toDataURL();
            preview_img.alt = file_name;
            preview_img.style.display = 'block';
            dropzone.appendChild(preview_img);
        }

        if (existing_text) {
            existing_text.style.display = 'none';
        }
    }

    /**
     * Clear dropzone preview
     * @param {string} dropzone_id - ID of the dropzone element
     */
    clear_dropzone_preview = (dropzone_id) => {
        const dropzone = document.getElementById(dropzone_id);
        const preview_img = dropzone.querySelector('.dropzone-preview');
        const text_element = dropzone.querySelector('.dropzone-text');

        if (preview_img) {
            preview_img.style.display = 'none';
            preview_img.src = '';
        }

        if (text_element) {
            text_element.style.display = 'block';
        }
    }

    /**
     * Set up drag and drop zone for file input
     * @param {string} dropzone_id - ID of the dropzone element
     * @param {string} input_id - ID of the file input element
     * @param {string} file_var_name - Key name in datas object
     */
    setup_dropzone = (dropzone_id, input_id, file_var_name) => {
        const dropzone = document.getElementById(dropzone_id);
        const input = document.getElementById(input_id);

        // Add text element for initial state
        const text_element = document.createElement('div');
        text_element.className = 'dropzone-text';
        text_element.textContent = dropzone.getAttribute('title') || 'Drop or click to select image';
        dropzone.appendChild(text_element);

        // Create preview image container
        const preview_img = this.create_preview_image(dropzone_id);
        dropzone.appendChild(preview_img);

        // Click on dropzone triggers file select dialog
        dropzone.addEventListener('click', () => input.click());

        // Handle file selection
        const change_handler = async () => {
            if (input.files.length > 0) {
                await this.handle_file_load(input.files[0], file_var_name, dropzone_id);
            }
        };
        input.addEventListener('change', change_handler);
        this.event_handlers.set(`${input_id}_change`, change_handler);

        // Prevent default drag behaviors with single handler
        const prevent_default = (e) => e.preventDefault();
        this.drag_events.forEach(event_name => {
            dropzone.addEventListener(event_name, prevent_default);
        });

        // drag over handler
        const drag_over_handler = () => dropzone.classList.add('drag-over');
        const drag_leave_handler = () => dropzone.classList.remove('drag-over');

        dropzone.addEventListener('dragover', drag_over_handler);
        dropzone.addEventListener('dragleave', drag_leave_handler);

        // Handle dropped files
        const drop_handler = async (e) => {
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                await this.handle_file_load(e.dataTransfer.files[0], file_var_name, dropzone_id);
            }
        };
        dropzone.addEventListener('drop', drop_handler);

        // Cache handlers for cleanup
        this.event_handlers.set(`${dropzone_id}_dragover`, drag_over_handler);
        this.event_handlers.set(`${dropzone_id}_dragleave`, drag_leave_handler);
        this.event_handlers.set(`${dropzone_id}_drop`, drop_handler);
    }

    /**
     * Handle file loading with error handling
     * @param {File} file - File to load
     * @param {string} file_var_name - Key name in datas object
     * @param {string} dropzone_id - ID of the dropzone element
     */
    handle_file_load = async (file, file_var_name, dropzone_id) => {
        try {
            const image = await load_image(file);
            this.datas[file_var_name] = image;
            this.update_dropzone_preview(dropzone_id, image, file.name);
            this.clear_error();
        } catch (error) {
            this.show_error(`Failed to load ${file_var_name} image: ${error.message}`);
        }
    }

    /**
     * Validate required inputs before processing
     * @throws {Error} When required inputs are missing
     */
    validate_inputs = () => {
        if (!this.datas.base) {
            throw new Error('Please select a base normal map');
        }

        if (!this.datas.add) {
            throw new Error('Please select an add normal map');
        }
    }

    /**
     * Load and prepare image data for processing
     * @returns {Promise<Object>} Processed image data and dimensions
     */
    load_image_data = async () => {
        const base_data = get_image_data(this.datas.base, 0, 0, this.datas.base.width, this.datas.base.height);
        let add_data = get_image_data(this.datas.add, 0, 0, this.datas.add.width, this.datas.add.height);
        let mask_data;

        // Scale add image to match base dimensions if needed
        if (this.datas.base.width !== this.datas.add.width || this.datas.base.height !== this.datas.add.height) {
            add_data = await scale_normal_map_worker(
                add_data,
                this.datas.add.width,
                this.datas.add.height,
                this.datas.base.width,
                this.datas.base.height
            );
        }

        // Create mask data if not provided
        if (!this.datas.mask) {
            const intensity = parseFloat(this.intensity_input.value) * 255;
            const array_size = this.datas.base.width * this.datas.base.height * 4;
            mask_data = new Uint8ClampedArray(array_size);
            mask_data.fill(intensity);
        } else {
            mask_data = get_image_data(this.datas.mask, 0, 0, this.datas.mask.width, this.datas.mask.height);

            if (this.datas.base.width !== this.datas.mask.width || this.datas.base.height !== this.datas.mask.height) {
                mask_data = resize_img_canv(
                    mask_data,
                    this.datas.mask.width,
                    this.datas.mask.height,
                    this.datas.base.width,
                    this.datas.base.height,
                    false
                );
            }
        }

        return {
            base_data,
            add_data,
            mask_data,
            width: this.datas.base.width,
            height: this.datas.base.height
        };
    }

    /**
     * Apply fallback alpha values to merged data if no transparency exists
     * @param {Uint8ClampedArray} merged_data - The merged image data
     */
    apply_fallback_alpha = (merged_data) => {
        if (!has_transparency(merged_data)) {
            const fallback_alpha = parseInt(this.fallback_alpha_input.value);
            const data_length = merged_data.length;

            for (let i = 3; i < data_length; i += 4) {
                merged_data[i] = fallback_alpha;
            }
        }
    }

    /**
     * Merge normal maps
     */
    merge_normal_maps = async () => {
        if (this.is_processing) return;

        try {
            this.is_processing = true;
            this.clear_error();

            // Batch DOM updates
            this.merge_button.classList.add('loading');
            this.merge_button.textContent = 'Processing...';
            this.preview_canvas.style.display = 'none';
            this.download_button.style.display = 'none';

            // Validate inputs
            this.validate_inputs();

            // Load and process image data
            const { base_data, add_data, mask_data, width, height } = await this.load_image_data();
            console.log(base_data, add_data, mask_data, width, height);

            // Merge normal maps
            const merged_data = await merge_normal_map_worker(
                base_data,
                add_data,
                mask_data,
                width,
                height
            );

            this.datas.mask = null;

            //console.log(`merged_data`, merged_data);


            // Apply fallback alpha if no transparency
            this.apply_fallback_alpha(merged_data);

            // Display result 
            this.preview_canvas.width = width;
            this.preview_canvas.height = height;

            const image_data = this.canvas_ctx.createImageData(width, height);
            image_data.data.set(merged_data);
            this.canvas_ctx.putImageData(image_data, 0, 0);

            this.result_image_data = image_data;
            this.preview_canvas.style.display = 'block';
            this.download_button.style.display = 'block';

            // Set download filename
            const base_name = this.base_input.files[0].name.split('.')[0];
            const add_name = this.add_input.files[0].name.split('.')[0];
            this.download_button.dataset.filename = `${base_name}_${add_name}.png`;

        } catch (error) {
            this.show_error(error.message);
            console.error('Error merging normal maps:', error);
        } finally {
            this.is_processing = false;
            this.merge_button.classList.remove('loading');
            this.merge_button.textContent = 'Merge Normal Maps';
        }
    }

    /**
     * Download the merged result as PNG file
     */
    download_result = async () => {
        if (!this.result_image_data) {
            this.show_error('No result to download. Please merge normal maps first.');
            return;
        }

        try {
            const blob = await canvas_to_blob(this.preview_canvas);
            const base_name = this.base_input.files[0].name.split('.')[0];
            const add_name = this.add_input.files[0].name.split('.')[0];

            save_file(blob, `${base_name}_${add_name}.png`);
        } catch (error) {
            this.show_error(`Failed to download result: ${error.message}`);
        }
    }

    /**
     * Clean up event listeners and resources
     */
    destroy = () => {
        this.event_handlers.forEach((handler, key) => {
            const [element_id, event_type] = key.split('_');
            const element = document.getElementById(element_id);
            if (element) {
                element.removeEventListener(event_type, handler);
            }
        });
        this.event_handlers.clear();
    }
}

// Initialize the application when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    const normal_map_merger = new NormalMapMerger();
    normal_map_merger.init();
});