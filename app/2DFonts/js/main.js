/*
    2D Font Texture Generator
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
 * Application defaults and configuration constants
 * @namespace
 */
const defaults = {
    width: 256,
    height: 256,
    grid: false,
    zoom: 1,
    font_family: 'monospace, Times, serif',
    font_weight: 'normal',
    font_style: 'normal',
    font_size: 16,
    chars: ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    fill: 'fill',
    color: '#000000FF',
    back_color: '#FFFFFF00',
    shadow: false,
    shadow_color: '#000000FF',
    shadow_x: 0,
    shadow_y: 0,
    glow: false,
    glow_color: '#FFFFFFFF',
    glow_dist: 0,
    blur: false,
    blur_dist: 0,
    max_cache_size: 100
};

/**
 * Main application data store
 * @namespace
 */
const data = {
    width: defaults.width,
    height: defaults.height,
    grid: defaults.grid,
    zoom: defaults.zoom,
    target_zoom: defaults.zoom,
    font_family: defaults.font_family,
    font_weight: defaults.font_weight,
    font_style: defaults.font_style,
    font_size: defaults.font_size,
    chars: defaults.chars,
    fill: defaults.fill,
    color: '#000000FF',
    back_color: '#FFFFFF00',
    shadow: defaults.shadow,
    shadow_color: '#000000FF',
    shadow_x: 0,
    shadow_y: 0,
    glow: defaults.glow,
    glow_color: '#FFFFFFFF',
    glow_dist: 0,
    blur: defaults.blur,
    blur_dist: 0
};

// Canvas context references
const view = document.getElementById('graph').getContext('2d', { willReadFrequently: false });
const char_canv = document.getElementById('canv_char').getContext('2d', { willReadFrequently: false });
const map_canv = document.getElementById('canv_tex').getContext('2d', { willReadFrequently: false });
const grid_canv = document.createElement('canvas').getContext('2d', { willReadFrequently: false });

// Application state
let is_dirty = true;
let draw_timer = null;
const font_size_cache = new Map();

/**
 * Optimizes canvas for high DPI displays
 * @param {HTMLCanvasElement} canvas - The canvas element to optimize
 * @param {number} width - The logical width
 * @param {number} height - The logical height
 */
const set_pixel_ratio = (canvas, width, height) => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;
};

/**
 * Converts hex color and alpha to 8-digit hex color
 * @param {string} hex - 6-digit hex color
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} 8-digit hex color
 */
const input_to_color = (hex, alpha) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return '#000000FF';
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();
    return `${hex}${a}`;
};

/**
 * Extracts 6-digit hex color from 8-digit hex
 * @param {string} hex - 8-digit hex color
 * @returns {string} 6-digit hex color
 */
const color_to_input = (hex) => {
    if (hex.startsWith('#') && hex.length === 9) return hex.substring(0, 7);
    if (hex.startsWith('#') && hex.length === 7) return hex;
    return '#000000';
};

/**
 * Debounces function execution
 * @param {Function} fn - Function to debounce
 * @param {number} ms - Delay in milliseconds
 * @returns {Function} Debounced function
 */
const debounce = (fn, ms) => {
    let timeout_id = null;
    return (...args) => {
        clearTimeout(timeout_id);
        timeout_id = setTimeout(() => fn.apply(null, args), ms);
    };
};

/**
 * Sanitizes string by removing unwanted characters
 * @param {string} value - Input string
 * @returns {string} Sanitized string
 */
const sanitize_string = (value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/[\u{1F000}-\u{1FAFF}\u{1F300}-\u{1F6FF}\u{2600}-\u{27BF}]/gu, '')
                .replace(/[^\x20-\x7E]/g, '');
};

/**
 * Sanitizes font family string
 * @param {string} value - Font family string
 * @returns {string} Sanitized font family
 */
const sanitize_font_family = (value) => {
    const sanitized = sanitize_string(value);
    return sanitized || defaults.font_family;
};

/**
 * Requests a redraw with debouncing
 */
