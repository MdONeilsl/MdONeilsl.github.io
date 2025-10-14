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

// texture.js
import { glcomp } from "./glcomp.js";

// Updated texture class
/**
 * Manages WebGL textures with pooling and float support.
 */
export class texture extends glcomp {
    #index = null;
    #width = 0;
    #height = 0;
    #format = 0;
    #internal_format = 0;
    #type = 0;
    #supports_float = false;

    /**
     * @param {WebGLRenderingContext} gl - The WebGL context.
     * @param {string} name - Texture name.
     * @param {boolean} debug - Debug mode flag.
     */
    constructor(gl, name, debug = false) {
        super(gl, name);
        const is_webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        this.#supports_float = is_webgl2
            ? gl.getExtension('EXT_color_buffer_float') !== null
            : gl.getExtension('OES_texture_float') !== null && gl.getExtension('WEBGL_color_buffer_float') !== null;
        this.debug = debug;
    }

    /**
     * Creates or updates a texture.
     * @param {number} index - Texture unit index.
     * @param {ArrayBufferView|null} data - Texture data.
     * @param {number} width - Texture width.
     * @param {number} height - Texture height.
     * @param {number} [internal_format] - Internal format.
     * @param {number} [format] - Data format.
     * @param {number} [type] - Data type.
     * @returns {texture} This instance for chaining.
     */
    create(index, data, width, height, internal_format, format, type) {
        const { gl } = this;

        if (index < 0 || index > 15) throw new Error('Texture unit index must be between 0 and 15');
        if (width <= 0 || height <= 0) throw new Error('Texture dimensions must be positive');

        internal_format = internal_format || gl.RGBA;
        format = format || gl.RGBA;
        type = type || gl.UNSIGNED_BYTE;

        // Always pack float data to bytes when float not supported
        if (!this.#supports_float && data instanceof Float32Array) {
            data = this.#pack_floats_to_bytes(data);
            internal_format = gl.RGBA;
            format = gl.RGBA;
            type = gl.UNSIGNED_BYTE;
        }

        const needs_new_texture = !this.addr || this.#width !== width || this.#height !== height ||
            this.#internal_format !== internal_format || this.#format !== format || this.#type !== type;

        if (needs_new_texture) {
            this.clear();
            const texture_obj = gl.createTexture();
            if (!texture_obj) throw new Error('Failed to create texture');
            this.addr = texture_obj;
        }

        // Set properties after potential clear
        this.#index = gl.TEXTURE0 + index;
        this.#width = width;
        this.#height = height;
        this.#format = format;
        this.#internal_format = internal_format;
        this.#type = type;

        // Always set active texture and bind
        gl.activeTexture(this.#index);
        gl._current_texture_unit = this.#index;
        gl.bindTexture(gl.TEXTURE_2D, this.addr);
        gl._current_texture_2d = this.addr;

        if (needs_new_texture) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        const is_webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        if (is_webgl2 && needs_new_texture) {
            let sized_internal_format = internal_format;
            switch (internal_format) {
                case gl.RGBA:
                    if (type === gl.UNSIGNED_BYTE) sized_internal_format = gl.RGBA8;
                    else if (type === gl.FLOAT) sized_internal_format = gl.RGBA32F;
                    break;
                case gl.RGB:
                    if (type === gl.UNSIGNED_BYTE) sized_internal_format = gl.RGB8;
                    else if (type === gl.FLOAT) sized_internal_format = gl.RGB32F;
                    break;
                // Add more formats as needed
                default:
                    // Use as is or handle error
                    break;
            }
            gl.texStorage2D(gl.TEXTURE_2D, 1, sized_internal_format, width, height);
            if (data) {
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, format, type, data);
            }
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, internal_format, width, height, 0, format, type, data);
        }

        if (this.debug) {
            const error = gl.getError();
            if (error !== gl.NO_ERROR) {
                this.clear();
                throw new Error(`Texture creation error: ${error}`);
            }
        }

        return this;
    }

    /**
     * Packs Float32Array data into Uint8ClampedArray for unsupported float textures.
     * @param {Float32Array} data - Input float data.
     * @returns {Uint8ClampedArray} Packed byte data.
     */
    #pack_floats_to_bytes(data) {
        const bytes = new Uint8ClampedArray(data.length);
        for (let i = 0; i < data.length; i++) {
            bytes[i] = Math.min(Math.max((data[i] + 1.0) * 127.5, 0), 255);
        }
        return bytes;
    }

    /**
     * Unpacks Uint8ClampedArray to Float32Array.
     * @param {Uint8ClampedArray} data - Input byte data.
     * @returns {Float32Array} Unpacked float data.
     */
    unpack_bytes_to_floats(data) {
        const floats = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            floats[i] = (data[i] / 127.5) - 1.0;
        }
        return floats;
    }

    /** @returns {number} The texture width. */
    get width() { return this.#width; }

    /** @returns {number} The texture height. */
    get height() { return this.#height; }

    /** @returns {number} The texture format. */
    get format() { return this.#format; }

    /** @returns {number} The texture unit index. */
    get index() { return this.#index; }

    /** @returns {boolean} Whether float textures are supported. */
    get supports_float() { return this.#supports_float; }

    /** Activates and binds this texture. */
    activate(index = null) {
        if (this.addr) {
            const { gl } = this;
            const target_index = index !== null ? gl.TEXTURE0 + index : this.#index;
            if (index !== null && (index < 0 || index > 15)) return; // Skip invalid indices
            gl.activeTexture(target_index);
            gl._current_texture_unit = target_index;
            gl.bindTexture(gl.TEXTURE_2D, this.addr);
            gl._current_texture_2d = this.addr;
        }
    }

    /** Cleans up texture resources. */
    clear() {
        const { gl } = this;

        if (this.addr && gl._current_texture_2d === this.addr) {
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl._current_texture_2d = null;
        }

        if (this.addr) {
            gl.deleteTexture(this.addr);
            this.addr = null;
        }

        this.#index = null;
        this.#width = 0;
        this.#height = 0;
        this.#format = 0;
        this.#internal_format = 0;
        this.#type = 0;
    }
}
