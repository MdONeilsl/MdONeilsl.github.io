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
 * Manages WebGL geometry buffers.
 */
export class geometry extends glcomp {
    #vao = null;
    #vao_ext = null;

    /**
     * @param {WebGLRenderingContext} gl - The WebGL context.
     * @param {string} name - Geometry name.
     * @param {boolean} debug - Debug mode flag.
     */
    constructor(gl, name, debug = false) {
        super(gl, name);
        const oes_vao = gl.getExtension('OES_vertex_array_object');
        this.#vao_ext = oes_vao || (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? gl : null);
        this.debug = debug;
    }

    /**
     * Initializes geometry buffer.
     * @param {number} location - Attribute location.
     */
    init(location) {
        const { gl } = this;

        if (typeof location !== 'number') {
            throw new Error('Location must be a number');
        }

        if (!this.addr) {
            const buffer = gl.createBuffer();
            if (!buffer) throw new Error('Failed to create geometry buffer');
            this.addr = buffer;
        }

        if (gl._current_array_buffer !== this.addr) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.addr);
            gl._current_array_buffer = this.addr;
        }

        const quad_data = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        gl.bufferData(gl.ARRAY_BUFFER, quad_data, gl.STATIC_DRAW);

        if (location >= 0) {
            if (this.#vao_ext && !this.#vao) {
                const create_vao = this.#vao_ext.createVertexArrayOES || this.#vao_ext.createVertexArray;
                const bind_vao = this.#vao_ext.bindVertexArrayOES || this.#vao_ext.bindVertexArray;
                this.#vao = create_vao.call(this.#vao_ext);
                bind_vao.call(this.#vao_ext, this.#vao);
            }

            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

            if (this.#vao_ext) {
                const bind_vao = this.#vao_ext.bindVertexArrayOES || this.#vao_ext.bindVertexArray;
                bind_vao.call(this.#vao_ext, null);
                gl._current_vao = null;
            }
        }

        if (this.debug) {
            const error = gl.getError();
            if (error !== gl.NO_ERROR) {
                this.clear();
                throw new Error(`Geometry initialization error: ${error}`);
            }
        }
    }

    /** Binds the VAO if available. */
    bind() {
        if (this.#vao_ext && this.#vao) {
            const { gl } = this;
            const bind_vao = this.#vao_ext.bindVertexArrayOES || this.#vao_ext.bindVertexArray;
            if (gl._current_vao !== this.#vao) {
                bind_vao.call(this.#vao_ext, this.#vao);
                gl._current_vao = this.#vao;
            }
        }
    }

    /** Cleans up geometry resources. */
    clear() {
        const { gl } = this;

        if (this.addr && gl._current_array_buffer === this.addr) {
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl._current_array_buffer = null;
        }

        if (this.addr) {
            gl.deleteBuffer(this.addr);
            this.addr = null;
        }

        if (this.#vao_ext && this.#vao) {
            const delete_vao = this.#vao_ext.deleteVertexArrayOES || this.#vao_ext.deleteVertexArray;
            if (gl._current_vao === this.#vao) {
                const bind_vao = this.#vao_ext.bindVertexArrayOES || this.#vao_ext.bindVertexArray;
                bind_vao.call(this.#vao_ext, null);
                gl._current_vao = null;
            }
            delete_vao.call(this.#vao_ext, this.#vao);
            this.#vao = null;
        }
    }
}