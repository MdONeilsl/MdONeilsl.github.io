/*
    Enhance image color and reflection for PBR materials.
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

/**
 * Utility functions for image processing operations
 * @namespace
 */
const utils = {
    /**
     * Calculates the nearest power of two for a given size
     * @param {number} size - Input size
     * @returns {number} Nearest power of two
     */
    nearest_power_of_two(size) {
        return 1 << Math.round(Math.log2(size));
    },

    /**
     * Creates a debounced function that delays execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout_id;
        return (...args) => {
            clearTimeout(timeout_id);
            timeout_id = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * Converts sRGB to linear color space
     * @param {number} c - sRGB color component (0-1)
     * @returns {number} Linear color value
     */
    srgb_to_linear(c) {
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    },

    /**
     * Converts linear to sRGB color space
     * @param {number} c - Linear color component (0-1)
     * @returns {number} sRGB color value
     */
    linear_to_srgb(c) {
        return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }
};

/**
 * Adds an object to an array in a document and returns its index
 * @param {Object} doc - Target document
 * @param {string} name - Array property name
 * @param {Object} obj - Object to add
 * @returns {number} Index of the added object
 */
const add_to_array = (doc, name, obj) => {
    if (!doc[name]) doc[name] = [];
    return doc[name].push(obj) - 1;
};

/**
 * Converts canvas element to data URL
 * @param {HTMLCanvasElement} el - Canvas element
 * @param {string} type - MIME type
 * @param {number} quality - Image quality (0-1)
 * @returns {string} Data URL
 */
const to_data_url = (el, type, quality) => el.toDataURL(type, quality);

/**
 * Image processor for PBR material enhancement
 * @class
 */
class ImageProcessor {
    /**
     * Creates an ImageProcessor instance
     */
    constructor() {
        /** @type {HTMLImageElement|null} */
        this.original_image = null;
        
        /** @type {Object} */
        this.elements = this._cache_elements();
        
        /** @type {FileReader} */
        this.reader = new FileReader();
        
        this._init_event_listeners();
    }

    /**
     * Caches frequently accessed DOM elements
     * @private
     * @returns {Object} Cached elements
     */
    _cache_elements() {
        const element_ids = [
            'canvas-input', 'image-file', 'fix-size', 'max-size', 'srgb-output',
            'metal-roughness-output', 'emissive-output', 'input-image-canvas',
            'save-gltf', 'srgb-color-space', 'srgb-max-size', 'metal-roughness-max-size',
            'emissive-max-size', 'emissive-threshold', 'occlusion-checkbox',
            'roughness-checkbox', 'metalness-checkbox'
        ];

        const elements = {};
        for (const id of element_ids) {
            elements[id.replace(/-/g, '_')] = document.getElementById(id);
        }
        return elements;
    }

    /**
     * Resizes an image with optional power-of-two constraint
     * @param {HTMLImageElement} image - Source image
     * @param {number} max_width - Maximum width
     * @param {number} max_height - Maximum height
     * @param {boolean} fix_size - Whether to enforce power-of-two dimensions
     * @returns {HTMLCanvasElement} Resized canvas
     */
    resize_image(image, max_width, max_height, fix_size) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let width = image.width;
        let height = image.height;

        if (fix_size) {
            width = utils.nearest_power_of_two(width);
            height = utils.nearest_power_of_two(height);
        }

        const aspect_ratio = width / height;
        
        if (width > max_width) {
            width = max_width;
            height = width / aspect_ratio;
        }
        if (height > max_height) {
            height = max_height;
            width = height * aspect_ratio;
        }

        canvas.width = Math.min(width, max_width);
        canvas.height = Math.min(height, max_height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    /**
     * Processes sRGB color space conversion
     * @param {HTMLCanvasElement} image - Input image canvas
     * @param {number} max_width - Maximum output width
     * @param {string} color_space - Target color space
     */
    process_srgb(image, max_width, color_space) {
        const canvas = this.elements.srgb_output;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const width = Math.min(image.width, max_width);
        const height = Math.min(image.height, max_width);
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);

        if (color_space === 'none') return;

        const image_data = ctx.getImageData(0, 0, width, height);
        const data = image_data.data;
        const conversion_fn = color_space === 'srgb' ? utils.linear_to_srgb : utils.srgb_to_linear;

        // Process in batches for better performance
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;

            data[i] = conversion_fn(r) * 255;
            data[i + 1] = conversion_fn(g) * 255;
            data[i + 2] = conversion_fn(b) * 255;
        }

