// Constants
const DEFAULTS = {
    WIDTH: 256,
    HEIGHT: 256,
    GRID: false,
    ZOOM: 1,
    FONT_FAMILY: 'monospace, Times, serif',
    FONT_WEIGHT: 'normal',
    FONT_STYLE: 'normal',
    FONT_SIZE: 16,
    CHARS: ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    FILL: 'fill',
    COLOR: '#000000FF',
    BACK_COLOR: '#FFFFFF00',
    SHADOW: false,
    SHADOW_COLOR: '#000000FF',
    SHADOW_X: 0,
    SHADOW_Y: 0,
    GLOW: false,
    GLOW_COLOR: '#FFFFFFFF',
    GLOW_DIST: 0,
    BLUR: false,
    BLUR_DIST: 0,
    MAX_CACHE_SIZE: 100
};

// Data object
const data = {
    width: DEFAULTS.WIDTH,
    height: DEFAULTS.HEIGHT,
    grid: DEFAULTS.GRID,
    zoom: DEFAULTS.ZOOM,
    targetZoom: DEFAULTS.ZOOM,
    fontFamily: DEFAULTS.FONT_FAMILY,
    fontWeight: DEFAULTS.FONT_WEIGHT,
    fontStyle: DEFAULTS.FONT_STYLE,
    fontSize: DEFAULTS.FONT_SIZE,
    chars: DEFAULTS.CHARS,
    fill: DEFAULTS.FILL,
    color: '#000000FF',
    backColor: '#FFFFFF00',
    shadow: DEFAULTS.SHADOW,
    shadowColor: '#000000FF',
    shadowX: 0,
    shadowY: 0,
    glow: DEFAULTS.GLOW,
    glowColor: '#FFFFFFFF',
    glowDist: 0,
    blur: DEFAULTS.BLUR,
    blurDist: 0
};

// Canvas setup
const view = document.getElementById('graph').getContext('2d');
const charCanv = document.getElementById('canv_char').getContext('2d');
const mapCanv = document.getElementById('canv_tex').getContext('2d');
const gridCanv = document.createElement('canvas').getContext('2d');

// State
let isDirty = true;
const fontSizeCache = new Map();

// Helper functions
const setPixelRatio = (canvas, width, height) => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.getContext('2d').scale(dpr, dpr);
};

const inputToColor = (hex, alpha) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return '#000000FF';
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `${hex}${a}`;
};

const colorToInput = hex => {
    if (!hex.startsWith('#')) return '#000000';
    if (hex.length === 9 || hex.length === 8) return `#${hex.slice(1, 7)}`;
    if (hex.length === 7) return hex;
    if (hex.length === 4) return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    return '#000000';
};

const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const sanitizeString = value => {
    return [...value].filter(char => {
        const code = char.codePointAt(0);
        return code >= 32 && !(code >= 0x1F000 && code <= 0x1FAFF) &&
               !(code >= 0x1F300 && code <= 0x1F6FF) &&
               !(code >= 0x2600 && code <= 0x27BF);
    }).join('');
};

const sanitizeFontFamily = value => sanitizeString(value) || DEFAULTS.FONT_FAMILY;

let draw_timer;
const requestDraw = () => { if (!draw_timer) draw_timer = setTimeout(draw, 200); };