const request_draw = () => {
    if (draw_timer) return;
    draw_timer = requestAnimationFrame(() => {
        draw();
        draw_timer = null;
    });
};

/**
 * UI data binding map
 * @namespace
 */
const ui_map = {
    width_sel: {
        get: () => data.width,
        set: (value) => {
            data.width = Math.max(1, parseInt(value, 10) || defaults.width);
            is_dirty = true;
            request_draw();
        }
    },
    height_sel: {
        get: () => data.height,
        set: (value) => {
            data.height = Math.max(1, parseInt(value, 10) || defaults.height);
            is_dirty = true;
            request_draw();
        }
    },
    font_family: {
        get: () => data.font_family,
        set: (value) => {
            data.font_family = sanitize_font_family(value);
            font_size_cache.clear();
            is_dirty = true;
            request_draw();
        }
    },
    char_list: {
        get: () => data.chars,
        set: (value) => {
            if (!value || value.length === 0) throw new Error('Characters cannot be empty');
            data.chars = sanitize_string(value);
            font_size_cache.clear();
            is_dirty = true;
            request_draw();
        }
    },
    font_weight: {
        get: () => data.font_weight,
        set: (value) => {
            data.font_weight = value;
            font_size_cache.clear();
            is_dirty = true;
            request_draw();
        }
    },
    font_style: {
        get: () => data.font_style,
        set: (value) => {
            data.font_style = value;
            font_size_cache.clear();
            is_dirty = true;
            request_draw();
        }
    },
    fill_style: {
        get: () => data.fill,
        set: (value) => {
            data.fill = value;
            is_dirty = true;
            request_draw();
        }
    },
    font_color: {
        get: () => color_to_input(data.color),
        set: (value) => {
            const alpha_hex = data.color.length === 9 ? data.color.slice(7, 9) : 'FF';
            const alpha = parseInt(alpha_hex, 16) / 255;
            data.color = input_to_color(value, alpha);
            is_dirty = true;
            request_draw();
        }
    },
    font_alpha: {
        get: () => {
            const alpha_hex = data.color.length === 9 ? data.color.slice(7, 9) : 'FF';
            return parseInt(alpha_hex, 16) / 255;
        },
        set: (value) => {
            const current_color = color_to_input(data.color);
            data.color = input_to_color(current_color, Math.max(0, Math.min(1, value)));
            is_dirty = true;
            request_draw();
        }
    },
    back_color: {
        get: () => color_to_input(data.back_color),
        set: (value) => {
            const alpha_hex = data.back_color.length === 9 ? data.back_color.slice(7, 9) : '00';
            const alpha = parseInt(alpha_hex, 16) / 255;
            data.back_color = input_to_color(value, alpha);
            is_dirty = true;
            request_draw();
        }
    },
    back_alpha: {
        get: () => {
            const alpha_hex = data.back_color.length === 9 ? data.back_color.slice(7, 9) : '00';
            return parseInt(alpha_hex, 16) / 255;
        },
        set: (value) => {
            const current_color = color_to_input(data.back_color);
            data.back_color = input_to_color(current_color, Math.max(0, Math.min(1, value)));
            is_dirty = true;
            request_draw();
        }
    },
    shadow_chb: {
        get: () => data.shadow,
        set: (value) => {
            data.shadow = Boolean(value);
            is_dirty = true;
            request_draw();
        }
    },
    shadow_color: {
        get: () => color_to_input(data.shadow_color),
        set: (value) => {
            const alpha_hex = data.shadow_color.length === 9 ? data.shadow_color.slice(7, 9) : '00';
            const alpha = parseInt(alpha_hex, 16) / 255;
            data.shadow_color = input_to_color(value, alpha);
            is_dirty = true;
            request_draw();
        }
    },
    shadow_x: {
        get: () => data.shadow_x,
        set: (value) => {
            data.shadow_x = parseInt(value, 10) || 0;
            is_dirty = true;
            request_draw();
        }
    },
    shadow_y: {
        get: () => data.shadow_y,
        set: (value) => {
            data.shadow_y = parseInt(value, 10) || 0;
            is_dirty = true;
            request_draw();
        }
    },
    glowing_chb: {
        get: () => data.glow,
        set: (value) => {
            data.glow = Boolean(value);
            is_dirty = true;
            request_draw();
        }
    },
    glowing_color: {
        get: () => color_to_input(data.glow_color),
        set: (value) => {
            const alpha_hex = data.glow_color.length === 9 ? data.glow_color.slice(7, 9) : '00';
            const alpha = parseInt(alpha_hex, 16) / 255;
            data.glow_color = input_to_color(value, alpha);
            is_dirty = true;
            request_draw();
        }
    },
    glowing_dist: {
        get: () => data.glow_dist,
        set: (value) => {
            data.glow_dist = Math.max(0, parseInt(value, 10) || 0);
            is_dirty = true;
            request_draw();
        }
    },
    blurred_chb: {
        get: () => data.blur,
        set: (value) => {
            data.blur = Boolean(value);
            is_dirty = true;
            request_draw();
        }
    },
    blurred_dist: {
        get: () => data.blur_dist,
        set: (value) => {
            data.blur_dist = Math.max(0, parseInt(value, 10) || 0);
            is_dirty = true;
            request_draw();
        }
    }
};

