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

import { compute_hash } from "../module/string.js";
import { glcomp } from "./glcomp.js";

const uniform_setters = {
    [WebGLRenderingContext.FLOAT]: 'uniform1f',
    [WebGLRenderingContext.FLOAT_VEC2]: 'uniform2f',
    [WebGLRenderingContext.FLOAT_VEC3]: 'uniform3f',
    [WebGLRenderingContext.FLOAT_VEC4]: 'uniform4f',
    [WebGLRenderingContext.INT]: 'uniform1i',
    [WebGLRenderingContext.INT_VEC2]: 'uniform2i',
    [WebGLRenderingContext.INT_VEC3]: 'uniform3i',
    [WebGLRenderingContext.INT_VEC4]: 'uniform4i',
    [WebGLRenderingContext.BOOL]: 'uniform1i',
    [WebGLRenderingContext.BOOL_VEC2]: 'uniform2i',
    [WebGLRenderingContext.BOOL_VEC3]: 'uniform3i',
    [WebGLRenderingContext.BOOL_VEC4]: 'uniform4i',
    [WebGLRenderingContext.FLOAT_MAT2]: 'uniformMatrix2fv',
    [WebGLRenderingContext.FLOAT_MAT3]: 'uniformMatrix3fv',
    [WebGLRenderingContext.FLOAT_MAT4]: 'uniformMatrix4fv',
    [WebGLRenderingContext.SAMPLER_2D]: 'uniform1i',
    [WebGLRenderingContext.SAMPLER_CUBE]: 'uniform1i'
};


/**
 * Manages individual WebGL shaders.
 */
export class shader extends glcomp {
    #type = null;
    #source = null;

    /**
     * @param {WebGLRenderingContext} gl - The WebGL context.
     * @param {string} name - Shader name.
     * @param {number} type - The shader type (VERTEX_SHADER or FRAGMENT_SHADER).
     * @param {string} source - The shader source code.
     */
    constructor(gl, name, type, source) {
        super(gl, name);

        if (type === null || type === undefined || typeof type !== 'number') {
            throw new Error('Component name is required');
        }
        if (source === null || source === undefined || typeof source !== 'string') {
            throw new Error('Component name is required');
        }

        this.#type = type;
        this.#source = source;
    }