// UI update
const uiMap = {
    width_sel: { get: () => data.width, set: v => { data.width = +v; isDirty = true; requestDraw(); } },
    height_sel: { get: () => data.height, set: v => { data.height = +v; isDirty = true; requestDraw(); } },
    font_family: { get: () => data.fontFamily, set: v => { data.fontFamily = sanitizeFontFamily(v); isDirty = true; requestDraw(); } },
    char_list: { get: () => data.chars, set: v => { if (v) { data.chars = sanitizeString(v); isDirty = true; requestDraw(); } else throw new Error('Characters cannot be empty'); } },
    font_weight: { get: () => data.fontWeight, set: v => { data.fontWeight = v; isDirty = true; requestDraw(); } },
    font_style: { get: () => data.fontStyle, set: v => { data.fontStyle = v; isDirty = true; requestDraw(); } },
    fill_style: { get: () => data.fill, set: v => { data.fill = v; isDirty = true; requestDraw(); } },
    font_color: {
        get: () => colorToInput(data.color),
        set: v => {
            const alphaHex = data.color.length === 9 ? data.color.slice(7, 9) : 'FF';
            const alpha = parseInt(alphaHex, 16) / 255;
            data.color = inputToColor(v, alpha);
            isDirty = true;
            requestDraw();
        }
    },
    font_alpha: {
        get: () => parseFloat(data.color.slice(7, 9)) / 255,
        set: v => {
            const currentColor = colorToInput(data.color);
            data.color = inputToColor(currentColor, v);
            isDirty = true;
            requestDraw();
        }
    },
    back_color: {
        get: () => colorToInput(data.backColor),
        set: v => {
            const alphaHex = data.backColor.length === 9 ? data.backColor.slice(7, 9) : '00';
            const alpha = parseInt(alphaHex, 16) / 255;
            data.backColor = inputToColor(v, alpha);
            isDirty = true;
            requestDraw();
        }
    },
    back_alpha: {
        get: () => parseFloat(data.backColor.slice(7, 9)) / 255,
        set: v => {
            const currentColor = colorToInput(data.backColor);
            data.backColor = inputToColor(currentColor, v);
            isDirty = true;
            requestDraw();
        }
    },
    shadow_chb: { get: () => data.shadow, set: v => { data.shadow = v; isDirty = true; requestDraw(); } },
    shadow_color: {
        get: () => colorToInput(data.shadowColor),
        set: v => {
            const alphaHex = data.shadowColor.length === 9 ? data.shadowColor.slice(7, 9) : '00';
            const alpha = parseInt(alphaHex, 16) / 255;
            data.shadowColor = inputToColor(v, alpha);
            isDirty = true;
            requestDraw();
        }
    },
    shadow_x: { get: () => data.shadowX, set: v => { data.shadowX = +v; isDirty = true; requestDraw(); } },
    shadow_y: { get: () => data.shadowY, set: v => { data.shadowY = +v; isDirty = true; requestDraw(); } },
    glowing_chb: { get: () => data.glow, set: v => { data.glow = v; isDirty = true; requestDraw(); } },
    glowing_color: {
        get: () => colorToInput(data.glowColor),
        set: v => {
            const alphaHex = data.glowColor.length === 9 ? data.glowColor.slice(7, 9) : '00';
            const alpha = parseInt(alphaHex, 16) / 255;
            data.glowColor = inputToColor(v, alpha);
            isDirty = true;
            requestDraw();
        }
    },
    glowing_dist: { get: () => data.glowDist, set: v => { data.glowDist = +v; isDirty = true; requestDraw(); } },
    blurred_chb: { get: () => data.blur, set: v => { data.blur = v; isDirty = true; requestDraw(); } },
    blurred_dist: { get: () => data.blurDist, set: v => { data.blurDist = +v; isDirty = true; requestDraw(); } }
};

const updateSize = () => {
    document.getElementById('width_sel').value = uiMap.width_sel.get();
    document.getElementById('height_sel').value = uiMap.height_sel.get();
    document.getElementById('ft_grid_btn').checked = data.grid;
    document.getElementById('ft_zoom_btn').textContent = `${Math.round(data.zoom * 100)}%`;
};

const updateFont = () => {
    document.getElementById('font_family').value = uiMap.font_family.get();
    document.getElementById('char_list').value = uiMap.char_list.get();
    document.getElementById('font_weight').value = uiMap.font_weight.get();
    document.getElementById('font_style').value = uiMap.font_style.get();
    document.getElementById('fill_style').value = uiMap.fill_style.get();
};

