/** 
 * glcomp class
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

/**
 * Base WebGL component class.
 */
export class glcomp {
	#gl = null;
	#addr = null;
	#name = null;

	/**
	 * @param {WebGLRenderingContext} gl - The WebGL context.
	 * @param {string} name - Component name for retrieval.
	 */
	constructor(gl, name) {
		if (gl === null || gl === undefined || typeof gl !== 'object') {
			throw new Error('WebGL context is required');
		}
		if (name === null || name === undefined || typeof name !== 'string' || name.length === 0) {
			throw new Error('Component name is required');
		}
		this.#gl = gl;
		this.#name = name;
	}

	/**
	 * Gets the WebGL context.
	 * @returns {WebGLRenderingContext} The WebGL context.
	 */
	get gl() {
		return this.#gl;
	}

	/**
	 * Gets the GPU resource address.
	 * @returns {WebGLObject|null} The GPU resource address.
	 */
	get addr() {
		return this.#addr;
	}

	/**
	 * Sets the GPU resource address.
	 * @param {WebGLObject|null} value - The GPU resource address.
	 */
	set addr(value) {
		this.#addr = value;
	}

	/**
	 * Gets the component name.
	 * @returns {string} The component name.
	 */
	get name() {
		return this.#name;
	}

	/**
	 * Checks if WebGL context is valid.
	 * @returns {boolean} True if context is valid.
	 */
	get is_valid() {
		return this.#gl !== null;
	}

	/**
	 * Checks if GPU resource is allocated.
	 * @returns {boolean} True if resource is allocated.
	 */
	get is_allocated() {
		return this.#addr !== null && this.#addr !== undefined;
	}

}
