import { compute_hash } from "../module/string.js";

/**
 * Maps WebGL uniform types to their setter functions.
 */
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
 * Base WebGL component class.
 */
class glcomp {
	#gl = null;
	#addr = null;

	/**
	 * @param {WebGLRenderingContext} gl - The WebGL context.
	 */
	constructor(gl) {
		if (!gl) throw new Error('WebGL context is required');
		this.#gl = gl;
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
	 * Checks if WebGL context is valid.
	 * @returns {boolean} True if context is valid.
	 */
	get isValid() {
		return this.#gl !== null;
	}

	/**
	 * Checks if GPU resource is allocated.
	 * @returns {boolean} True if resource is allocated.
	 */
	get isAllocated() {
		return this.#addr !== null;
	}
}

/**
 * Manages individual WebGL shaders.
 */
class shader extends glcomp {
	#type = null;
	#source = null;

	/**
	 * @param {WebGLRenderingContext} gl - The WebGL context.
	 * @param {number} type - The shader type (VERTEX_SHADER or FRAGMENT_SHADER).
	 * @param {string} source - The shader source code.
	 */
	constructor(gl, type, source) {
		super(gl);
		this.#type = type;
		this.#source = source;
	}

	/**
	 * Compiles the shader.
	 * @returns {shader} This instance for chaining.
	 */
	compile = () => {
		if (!this.#source || typeof this.#source !== 'string') {
			throw new Error('Shader source must be a non-empty string');
		}

		const gl = this.gl;
		this.addr = gl.createShader(this.#type);
		if (!this.addr) {
			throw new Error('Failed to create shader');
		}

		gl.shaderSource(this.addr, this.#source);
		gl.compileShader(this.addr);

		if (!gl.getShaderParameter(this.addr, gl.COMPILE_STATUS)) {
			const log = gl.getShaderInfoLog(this.addr);
			this.clear();
			throw new Error(`Shader compilation error: ${log}`);
		}

		return this;
	};

	/** @returns {number} The shader type. */
	get type() { return this.#type; }

	/** @returns {string} The shader source. */
	get source() { return this.#source; }

	/** Cleans up shader resources. */
	clear = () => {
		if (this.addr) {
			this.gl.deleteShader(this.addr);
			this.addr = null;
		}
	};
}

/**
 * Manages WebGL shader programs.
 */
class program extends glcomp {
	#hash = null;
	#vs = null;
	#fs = null;
	#uniforms = new Map();
	#attributes = new Map();

	/**
	 * @param {WebGLRenderingContext} gl - The WebGL context.
	 */
	constructor(gl) {
		super(gl);
	}

	/**
	 * Initializes the shader program.
	 * @param {string} vs_source - Vertex shader source.
	 * @param {string} fs_source - Fragment shader source.
	 * @returns {program} This instance for chaining.
	 */
	init = (vs_source, fs_source) => {
		if (!vs_source || !fs_source) {
			throw new Error('Both vertex and fragment shader sources are required');
		}

		const h = compute_hash(vs_source + fs_source);
		if (this.#hash !== h) {
			this.clear();
			this.#hash = h;
		}

		const gl = this.gl;

		// Create and compile shaders
		this.#vs = new shader(gl, gl.VERTEX_SHADER, vs_source).compile();
		this.#fs = new shader(gl, gl.FRAGMENT_SHADER, fs_source).compile();

		// Create and link program
		this.addr = gl.createProgram();
		if (!this.addr) {
			this.clear();
			throw new Error('Failed to create shader program');
		}

		gl.attachShader(this.addr, this.#vs.addr);
		gl.attachShader(this.addr, this.#fs.addr);
		gl.linkProgram(this.addr);

		if (!gl.getProgramParameter(this.addr, gl.LINK_STATUS)) {
			this.clear();
			const log = gl.getProgramInfoLog(this.addr);
			throw new Error(`Unable to link shader program: ${log}`);
		}

		// Map uniforms and attributes
		this.#map_uniforms();
		this.#map_attributes();

		return this;
	};

	/**
	 * Maps all active uniforms in the program.
	 */
	#map_uniforms = () => {
		const gl = this.gl;
		const num_uniforms = gl.getProgramParameter(this.addr, gl.ACTIVE_UNIFORMS);

		for (let i = 0; i < num_uniforms; i++) {
			const info = gl.getActiveUniform(this.addr, i);
			if (!info) continue;

			const location = gl.getUniformLocation(this.addr, info.name);
			if (location) {
				const setter = uniform_setters[info.type];
				if (setter) {
					this.#uniforms.set(info.name, {
						location: location,
						setter: setter,
						type: info.type,
						size: info.size
					});
				} else {
					console.warn(`No setter found for uniform type: ${info.type} (${info.name})`);
				}
			}
		}
	};

	/**
	 * Maps all active attributes in the program.
	 */
	#map_attributes = () => {
		const gl = this.gl;
		const num_attributes = gl.getProgramParameter(this.addr, gl.ACTIVE_ATTRIBUTES);

		for (let i = 0; i < num_attributes; i++) {
			const info = gl.getActiveAttrib(this.addr, i);
			if (!info) continue;

			const location = gl.getAttribLocation(this.addr, info.name);
			if (location >= 0) {
				this.#attributes.set(info.name, {
					location: location,
					type: info.type,
					size: info.size
				});
			}
		}
	};