const updateEffects = () => {
    document.getElementById('font_color').value = uiMap.font_color.get();
    document.getElementById('font_alpha').value = uiMap.font_alpha.get();
    document.getElementById('back_color').value = uiMap.back_color.get();
    document.getElementById('back_alpha').value = uiMap.back_alpha.get();
    document.getElementById('shadow_chb').checked = uiMap.shadow_chb.get();
    document.getElementById('shadow_color').value = uiMap.shadow_color.get();
    document.getElementById('shadow_x').value = uiMap.shadow_x.get();
    document.getElementById('shadow_y').value = uiMap.shadow_y.get();
    document.getElementById('glowing_chb').checked = uiMap.glowing_chb.get();
    document.getElementById('glowing_color').value = uiMap.glowing_color.get();
    document.getElementById('glowing_dist').value = uiMap.glowing_dist.get();
    document.getElementById('blurred_chb').checked = uiMap.blurred_chb.get();
    document.getElementById('blurred_dist').value = uiMap.blurred_dist.get();
};

const updateUI = () => {
    updateSize();
    updateFont();
    updateEffects();
};

// Options panel
const toggleOptions = () => {
    const panel = document.getElementById('tool_fld');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) document.getElementById('font_family').focus();
};

const closeOptions = () => document.getElementById('tool_fld').classList.add('hidden');

// Export canvas
const exportCanvas = () => {
    document.getElementById('ft_grid_btn').checked = false;
    data.grid = false;
    isDirty = true;
    requestDraw();
    setTimeout(() => {
        let link = null;
        try {
            const canvas = document.getElementById('canv_tex');
            const dataURL = canvas.toDataURL('image/png');
            link = document.createElement('a');
            link.href = dataURL;
            link.download = 'font.png';
            document.body.appendChild(link);
            link.click();
        } catch (e) {
            alert('Export failed. Try reducing canvas size.');
        } finally {
            if (link) {
                document.body.removeChild(link);
                link = null;
            }
        }
    }, 1000);
};

// Calculate grid layout
const calculateGrid = (width, height, sections) => {
    let side = Math.floor(Math.sqrt((width * height) / sections));
    while (true) {
        const cols = Math.floor(width / side);
        const rows = Math.floor(height / side);
        if (cols * rows >= sections) return { side, cols, rows };
        side--;
    }
};