/**
 * Updates size-related UI elements
 */
const update_size_ui = () => {
    document.getElementById('width_sel').value = ui_map.width_sel.get();
    document.getElementById('height_sel').value = ui_map.height_sel.get();
    document.getElementById('ft_grid_btn').checked = data.grid;
    document.getElementById('ft_zoom_btn').textContent = `${Math.round(data.zoom * 100)}%`;
};

/**
 * Updates font-related UI elements
 */
const update_font_ui = () => {
    document.getElementById('font_family').value = ui_map.font_family.get();
    document.getElementById('char_list').value = ui_map.char_list.get();
    document.getElementById('font_weight').value = ui_map.font_weight.get();
    document.getElementById('font_style').value = ui_map.font_style.get();
    document.getElementById('fill_style').value = ui_map.fill_style.get();
};

/**
 * Updates effects-related UI elements
 */
const update_effects_ui = () => {
    document.getElementById('font_color').value = ui_map.font_color.get();
    document.getElementById('font_alpha').value = ui_map.font_alpha.get();
    document.getElementById('back_color').value = ui_map.back_color.get();
    document.getElementById('back_alpha').value = ui_map.back_alpha.get();
    document.getElementById('shadow_chb').checked = ui_map.shadow_chb.get();
    document.getElementById('shadow_color').value = ui_map.shadow_color.get();
    document.getElementById('shadow_x').value = ui_map.shadow_x.get();
    document.getElementById('shadow_y').value = ui_map.shadow_y.get();
    document.getElementById('glowing_chb').checked = ui_map.glowing_chb.get();
    document.getElementById('glowing_color').value = ui_map.glowing_color.get();
    document.getElementById('glowing_dist').value = ui_map.glowing_dist.get();
    document.getElementById('blurred_chb').checked = ui_map.blurred_chb.get();
    document.getElementById('blurred_dist').value = ui_map.blurred_dist.get();
};

/**
 * Updates all UI elements from data model
 */
const update_ui = () => {
    update_size_ui();
    update_font_ui();
    update_effects_ui();
};

/**
 * Toggles options panel visibility
 */
const toggle_options = () => {
    const panel = document.getElementById('tool_fld');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        document.getElementById('font_family').focus();
    }
};

/**
 * Closes options panel
 */
const close_options = () => {
    document.getElementById('tool_fld').classList.add('hidden');
};

/**
 * Exports canvas as PNG image
 */
const export_canvas = () => {
    const grid_btn = document.getElementById('ft_grid_btn');
    const was_grid_visible = grid_btn.checked;
    
    if (was_grid_visible) {
        grid_btn.checked = false;
        data.grid = false;
        is_dirty = true;
        request_draw();
    }
    
    setTimeout(() => {
        try {
            const canvas = document.getElementById('canv_tex');
            const data_url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = data_url;
            link.download = 'font.png';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (was_grid_visible) {
                setTimeout(() => {
                    grid_btn.checked = true;
                    data.grid = true;
                    is_dirty = true;
                    request_draw();
                }, 100);
            }
        } catch (error) {
            alert('Export failed. Try reducing canvas size.');
        }
    }, was_grid_visible ? 100 : 0);
};