    /**
     * Compiles the shader without checking status (checked during program link).
     * @returns {shader} This instance for chaining.
     */
    compile() {
        const { source } = this;
        if (!source || typeof source !== 'string') {
            throw new Error('Shader source must be non-empty string');
        }

        const { gl } = this;

        if (this.addr) {
            gl.deleteShader(this.addr);
            this.addr = null;
        }

        const shader_obj = gl.createShader(this.#type);
        if (!shader_obj) throw new Error('Failed to create shader');

        gl.shaderSource(shader_obj, source);
        gl.compileShader(shader_obj);
        this.addr = shader_obj;

        return this;
    }

    /** @returns {number} The shader type. */
    get type() { return this.#type; }

    /** @returns {string} The shader source. */
    get source() { return this.#source; }

    /** Cleans up shader resources. */
    clear() {
        const { addr, gl } = this;
        if (addr) {
            gl.deleteShader(addr);
            this.addr = null;
        }
    }
}

/**
 * Manages WebGL shader programs.
 */
export class program extends glcomp {
    #hash = null;
    #vs = null;
    #fs = null;
    #uniforms = new Map();
    #attributes = new Map();
    #uniform_values = new Map();

    /**
     * @param {WebGLRenderingContext} gl - The WebGL context.
     * @param {string} name - Program name.
     */
    constructor(gl, name) {
        super(gl, name);
    }

    /**
     * Initializes the shader program.
     * @param {string} vs_source - Vertex shader source.
     * @param {string} fs_source - Fragment shader source.
     * @returns {program} This instance for chaining.
     */
    init(vs_source, fs_source) {
        if (!vs_source || !fs_source || typeof vs_source !== 'string' || typeof fs_source !== 'string') {
            throw new Error('Both vertex and fragment shader sources required');
        }

        const h = compute_hash(vs_source + fs_source);
        if (this.#hash === h && this.is_allocated) {
            return this;
        }

        if (this.#hash !== h) {
            this.clear();
            this.#hash = h;
        }

        const { gl } = this;

        this.#vs = new shader(gl, `${this.name}_vs`, gl.VERTEX_SHADER, vs_source).compile();
        this.#fs = new shader(gl, `${this.name}_fs`, gl.FRAGMENT_SHADER, fs_source).compile();

        const program_obj = gl.createProgram();
        if (!program_obj) {
            this.clear();
            throw new Error('Failed to create shader program');
        }

        this.addr = program_obj;
        gl.attachShader(program_obj, this.#vs.addr);
        gl.attachShader(program_obj, this.#fs.addr);
        gl.linkProgram(program_obj);

        if (!gl.getProgramParameter(program_obj, gl.LINK_STATUS)) {
            const program_log = gl.getProgramInfoLog(program_obj).trim();
            let error_msg = `Program link error: ${program_log}`;

            if (!gl.getShaderParameter(this.#vs.addr, gl.COMPILE_STATUS)) {
                const vs_log = gl.getShaderInfoLog(this.#vs.addr).trim();
                error_msg += `\nVertex shader compilation error: ${vs_log}`;
            }
            if (!gl.getShaderParameter(this.#fs.addr, gl.COMPILE_STATUS)) {
                const fs_log = gl.getShaderInfoLog(this.#fs.addr).trim();
                error_msg += `\nFragment shader compilation error: ${fs_log}`;
            }

            this.clear();
            throw new Error(error_msg);
        }

        this.#map_uniforms();
        this.#map_attributes();

        return this;
    }

    /**
     * Maps all active uniforms in the program.
     */
    #map_uniforms() {
        const { gl, addr } = this;
        const num_uniforms = gl.getProgramParameter(addr, gl.ACTIVE_UNIFORMS);

        for (let i = 0; i < num_uniforms; i++) {
            const info = gl.getActiveUniform(addr, i);
            if (!info) continue;

            const location = gl.getUniformLocation(addr, info.name);
            if (location) {
                const setter = uniform_setters[info.type];
                if (setter) {
                    this.#uniforms.set(info.name, {
                        location,
                        setter,
                        type: info.type,
                        size: info.size
                    });
                }
            }
        }
    }

    /**
     * Maps all active attributes in the program.
     */
    #map_attributes() {
        const { gl, addr } = this;
        const num_attributes = gl.getProgramParameter(addr, gl.ACTIVE_ATTRIBUTES);

        for (let i = 0; i < num_attributes; i++) {
            const info = gl.getActiveAttrib(addr, i);
            if (!info) continue;

            const location = gl.getAttribLocation(addr, info.name);
            if (location >= 0) {
                this.#attributes.set(info.name, {
                    location,
                    type: info.type,
                    size: info.size
                });
            }
        }
    }

    /**
     * Uses this program for rendering if not already active.
     */
    use() {
        if (this.addr) {
            const { gl } = this;
            if (gl._current_program !== this.addr) {
                gl.useProgram(this.addr);
                gl._current_program = this.addr;
            }
        }
    }

    /**
     * Gets uniform information by name.
     * @param {string} name - Uniform name.
     * @returns {Object|null} Uniform information or null if not found.
     */
    uni_loc(name) {
        const uniform = this.#uniforms.get(name);
        return uniform ? uniform.location : null;
    }

    /**
     * Gets attribute information by name.
     * @param {string} name - Attribute name.
     * @returns {Object|null} Attribute information or null if not found.
     */
    att_loc(name) {
        const attribute = this.#attributes.get(name);
        return attribute ? attribute.location : -1;
    }

    /**
     * Gets uniform setter function name.
     * @param {string} name - Uniform name.
     * @returns {string|null} Setter function name or null if not found.
     */
    uni_setter(name) {
        const uniform = this.#uniforms.get(name);
        return uniform ? uniform.setter : null;
    }

    /**
     * Sets a uniform value by name, only if changed.
     * @param {string} name - Uniform name.
     * @param {...any} values - Uniform values.
     * @returns {boolean} True if uniform was set successfully.
     */
    set(name, ...values) {
        const uniform = this.#uniforms.get(name);
        if (!uniform || !this.gl[uniform.setter]) return false;

        const { gl } = this;
        const { setter, location } = uniform;
        const is_matrix = setter.includes('Matrix');

        let new_val;
        if (is_matrix) {
            if (values.length !== 1 || (!Array.isArray(values[0]) && !(values[0] instanceof Float32Array))) return false;
            new_val = Array.from(values[0]);
        } else {
            new_val = values.slice();
        }

        const old_val = this.#uniform_values.get(name);
        if (old_val && old_val.length === new_val.length && old_val.every((v, i) => v === new_val[i])) {
            return true;
        }

        this.#uniform_values.set(name, new_val);

        if (is_matrix) {
            gl[setter](location, false, values[0]);
        } else {
            gl[setter](location, ...values);
        }

        return true;
    }

    /**
     * Gets all uniform information.
     * @returns {Map} Map of uniform information.
     */
    get uniforms() {
        return new Map(this.#uniforms);
    }

    /**
     * Gets all attribute information.
     * @returns {Map} Map of attribute information.
     */
    get attributes() {
        return new Map(this.#attributes);
    }

    /**
     * Gets program info for debugging.
     * @returns {Object} Program information.
     */
    get_program_info() {
        if (!this.addr) return null;

        const { gl, addr } = this;
        return {
            linked: gl.getProgramParameter(addr, gl.LINK_STATUS),
            validated: gl.getProgramParameter(addr, gl.VALIDATE_STATUS),
            attached_shaders: gl.getProgramParameter(addr, gl.ATTACHED_SHADERS),
            active_attributes: gl.getProgramParameter(addr, gl.ACTIVE_ATTRIBUTES),
            active_uniforms: gl.getProgramParameter(addr, gl.ACTIVE_UNIFORMS),
            uniforms: Array.from(this.#uniforms.keys()),
            attributes: Array.from(this.#attributes.keys())
        };
    }

    /**
     * Cleans up program resources.
     */
    clear() {
        const { gl } = this;

        if (this.addr) {
            if (this.#vs?.is_allocated) {
                gl.detachShader(this.addr, this.#vs.addr);
            }
            if (this.#fs?.is_allocated) {
                gl.detachShader(this.addr, this.#fs.addr);
            }
            gl.deleteProgram(this.addr);
            if (gl._current_program === this.addr) {
                gl._current_program = null;
            }
            this.addr = null;
        }

        if (this.#vs) {
            this.#vs.clear();
            this.#vs = null;
        }

        if (this.#fs) {
            this.#fs.clear();
            this.#fs = null;
        }

        this.#uniforms.clear();
        this.#attributes.clear();
        this.#uniform_values.clear();
        this.#hash = null;
    }
}