        ctx.putImageData(image_data, 0, 0);
    }

    /**
     * Processes metalness and roughness channels
     * @param {HTMLCanvasElement} image - Input image canvas
     * @param {number} max_width - Maximum output width
     */
    process_metal_roughness(image, max_width) {
        const canvas = this.elements.metal_roughness_output;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const width = Math.min(image.width, max_width);
        const height = Math.min(image.height, max_width);
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);

        const image_data = ctx.getImageData(0, 0, width, height);
        const data = image_data.data;
        const output_data = new Uint8ClampedArray(data.length);

        const occlusion_checked = this.elements.occlusion_checkbox.checked;
        const roughness_checked = this.elements.roughness_checkbox.checked;
        const metalness_checked = this.elements.metalness_checkbox.checked;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Pre-calculate values
            const max_rgb = Math.max(r, g, b);
            const min_rgb = Math.min(r, g, b);
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            const roughness = 0.05 + (1 - (luminance / 255)) * 0.935;
            const saturation = max_rgb === 0 ? 0 : (max_rgb - min_rgb) / max_rgb;

            output_data[i] = occlusion_checked ? luminance : 0;
            output_data[i + 1] = roughness_checked ? roughness * 255 : 0;
            output_data[i + 2] = metalness_checked ? (saturation > 0.5 ? 255 : 0) : 0;
            output_data[i + 3] = 255;
        }

        ctx.putImageData(new ImageData(output_data, width, height), 0, 0);
    }

    /**
     * Processes emissive channel with threshold mapping
     * @param {HTMLCanvasElement} image - Input image canvas
     * @param {number} max_width - Maximum output width
     */
    process_emissive(image, max_width) {
        const canvas = this.elements.emissive_output;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const width = Math.min(image.width, max_width);
        const height = Math.min(image.height, max_width);
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(image, 0, 0, width, height);

        const image_data = ctx.getImageData(0, 0, width, height);
        const data = image_data.data;
        const output_data = new Uint8ClampedArray(data.length);
        const threshold = parseInt(this.elements.emissive_threshold.value);

        // Pre-calculate scaling factor
        const scale_factor = threshold / 255;

        for (let i = 0; i < data.length; i += 4) {
            output_data[i] = data[i] * scale_factor;
            output_data[i + 1] = data[i + 1] * scale_factor;
            output_data[i + 2] = data[i + 2] * scale_factor;
            output_data[i + 3] = 255;
        }

        ctx.putImageData(new ImageData(output_data, width, height), 0, 0);
    }

    /**
     * Updates all output canvases with debounced execution
     */
    update_outputs = utils.debounce(() => {
        if (!this.original_image) return;

        const max_size = parseInt(this.elements.max_size.value);
        const resized_image = this.resize_image(
            this.original_image, 
            max_size, 
            max_size, 
            this.elements.fix_size.checked
        );

        // Update input canvas preview
        const input_ctx = this.elements.input_image_canvas.getContext('2d');
        this.elements.input_image_canvas.width = resized_image.width;
        this.elements.input_image_canvas.height = resized_image.height;
        input_ctx.drawImage(resized_image, 0, 0);

        // Process all outputs
        this.process_srgb(
            resized_image, 
            parseInt(this.elements.srgb_max_size.value), 
            this.elements.srgb_color_space.value
        );
        this.process_metal_roughness(
            resized_image, 
            parseInt(this.elements.metal_roughness_max_size.value)
        );
        this.process_emissive(
            resized_image, 
            parseInt(this.elements.emissive_max_size.value)
        );

        this.elements.save_gltf.disabled = false;
    }, 250);

    /**
     * Handles image load event
     * @param {Event} e - Load event
     * @returns {Promise<void>}
     */
    handle_image_load(e) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.original_image = img;
                this.elements.save_gltf.disabled = false;
                this.update_outputs();
                resolve();
            };
            img.onerror = reject;
            img.src = e.target.result;
        });
    }

    /**
     * Initializes all event listeners
     * @private
     */
    _init_event_listeners() {
        this._init_drag_drop_events();
        this._init_file_input_events();
        this._init_control_events();
        this._init_save_events();
    }

    /**
     * Initializes drag and drop event listeners
     * @private
     */
    _init_drag_drop_events() {
        const canvas_input = this.elements.canvas_input;

        canvas_input.addEventListener('dragover', (e) => {
            e.preventDefault();
            canvas_input.classList.add('drag-over');
        });

        canvas_input.addEventListener('dragleave', () => {
            canvas_input.classList.remove('drag-over');
        });

        canvas_input.addEventListener('drop', async (e) => {
            e.preventDefault();
            canvas_input.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file?.type.startsWith('image/')) {
                this.reader.readAsDataURL(file);
            } else {
                alert('Please drop a valid image file.');
            }
        });
    }

    /**
     * Initializes file input event listeners
     * @private
     */
    _init_file_input_events() {
        const canvas_input = this.elements.canvas_input;
        const image_file = this.elements.image_file;

        canvas_input.addEventListener('click', () => image_file.click());
        
        canvas_input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                image_file.click();
            }
        });

        image_file.addEventListener('change', () => {
            const file = image_file.files[0];
            if (file?.type.startsWith('image/')) {
                this.reader.readAsDataURL(file);
            } else {
                alert('Please select a valid image file.');
            }
        });

        this.reader.onload = (e) => {
            this.handle_image_load(e).catch(() => alert('Error loading image'));
        };
    }

    /**
     * Initializes control event listeners
     * @private
     */
    _init_control_events() {
        // Add change listeners to all relevant elements
        const control_elements = [
            this.elements.fix_size,
            this.elements.max_size,
            this.elements.srgb_color_space,
            this.elements.srgb_max_size,
            this.elements.metal_roughness_max_size,
            this.elements.emissive_max_size,
            this.elements.emissive_threshold,
            this.elements.occlusion_checkbox,
            this.elements.roughness_checkbox,
            this.elements.metalness_checkbox
        ];

        for (const element of control_elements) {
            if (element) {
                element.addEventListener('change', this.update_outputs);
            }
        }
    }

    /**
     * Initializes save event listeners
     * @private
     */
    _init_save_events() {
        this.elements.save_gltf.addEventListener('click', () => {
            if (!this.original_image) return;

            const material = {
                doubleSided: false,
                alphaMode: "OPAQUE",
                alphaCutoff: 1,
                emissiveFactor: [1, 1, 1],
                pbrMetallicRoughness: {
                    metallicFactor: 0,
                    roughnessFactor: 1,
                    baseColorFactor: [1, 1, 1, 1]
                }
            };

            const gltf = {
                asset: { version: "2.0" },
                scene: 0,
                scenes: [{ nodes: [0] }],
                nodes: [{ mesh: 0 }],
                meshes: [{ primitives: [{ attributes: { POSITION: 1, TEXCOORD_0: 2 }, indices: 0, material: 0 }] }],
                materials: [material],
                textures: [],
                images: [],
                buffers: [{ uri: "data:application/gltf-buffer;base64,AAABAAIAAQADAAIAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAA", byteLength: 108 }],
                bufferViews: [
                    { buffer: 0, byteOffset: 0, byteLength: 12, target: 34963 },
                    { buffer: 0, byteOffset: 12, byteLength: 96, byteStride: 12, target: 34962 }
                ],
                accessors: [
                    { bufferView: 0, byteOffset: 0, componentType: 5123, count: 6, type: "SCALAR", max: [3], min: [0] },
                    { bufferView: 1, byteOffset: 0, componentType: 5126, count: 4, type: "VEC3", max: [1, 1, 0], min: [0, 0, 0] },
                    { bufferView: 1, byteOffset: 48, componentType: 5126, count: 4, type: "VEC2", max: [1, 1], min: [0, 0] }
                ]
            };

            const texture_map = [
                { el: this.elements.srgb_output, prop: 'baseColorTexture', type: 'image/png', target: 'pbrMetallicRoughness' },
                { el: this.elements.metal_roughness_output, prop: 'metallicRoughnessTexture', type: 'image/jpeg', target: 'pbrMetallicRoughness' },
                { el: this.elements.emissive_output, prop: 'emissiveTexture', type: 'image/jpeg' },
            ];
        
            for (const { el, prop, type, target } of texture_map) {
                const texture_idx = add_to_array(gltf, "textures", {
                    source: add_to_array(gltf, "images", { uri: to_data_url(el, type, 1) })
                });
                const target_obj = target ? material[target] : material;
                target_obj[prop] = { index: texture_idx };
            }

            const blob = new Blob([JSON.stringify(gltf, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'model.gltf';
            a.click();
            URL.revokeObjectURL(url);
        });
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => new ImageProcessor());