/**
 * Calculates optimal grid layout for characters
 * @param {number} width - Total width
 * @param {number} height - Total height
 * @param {number} sections - Number of characters
 * @returns {Object} Grid dimensions
 */
const calculate_grid = (width, height, sections) => {
    let side = Math.floor(Math.sqrt((width * height) / sections));
    while (side > 0) {
        const cols = Math.floor(width / side);
        const rows = Math.floor(height / side);
        if (cols * rows >= sections) {
            return { side, cols, rows };
        }
        side--;
    }
    return { side: 1, cols: width, rows: height };
};

/**
 * Calculates maximum font size that fits all characters
 * @param {string} text - Characters to measure
 * @param {number} width - Available width
 * @param {number} height - Available height
 * @returns {number} Optimal font size
 */
const calculate_font_size = (text, width, height) => {
    if (!text || width <= 0 || height <= 0) throw new Error('Invalid input');
    
    const key = `${text}-${width}-${height}-${data.font_family}-${data.font_weight}-${data.font_style}`;
    if (font_size_cache.has(key)) return font_size_cache.get(key);
    
    const unique_chars = Array.from(new Set(text));
    const min_size = 1;
    const max_size = Math.min(width, height);
    const measure_cache = new Map();
    
    /**
     * Checks if character fits at given font size
     * @param {string} char - Character to measure
     * @param {number} size - Font size to test
     * @returns {boolean} True if character fits
     */
    const character_fits = (char, size) => {
        const cache_key = `${char}-${size}`;
        if (measure_cache.has(cache_key)) return measure_cache.get(cache_key);
        
        char_canv.font = `${data.font_style} ${data.font_weight} ${size}px ${data.font_family}`;
        const metrics = char_canv.measureText(char);
        const text_width = Math.ceil(metrics.width);
        const text_height = Math.ceil(Math.abs(metrics.actualBoundingBoxAscent) + Math.abs(metrics.actualBoundingBoxDescent || 0));
        
        const fits = text_width <= width && text_height <= height;
        measure_cache.set(cache_key, fits);
        return fits;
    };
    
    let low = min_size;
    let high = max_size;
    let result = min_size;
    
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (unique_chars.every(char => character_fits(char, mid))) {
            result = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    
    if (result === min_size && !unique_chars.every(char => character_fits(char, min_size))) {
        throw new Error('Dimensions too small for characters');
    }
    
    font_size_cache.set(key, result);
    
    if (font_size_cache.size > defaults.max_cache_size) {
        const first_key = font_size_cache.keys().next().value;
        font_size_cache.delete(first_key);
    }
    
    return result;
};

/**
 * Sets zoom level for preview
 * @param {number} scale - New zoom scale
 */
const set_zoom = (scale) => {
    data.target_zoom = Math.max(0.1, Math.min(4, scale));
    data.zoom = data.target_zoom;
    document.getElementById('ft_zoom_btn').textContent = `${Math.round(data.zoom * 100)}%`;
    is_dirty = true;
    request_draw();
};

/**
 * Draws grid overlay
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 */
const draw_grid = (width, height, cols, rows) => {
    set_pixel_ratio(grid_canv.canvas, width, height);
    grid_canv.clearRect(0, 0, width, height);
    grid_canv.strokeStyle = '#000000';
    grid_canv.lineWidth = 1;
    grid_canv.beginPath();
    
    for (let col = 0; col <= cols; col++) {
        const x = Math.round((col * width) / cols);
        grid_canv.moveTo(x, 0);
        grid_canv.lineTo(x, height);
    }
    
    for (let row = 0; row <= rows; row++) {
        const y = Math.round((row * height) / rows);
        grid_canv.moveTo(0, y);
        grid_canv.lineTo(width, y);
    }
    
    grid_canv.stroke();
};

/**
 * Main drawing function
 */
const draw = () => {
    if (!is_dirty) return;
    
    const start_time = performance.now();
    
    view.clearRect(0, 0, view.canvas.width, view.canvas.height);
    map_canv.clearRect(0, 0, map_canv.canvas.width, map_canv.canvas.height);
    
    if (!data.chars || data.chars.length === 0) {
        is_dirty = false;
        return;
    }
    
    try {
        const grid = calculate_grid(data.width, data.height, data.chars.length);
        data.font_size = calculate_font_size(data.chars, grid.side, grid.side);
        
        set_pixel_ratio(document.getElementById('canv_char'), grid.side, grid.side);
        set_pixel_ratio(document.getElementById('canv_tex'), data.width, data.height);
        
        map_canv.fillStyle = data.back_color;
        map_canv.fillRect(0, 0, data.width, data.height);
        
        const is_fill = data.fill === 'fill';
        const filters = [];
        
        if (data.shadow) {
            filters.push(`drop-shadow(${data.shadow_x}px ${data.shadow_y}px ${data.shadow_color})`);
        }
        if (data.blur) {
            filters.push(`blur(${data.blur_dist}px)`);
        }
        
        char_canv.font = `${data.font_style} ${data.font_weight} ${data.font_size}px ${data.font_family}`;
        char_canv.textAlign = 'center';
        char_canv.textBaseline = 'middle';
        char_canv.filter = filters.join(' ');
        
        const half_side = grid.side / 2;
        
        for (let row = 0; row < grid.rows; row++) {
            for (let col = 0; col < grid.cols; col++) {
                const index = row * grid.cols + col;
                if (index >= data.chars.length) break;
                
                const char = data.chars[index];
                char_canv.clearRect(0, 0, grid.side, grid.side);
                
                if (data.glow) {
                    char_canv.save();
                    char_canv.shadowBlur = data.glow_dist;
                    char_canv.shadowColor = data.glow_color;
                    char_canv.globalCompositeOperation = 'lighter';
                    
                    if (is_fill) {
                        char_canv.fillStyle = data.glow_color;
                        char_canv.fillText(char, half_side, half_side);
                    } else {
                        char_canv.strokeStyle = data.glow_color;
                        char_canv.strokeText(char, half_side, half_side);
                    }
                    char_canv.restore();
                }
                
                if (is_fill) {
                    char_canv.fillStyle = data.color;
                    char_canv.fillText(char, half_side, half_side);
                } else {
                    char_canv.strokeStyle = data.color;
                    char_canv.strokeText(char, half_side, half_side);
                }
                
                const dest_x = Math.round((col * data.width) / grid.cols);
                const dest_y = Math.round((row * data.height) / grid.rows);
                map_canv.drawImage(char_canv.canvas, dest_x, dest_y, grid.side, grid.side);
            }
        }
        
        if (data.grid) {
            draw_grid(data.width, data.height, grid.cols, grid.rows);
            map_canv.drawImage(grid_canv.canvas, 0, 0);
        }
        
        const view_width = view.canvas.width / (window.devicePixelRatio || 1);
        const view_height = view.canvas.height / (window.devicePixelRatio || 1);
        const texture_width = data.width * data.zoom;
        const texture_height = data.height * data.zoom;
        const offset_x = (view_width - texture_width) / 2;
        const offset_y = (view_height - texture_height) / 2;
        
        view.drawImage(map_canv.canvas, offset_x, offset_y, texture_width, texture_height);
        
    } catch (error) {
        console.error('Draw error:', error);
    }
    
    is_dirty = false;
};

/**
 * Handles window resize
 */
const handle_resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.getElementById('graph');
    const nav_height = document.querySelector('.nav_pan')?.offsetHeight || 0;
    const status_height = document.querySelector('.status_bar')?.offsetHeight || 0;
    
    const max_width = window.innerWidth;
    const max_height = window.innerHeight - nav_height - status_height;
    const aspect_ratio = data.width / data.height;
    
    let css_width = Math.min(max_width, max_height * aspect_ratio);
    let css_height = css_width / aspect_ratio;
    
    if (css_height > max_height) {
        css_height = max_height;
        css_width = css_height * aspect_ratio;
    }
    
    canvas.style.width = `${css_width}px`;
    canvas.style.height = `${css_height}px`;
    canvas.width = Math.round(css_width * dpr);
    canvas.height = Math.round(css_height * dpr);
    
    view.setTransform(dpr, 0, 0, dpr, 0, 0);
    is_dirty = true;
    request_draw();
};

