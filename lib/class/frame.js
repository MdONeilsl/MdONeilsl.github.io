/** 
 * frame class
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
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
