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