// Calculate font size
const calculateFontSize = (text, width, height) => {
    if (!text || width <= 0 || height <= 0) throw new Error('Invalid input.');
    const key = `${text}-${width}-${height}`;
    if (fontSizeCache.has(key)) return fontSizeCache.get(key);

    const minSize = 1;
    const maxSize = Math.min(width, height);
    const chars = [...new Set(text)];
    const cache = new Map();

    const fits = (char, size) => {
        const key = `${char}-${size}`;
        if (cache.has(key)) return cache.get(key);
        charCanv.font = `${data.fontStyle} ${data.fontWeight} ${size}px ${data.fontFamily}`;
        const metrics = charCanv.measureText(char);
        const h = Math.abs(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) - 2;
        const fits = metrics.width <= width && h <= height;
        cache.set(key, fits);
        return fits;
    };

    let low = minSize, high = maxSize, result = 0;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (chars.every(c => fits(c, mid))) {
            result = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    if (result === 0) throw new Error('Dimensions too small.');

    fontSizeCache.set(key, result);
    if (fontSizeCache.size > DEFAULTS.MAX_CACHE_SIZE) {
        const firstKey = fontSizeCache.keys().next().value;
        fontSizeCache.delete(firstKey);
    }
    return result;
};

// Zoom handling
const setZoom = scale => {
    data.targetZoom = Math.min(Math.max(0.1, scale), 4);
    data.zoom = data.targetZoom; // Update zoom immediately
    document.getElementById('ft_zoom_btn').textContent = `${Math.round(data.zoom * 100)}%`;
    isDirty = true;
    requestDraw();
};

// Grid drawing
const drawGrid = (width, height, cols, rows) => {
    setPixelRatio(gridCanv.canvas, width, height);
    gridCanv.clearRect(0, 0, width, height);
    gridCanv.strokeStyle = '#000';
    gridCanv.beginPath();

    for (let x = 0; x <= cols; x++) {
        const w = Math.round((x * width) / cols);
        gridCanv.moveTo(w, 0);
        gridCanv.lineTo(w, height);
    }
    for (let y = 0; y <= rows; y++) {
        const h = Math.round((y * height) / rows);
        gridCanv.moveTo(0, h);
        gridCanv.lineTo(width, h);
    }
    gridCanv.stroke();
};

// Draw canvas
const draw = () => {
    if (!isDirty) return;

    // Clear canvases
    view.clearRect(0, 0, view.canvas.width, view.canvas.height);
    mapCanv.clearRect(0, 0, mapCanv.canvas.width, mapCanv.canvas.height);

    // Calculate grid
    const { side, cols, rows } = calculateGrid(data.width, data.height, data.chars.length);
    data.fontSize = calculateFontSize(data.chars, side, side);
    setPixelRatio(document.getElementById('canv_char'), side, side);
    setPixelRatio(document.getElementById('canv_tex'), data.width, data.height);

    // Draw background
    mapCanv.fillStyle = data.backColor;
    mapCanv.fillRect(0, 0, data.width, data.height);

    // Apply effects
    const isFill = data.fill === 'fill';
    let filter = [];
    if (data.shadow) {
        const shadowColor = colorToInput(data.shadowColor);
        filter.push(`drop-shadow(${data.shadowX}px ${data.shadowY}px ${shadowColor})`);
    }
    if (data.blur) filter.push(`blur(${data.blurDist}px)`);
    filter = filter.join(' ').trim();

    // Batch canvas state
    charCanv.font = `${data.fontStyle} ${data.fontWeight} ${data.fontSize}px ${data.fontFamily}`;
    charCanv.textAlign = 'center';
    charCanv.textBaseline = 'middle';
    if (filter) charCanv.filter = filter;

    // Draw characters
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const ch = data.chars[y * cols + x];
            if (!ch) break;

            charCanv.clearRect(0, 0, charCanv.canvas.width, charCanv.canvas.height);
            charCanv.fillStyle = data.color;  // Use data.color here
            charCanv.strokeStyle = data.color; // And here
            const tx = side / 2, ty = side / 2;

            if (data.glow) {
                charCanv.save();
                charCanv.shadowBlur = data.glowDist;
                charCanv.shadowColor = data.glowColor;

                // Optional: render glow underneath with lighter blending
                charCanv.globalCompositeOperation = 'lighter';

                if (isFill) {
                    charCanv.fillStyle = data.glowColor;
                    charCanv.fillText(ch, tx, ty);
                } else {
                    charCanv.strokeStyle = data.glowColor;
                    charCanv.strokeText(ch, tx, ty);
                }

                charCanv.restore();

                // Then render the actual text on top if needed
                charCanv.save();
                charCanv.globalCompositeOperation = 'source-over';
                if (isFill) {
                    charCanv.fillStyle = data.glowColor;
                    charCanv.fillText(ch, tx, ty);
                } else {
                    charCanv.strokeStyle = data.glowColor;
                    charCanv.strokeText(ch, tx, ty);
                }
                charCanv.restore();
            }

            if (isFill) charCanv.fillText(ch, tx, ty);
            else charCanv.strokeText(ch, tx, ty);

            const dx = Math.round((x * data.width) / cols);
            const dy = Math.round((y * data.height) / rows); // Fixed: height -> data.height
            mapCanv.drawImage(document.getElementById('canv_char'), dx, dy, side, side);
        }
    }

    // Draw grid
    if (data.grid) {
        drawGrid(data.width, data.height, cols, rows);
        mapCanv.drawImage(gridCanv.canvas, 0, 0);
    }

    // Draw to view canvas
    const vw = view.canvas.width / window.devicePixelRatio;
    const vh = view.canvas.height / window.devicePixelRatio;
    const tw = data.width * data.zoom;
    const th = data.height * data.zoom;
    view.drawImage(document.getElementById('canv_tex'), (vw - tw) / 2, (vh - th) / 2, tw, th);

    isDirty = false;
    draw_timer = undefined;
}