	/**
	 * Uses this program for rendering.
	 */
	use = () => {
		if (this.addr) {
			this.gl.useProgram(this.addr);
		}
	};

	/**
	 * Gets uniform information by name.
	 * @param {string} name - Uniform name.
	 * @returns {Object|null} Uniform information or null if not found.
	 */
	uni_loc = name => {
		const uniform = this.#uniforms.get(name);
		return uniform ? uniform.location : null;
	};

	/**
	 * Gets attribute information by name.
	 * @param {string} name - Attribute name.
	 * @returns {Object|null} Attribute information or null if not found.
	 */
	att_loc = name => {
		const attribute = this.#attributes.get(name);
		return attribute ? attribute.location : -1;
	};

	/**
	 * Gets uniform setter function name.
	 * @param {string} name - Uniform name.
	 * @returns {string|null} Setter function name or null if not found.
	 */
	uni_setter = name => {
		const uniform = this.#uniforms.get(name);
		return uniform ? uniform.setter : null;
	};

	/**
	 * Sets a uniform value by name.
	 * @param {string} name - Uniform name.
	 * @param {...any} values - Uniform values.
	 * @returns {boolean} True if uniform was set successfully.
	 */
	set = (name, ...values) => {
		const uniform = this.#uniforms.get(name);
		if (!uniform || !this.gl[uniform.setter]) {
			return false;
		}

		const gl = this.gl;
		const setter = uniform.setter;

		// Handle matrix uniforms specially
		if (setter.includes('Matrix')) {
			gl[setter](uniform.location, false, ...values);
		} else {
			gl[setter](uniform.location, ...values);
		}

		return true;
	};

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
	get_program_info = () => {
		if (!this.addr) return null;

		const gl = this.gl;
		return {
			linked: gl.getProgramParameter(this.addr, gl.LINK_STATUS),
			validated: gl.getProgramParameter(this.addr, gl.VALIDATE_STATUS),
			attached_shaders: gl.getProgramParameter(this.addr, gl.ATTACHED_SHADERS),
			active_attributes: gl.getProgramParameter(this.addr, gl.ACTIVE_ATTRIBUTES),
			active_uniforms: gl.getProgramParameter(this.addr, gl.ACTIVE_UNIFORMS),
			uniforms: Array.from(this.#uniforms.keys()),
			attributes: Array.from(this.#attributes.keys())
		};
	};

	/**
	 * Cleans up program resources.
	 */
	clear = () => {
		const gl = this.gl;

		if (this.addr) {
			if (this.#vs && this.#vs.isAllocated) {
				gl.detachShader(this.addr, this.#vs.addr);
			}
			if (this.#fs && this.#fs.isAllocated) {
				gl.detachShader(this.addr, this.#fs.addr);
			}
			gl.deleteProgram(this.addr);
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
		this.#hash = null;
	};
}

/**
 * Manages WebGL textures.
 */
class texture extends glcomp {
	#index = null;
	#width = 0;
	#height = 0;
	#format = 0;

	/**
	 * @param {WebGLRenderingContext} gl - The WebGL context.
	 */
	constructor(gl) {
		super(gl);
	}

	/**
	 * Creates a texture.
	 * @param {number} index - Texture unit index.
	 * @param {ArrayBufferView|null} data - Texture data.
	 * @param {number} width - Texture width.
	 * @param {number} height - Texture height.
	 * @param {number} [internal_format] - Internal format.
	 * @param {number} [format] - Data format.
	 * @param {number} [type] - Data type.
	 * @returns {texture} This instance for chaining.
	 */
	create = (index, data, width, height, internal_format, format, type) => {
		const gl = this.gl;

		if (index < 0 || index > 15) {
			throw new Error('Texture unit index must be between 0 and 15');
		}
		if (width <= 0 || height <= 0) {
			throw new Error('Texture dimensions must be positive');
		}

		this.clear();

		// Set defaults if not provided
		internal_format = internal_format || gl.RGBA;
		format = format || gl.RGBA;
		type = type || gl.UNSIGNED_BYTE;

		this.#index = gl[`TEXTURE${index}`];
		this.addr = gl.createTexture();
		if (!this.addr) {
			throw new Error('Failed to create texture');
		}

		this.#width = width;
		this.#height = height;
		this.#format = format;

		this.activate();

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.texImage2D(gl.TEXTURE_2D, 0, internal_format, width, height, 0, format, type, data);

		return this;
	};

	/** @returns {number} The texture width. */
	get width() { return this.#width; }

	/** @returns {number} The texture height. */
	get height() { return this.#height; }

	/** @returns {number} The texture format. */
	get format() { return this.#format; }

	/** @returns {number} The texture unit index. */
	get index() { return this.#index; }

	/** Activates and binds this texture. */
	activate = () => {
		if (this.addr) {
			this.gl.activeTexture(this.#index);
			this.gl.bindTexture(this.gl.TEXTURE_2D, this.addr);
		}
	};

	/** Cleans up texture resources. */
	clear = () => {
		const gl = this.gl;

		if (this.#index !== null) {
			gl.activeTexture(this.#index);
			gl.bindTexture(gl.TEXTURE_2D, null);
			this.#index = null;
		}

		if (this.addr) {
			gl.deleteTexture(this.addr);
			this.addr = null;
		}

		this.#width = 0;
		this.#height = 0;
		this.#format = 0;
	};
}

/**
 * Manages WebGL geometry buffers.
 */
class geometry extends glcomp {
	/**
	 * @param {WebGLRenderingContext} gl - The WebGL context.
	 */
	constructor(gl) {
		super(gl);
	}

	/**
	 * Initializes geometry buffer.
	 * @param {number} location - Attribute location.
	 */
	init = location => {
		this.clear();

		const gl = this.gl;
		this.addr = gl.createBuffer();
		if (!this.addr) {
			throw new Error('Failed to create geometry buffer');
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, this.addr);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

		if (location >= 0) {
			gl.enableVertexAttribArray(location);
			gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
		}
	};

	/** Cleans up geometry resources. */
	clear = () => {
		if (this.addr) {
			this.gl.deleteBuffer(this.addr);
			this.addr = null;
		}
	};
}

/**
 * Manages WebGL framebuffers.
 */
class frame extends glcomp {
	#bound_texture = null;

	/**
	 * @param {WebGLRenderingContext} gl - The WebGL context.
	 */
	constructor(gl) {
		super(gl);
	}

	/**
	 * Initializes the framebuffer.
	 * @returns {frame} This instance for chaining.
	 */
	init = () => {
		this.clear();
		this.addr = this.gl.createFramebuffer();
		if (!this.addr) {
			throw new Error('Failed to create framebuffer');
		}
		return this;
	};

	/** @returns {WebGLTexture} The currently bound texture. */
	get bound_texture() { return this.#bound_texture; }

	/** Activates this framebuffer. */
	activate = () => {
		if (this.addr) {
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.addr);
		}
	};

	/**
	 * Binds texture to framebuffer.
	 * @param {WebGLTexture} tex - Texture to bind.
	 * @returns {frame} This instance for chaining.
	 */
	bind_to_texture = tex => {
		if (!this.addr) {
			throw new Error('Framebuffer not initialized');
		}
		if (!tex) {
			throw new Error('Texture is required');
		}

		this.activate();

		const gl = this.gl;
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D, tex, 0
		);

		this.#bound_texture = tex;

		const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		if (status !== gl.FRAMEBUFFER_COMPLETE) {
			console.error('Framebuffer incomplete:', status);
			throw new Error(`Framebuffer incomplete: ${status}`);
		}

		return this;
	};

	/** Cleans up framebuffer resources. */
	clear = () => {
		if (this.addr) {
			this.gl.deleteFramebuffer(this.addr);
			this.addr = null;
		}
		this.#bound_texture = null;
	};
}

/**
 * GPGPU computation manager using WebGL.
 */
export class GPGPU {
	#screen = null;
	gl = null;

	prog = null;
	geo = null;
	frame = null;

	textures = new Map();
	frame_textures = new Set();

	/**
	 * @param {number} width - Canvas width.
	 * @param {number} height - Canvas height.
	 */
	constructor(width, height) {
		if (width > 0 && height > 0) {
			this.#screen = new OffscreenCanvas(width, height);
			this.gl = this.#screen.getContext('webgl2', {
				antialias: false,
				depth: false,
				alpha: false,
				preserveDrawingBuffer: false,
				powerPreference: 'high-performance'
			}) || this.#screen.getContext('webgl', {
				antialias: false,
				depth: false,
				alpha: false,
				preserveDrawingBuffer: false,
				powerPreference: 'high-performance'
			}) || this.#screen.getContext('experimental-webgl', {
				antialias: false,
				depth: false,
				alpha: false,
				preserveDrawingBuffer: false,
				powerPreference: 'high-performance'
			});

			if (this.gl) {
				this.gl.enable(this.gl.SCISSOR_TEST);
				this.gl.disable(this.gl.DEPTH_TEST);
				this.gl.disable(this.gl.BLEND);
			}
			else this.gl = null;
		}
	}

	/**
	 * Checks if WebGL context is available.
	 * @returns {boolean} True if WebGL is available.
	 */
	get isWebGLAvailable() {
		return this.gl !== null;
	}

	/**
	 * Sets canvas dimensions.
	 * @param {number} width - New width.
	 * @param {number} height - New height.
	 */
	set_screen_size = (width, height) => {
		if (width <= 0 || height <= 0) {
			throw new Error(`Canvas dimensions must be positive: ${width}, ${height}`);
		}

		const screen = this.gl.canvas;
		if (screen.width !== width || screen.height !== height) {
			screen.width = width;
			screen.height = height;
		}
	};

	/**
	 * Sets up shader program.
	 * @param {string} vs_source - Vertex shader source.
	 * @param {string} fs_source - Fragment shader source.
	 * @param {string} geo_attr - Geometry attribute name.
	 * @returns {program} The created program.
	 */
	setup_program = (vs_source, fs_source, geo_attr) => {
		if (!this.prog) {
			this.prog = new program(this.gl);
			this.prog.init(vs_source, fs_source);

			if (this.geo) this.geo.clear();
			this.geo = new geometry(this.gl);

			const geo_location = this.prog.att_loc(geo_attr);
			if (geo_location >= 0) {
				this.geo.init(geo_location);
			}
		}

		return this.prog;
	};

	/**
	 * Creates or updates a texture.
	 * @param {string} name - Texture name.
	 * @param {number} index - Texture unit index.
	 * @param {ArrayBufferView|null} data - Texture data.
	 * @param {number} width - Texture width.
	 * @param {number} height - Texture height.
	 * @param {number} [internal_format] - Internal format.
	 * @param {number} [format] - Data format.
	 * @param {number} [type] - Data type.
	 * @returns {texture} The created texture.
	 */
	create_texture = (name, index, data, width, height, internal_format, format, type) => {
		// Always create a fresh texture - clear existing one first
		if (this.textures.has(name)) {
			const old_tex = this.textures.get(name);
			old_tex.clear();
			this.textures.delete(name);
		}

		const tex = new texture(this.gl);
		tex.create(index, data, width, height, internal_format, format, type);
		this.textures.set(name, tex);
		return tex;
	};

	/**
	 * Gets a texture by name.
	 * @param {string} name - Texture name.
	 * @returns {texture|null} The texture or null if not found.
	 */
	get_texture = name => {
		return this.textures.get(name) || null;
	};

	/**
	 * Sets up framebuffer with texture.
	 * @param {string} tex_name - Texture name to bind.
	 * @returns {frame} The created framebuffer.
	 */
	setup_frame = tex_name => {
		// Always create a fresh framebuffer
		if (this.frame) {
			this.frame.clear();
		}

		this.frame = new frame(this.gl);
		this.frame.init();

		const tex = this.textures.get(tex_name);
		if (!tex) {
			throw new Error(`Texture '${tex_name}' not found`);
		}

		this.frame.bind_to_texture(tex.addr);
		this.frame_textures.add(tex_name);

		return this.frame;
	};

	/**
	 * Executes a function with GPU context.
	 * @param {Function} func - Function to execute.
	 * @param {...any} args - Function arguments.
	 * @returns {any} The result of the function.
	 */
	exec = (func, ...args) => {
		if (typeof func !== 'function') {
			throw new Error('First argument must be a function');
		}
		return func(this, ...args);
	};

	/**
	 * Executes WebGL rendering and reads pixels.
	 * @param {number} width - Viewport width.
	 * @param {number} height - Viewport height.
	 * @param {number} [format] - Pixel format.
	 * @param {number} [type] - Pixel type.
	 * @returns {Uint8ClampedArray|Float32Array} Pixel data.
	 */
	glexec = (width, height, format, type) => {
		if (width <= 0 || height <= 0) {
			throw new Error('Viewport dimensions must be positive');
		}

		const gl = this.gl;

		// Set defaults
		format = format || gl.RGBA;
		type = type || gl.UNSIGNED_BYTE;

		// Ensure framebuffer is active before rendering
		//if (this.frame) {
		//	this.frame.activate();
		//} else {
		//	// If no framebuffer is set, bind to default (canvas)
		//	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		//}

		gl.viewport(0, 0, width, height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		const error = gl.getError();
		if (error !== gl.NO_ERROR) {
			console.error('WebGL error during rendering:', error);
			this.clear_frame();
			throw new Error(`WebGL rendering error: ${error}`);
		}

		let dest_data;
		if (type === gl.UNSIGNED_BYTE) {
			dest_data = new Uint8ClampedArray(width * height * 4);
		} else if (type === gl.FLOAT) {
			dest_data = new Float32Array(width * height * 4);
		} else {
			throw new Error(`Unsupported pixel type: ${type}`);
		}

		gl.readPixels(0, 0, width, height, format, type, dest_data);

		const read_error = gl.getError();
		if (read_error !== gl.NO_ERROR) {
			console.error('WebGL error during readPixels:', read_error);
			this.clear_frame();
			throw new Error(`WebGL readPixels error: ${read_error}`);
		}

		return dest_data;
	};

	/** Clears all textures. */
	clear_texture = () => {
		this.textures.forEach(tex => tex.clear());
		this.textures.clear();
	};

	/** Clears only frame-related textures. */
	clear_frame_textures = () => {
		this.frame_textures.forEach(name => {
			const tex = this.textures.get(name);
			if (tex) {
				tex.clear();
				this.textures.delete(name);
			}
		});
		this.frame_textures.clear();
	};

	/** Clears framebuffer and frame textures. */
	clear_frame = () => {
		if (this.frame) {
			this.frame.clear();
			this.frame = null;
		}
		this.clear_frame_textures();
	};

	/** Cleans up all GPU resources. */
	clear = () => {
		if (this.prog) {
			this.prog.clear();
			this.prog = null;
		}
		if (this.geo) {
			this.geo.clear();
			this.geo = null;
		}
		this.clear_frame();
		this.clear_texture();
	};
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
		gp.setup_program(vs_source, fs_source, 'position');
		gp.prog.use();

		// Create source texture
		const source_tex = gp.create_texture('source_tex', 0, src_data, src_width, src_height);

		// Create destination texture
		gp.create_texture('dest_tex', 1, null, target_width, target_height);

		// Setup framebuffer
		gp.setup_frame('dest_tex');

		// Set uniforms using the new simplified API
		source_tex.activate();
		gp.prog.set('source_tex', 0);  // Simplified: just name and value
		gp.prog.set('source_size', src_width, src_height);
		gp.prog.set('target_size', target_width, target_height);

		// Execute and get result
		const result = gp.glexec(target_width, target_height);
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