/**
 * Event handlers configuration
 * @type {Array}
 */
const event_handlers = [
    { id: 'tool_btn', event: 'click', handler: toggle_options },
    { id: 'tool_close_btn', event: 'click', handler: close_options },
    { id: 'export_act', event: 'click', handler: export_canvas },
    { id: 'width_sel', event: 'change', handler: (e) => ui_map.width_sel.set(e.target.value) },
    { id: 'height_sel', event: 'change', handler: (e) => ui_map.height_sel.set(e.target.value) },
    { id: 'ft_grid_btn', event: 'change', handler: (e) => { data.grid = e.target.checked; is_dirty = true; request_draw(); } },
    { id: 'graph', event: 'wheel', handler: (e) => { e.preventDefault(); set_zoom(data.zoom - e.deltaY * 0.001); } },
    { id: 'font_family', event: 'input', handler: debounce((e) => ui_map.font_family.set(e.target.value), 150) },
    { id: 'char_list', event: 'input', handler: debounce((e) => { try { ui_map.char_list.set(e.target.value); } catch (err) { alert(err.message); e.target.value = data.chars; } }, 150) },
    { id: 'font_weight', event: 'change', handler: (e) => ui_map.font_weight.set(e.target.value) },
    { id: 'font_style', event: 'change', handler: (e) => ui_map.font_style.set(e.target.value) },
    { id: 'fill_style', event: 'change', handler: (e) => ui_map.fill_style.set(e.target.value) },
    { id: 'font_color', event: 'input', handler: (e) => ui_map.font_color.set(e.target.value) },
    { id: 'font_alpha', event: 'input', handler: (e) => ui_map.font_alpha.set(e.target.value) },
    { id: 'back_color', event: 'input', handler: (e) => ui_map.back_color.set(e.target.value) },
    { id: 'back_alpha', event: 'input', handler: (e) => ui_map.back_alpha.set(e.target.value) },
    { id: 'shadow_chb', event: 'change', handler: (e) => ui_map.shadow_chb.set(e.target.checked) },
    { id: 'shadow_color', event: 'input', handler: (e) => ui_map.shadow_color.set(e.target.value) },
    { id: 'shadow_x', event: 'input', handler: debounce((e) => ui_map.shadow_x.set(e.target.value), 150) },
    { id: 'shadow_y', event: 'input', handler: debounce((e) => ui_map.shadow_y.set(e.target.value), 150) },
    { id: 'glowing_chb', event: 'change', handler: (e) => ui_map.glowing_chb.set(e.target.checked) },
    { id: 'glowing_color', event: 'input', handler: (e) => ui_map.glowing_color.set(e.target.value) },
    { id: 'glowing_dist', event: 'input', handler: debounce((e) => ui_map.glowing_dist.set(e.target.value), 150) },
    { id: 'blurred_chb', event: 'change', handler: (e) => ui_map.blurred_chb.set(e.target.checked) },
    { id: 'blurred_dist', event: 'input', handler: debounce((e) => ui_map.blurred_dist.set(e.target.value), 150) },
    { element: window, event: 'resize', handler: debounce(handle_resize, 100) }
];

/**
 * Initializes application
 */
window.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('graph').getContext('2d')) {
        document.body.innerHTML = '<p>Canvas not supported. Please use a modern browser.</p>';
        return;
    }
    
    update_ui();
    handle_resize();
    
    event_handlers.forEach(({ id, element, event, handler }) => {
        const target = element || document.getElementById(id);
        if (target) target.addEventListener(event, handler);
    });
    
    request_draw();
});