// Window resize
const resize = () => {
    const dpr = window.devicePixelRatio;
    const canvas = document.getElementById('graph');
    const aspect = data.width / data.height;
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight - document.querySelector('.nav_pan').offsetHeight - document.querySelector('.status_bar').offsetHeight;
    const cssWidth = Math.min(maxWidth, maxHeight * aspect);
    const cssHeight = cssWidth / aspect;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    view.scale(dpr, dpr);
    isDirty = true;
    requestDraw();
};

// Event listeners
const events = [
    { id: 'tool_btn', event: 'click', handler: toggleOptions },
    { id: 'tool_close_btn', event: 'click', handler: closeOptions },
    { id: 'export_act', event: 'click', handler: exportCanvas },
    { id: 'width_sel', event: 'change', handler: e => uiMap.width_sel.set(e.target.value) },
    { id: 'height_sel', event: 'change', handler: e => uiMap.height_sel.set(e.target.value) },
    { id: 'ft_grid_btn', event: 'change', handler: e => { data.grid = e.target.checked; isDirty = true; requestDraw(); } },
    { id: 'graph', event: 'wheel', handler: e => {e.preventDefault(); setZoom(data.zoom + (0.1 * Math.sign(-e.deltaY)))} },
    { id: 'font_family', event: 'input', handler: debounce(e => uiMap.font_family.set(e.target.value), 100) },
    {
        id: 'char_list', event: 'input', handler: debounce(e => {
            try {
                uiMap.char_list.set(e.target.value);
            } catch (err) {
                alert(err.message);
                e.target.value = data.chars;
            }
        }, 100)
    },
    { id: 'font_weight', event: 'change', handler: e => uiMap.font_weight.set(e.target.value) },
    { id: 'font_style', event: 'change', handler: e => uiMap.font_style.set(e.target.value) },
    { id: 'fill_style', event: 'change', handler: e => uiMap.fill_style.set(e.target.value) },
    { id: 'font_color', event: 'input', handler: e => uiMap.font_color.set(e.target.value) },
    { id: 'font_alpha', event: 'input', handler: e => uiMap.font_alpha.set(e.target.value) },
    { id: 'back_color', event: 'input', handler: e => uiMap.back_color.set(e.target.value) },
    { id: 'back_alpha', event: 'input', handler: e => uiMap.back_alpha.set(e.target.value) },
    { id: 'shadow_chb', event: 'change', handler: e => uiMap.shadow_chb.set(e.target.checked) },
    { id: 'shadow_color', event: 'input', handler: e => uiMap.shadow_color.set(e.target.value) },
    { id: 'shadow_x', event: 'input', handler: debounce(e => uiMap.shadow_x.set(e.target.value), 100) },
    { id: 'shadow_y', event: 'input', handler: debounce(e => uiMap.shadow_y.set(e.target.value), 100) },
    { id: 'glowing_chb', event: 'change', handler: e => uiMap.glowing_chb.set(e.target.checked) },
    { id: 'glowing_color', event: 'input', handler: e => uiMap.glowing_color.set(e.target.value) },
    { id: 'glowing_dist', event: 'input', handler: debounce(e => uiMap.glowing_dist.set(e.target.value), 100) },
    { id: 'blurred_chb', event: 'change', handler: e => uiMap.blurred_chb.set(e.target.checked) },
    { id: 'blurred_dist', event: 'input', handler: debounce(e => uiMap.blurred_dist.set(e.target.value), 100) },
    { id: '', event: 'resize', handler: resize, element: window }
];

// Initialize
window.addEventListener('DOMContentLoaded', () => {

    if (!document.getElementById('graph').getContext('2d')) {
        document.body.innerHTML = '<p>Canvas not supported. Please use a modern browser.</p>';
        return;
    }

    updateUI();
    resize();
    events.forEach(({ id, event, handler, element }) => (element || document.getElementById(id)).addEventListener(event, handler));
    requestDraw();
});
