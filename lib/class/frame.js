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

import { glcomp } from "./glcomp.js";

/**
 * Manages WebGL framebuffers with pooling.
 */
export class frame extends glcomp {
	#bound_texture = null;

	/**
	 * @param {WebGLRenderingContext} gl - The WebGL context.
	 * @param {string} name - Framebuffer name.
	 * @param {boolean} debug - Debug mode flag.
	 */
	constructor(gl, name, debug = false) {
		super(gl, name);
		this.debug = debug;
	}

	/**
	 * Initializes the framebuffer.
	 * @returns {frame} This instance for chaining.
	 */
	init() {
		const { gl } = this;

		if (!this.addr) {
			const framebuffer = gl.createFramebuffer();
			if (!framebuffer) throw new Error('Failed to create framebuffer');
			this.addr = framebuffer;
		}

		return this;
	}

	/** @returns {WebGLTexture} The currently bound texture. */
	get bound_texture() { return this.#bound_texture; }

	/** Activates this framebuffer. */
	activate() {
		if (this.addr) {
			const { gl } = this;
			if (gl._current_framebuffer !== this.addr) {
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.addr);
				gl._current_framebuffer = this.addr;
			}
		}
	}

	/**
	 * Binds texture to framebuffer.
	 * @param {WebGLTexture} tex - Texture to bind.
	 * @returns {frame} This instance for chaining.
	 */
	bind_to_texture(tex) {
		if (!this.addr) throw new Error('Framebuffer not initialized');
		if (!tex || typeof tex !== 'object') throw new Error('Texture is required');

		this.activate();

		const { gl } = this;
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

		this.#bound_texture = tex;

		if (this.debug) {
			const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
			if (status !== gl.FRAMEBUFFER_COMPLETE) {
				throw new Error(`Framebuffer incomplete: ${status}`);
			}
		}

		return this;
	}

	/** Cleans up framebuffer resources. */
	clear() {
		const { gl } = this;

		if (this.addr && gl._current_framebuffer === this.addr) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl._current_framebuffer = null;
		}

		if (this.addr) {
			gl.deleteFramebuffer(this.addr);
			this.addr = null;
		}

		this.#bound_texture = null;
	}
}