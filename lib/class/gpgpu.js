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

import { program } from "./shader_program.js";
import { texture } from "./texture.js";
import { geometry } from "./geometry.js";
import { frame } from "./frame.js";

/**
 * GPGPU computation manager using WebGL.
 */
export class GPGPU {
	#screen = null;
	gl = null;

	prog = null;
	geo = null;
	frame = null;

	#texture_pool = new Map();
	#frame_pool = new Map();
	#available_textures = [];
	#available_frames = [];

	textures = new Map();
	programs = new Map();
	geometries = new Map();
	frames = new Map();
	frame_textures = new Set();

	max_tex_size = 0;

	#debug = false;

	/**
	 * @param {number} width - Canvas width.
	 * @param {number} height - Canvas height.
	 * @param {boolean} debug - Enable debug mode for error checking.
	 */
	constructor(width, height, debug = true) {
		if (width > 0 && height > 0) {
			this.#screen = new OffscreenCanvas(width, height);
			const context_attributes = {
				antialias: false,
				depth: false,
				stencil: false,
				alpha: false,
				preserveDrawingBuffer: false,
				powerPreference: 'high-performance'
			};

			this.gl = this.#screen.getContext('webgl2', context_attributes) ||
				this.#screen.getContext('webgl', context_attributes) ||
				this.#screen.getContext('experimental-webgl', context_attributes);

			if (this.gl) {
				const { gl } = this;
				gl._current_program = null;
				gl._current_texture_unit = null;
				gl._current_texture_2d = null;
				gl._current_array_buffer = null;
				gl._current_vao = null;
				gl._current_framebuffer = null;

				gl.disable(gl.DEPTH_TEST);
				gl.disable(gl.BLEND);
				this.max_tex_size = gl.getParameter(gl.MAX_TEXTURE_SIZE); // 16384

				if (debug) {
					this.#screen.addEventListener("webglcontextcreationerror", (e) => {
						console.error(`WebGL context creation failed: ${e.statusMessage || "Unknown error"}`);
					});
					this.#screen.addEventListener('webglcontextlost', (event) => {
						event.preventDefault(); // Prevent default behavior
						console.error('WebGL context lost detected.');
						this.clear();
					});
				}

			} else {
				this.gl = null;
			}
		}
		this.#debug = debug;
	}

	/**
	 * Checks if WebGL context is available.
	 * @returns {boolean} True if WebGL is available.
	 */
	get is_webgl_available() {
		return this.gl !== null;
	}

	/**
	 * Sets canvas dimensions.
	 * @param {number} width - New width.
	 * @param {number} height - New height.
	 */
	set_screen_size(width, height) {
		if (width <= 0 || height <= 0) {
			throw new Error(`Canvas dimensions must be positive: ${width}, ${height}`);
		}

		const { screen } = this;
		if (screen.width !== width || screen.height !== height) {
			screen.width = width;
			screen.height = height;
		}
	}

	/**
	 * Sets up shader program.
	 * @param {string} name - Program name.
	 * @param {string} vs_source - Vertex shader source.
	 * @param {string} fs_source - Fragment shader source.
	 * @param {string} geo_attr - Geometry attribute name.
	 * @returns {program} The created program.
	 */
	setup_program(name, vs_source, fs_source, geo_attr) {
		if (this.programs.has(name)) {
			this.prog = this.programs.get(name);
			return this.prog;
		}

		this.prog = new program(this.gl, name);
		this.prog.init(vs_source, fs_source);
		this.programs.set(name, this.prog);

		if (this.geo) {
			this.geo.clear();
			this.geometries.delete(this.geo.name);
		}
		this.geo = new geometry(this.gl, `${name}_geo`, this.#debug);
		this.geometries.set(this.geo.name, this.geo);

		const geo_location = this.prog.att_loc(geo_attr);
		if (geo_location >= 0) {
			this.geo.init(geo_location);
		}

		return this.prog;
	}

	/**
	 * Creates or updates a texture from pool.
	 * @param {string} name - Texture name.
	 * @param {number} index - Texture unit index.
	 * @param {ArrayBufferView|null} data - Texture data.
	 * @param {number} width - Texture width.
	 * @param {number} height - Texture height.
	 * @param {number} [internal_format] - Internal format.
	 * @param {number} [format] - Data format.
	 * @param {number} [type] - Data type.
	 * @returns {texture} The created or updated texture.
	 */
	create_texture(name, index, data, width, height, internal_format, format, type) {
		let tex = this.#texture_pool.get(name);
		if (!tex) {
			const available = this.#available_textures.find(t => !t.is_allocated);
			tex = available || new texture(this.gl, name, this.#debug);
			if (!available) this.#available_textures.push(tex);
			this.#texture_pool.set(name, tex);
		}

		tex.create(index, data, width, height, internal_format, format, type);
		this.textures.set(name, tex);
		return tex;
	}

	/**
	 * Gets a texture by name.
	 * @param {string} name - Texture name.
	 * @returns {texture|null} The texture or null if not found.
	 */
	get_texture(name) {
		return this.textures.get(name) || null;
	}

	/**
	 * Gets a program by name.
	 * @param {string} name - Program name.
	 * @returns {program|null} The program or null if not found.
	 */
	get_program(name) {
		return this.programs.get(name) || null;
	}

	/**
	 * Gets a geometry by name.
	 * @param {string} name - Geometry name.
	 * @returns {geometry|null} The geometry or null if not found.
	 */
	get_geometry(name) {
		return this.geometries.get(name) || null;
	}

	/**
	 * Sets up framebuffer with texture from pool.
	 * @param {string} name - Framebuffer name.
	 * @param {string} tex_name - Texture name to bind.
	 * @returns {frame} The created or updated framebuffer.
	 */
	setup_frame(name, tex_name) {
		let fb = this.#frame_pool.get(name);
		if (!fb) {
			const available = this.#available_frames.find(f => !f.is_allocated);
			fb = available || new frame(this.gl, name, this.#debug);
			if (!available) this.#available_frames.push(fb);
			this.#frame_pool.set(name, fb);
		}

		this.frame = fb;
		this.frame.init();

		const tex = this.textures.get(tex_name);
		if (!tex) throw new Error(`Texture '${tex_name}' not found`);

		this.frame.bind_to_texture(tex.addr);
		this.frames.set(name, this.frame);
		this.frame_textures.add(tex_name);

		return this.frame;
	}

	/**
	 * Gets a framebuffer by name.
	 * @param {string} name - Framebuffer name.
	 * @returns {frame|null} The framebuffer or null if not found.
	 */
	get_frame(name) {
		return this.frames.get(name) || null;
	}

	/**
	 * Executes a function with GPU context.
	 * @param {Function} func - Function to execute.
	 * @param {...any} args - Function arguments.
	 * @returns {any} The result of the function.
	 */
	exec(func, ...args) {
		if (typeof func !== 'function') throw new Error('First argument must be a function');
		return func(this, ...args);
	}

	/**
	 * Executes WebGL rendering.
	 * @param {number} width - Viewport width.
	 * @param {number} height - Viewport height.
	 */
	render(width, height) {
		if (width <= 0 || height <= 0) throw new Error('Viewport dimensions must be positive');

		const { gl } = this;
		this.geo?.bind();

		gl.viewport(0, 0, width, height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.flush();

		if (this.#debug) {
			const error = gl.getError();
			if (error !== gl.NO_ERROR) {
				this.clear_frame();
				throw new Error(`WebGL rendering error: ${error}`);
			}
		}
	}

	/**
	 * Reads pixel data from the current framebuffer.
	 * @param {number} width - Viewport width.
	 * @param {number} height - Viewport height.
	 * @param {number} [format] - Pixel format.
	 * @param {number} [type] - Pixel type.
	 * @returns {Uint8ClampedArray|Float32Array} Pixel data.
	 */
	read_pixels(width, height, format, type) {
		if (width <= 0 || height <= 0) throw new Error('Viewport dimensions must be positive');

		const { gl } = this;
		format = format || gl.RGBA;
		type = type || gl.UNSIGNED_BYTE;

		let dest_data;
		if (type === gl.UNSIGNED_BYTE) {
			dest_data = new Uint8ClampedArray(width * height * 4);
		} else if (type === gl.FLOAT) {
			dest_data = new Float32Array(width * height * 4);
		} else {
			throw new Error(`Unsupported pixel type: ${type}`);
		}

		gl.readPixels(0, 0, width, height, format, type, dest_data);

		if (this.#debug) {
			const read_error = gl.getError();
			if (read_error !== gl.NO_ERROR) {
				this.clear_frame();
				throw new Error(`WebGL readPixels error: ${read_error}`);
			}
		}

		const tex = this.frame ? this.textures.get(Array.from(this.frame_textures)[0]) : null;
		if (tex && type === gl.FLOAT && !tex.supports_float) {
			return tex.unpack_bytes_to_floats(dest_data);
		}

		return dest_data;
	}

	debug() {
		if (this.#debug) {
			const read_error = this.gl.getError();
			if (read_error !== this.gl.NO_ERROR) {
				throw new Error(`WebGL error: ${read_error}`);
			}
		}
	}

	/** Clears all textures. */
	clear_texture() {
		this.textures.forEach(tex => {
			tex.clear();
			this.#texture_pool.delete(tex.name);
		});
		this.textures.clear();
		this.frame_textures.clear();
	}

	/** Clears only frame-related textures. */
	clear_frame_textures() {
		this.frame_textures.forEach(name => {
			const tex = this.textures.get(name);
			if (tex) {
				tex.clear();
				this.textures.delete(name);
				this.#texture_pool.delete(name);
			}
		});
		this.frame_textures.clear();
	}

	/** Clears framebuffer and frame textures. */
	clear_frame() {
		if (this.frame) {
			this.frame.clear();
			this.frames.delete(this.frame.name);
			this.#frame_pool.delete(this.frame.name);
			this.frame = null;
		}
		this.clear_frame_textures();
	}

	/** Cleans up all GPU resources. */
	clear() {
		if (this.prog) {
			this.prog.clear();
			this.programs.delete(this.prog.name);
			this.prog = null;
		}
		if (this.geo) {
			this.geo.clear();
			this.geometries.delete(this.geo.name);
			this.geo = null;
		}
		this.frames.forEach(f => f.clear());
		this.frames.clear();
		this.#frame_pool.clear();
		this.clear_texture();
		this.#available_textures = [];
		this.#available_frames = [];
		if (this.#debug) console.log(`gl clear`);
	}

	/** @returns {OffscreenCanvas} The screen canvas. */
	get screen() { return this.#screen; }
}
/*
const vs_source = ``;
const fs_source = ``;

// Example code:
const gpuscl = (gp, src_data, src_width, src_height, target_width, target_height) => {
	try {
		// Set canvas size first
		gp.set_screen_size(target_width, target_height);

		// Setup program with actual shader sources
		const prog = gp.setup_program('main_program', vs_source, fs_source, 'position');
		prog.use();

		// Create source texture
		const source_tex = gp.create_texture('source_tex', 0, src_data, src_width, src_height, gp.gl.RGBA, gp.gl.RGBA, gp.gl.FLOAT);

		// Create destination texture
		gp.create_texture('dest_tex', 1, null, target_width, target_height, gp.gl.RGBA, gp.gl.RGBA, gp.gl.FLOAT);

		// Setup framebuffer
		gp.setup_frame('main_frame', 'dest_tex');

		// Set uniforms
		source_tex.activate();
		prog.set('source_tex', 0);
		prog.set('source_size', src_width, src_height);
		prog.set('target_size', target_width, target_height);

		// Execute rendering
		gp.render(target_width, target_height);

		// Read result
		const result = gp.read_pixels(target_width, target_height, gp.gl.RGBA, gp.gl.FLOAT);
		gp.clear_frame();

		return result;
	}
	catch (err) {
		gp.clear();
		console.error('GPU execution error:', err);
		throw err;
	}
};
*/