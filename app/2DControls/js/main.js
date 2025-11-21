let elems;
const styles = {
    background_color: '#3498dbff',

    background_top_gradiant: false,
    background_top_color: '#5dade2ff',

    background_bottom_gradiant: false,
    background_bottom_color: '#2980b9ff',

    gloss: true,
    gloss_opacity: 0.4,

    corner_radius: 1,

    shadow: true,
    shadow_blur: 0,
    shadow_color: "#000000",
    shadow_offset: 1,

    border: true,
    border_size: 2,
    border_color: '#1b4f72',

    text: "Text",

    font: "Arial, sans-serif",
    font_size: 16,
    font_color: '#000000ff',

    text_shadow: true,
    text_shadow_blur: 2,
    text_shadow_color: "#5b5b5bff",
    text_shadow_offset: 1,

    padding_vertical: 5,
    padding_horizontal: 5,

    margin_vertical: 5,
    margin_horizontal: 5,

    // New properties for checkbox, switch and slider
    control_size: 20, // Base size for checkbox and switch
    slider_track_height: 8,
    slider_thumb_width: 25,
    slider_value: 50, // Always 50% for center position
};

/**
 * Convert red, green, and blue values to hue, saturation, and lightness.
 *
 * @param {number} red_value - A number between 0 and 1 representing red.
 * @param {number} green_value - A number between 0 and 1 representing green.
 * @param {number} blue_value - A number between 0 and 1 representing blue.
 * @returns {number[]} An array containing hue, saturation, and lightness.
 * @throws {Error} When input values are not valid numeric ranges.
 */
const rgb_to_hsl = (red_value, green_value, blue_value) => {
    if (
        typeof red_value !== 'number' || red_value < 0 || red_value > 1 ||
        typeof green_value !== 'number' || green_value < 0 || green_value > 1 ||
        typeof blue_value !== 'number' || blue_value < 0 || blue_value > 1
    ) {
        throw new Error('invalid_rgb_values');
    }

    const max_value = red_value > green_value
        ? (red_value > blue_value ? red_value : blue_value)
        : (green_value > blue_value ? green_value : blue_value);

    const min_value = red_value < green_value
        ? (red_value < blue_value ? red_value : blue_value)
        : (green_value < blue_value ? green_value : blue_value);

    const delta_value = max_value - min_value;
    const lightness_value = (max_value + min_value) * 0.5;

    if (delta_value === 0) {
        return [0, 0, lightness_value];
    }

    const saturation_value =
        lightness_value > 0.5
            ? delta_value / (2 - max_value - min_value)
            : delta_value / (max_value + min_value);

    let hue_value;

    if (max_value === red_value) {
        hue_value = (green_value - blue_value) / delta_value + (green_value < blue_value ? 6 : 0);
    } else if (max_value === green_value) {
        hue_value = (blue_value - red_value) / delta_value + 2;
    } else {
        hue_value = (red_value - green_value) / delta_value + 4;
    }

    hue_value *= 1 / 6;

    return [hue_value, saturation_value, lightness_value];
};

/**
 * Convert hue, saturation, and lightness values to red, green, and blue.
 *
 * @param {number} hue_value - A number between 0 and 1 representing hue.
 * @param {number} saturation_value - A number between 0 and 1 representing saturation.
 * @param {number} lightness_value - A number between 0 and 1 representing lightness.
 * @returns {number[]} An array containing red, green, and blue values.
 * @throws {Error} When values fall outside the accepted numeric range.
 */
const hsl_to_rgb = (hue_value, saturation_value, lightness_value) => {
    if (
        typeof hue_value !== 'number' || hue_value < 0 || hue_value > 1 ||
        typeof saturation_value !== 'number' || saturation_value < 0 || saturation_value > 1 ||
        typeof lightness_value !== 'number' || lightness_value < 0 || lightness_value > 1
    ) {
        throw new Error('invalid_hsl_values');
    }

    if (saturation_value === 0) {
        return [lightness_value, lightness_value, lightness_value];
    }

    const hue_to_rgb = (primary_value, secondary_value, temp_value) => {
        if (temp_value < 0) temp_value += 1;
        else if (temp_value > 1) temp_value -= 1;

        if (temp_value < 0.16666666666666666) {
            return primary_value + (secondary_value - primary_value) * 6 * temp_value;
        }

        if (temp_value < 0.5) {
            return secondary_value;
        }

        if (temp_value < 0.6666666666666666) {
            return primary_value + (secondary_value - primary_value) * (0.6666666666666666 - temp_value) * 6;
        }

        return primary_value;
    };

    const secondary_value =
        lightness_value < 0.5
            ? lightness_value * (1 + saturation_value)
            : lightness_value + saturation_value - lightness_value * saturation_value;

    const primary_value = 2 * lightness_value - secondary_value;

    return [
        hue_to_rgb(primary_value, secondary_value, hue_value + 0.3333333333333333),
        hue_to_rgb(primary_value, secondary_value, hue_value),
        hue_to_rgb(primary_value, secondary_value, hue_value - 0.3333333333333333)
    ];
};

/**
 * Convert a hexadecimal color string into red, green, and blue values.
 *
 * @param {string} hex_value - A six-character hexadecimal color string.
 * @returns {number[]|null} An array containing red, green, and blue values, or null for invalid input.
 * @throws {Error} When the provided string does not follow the expected format.
 */
const hex_to_rgb = (hex_value) => {
    // Remove # prefix if present
    let hex = hex_value.startsWith('#') ? hex_value.slice(1) : hex_value;

    // Validate hex string format and length
    if (
        typeof hex_value !== 'string' ||
        !/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)
    ) {
        throw new Error(`invalid_hex_values ${hex_value}`);
    }

    const hex_number = parseInt(hex, 16);
    if (isNaN(hex_number)) {
        return null;
    }

    const conversion_factor = 0.00392156862745098; // 1/255

    // Handle RGBA (8-digit hex)
    if (hex.length === 8) {
        return [
            ((hex_number >> 24) & 255) * conversion_factor,
            ((hex_number >> 16) & 255) * conversion_factor,
            ((hex_number >> 8) & 255) * conversion_factor,
            (hex_number & 255) * conversion_factor
        ];
    }

    // Handle RGB (6-digit hex)
    return [
        ((hex_number >> 16) & 255) * conversion_factor,
        ((hex_number >> 8) & 255) * conversion_factor,
        (hex_number & 255) * conversion_factor
    ];
};

/**
 * Convert red, green, and blue values into a hexadecimal color string.
 *
 * @param {number} red_value - A number between 0 and 1 representing red.
 * @param {number} green_value - A number between 0 and 1 representing green.
 * @param {number} blue_value - A number between 0 and 1 representing blue.
 * @returns {string} A six-character hexadecimal color string.
 * @throws {Error} When one or more values fall outside the accepted range.
 */
const rgb_to_hex = (red_value, green_value, blue_value) => {
    if (
        typeof red_value !== 'number' || red_value < 0 || red_value > 1 ||
        typeof green_value !== 'number' || green_value < 0 || green_value > 1 ||
        typeof blue_value !== 'number' || blue_value < 0 || blue_value > 1
    ) {
        throw new Error('invalid_rgb_values');
    }

    const red_int = (red_value * 255 + 0.5) << 0;
    const green_int = (green_value * 255 + 0.5) << 0;
    const blue_int = (blue_value * 255 + 0.5) << 0;

    const combined_value =
        (red_int << 16) |
        (green_int << 8) |
        blue_int;

    return combined_value
        .toString(16)
        .padStart(6, '0')
        .toUpperCase();
};

const hex_to_rgba = (hex_value) => {
    const rgb_values = hex_to_rgb(hex_value);
    if (rgb_values === null) {
        return null;
    }
    if (rgb_values.length === 4) {
        return `rgba(${rgb_values[0]}, ${rgb_values[1]}, ${rgb_values[2]}, ${rgb_values[3]})`;
    }
    return `rgba(${rgb_values[0]}, ${rgb_values[1]}, ${rgb_values[2]}, 1)`;
};

/**
 * Create two color values representing darker and lighter variations
 * of a provided hexadecimal color string.
 *
 * @param {string} hex_color_value - A six-character hexadecimal color string.
 * @returns {string[]|null} An array containing darker and lighter color strings, or null for invalid input.
 */
const extrapolate_gradient = (hex_color_value) => {
    if (typeof hex_color_value !== 'string' || hex_color_value.length !== 6) {
        return null;
    }

    const factor = 0.15;
    const rgb_values = hex_to_rgb(hex_color_value);
    if (rgb_values === null) {
        return null;
    }

    const hsl_values = rgb_to_hsl(
        rgb_values[0],
        rgb_values[1],
        rgb_values[2]
    );

    const hue_value = hsl_values[0];
    const saturation_value = hsl_values[1];
    const lightness_value = hsl_values[2];

    const dark_lightness_value = lightness_value - factor < 0
        ? 0
        : lightness_value - factor;

    const light_lightness_value = lightness_value + 0.15 > 1
        ? 1
        : lightness_value + 0.15;

    const dark_rgb_values = hsl_to_rgb(
        hue_value,
        saturation_value,
        dark_lightness_value
    );

    const light_rgb_values = hsl_to_rgb(
        hue_value,
        saturation_value,
        light_lightness_value
    );

    return [
        rgb_to_hex(
            dark_rgb_values[0],
            dark_rgb_values[1],
            dark_rgb_values[2]
        ),
        rgb_to_hex(
            light_rgb_values[0],
            light_rgb_values[1],
            light_rgb_values[2]
        )
    ];
};

/**
 * Convert rgb values to grayscale using the luminosity approach.
 * @param {number} red_value - Red component in the range 0–1
 * @param {number} green_value - Green component in the range 0–1
 * @param {number} blue_value - Blue component in the range 0–1
 * @returns {number[]} Array containing grayscale rgb values [gray, gray, gray]
 */
const rgb_to_grayscale = (red_value, green_value, blue_value) => {
    const gray_value = (0.299 * red_value) + (0.587 * green_value) + (0.114 * blue_value);
    return [gray_value, gray_value, gray_value];
};

/**
 * Darkens a hex color by reducing its lightness value.
 *
 * @param {string} hex_color_value - The hex color value to darken
 * @returns {string|null} The darkened hex color value, or null if input is invalid
 */
const darken_hex_color = (hex_color_value) => {
    if (hex_color_value.startsWith('#')) {
        hex_color_value = hex_color_value.substr(1);
    }
    const rgb_values = hex_to_rgb(hex_color_value);
    if (rgb_values === null) {
        return null;
    }

    const [hue_value, saturation_value, lightness_value] = rgb_to_hsl(
        rgb_values[0],
        rgb_values[1],
        rgb_values[2]
    );

    const dark_lightness_value = Math.max(0, lightness_value - 0.15);
    const dark_rgb = hsl_to_rgb(hue_value, saturation_value, dark_lightness_value);

    return rgb_to_hex(dark_rgb[0], dark_rgb[1], dark_rgb[2]);
};

/**
 * Calculate control dimensions based on control type and styling
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {Object} style - The control style configuration
 * @param {string} type - The control type ('button', 'checkbox', 'switch', 'slider')
 * @returns {Object} Calculated dimensions object
 */
const calculate_control_dimensions = (ctx, style, type = 'button') => {
    let content_width = 0;
    let content_height = 0;

    switch (type) {
        case 'button': case 'spinbox':
            let text_width = 0;
            let text_height = 0;

            const text = style.text;
            if (text && text.length !== 0) {
                ctx.font = style.font_style || `${style.font_size}px ${style.font}`;
                const text_metrics = ctx.measureText(text);

                const shadow_offset = style.text_shadow ? style.text_shadow_offset : 0;
                text_width = Math.ceil(text_metrics.width + shadow_offset * 2);
                text_height = Math.ceil(style.font_size * 1.2 + shadow_offset * 2);
            }

            // Spinbox needs extra width for buttons
            const button_area_width = type === 'spinbox' ? 40 : 0;
            content_width = text_width + (style.padding_horizontal * 2) + button_area_width;
            content_height = text_height + (style.padding_vertical * 2);
            break;

        case 'checkbox':
            content_width = style.padding_horizontal * 2;
            content_height = style.padding_vertical * 2;
            break;

        case 'switch':
            content_width = style.padding_horizontal * 4;
            content_height = style.padding_vertical * 2;
            break;

        case 'slider':
            content_width = style.padding_horizontal * 8;
            content_height = style.padding_vertical * 2;
    }

    const border_size = style.border ? style.border_size : 0;
    const outer_width = content_width + (border_size * 2);
    const outer_height = content_height + (border_size * 2);

    const total_width = outer_width + (style.margin_horizontal * 2);
    const total_height = outer_height + (style.margin_vertical * 2);

    return {
        content_width, content_height,
        outer_width, outer_height,
        total_width, total_height,
    };
};

/**
 * Deep merge two objects
 * @param {Object} target - The target object
 * @param {Object} source - The source object
 * @returns {Object} Merged object
 */
const deep_merge = (target, source) => {
    const result = { ...target };

    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deep_merge(result[key] || {}, source[key]);
        }
        else {
            result[key] = source[key];
        }
    }

    return result;
};

/**
 * Draws a rounded rectangle on a canvas context.
 * 
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {number} x - The x-coordinate of the rectangle's top-left corner.
 * @param {number} y - The y-coordinate of the rectangle's top-left corner.
 * @param {number} width - The width of the rectangle.
 * @param {number} height - The height of the rectangle.
 * @param {number|Array} radius - Corner radius as number or array of individual corner radii.
 * @param {boolean} fill - Whether to fill the rectangle (true) or stroke it (false).
 */
const draw_rounded_rect = (ctx, x, y, width, height, radius, fill = true) => {
    let top_left;
    let top_right;
    let bottom_right;
    let bottom_left;

    if (typeof radius === 'number') {
        const max_radius = Math.min(radius, width * 0.5, height * 0.5);
        top_left = top_right = bottom_right = bottom_left = max_radius;
    } else if (Array.isArray(radius)) {
        [
            top_left = 0,
            top_right = 0,
            bottom_right = 0,
            bottom_left = 0
        ] = radius;

        // Constrain radii to maximum possible values
        const max_horizontal = width * 0.5;
        const max_vertical = height * 0.5;

        top_left = Math.min(top_left, max_horizontal, max_vertical);
        top_right = Math.min(top_right, max_horizontal, max_vertical);
        bottom_right = Math.min(bottom_right, max_horizontal, max_vertical);
        bottom_left = Math.min(bottom_left, max_horizontal, max_vertical);
    } else {
        top_left = top_right = bottom_right = bottom_left = 0;
    }

    ctx.beginPath();

    // Start from top-left corner (moving clockwise)
    ctx.moveTo(x + top_left, y);

    // Top edge and top-right corner
    ctx.lineTo(x + width - top_right, y);
    if (top_right > 0) {
        ctx.arcTo(x + width, y, x + width, y + top_right, top_right);
    }

    // Right edge and bottom-right corner
    ctx.lineTo(x + width, y + height - bottom_right);
    if (bottom_right > 0) {
        ctx.arcTo(x + width, y + height, x + width - bottom_right, y + height, bottom_right);
    }

    // Bottom edge and bottom-left corner
    ctx.lineTo(x + bottom_left, y + height);
    if (bottom_left > 0) {
        ctx.arcTo(x, y + height, x, y + height - bottom_left, bottom_left);
    }

    // Left edge and top-left corner
    ctx.lineTo(x, y + top_left);
    if (top_left > 0) {
        ctx.arcTo(x, y, x + top_left, y, top_left);
    }

    ctx.closePath();

    if (fill) {
        ctx.fill();
    } else {
        ctx.stroke();
    }
};

/**
 * Draws a button with specified style and state
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {Object} style - The button style properties
 * @param {string} state - The button state ('normal', 'pressed', or 'disabled')
 * @returns {Object} The calculated button dimensions
 */
const draw_button = (ctx, style, state = 'normal') => {
    const loc_style = { ...style };

    if (state === 'pressed') {
        const darken_color = (color) => `#${darken_hex_color(color)}`;

        loc_style.background_color = darken_color(loc_style.background_color);
        loc_style.background_top_color = darken_color(loc_style.background_top_color);
        loc_style.background_bottom_color = darken_color(loc_style.background_bottom_color);
        loc_style.shadow_color = darken_color(loc_style.shadow_color);
        loc_style.border_color = darken_color(loc_style.border_color);
        loc_style.font_color = darken_color(loc_style.font_color);
        loc_style.text_shadow_color = darken_color(loc_style.text_shadow_color);
    }
    else if (state === 'disabled') {
        const to_gray_shade = (color) => {
            const clean_color = color.startsWith('#') ? color.slice(1) : color;
            const rgb_values = hex_to_rgb(clean_color);
            const gray_value = rgb_to_grayscale(...rgb_values);
            return `#${rgb_to_hex(...gray_value)}`;
        };

        loc_style.background_color = to_gray_shade(loc_style.background_color);
        loc_style.background_top_color = to_gray_shade(loc_style.background_top_color);
        loc_style.background_bottom_color = to_gray_shade(loc_style.background_bottom_color);
        loc_style.shadow_color = to_gray_shade(loc_style.shadow_color);
        loc_style.border_color = to_gray_shade(loc_style.border_color);
        loc_style.font_color = to_gray_shade(loc_style.font_color);
        loc_style.text_shadow_color = to_gray_shade(loc_style.text_shadow_color);
    }

    const dim = calculate_control_dimensions(ctx, style, `button`);
    const margin_h = style.margin_horizontal;
    const margin_v = style.margin_vertical;

    const border_size = style.border ? style.border_size : 0;
    const content_x = margin_h + border_size;
    const content_y = margin_v + border_size;
    const half_content_height = dim.content_height / 2;
    const center_x = content_x + (dim.content_width / 2);
    const center_y = content_y + half_content_height;

    /**
     * Draws button shadow effect
     */
    const draw_button_shadow = () => {
        //console.log(`draw shadow`, loc_style.shadow_color);
        ctx.save();
        ctx.shadowBlur = style.shadow_blur || 4;


        const shadow_color = hex_to_rgba(loc_style.shadow_color) || 'rgba(0,0,0,0.5)';

        ctx.shadowColor = shadow_color;
        const shadow_offset = style.shadow_offset || 2;
        ctx.shadowOffsetX = shadow_offset;
        ctx.shadowOffsetY = shadow_offset;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';

        const border_radius = style.corner_radius + border_size;
        draw_rounded_rect(ctx, margin_h, margin_v, dim.outer_width, dim.outer_height, border_radius);
        ctx.restore();
    };

    /**
     * Draws button border
     */
    const draw_button_border = () => {
        ctx.fillStyle = loc_style.border_color;
        const border_radius = style.corner_radius + border_size;
        draw_rounded_rect(ctx, margin_h, margin_v, dim.outer_width, dim.outer_height, border_radius);
    };

    /**
     * Draws button background
     */
    const draw_button_back = () => {
        ctx.fillStyle = loc_style.background_color;
        draw_rounded_rect(ctx, content_x, content_y, dim.content_width, dim.content_height, style.corner_radius);
    };

    /**
     * Draws top gradient effect
     */
    const draw_button_top_gradient = () => {
        const gradient = ctx.createLinearGradient(0, content_y, 0, content_y + half_content_height);
        gradient.addColorStop(0, loc_style.background_top_color);
        gradient.addColorStop(1, loc_style.background_color);
        ctx.fillStyle = gradient;
        draw_rounded_rect(ctx, content_x, content_y, dim.content_width, half_content_height, style.corner_radius);
    };

    /**
     * Draws bottom gradient effect
     */
    const draw_button_bottom_gradient = () => {
        const bottom_y = content_y + half_content_height;
        const gradient = ctx.createLinearGradient(0, bottom_y, 0, bottom_y + half_content_height);
        gradient.addColorStop(0, loc_style.background_color);
        gradient.addColorStop(1, loc_style.background_bottom_color);
        ctx.fillStyle = gradient;
        draw_rounded_rect(ctx, content_x, bottom_y, dim.content_width, half_content_height, style.corner_radius);
    };

    /**
     * Draws text shadow effect
     */
    const draw_button_text_shadow = () => {
        ctx.save();
        ctx.font = style.font_style || `${style.font_size}px ${style.font}`;
        ctx.fillStyle = loc_style.font_color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = style.text_shadow_blur || 2;
        ctx.shadowColor = loc_style.text_shadow_color || 'rgba(0,0,0,0.5)';
        const text_shadow_offset = style.text_shadow_offset || 1;
        ctx.shadowOffsetX = text_shadow_offset;
        ctx.shadowOffsetY = text_shadow_offset;
        ctx.fillText(style.text, center_x, center_y);
        ctx.restore();
    };

    /**
     * Draws button text
     */
    const draw_button_text = () => {
        ctx.font = style.font_style || `${style.font_size}px ${style.font}`;
        ctx.fillStyle = loc_style.font_color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(style.text, center_x, center_y);
    };

    /**
     * Draws gloss overlay effect
     */
    const draw_button_gloss_effect = () => {
        const gloss_inset = Math.max(1, dim.content_width * 0.01);
        const gloss_height = dim.content_height * 0.4;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(content_x + gloss_inset, content_y + style.corner_radius + gloss_inset);
        ctx.arcTo(content_x + gloss_inset, content_y + gloss_inset, content_x + style.corner_radius + gloss_inset, content_y + gloss_inset, style.corner_radius);
        ctx.arcTo(content_x + dim.content_width - gloss_inset, content_y + gloss_inset, content_x + dim.content_width - gloss_inset, content_y + style.corner_radius + gloss_inset, style.corner_radius);
        ctx.lineTo(content_x + dim.content_width - gloss_inset, content_y + gloss_height);
        ctx.lineTo(content_x + gloss_inset, content_y + gloss_height);
        ctx.closePath();
        const gloss_gradient = ctx.createLinearGradient(content_x, content_y + gloss_inset, content_x, content_y + gloss_height);
        gloss_gradient.addColorStop(0, `rgba(255,255,255,${style.gloss_opacity})`);
        gloss_gradient.addColorStop(1, `rgba(255,255,255,${style.gloss_opacity * 0.1})`);
        ctx.fillStyle = gloss_gradient;
        ctx.fill();
        ctx.restore();
    };

    if (style.shadow && state !== 'pressed') {
        draw_button_shadow();
    }

    if (style.border) {
        draw_button_border();
    }

    draw_button_back();

    if (style.background_top_gradiant) {
        draw_button_top_gradient();
    }

    if (style.background_bottom_gradiant) {
        draw_button_bottom_gradient();
    }

    if (style.text.length > 0) {
        draw_button_text();
        if (style.text_shadow && state !== 'pressed') {
            draw_button_text_shadow();
        }
    }

    if (style.gloss && state === 'normal') {
        draw_button_gloss_effect();
    }

    return dim;
};

/**
 * Draws a checkbox with specified style and state
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {Object} style - The checkbox style properties
 * @param {string} state - The checkbox state ('unchecked', 'checked', or 'disabled')
 * @returns {Object} The calculated checkbox dimensions
 */
const draw_checkbox = (ctx, style, state = 'unchecked') => {
    const loc_style = { ...style };

    if (state === 'disabled') {
        const to_gray_shade = (color) => {
            const clean_color = color.startsWith('#') ? color.slice(1) : color;
            const rgb_values = hex_to_rgb(clean_color);
            const gray_value = rgb_to_grayscale(...rgb_values);
            return `#${rgb_to_hex(...gray_value)}`;
        };

        loc_style.background_color = to_gray_shade(loc_style.background_color);
        loc_style.background_top_color = to_gray_shade(loc_style.background_top_color);
        loc_style.background_bottom_color = to_gray_shade(loc_style.background_bottom_color);
        loc_style.shadow_color = to_gray_shade(loc_style.shadow_color);
        loc_style.border_color = to_gray_shade(loc_style.border_color);
        loc_style.font_color = to_gray_shade(loc_style.font_color);
        loc_style.text_shadow_color = to_gray_shade(loc_style.text_shadow_color);
    }

    const dim = calculate_control_dimensions(ctx, style, 'checkbox');
    const margin_h = style.margin_horizontal;
    const margin_v = style.margin_vertical;

    const border_size = style.border ? style.border_size : 0;
    const content_x = margin_h + border_size;
    const content_y = margin_v + border_size;

    const center_x = content_x + (dim.content_width / 2);
    const center_y = content_y + (dim.content_height / 2);

    const half_content_height = dim.content_height / 2;

    const draw_checkbox_shadow = () => {
        if (style.shadow) {
            ctx.save();
            ctx.shadowBlur = style.shadow_blur || 4;
            const shadow_color = hex_to_rgba(loc_style.shadow_color + "88") || 'rgba(0,0,0,0.5)';
            ctx.shadowColor = shadow_color;
            const shadow_offset = style.shadow_offset || 2;
            ctx.shadowOffsetX = shadow_offset;
            ctx.shadowOffsetY = shadow_offset;
            ctx.fillStyle = hex_to_rgba(loc_style.shadow_color + "88") || 'rgba(0,0,0,0.5)';


            const border_radius = style.corner_radius + border_size;
            draw_rounded_rect(ctx, margin_h, margin_v, dim.outer_width, dim.outer_height, border_radius);
            ctx.restore();
        }
    };

    const draw_checkbox_border = () => {
        ctx.fillStyle = loc_style.border_color;
        const border_radius = style.corner_radius + border_size;
        draw_rounded_rect(ctx, margin_h, margin_v, dim.outer_width, dim.outer_height, border_radius);
    };

    const draw_checkbox_background = () => {

        const top_color = style.background_top_gradiant
            ? loc_style.background_top_color
            : loc_style.background_color;

        const bottom_color = style.background_bottom_gradiant
            ? loc_style.background_bottom_color
            : loc_style.background_color;


        const gradient = ctx.createLinearGradient(0, content_y, 0, content_y + dim.content_height);
        gradient.addColorStop(0, top_color);
        gradient.addColorStop(0.5, loc_style.background_color);
        gradient.addColorStop(1, bottom_color);
        ctx.fillStyle = gradient;

        draw_rounded_rect(ctx, content_x, content_y, dim.content_width, dim.content_height, style.corner_radius);

        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        draw_rounded_rect(ctx, content_x, content_y, dim.content_width, dim.content_height, style.corner_radius, false);
    };

    const draw_checkbox_check = () => {
        const mark_width = dim.content_width * 0.7;
        const mark_height = dim.content_height * 0.7;
        const mark_x = center_x - (mark_width / 2);
        const mark_y = center_y - (mark_height / 2);
        ctx.fillStyle = loc_style.font_color;
        draw_rounded_rect(ctx, mark_x, mark_y, mark_width, mark_height, style.corner_radius * 0.7);
    };

    if (style.shadow && state !== 'disabled') {
        draw_checkbox_shadow();
    }

    if (style.border) {
        draw_checkbox_border();
    }

    draw_checkbox_background();

    if (state === 'checked') {
        draw_checkbox_check();
    }

    return dim;
};

/**
 * Draws a switch with specified style and state
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {Object} style - The switch style properties
 * @param {string} state - The switch state ('on', 'off', or 'disabled')
 * @returns {Object} The calculated switch dimensions
 */
const draw_switch = (ctx, style, state = 'off') => {
    const loc_style = { ...style };

    if (state === 'disabled') {
        const to_gray_shade = (color) => {
            const clean_color = color.startsWith('#') ? color.slice(1) : color;
            const rgb_values = hex_to_rgb(clean_color);
            const gray_value = rgb_to_grayscale(...rgb_values);
            return `#${rgb_to_hex(...gray_value)}`;
        };

        loc_style.background_color = to_gray_shade(loc_style.background_color);
        loc_style.background_top_color = to_gray_shade(loc_style.background_top_color);
        loc_style.background_bottom_color = to_gray_shade(loc_style.background_bottom_color);
        loc_style.shadow_color = to_gray_shade(loc_style.shadow_color);
        loc_style.border_color = to_gray_shade(loc_style.border_color);
        loc_style.font_color = to_gray_shade(loc_style.font_color);
        loc_style.text_shadow_color = to_gray_shade(loc_style.text_shadow_color);
    }

    const dim = calculate_control_dimensions(ctx, style, 'switch');
    const margin_h = style.margin_horizontal;
    const margin_v = style.margin_vertical;

    const border_size = style.border ? style.border_size : 0;
    const content_x = margin_h + border_size;
    const content_y = margin_v + border_size;

    const radius = dim.content_height / 2;

    const draw_switch_shadow = () => {
        if (style.shadow) {
            ctx.save();
            ctx.shadowBlur = style.shadow_blur || 4;
            const shadow_color = hex_to_rgba(loc_style.shadow_color + "88") || 'rgba(0,0,0,0.5)';
            ctx.shadowColor = shadow_color;
            const shadow_offset = style.shadow_offset || 2;
            ctx.shadowOffsetX = shadow_offset;
            ctx.shadowOffsetY = shadow_offset;
            ctx.fillStyle = hex_to_rgba(loc_style.shadow_color + "88") || 'rgba(0,0,0,0.5)';
            const border_radius = radius + border_size;
            draw_rounded_rect(ctx, margin_h, margin_v, dim.outer_width, dim.outer_height, border_radius);
            ctx.restore();
        }
    };

    const draw_switch_border = () => {
        ctx.fillStyle = loc_style.border_color;
        const border_radius = radius + border_size;
        draw_rounded_rect(ctx, margin_h, margin_v, dim.outer_width, dim.outer_height, border_radius);
    };

    const draw_switch_background = () => {
        ctx.fillStyle = "#00ff1e";
        const color_on = state === 'on' ? loc_style.background_top_color : loc_style.background_color;
        const color_off = state === 'off' ? loc_style.background_bottom_color : loc_style.background_color;
        if (state === 'on') ctx.fillStyle = color_on;
        else if (state === 'off') ctx.fillStyle = color_off;
        else ctx.fillStyle = color_off;

        draw_rounded_rect(ctx, content_x, content_y, dim.content_width, dim.content_height, radius);
    };

    const draw_switch_thumb = () => {
        const thumb_radius = radius - 2;
        const thumb_x = state === 'on'
            ? content_x + dim.content_width - radius - 1
            : content_x + radius + 1;
        // Draw thumb
        ctx.fillStyle = loc_style.background_color;
        ctx.beginPath();
        ctx.arc(thumb_x, content_y + radius, thumb_radius, 0, Math.PI * 2);
        ctx.fill();
        if (style.border) {
            ctx.strokeStyle = loc_style.border_color;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    };

    if (style.shadow && state !== 'disabled') {
        draw_switch_shadow();
    }

    if (style.border) {
        draw_switch_border();
    }

    draw_switch_background();

    draw_switch_thumb();

    return dim;
};

/**
 * Draws a slider with specified style and state
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
 * @param {Object} style - The slider style properties
 * @param {string} state - The slider state ('active' or 'disabled')
 * @returns {Object} The calculated slider dimensions
 */
const draw_slider = (ctx, style, state = 'active', comp = 3) => {
    const loc_style = { ...style };

    if (state === 'disabled') {
        const to_gray_shade = (color) => {
            const clean_color = color.startsWith('#') ? color.slice(1) : color;
            const rgb_values = hex_to_rgb(clean_color);
            const gray_value = rgb_to_grayscale(...rgb_values);
            return `#${rgb_to_hex(...gray_value)}`;
        };

        loc_style.background_color = to_gray_shade(loc_style.background_color);
        loc_style.background_top_color = to_gray_shade(loc_style.background_top_color);
        loc_style.background_bottom_color = to_gray_shade(loc_style.background_bottom_color);
        loc_style.shadow_color = to_gray_shade(loc_style.shadow_color);
        loc_style.border_color = to_gray_shade(loc_style.border_color);
        loc_style.font_color = to_gray_shade(loc_style.font_color);
        loc_style.text_shadow_color = to_gray_shade(loc_style.text_shadow_color);
    }

    const dim = calculate_control_dimensions(ctx, style, 'slider');

    if (comp === 2) {
        dim.content_width *= 2;
    }

    const margin_h = style.margin_horizontal;
    const margin_v = style.margin_vertical;

    const border_size = style.border ? style.border_size : 0;
    const content_x = margin_h + border_size;
    const content_y = margin_v + border_size;

    const track_height = style.slider_track_height;
    const track_y = content_y + (dim.content_height - track_height) / 2;

    const draw_slider_shadow = () => {
        if (style.shadow) {
            ctx.save();
            ctx.shadowBlur = style.shadow_blur || 4;
            const shadow_color = hex_to_rgba(loc_style.shadow_color + "88") || 'rgba(0,0,0,0.5)';
            ctx.shadowColor = shadow_color;
            const shadow_offset = style.shadow_offset || 2;
            ctx.shadowOffsetX = shadow_offset;
            ctx.shadowOffsetY = shadow_offset;
            ctx.fillStyle = hex_to_rgba(loc_style.shadow_color + "88") || 'rgba(0,0,0,0.5)';
            const border_radius = style.corner_radius + border_size;
            draw_rounded_rect(ctx, margin_h, margin_v, dim.outer_width, dim.outer_height, border_radius);
            ctx.restore();
        }
    };

    const draw_slider_border = () => {
        ctx.fillStyle = loc_style.border_color;
        const border_radius = style.corner_radius + border_size;
        draw_rounded_rect(ctx, margin_h, margin_v, dim.outer_width, dim.outer_height, border_radius);
    };

    const draw_slider_background = () => {

        const left_color = style.background_top_gradiant
            ? loc_style.background_top_color
            : loc_style.background_color;

        const right_color = style.background_bottom_gradiant
            ? loc_style.background_bottom_color
            : loc_style.background_color;

        // make a gradient for the background, left to right
        const gradient = ctx.createLinearGradient(content_x, 0, content_x + dim.content_width, 0);
        gradient.addColorStop(0, left_color);
        gradient.addColorStop(0.499, left_color);
        gradient.addColorStop(0.501, right_color);
        gradient.addColorStop(1, right_color);
        ctx.fillStyle = gradient;

        const border_radius = style.corner_radius;
        draw_rounded_rect(ctx, content_x, content_y, dim.content_width, dim.content_height, border_radius);
    };

    const draw_slider_thumb = () => {
        const thumb_width = style.slider_thumb_width;
        const thumb_height = dim.content_height;
        const thumb_x = content_x + (dim.content_width - thumb_width) / 2;
        const thumb_y = content_y;

        // Thumb background
        ctx.fillStyle = loc_style.font_color;
        draw_rounded_rect(ctx, thumb_x, thumb_y, thumb_width, thumb_height, style.corner_radius);

        if (style.border) {
            ctx.strokeStyle = loc_style.border_color;
            ctx.lineWidth = border_size;
            draw_rounded_rect(ctx, thumb_x, thumb_y, thumb_width, thumb_height, style.corner_radius, false);
        }

        // Horizontal grip lines
        const grip_thickness = 2;
        const grip_spacing = 4;
        const top_bottom_padding = 6;
        const available = thumb_height - 2 * top_bottom_padding;

        let max_grips = Math.max(1, Math.floor((available + grip_spacing) / (grip_thickness + grip_spacing)));
        max_grips = Math.min(3, max_grips);

        const total_height = max_grips * grip_thickness + (max_grips - 1) * grip_spacing;
        const start_y = thumb_y + (thumb_height - total_height) / 2;

        ctx.strokeStyle = loc_style.background_bottom_color || '#00000088';
        ctx.lineWidth = grip_thickness;
        ctx.lineCap = 'round';

        for (let i = 0; i < max_grips; i++) {
            const y = start_y + i * (grip_thickness + grip_spacing);
            ctx.beginPath();
            ctx.moveTo(thumb_x + top_bottom_padding, y);
            ctx.lineTo(thumb_x + thumb_width - top_bottom_padding, y);
            ctx.stroke();
        }
    };


    if (comp === 1 || comp === 3) {
        if (style.shadow && state !== 'disabled') {
            draw_slider_shadow();
        }

        if (style.border) {
            draw_slider_border();
        }
    }

    if (comp === 2 || comp === 3) {
        draw_slider_background();
        draw_slider_thumb();
    }


    return dim;
};


/**
 * Draws a spinbox with standalone-style geometry (text area + up/down buttons)
 * using the same structural pattern as other controls.
 */
const draw_spinbox = (ctx, style, state = 'normal') => {
    const loc_style = { ...style };

    // ---------------- DISABLED COLOR TRANSFORM ----------------
    if (state === 'disabled') {
        const to_gray_shade = (color) => {
            const clean_color = color.startsWith('#') ? color.slice(1) : color;
            const rgb_values = hex_to_rgb(clean_color);
            const gray_value = rgb_to_grayscale(...rgb_values);
            return `#${rgb_to_hex(...gray_value)}`;
        };

        loc_style.background_color        = to_gray_shade(loc_style.background_color);
        loc_style.background_top_color    = to_gray_shade(loc_style.background_top_color);
        loc_style.background_bottom_color = to_gray_shade(loc_style.background_bottom_color);
        loc_style.shadow_color            = to_gray_shade(loc_style.shadow_color);
        loc_style.border_color            = to_gray_shade(loc_style.border_color);
        loc_style.font_color              = to_gray_shade(loc_style.font_color);
        loc_style.text_shadow_color       = to_gray_shade(loc_style.text_shadow_color);
    }

    // ---------------- DIMENSIONS & GEOMETRY ----------------
    const dim = calculate_control_dimensions(ctx, style, 'spinbox');

    const margin_h = style.margin_horizontal;
    const margin_v = style.margin_vertical;

    const border_size = style.border ? style.border_size : 0;

    const outer_x = margin_h;
    const outer_y = margin_v;
    const outer_w = dim.outer_width;
    const outer_h = dim.outer_height;

    const content_x = outer_x + border_size;
    const content_y = outer_y + border_size;
    const content_w = dim.content_width;
    const content_h = dim.content_height;

    // Standalone geometry
    const button_width = 20;
    const button_height = content_h / 2;
    const text_area_width = content_w - button_width;

    const effective_radius = Math.min(
        style.corner_radius,
        content_h * 0.5,
        content_w * 0.5
    );

    // ---------------- SHADOW ----------------
    const draw_spinbox_shadow = () => {
        ctx.save();
        ctx.shadowBlur = style.shadow_blur || 4;

        const basecol = loc_style.shadow_color.replace('#', '');
        const rgba = hex_to_rgba('#' + basecol.padEnd(6, '0') + '88');

        ctx.shadowColor = rgba;
        const off = style.shadow_offset || 2;
        ctx.shadowOffsetX = off;
        ctx.shadowOffsetY = off;

        draw_rounded_rect(ctx, outer_x, outer_y, outer_w, outer_h, effective_radius + border_size);
        ctx.fill();

        ctx.restore();
    };

    // ---------------- BORDER ----------------
    const draw_spinbox_border = () => {
        ctx.save();
        ctx.strokeStyle = loc_style.border_color;
        ctx.lineWidth = border_size;

        draw_rounded_rect(
            ctx,
            outer_x + border_size / 2,
            outer_y + border_size / 2,
            outer_w - border_size,
            outer_h - border_size,
            effective_radius + border_size
        );

        ctx.stroke();
        ctx.restore();
    };

    // ---------------- MAIN BACKGROUND ----------------
    const draw_spinbox_main_background = () => {
        ctx.fillStyle = loc_style.background_color;

        draw_rounded_rect(
            ctx,
            content_x,
            content_y,
            content_w,
            content_h,
            effective_radius
        );

        ctx.fill();
    };

    // ---------------- TEXT AREA ----------------
    const draw_spinbox_text_area = () => {
        ctx.fillStyle = loc_style.background_color;

        if (effective_radius > 0) {
            ctx.save();
            draw_rounded_rect(
                ctx,
                content_x,
                content_y,
                text_area_width,
                content_h,
                [effective_radius, 0, 0, effective_radius]
            );
            ctx.clip();
            ctx.fillRect(content_x, content_y, text_area_width, content_h);
            ctx.restore();
        } else {
            ctx.fillRect(content_x, content_y, text_area_width, content_h);
        }

        // Separator (Mode A: content coords)
        ctx.save();
        ctx.strokeStyle = loc_style.border_color;
        ctx.lineWidth = border_size;

        ctx.beginPath();
        ctx.moveTo(content_x + text_area_width, content_y);
        ctx.lineTo(content_x + text_area_width, content_y + content_h);
        ctx.stroke();

        ctx.restore();
    };

    // ---------------- BUTTONS ----------------
    const draw_spinbox_buttons = () => {
        const bx = content_x + text_area_width;
        const up_y = content_y;
        const dn_y = content_y + button_height;

        const topC = loc_style.background_top_color;
        const botC = loc_style.background_bottom_color;
        const arrowC = loc_style.font_color;

        // -------- UP BUTTON --------
        {
            const g = ctx.createLinearGradient(bx, up_y, bx, up_y + button_height);
            g.addColorStop(0, topC);
            g.addColorStop(1, botC);
            ctx.fillStyle = g;

            if (effective_radius > 0) {
                ctx.save();
                draw_rounded_rect(ctx, bx, up_y, button_width, button_height,
                    [0, effective_radius, 0, 0]);
                ctx.clip();
                ctx.fillRect(bx, up_y, button_width, button_height);
                ctx.restore();
            } else {
                ctx.fillRect(bx, up_y, button_width, button_height);
            }

            if (style.border) {
                ctx.save();
                ctx.strokeStyle = loc_style.border_color;
                ctx.lineWidth = border_size;
                draw_rounded_rect(ctx, bx, up_y, button_width, button_height,
                    [0, effective_radius, 0, 0]);
                ctx.stroke();
                ctx.restore();
            }

            // Arrow
            ctx.fillStyle = arrowC;
            ctx.beginPath();
            ctx.moveTo(bx + button_width / 2, up_y + 6);
            ctx.lineTo(bx + 6, up_y + button_height - 6);
            ctx.lineTo(bx + button_width - 6, up_y + button_height - 6);
            ctx.closePath();
            ctx.fill();
        }

        // -------- DOWN BUTTON --------
        {
            const g = ctx.createLinearGradient(bx, dn_y, bx, dn_y + button_height);
            g.addColorStop(0, topC);
            g.addColorStop(1, botC);
            ctx.fillStyle = g;

            if (effective_radius > 0) {
                ctx.save();
                draw_rounded_rect(ctx, bx, dn_y, button_width, button_height,
                    [0, 0, effective_radius, 0]);
                ctx.clip();
                ctx.fillRect(bx, dn_y, button_width, button_height);
                ctx.restore();
            } else {
                ctx.fillRect(bx, dn_y, button_width, button_height);
            }

            if (style.border) {
                ctx.save();
                ctx.strokeStyle = loc_style.border_color;
                ctx.lineWidth = border_size;
                draw_rounded_rect(ctx, bx, dn_y, button_width, button_height,
                    [0, 0, effective_radius, 0]);
                ctx.stroke();
                ctx.restore();
            }

            // Arrow
            ctx.fillStyle = arrowC;
            ctx.beginPath();
            ctx.moveTo(bx + button_width / 2, dn_y + button_height - 6);
            ctx.lineTo(bx + 6, dn_y + 6);
            ctx.lineTo(bx + button_width - 6, dn_y + 6);
            ctx.closePath();
            ctx.fill();
        }

        // Horizontal separator between buttons
        ctx.save();
        ctx.strokeStyle = loc_style.border_color;
        ctx.lineWidth = border_size;
        ctx.beginPath();
        ctx.moveTo(bx, dn_y);
        ctx.lineTo(bx + button_width, dn_y);
        ctx.stroke();
        ctx.restore();
    };

    // ---------------- RENDER ----------------
    if (style.shadow && state !== 'disabled') draw_spinbox_shadow();
    if (style.border) draw_spinbox_border();
    draw_spinbox_main_background();
    draw_spinbox_text_area();
    draw_spinbox_buttons();

    return dim;
};




/**
 * Redraws the control previews based on selected control type.
 */
const redraw = (clear = false) => {
    //console.log('redraw');
    const ctrl_type = elems.element_select.value;

    const calculate_fn_map = {
        'checkbox': (ctx) => calculate_control_dimensions(ctx, styles, 'checkbox'),
        'switch': (ctx) => calculate_control_dimensions(ctx, styles, 'switch'),
        'slider': (ctx) => calculate_control_dimensions(ctx, styles, 'slider'),
        'button': (ctx) => calculate_control_dimensions(ctx, styles, 'button'),
        'spinbox': (ctx) => calculate_control_dimensions(ctx, styles, 'spinbox'),
    };

    const calculate_fn = calculate_fn_map[ctrl_type] || calculate_fn_map.button;
    const { total_width, total_height } = calculate_fn(elems.pre_norm_ctx);

    const canvas_wrappers = [
        elems.pre_norm_wrapper,
        elems.pre_acti_wrapper,
        elems.pre_disa_wrapper
    ];

    canvas_wrappers.forEach(wrapper => {
        wrapper.width = total_width;
        wrapper.height = total_height;
        wrapper.style.width = `${total_width}px`;
        wrapper.style.height = `${total_height}px`;
    });

    const contexts = [
        elems.pre_norm_ctx,
        elems.pre_acti_ctx,
        elems.pre_disa_ctx
    ];
    const bg_color = elems.preview_bg.value;

    contexts.forEach(ctx => {
        if (clear) {
            ctx.clearRect(0, 0, total_width, total_height);
        } else {
            ctx.fillStyle = bg_color;
            ctx.fillRect(0, 0, total_width, total_height);
        }
    });

    elems.pre_acti_wrapper.style.display = 'block';

    const draw_operations = {
        'checkbox': () => {
            draw_checkbox(elems.pre_norm_ctx, styles, 'unchecked');
            draw_checkbox(elems.pre_acti_ctx, styles, 'checked');
            draw_checkbox(elems.pre_disa_ctx, styles, 'disabled');
        },
        'switch': () => {
            draw_switch(elems.pre_norm_ctx, styles, 'on');
            draw_switch(elems.pre_acti_ctx, styles, 'off');
            draw_switch(elems.pre_disa_ctx, styles, 'disabled');
        },
        'slider': () => {
            draw_slider(elems.pre_norm_ctx, styles, 'active');
            elems.pre_acti_wrapper.style.display = 'none';
            draw_slider(elems.pre_disa_ctx, styles, 'disabled');
        },
        'button': () => {
            draw_button(elems.pre_norm_ctx, styles, 'normal');
            draw_button(elems.pre_acti_ctx, styles, 'pressed');
            draw_button(elems.pre_disa_ctx, styles, 'disabled');
        },
        'spinbox': () => {
            draw_spinbox(elems.pre_norm_ctx, styles, 'normal');
            elems.pre_acti_wrapper.style.display = 'none';
            draw_spinbox(elems.pre_disa_ctx, styles, 'disabled');
        }
    };

    const draw_fn = draw_operations[ctrl_type] || draw_operations.button;
    draw_fn();
};

const format_font_style = () => {
    const font_family = elems.opt_text_family.value;
    const font_size = elems.opt_text_size.value;
    const font_bold = elems.opt_text_bold.checked ? 'bold' : 'normal';
    const font_italic = elems.opt_text_italic.checked ? 'italic' : 'normal';
    const smallcap = elems.opt_text_uppercase.checked ? 'small-caps' : 'normal';
    styles.font_style = `${font_italic} ${smallcap} ${font_bold} ${font_size}px ${font_family}`;

    // Update styles object with individual properties
    styles.font_bold = elems.opt_text_bold.checked;
    styles.font_italic = elems.opt_text_italic.checked;
    styles.font_uppercase = elems.opt_text_uppercase.checked;
};

const reset_style = () => {
    Object.assign(styles, {
        background_color: '#3498dbff',

        background_top_gradiant: false,
        background_top_color: '#5dade2ff',

        background_bottom_gradiant: false,
        background_bottom_color: '#2980b9ff',

        gloss: true,
        gloss_opacity: 0.4,

        corner_radius: 1,

        shadow: true,
        shadow_blur: 0,
        shadow_color: "#000000",
        shadow_offset: 1,

        border: true,
        border_size: 2,
        border_color: '#1b4f72',

        text: "Text",

        font: "Arial",
        font_size: 16,
        font_color: '#000000ff',

        text_shadow: true,
        text_shadow_blur: 2,
        text_shadow_color: "#5b5b5bff",
        text_shadow_offset: 1,

        padding_vertical: 5,
        padding_horizontal: 5,

        margin_vertical: 5,
        margin_horizontal: 5,

        // New properties for checkbox, switch and slider
        control_size: 20, // Base size for checkbox and switch
        slider_track_height: 8,
        slider_thumb_width: 25,
        slider_value: 50, // Always 50% for center position
    });

    // Update UI to match reset styles
    setup_ui_from_styles();
    //console.log('Styles reset to defaults');
    debounce_draw();
};

const save = async () => {
    const zip = new JSZip();
    const type = elems.element_select.value;
    const img_type = elems.format.value;
    const include_bg = elems.include_bg.checked;

    if (!include_bg) redraw(true);

    let canvases, names;

    if (type !== "slider") {
        canvases = [elems.pre_norm_wrapper, elems.pre_acti_wrapper, elems.pre_disa_wrapper];
        names = ['normal', 'active', 'disabled'];
    } else if (type === "spinbox") {
        canvases = [elems.pre_norm_wrapper, elems.pre_disa_wrapper];
        names = ['normal', 'disabled'];
    } else {

        const sld_act_csv = document.createElement('canvas');
        sld_act_csv.width = elems.pre_norm_wrapper.width * 2;
        sld_act_csv.height = elems.pre_norm_wrapper.height;
        const sld_act_ctx = sld_act_csv.getContext('2d');

        const sld_dis_csv = document.createElement('canvas');
        sld_dis_csv.width = elems.pre_norm_wrapper.width * 2;
        sld_dis_csv.height = elems.pre_norm_wrapper.height;
        const sld_dis_ctx = sld_dis_csv.getContext('2d');

        draw_slider(sld_act_ctx, styles, 'active', 2);
        draw_slider(sld_dis_ctx, styles, 'disabled', 2);

        canvases = [elems.pre_norm_wrapper, elems.pre_disa_wrapper, sld_act_csv, sld_dis_csv];
        names = ['active', 'disabled', 'active_track', 'disabled_track'];
    }

    const blobs = await Promise.all(
        canvases.map(canvas => new Promise(resolve => {
            canvas.toBlob(resolve, `image/${img_type}`, 1);
        }))
    );

    blobs.forEach((blob, i) => {
        zip.file(`${type}_${names[i]}.${img_type}`, blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    save_file(content, `${type}_images.zip`);
    redraw();
};

/**
 * Saves a file to the user's download location.
 * Throws error if blob or file_name are invalid.
 * @param {Blob} blob - File data as blob.
 * @param {string} file_name - Name for the downloaded file.
 */
const save_file = (blob, file_name) => {
    if (!(blob instanceof Blob)) {
        throw new TypeError('blob must be a Blob');
    }
    if (typeof file_name !== 'string' || !file_name) {
        throw new TypeError('file_name must be a non-empty string');
    }

    const link = document.createElement('a');
    const object_url = URL.createObjectURL(blob);

    link.href = object_url;
    link.download = file_name;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(object_url), 1000);
};

/**
 * Sets up the HTML UI to match the current values in the styles object
 */
const setup_ui_from_styles = () => {
    //console.log('Setting up UI from styles object');

    // Background Properties
    elems.opt_back_base_disp.value = styles.background_color;
    elems.opt_back_base.value = styles.background_color;
    elems.opt_back_base_disp.style.background = styles.background_color;

    elems.opt_back_topcol_chk.checked = styles.background_top_gradiant;
    elems.opt_back_topcol_disp.value = styles.background_top_color;
    elems.opt_back_topcol.value = styles.background_top_color;
    elems.opt_back_topcol_disp.style.background = styles.background_top_color;

    elems.opt_back_butcol_chk.checked = styles.background_bottom_gradiant;
    elems.opt_back_butcol_disp.value = styles.background_bottom_color;
    elems.opt_back_butcol.value = styles.background_bottom_color;
    elems.opt_back_butcol_disp.style.background = styles.background_bottom_color;

    // Shadow Properties
    elems.opt_shadow_chk.checked = styles.shadow;
    elems.opt_shadow_color_disp.value = styles.shadow_color.replace('ff', '');
    elems.opt_shadow_color.value = styles.shadow_color.replace('ff', '');
    elems.opt_shadow_color_disp.style.background = styles.shadow_color.replace('ff', '');

    elems.opt_shadow_blur.value = styles.shadow_blur;
    elems.opt_shadow_blur_sld.value = styles.shadow_blur;

    elems.opt_shadow_offset.value = styles.shadow_offset;
    elems.opt_shadow_offset_sld.value = styles.shadow_offset;

    // Gloss Properties
    elems.opt_gloss_chk.checked = styles.gloss;
    elems.opt_gloss_opacity.value = Math.round(styles.gloss_opacity * 100);
    elems.opt_gloss_opacity_sld.value = Math.round(styles.gloss_opacity * 100);

    // Border Properties
    elems.border_chk.checked = styles.border;
    elems.opt_border_radius.value = styles.corner_radius;
    elems.opt_border_radius_sld.value = styles.corner_radius;
    elems.opt_border_size.value = styles.border_size;
    elems.opt_border_size_sld.value = styles.border_size;
    elems.opt_border_color_disp.value = styles.border_color;
    elems.opt_border_color.value = styles.border_color;
    elems.opt_border_color_disp.style.background = styles.border_color;

    // Text Properties
    elems.opt_txt_txt.value = styles.text;
    elems.opt_text_family.value = styles.font;
    elems.opt_text_color_disp.value = styles.font_color;
    elems.opt_text_color.value = styles.font_color;
    elems.opt_text_color_disp.style.background = styles.font_color;

    elems.opt_text_size.value = styles.font_size;
    elems.opt_text_size_sld.value = styles.font_size;

    // Font style checkboxes
    elems.opt_text_bold.checked = styles.font_bold || false;
    elems.opt_text_italic.checked = styles.font_italic || false;
    elems.opt_text_uppercase.checked = styles.font_uppercase || false;

    // Text Shadow Properties
    elems.opt_text_shadow_chk.checked = styles.text_shadow;
    elems.opt_text_shadow_color_disp.value = styles.text_shadow_color;
    elems.opt_text_shadow_color.value = styles.text_shadow_color;
    elems.opt_text_shadow_color_disp.style.background = styles.text_shadow_color;

    elems.opt_text_shadow_blur.value = styles.text_shadow_blur;
    elems.opt_text_shadow_blur_sld.value = styles.text_shadow_blur;

    elems.opt_text_shadow_offset.value = styles.text_shadow_offset;
    elems.opt_text_shadow_offset_sld.value = styles.text_shadow_offset;

    // Layout Properties
    elems.opt_hpadding.value = styles.padding_horizontal;
    elems.opt_hpadding_sld.value = styles.padding_horizontal;

    elems.opt_vpadding.value = styles.padding_vertical;
    elems.opt_vpadding_sld.value = styles.padding_vertical;

    elems.opt_hmargin.value = styles.margin_horizontal;
    elems.opt_hmargin_sld.value = styles.margin_horizontal;

    elems.opt_vmargin.value = styles.margin_vertical;
    elems.opt_vmargin_sld.value = styles.margin_vertical;

    // Update font style
    format_font_style();

    //console.log('UI setup completed');
};

/**
 * Sets font color based on background color contrast.
 * @param {Element} element - The element to adjust font color.
 */
const set_font_color_based_on_background = (element) => {
    const background_color = window.getComputedStyle(element).backgroundColor;

    /**
     * Converts color value to brightness value.
     * @param {string} color - The color value to convert.
     * @returns {number} The calculated brightness value.
     */
    const get_brightness = (color) => {
        let red = 255;
        let green = 255;
        let blue = 255;

        if (color.startsWith('rgb')) {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                red = parseInt(match[1], 10);
                green = parseInt(match[2], 10);
                blue = parseInt(match[3], 10);
            }
        } else if (color[0] === '#') {
            let hex = color.slice(1);
            if (hex.length === 3) {
                hex = hex.replace(/(.)/g, '$1$1');
            }
            const num = parseInt(hex, 16);
            red = (num >> 16) & 255;
            green = (num >> 8) & 255;
            blue = num & 255;
        }

        return Math.round((red * 299 + green * 587 + blue * 114) / 1000);
    };

    const brightness_value = get_brightness(background_color);
    element.style.color = brightness_value < 125 ? '#ffffff' : '#000000';
};

const bind_color_picker = (display, input) => {
    display.addEventListener(`click`, () => input.click());
    input.addEventListener(`input`, (e) => {
        const value = e.currentTarget.value;
        display.value = value;
        display.style.setProperty('background', value);
        set_font_color_based_on_background(display);
    });
}

const bind_slider_input = (slider, input) => {
    slider.addEventListener(`input`, (e) => {
        const value = e.target.value;
        input.value = value;
    });
    input.addEventListener(`input`, (e) => {
        const value = e.target.value;
        slider.value = value;
    });
}

const debounce_draw = (() => {
    let timeout_id = null;
    return () => {
        if (timeout_id !== null) {
            clearTimeout(timeout_id);
        }
        timeout_id = setTimeout(() => {
            redraw();
            timeout_id = null;
        }, 100);
    };
})();

const setup_listener = () => {

    elems.element_select.addEventListener(`change`, (e) => {
        debounce_draw();
    });

    elems.ereset_btn.addEventListener(`click`, reset_style);
    //back base color
    {
        bind_color_picker(elems.opt_back_base_disp, elems.opt_back_base);
        elems.opt_back_base_disp.addEventListener(`change`, (e) => {
            const value = e.target.value;
            styles.background_color = value;
            debounce_draw();
        });
        elems.opt_back_base.addEventListener(`input`, (e) => {
            const value = e.target.value;
            styles.background_color = value;
            debounce_draw();
        });
    }

    //back bottom color
    {
        elems.opt_back_topcol_chk.addEventListener(`change`, (e) => {
            const checked = e.target.checked;
            styles.background_top_gradiant = checked;
            debounce_draw();
        });
        bind_color_picker(elems.opt_back_topcol_disp, elems.opt_back_topcol);
        elems.opt_back_topcol_disp.addEventListener(`change`, (e) => {
            const value = e.target.value;
            styles.background_top_color = value;
            debounce_draw();
        });
        elems.opt_back_topcol.addEventListener(`input`, (e) => {
            const value = e.target.value;
            styles.background_top_color = value;
            debounce_draw();
        });
    }

    //back bottom color
    {
        elems.opt_back_butcol_chk.addEventListener(`change`, (e) => {
            const checked = e.target.checked;
            styles.background_bottom_gradiant = checked;
            debounce_draw();
        });
        bind_color_picker(elems.opt_back_butcol_disp, elems.opt_back_butcol);
        elems.opt_back_butcol_disp.addEventListener(`change`, (e) => {
            const value = e.target.value;
            styles.background_bottom_color = value;
            debounce_draw();
        });
        elems.opt_back_butcol.addEventListener(`input`, (e) => {
            const value = e.target.value;
            styles.background_bottom_color = value;
            debounce_draw();
        });
    }

    {
        // Shadow Properties
        elems.opt_shadow_chk.addEventListener(`change`, (e) => {
            const checked = e.target.checked;
            styles.shadow = checked;
            debounce_draw();
        });

        bind_color_picker(elems.opt_shadow_color_disp, elems.opt_shadow_color);
        elems.opt_shadow_color_disp.addEventListener(`change`, (e) => {
            const value = e.target.value;
            styles.shadow_color = value;
            debounce_draw();
        });
        elems.opt_shadow_color.addEventListener(`input`, (e) => {
            const value = e.target.value;
            styles.shadow_color = value;
            debounce_draw();
        });

        bind_slider_input(elems.opt_shadow_blur_sld, elems.opt_shadow_blur);
        elems.opt_shadow_blur.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.shadow_blur = value;
            debounce_draw();
        });
        elems.opt_shadow_blur_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.shadow_blur = value;
            debounce_draw();
        });

        bind_slider_input(elems.opt_shadow_offset_sld, elems.opt_shadow_offset);
        elems.opt_shadow_offset.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.shadow_offset = value;
            debounce_draw();
        });
        elems.opt_shadow_offset_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.shadow_offset = value;
            debounce_draw();
        });
    }

    {
        elems.opt_gloss_chk.addEventListener(`change`, (e) => {
            const checked = e.target.checked;
            styles.gloss = checked;
            debounce_draw();
        });

        bind_slider_input(elems.opt_gloss_opacity_sld, elems.opt_gloss_opacity);
        elems.opt_gloss_opacity.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.gloss_opacity = value / 100;
            debounce_draw();
        });
        elems.opt_gloss_opacity_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.gloss_opacity = value / 100;
            debounce_draw();
        });
    }

    // Border Properties
    elems.border_chk.addEventListener(`change`, (e) => {
        const checked = e.target.checked;
        styles.border = checked;
        debounce_draw();
    });

    // Border Radius
    {
        bind_slider_input(elems.opt_border_radius_sld, elems.opt_border_radius);
        elems.opt_border_radius.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.corner_radius = value;
            debounce_draw();
        });
        elems.opt_border_radius_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.corner_radius = value;
            debounce_draw();
        });
    }

    // Border Size
    {
        bind_slider_input(elems.opt_border_size_sld, elems.opt_border_size);
        elems.opt_border_size.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.border_size = value;
            debounce_draw();
        });
        elems.opt_border_size_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.border_size = value;
            debounce_draw();
        });

    }

    // Border Color
    {
        bind_color_picker(elems.opt_border_color_disp, elems.opt_border_color);
        elems.opt_border_color_disp.addEventListener(`change`, (e) => {
            const value = e.target.value;
            styles.border_color = value;
            debounce_draw();
        });
        elems.opt_border_color.addEventListener(`input`, (e) => {
            const value = e.target.value;
            styles.border_color = value;
            debounce_draw();
        });
    }

    // Text Properties
    elems.opt_txt_txt.addEventListener(`input`, (e) => {
        const value = e.target.value;
        styles.text = value;
        debounce_draw();
    });
    elems.opt_text_family.addEventListener(`change`, (e) => {
        const value = e.target.value;
        styles.font = value;
        format_font_style();
        debounce_draw();
    });

    // Text Color   
    {
        bind_color_picker(elems.opt_text_color_disp, elems.opt_text_color);
        elems.opt_text_color_disp.addEventListener(`change`, (e) => {
            const value = e.target.value;
            styles.font_color = value;
            debounce_draw();
        });
        elems.opt_text_color.addEventListener(`input`, (e) => {
            const value = e.target.value;
            styles.font_color = value;
            debounce_draw();
        });
    }
    // Text Size
    {
        bind_slider_input(elems.opt_text_size_sld, elems.opt_text_size);
        elems.opt_text_size.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.font_size = value;
            format_font_style();
            debounce_draw();
        }
        );
        elems.opt_text_size_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.font_size = value;
            format_font_style();
            debounce_draw();
        });
    }
    elems.opt_text_bold.addEventListener(`change`, (e) => {
        const checked = e.target.checked;
        styles.font_bold = checked;
        format_font_style();
        debounce_draw();
    });
    elems.opt_text_italic.addEventListener(`change`, (e) => {
        const checked = e.target.checked;
        styles.font_italic = checked;
        format_font_style();
        debounce_draw();
    });
    elems.opt_text_uppercase.addEventListener(`change`, (e) => {
        const checked = e.target.checked;
        styles.font_uppercase = checked;
        format_font_style();
        debounce_draw();
    });

    {
        elems.opt_text_shadow_chk.addEventListener(`change`, (e) => {
            const checked = e.target.checked;
            styles.text_shadow = checked;
            debounce_draw();
        });

        bind_color_picker(elems.opt_text_shadow_color_disp, elems.opt_text_shadow_color);
        elems.opt_text_shadow_color_disp.addEventListener(`change`, (e) => {
            const value = e.target.value;
            styles.text_shadow_color = value;
            debounce_draw();
        });
        elems.opt_text_shadow_color.addEventListener(`input`, (e) => {
            const value = e.target.value;
            styles.text_shadow_color = value;
            debounce_draw();
        });

        bind_slider_input(elems.opt_text_shadow_blur_sld, elems.opt_text_shadow_blur);
        elems.opt_text_shadow_blur.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.text_shadow_blur = value;
            debounce_draw();
        });
        elems.opt_text_shadow_blur_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.text_shadow_blur = value;
            debounce_draw();
        });

        bind_slider_input(elems.opt_text_shadow_offset_sld, elems.opt_text_shadow_offset);
        elems.opt_text_shadow_offset.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.text_shadow_offset = value;
            debounce_draw();
        });
        elems.opt_text_shadow_offset_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.text_shadow_offset = value;
            debounce_draw();
        });
    }


    // Layout Properties
    {
        bind_slider_input(elems.opt_hpadding_sld, elems.opt_hpadding);
        elems.opt_hpadding.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.padding_horizontal = value;
            debounce_draw();
        });
        elems.opt_hpadding_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.padding_horizontal = value;
            debounce_draw();
        });
    }

    {
        bind_slider_input(elems.opt_vpadding_sld, elems.opt_vpadding);
        elems.opt_vpadding.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.padding_vertical = value;
            debounce_draw();
        });
        elems.opt_vpadding_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.padding_vertical = value;
            debounce_draw();
        });
    }

    {
        bind_slider_input(elems.opt_hmargin_sld, elems.opt_hmargin);
        elems.opt_hmargin.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.margin_horizontal = value;
            debounce_draw();
        });
        elems.opt_hmargin_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.margin_horizontal = value;
            debounce_draw();
        });
    }

    {
        bind_slider_input(elems.opt_vmargin_sld, elems.opt_vmargin);
        elems.opt_vmargin.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.margin_vertical = value;
            debounce_draw();
        });
        elems.opt_vmargin_sld.addEventListener(`input`, (e) => {
            const value = parseInt(e.target.value, 10);
            styles.margin_vertical = value;
            debounce_draw();
        });
    }

    // Preview Properties
    elems.preview_bg.addEventListener(`input`, (e) => {
        const value = e.target.value;
        //console.log(`preview_bg changed: `, value);
        debounce_draw();
    });

    elems.save_btn.addEventListener(`click`, () => {
        save();
    });

};

const cache_elements = () => {
    elems = {
        element_select: document.getElementById(`element-select`),
        ereset_btn: document.getElementById(`reset-btn`),

        // Background Properties
        opt_back_base_disp: document.getElementById(`opt_back_base_disp`),
        opt_back_base: document.getElementById(`opt_back_base`),

        opt_back_topcol_chk: document.getElementById(`opt_back_topcol_chk`),
        opt_back_topcol_disp: document.getElementById(`opt_back_topcol_disp`),
        opt_back_topcol: document.getElementById(`opt_back_topcol`),

        opt_back_butcol_chk: document.getElementById(`opt_back_butcol_chk`),
        opt_back_butcol_disp: document.getElementById(`opt_back_butcol_disp`),
        opt_back_butcol: document.getElementById(`opt_back_butcol`),


        opt_shadow_chk: document.getElementById(`opt_shadow_chk`),
        opt_shadow_color_disp: document.getElementById(`opt_shadow_color_disp`),
        opt_shadow_color: document.getElementById(`opt_shadow_color`),

        opt_shadow_blur: document.getElementById(`opt_shadow_blur`),
        opt_shadow_blur_sld: document.getElementById(`opt_shadow_blur_sld`),

        opt_shadow_offset: document.getElementById(`opt_shadow_offset`),
        opt_shadow_offset_sld: document.getElementById(`opt_shadow_offset_sld`),

        opt_gloss_chk: document.getElementById(`opt_gloss_chk`),
        opt_gloss_opacity: document.getElementById(`opt_gloss_opacity`),
        opt_gloss_opacity_sld: document.getElementById(`opt_gloss_opacity_sld`),

        // Border Properties
        border_chk: document.getElementById(`border_chk`),

        opt_border_radius: document.getElementById(`opt_border_radius`),
        opt_border_radius_sld: document.getElementById(`opt_border_radius_sld`),

        opt_border_size: document.getElementById(`opt_border_size`),
        opt_border_size_sld: document.getElementById(`opt_border_size_sld`),

        opt_border_color_disp: document.getElementById(`opt_border_color_disp`),
        opt_border_color: document.getElementById(`opt_border_color`),

        // Text Properties
        opt_txt_txt: document.getElementById(`opt_txt_txt`),
        opt_text_family: document.getElementById(`opt_text_family`),
        opt_text_color_disp: document.getElementById(`opt_text_color_disp`),
        opt_text_color: document.getElementById(`opt_text_color`),

        opt_text_size: document.getElementById(`opt_text_size`),
        opt_text_size_sld: document.getElementById(`opt_text_size_sld`),
        opt_text_bold: document.getElementById(`opt_text_bold`),
        opt_text_italic: document.getElementById(`opt_text_italic`),
        opt_text_uppercase: document.getElementById(`opt_text_uppercase`),

        opt_text_shadow_chk: document.getElementById(`opt_text_shadow_chk`),
        opt_text_shadow_color_disp: document.getElementById(`opt_text_shadow_color_disp`),
        opt_text_shadow_color: document.getElementById(`opt_text_shadow_color`),

        opt_text_shadow_blur: document.getElementById(`opt_text_shadow_blur`),
        opt_text_shadow_blur_sld: document.getElementById(`opt_text_shadow_blur_sld`),

        opt_text_shadow_offset: document.getElementById(`opt_text_shadow_offset`),
        opt_text_shadow_offset_sld: document.getElementById(`opt_text_shadow_offset_sld`),

        // Layout Properties
        opt_hpadding: document.getElementById(`opt_hpadding`),
        opt_hpadding_sld: document.getElementById(`opt_hpadding_sld`),

        opt_vpadding: document.getElementById(`opt_vpadding`),
        opt_vpadding_sld: document.getElementById(`opt_vpadding_sld`),

        opt_hmargin: document.getElementById(`opt_hmargin`),
        opt_hmargin_sld: document.getElementById(`opt_hmargin_sld`),

        opt_vmargin: document.getElementById(`opt_vmargin`),
        opt_vmargin_sld: document.getElementById(`opt_vmargin_sld`),

        // Preview
        preview_aling: document.getElementById(`preview-aling`),
        preview_bg: document.getElementById(`preview-bg`),

        pre_norm_wrapper: document.getElementById(`pre_norm_wrapper`),
        pre_acti_wrapper: document.getElementById(`pre_acti_wrapper`),
        pre_disa_wrapper: document.getElementById(`pre_disa_wrapper`),

        format: document.getElementById(`format`),
        include_bg: document.getElementById(`include_bg_chk`),
        save_btn: document.getElementById(`save_btn`),
    };

    elems.pre_norm_ctx = elems.pre_norm_wrapper.getContext(`2d`);
    elems.pre_acti_ctx = elems.pre_acti_wrapper.getContext(`2d`);
    elems.pre_disa_ctx = elems.pre_disa_wrapper.getContext(`2d`);
};

const initialize_application = () => {
    cache_elements();
    setup_ui_from_styles();

    [
        elems.opt_back_base_disp,
        elems.opt_back_topcol_disp,
        elems.opt_back_butcol_disp,
        elems.opt_border_color_disp,
        elems.opt_text_color_disp,
        elems.opt_shadow_color_disp,
        elems.opt_text_shadow_color_disp,
    ].forEach(set_font_color_based_on_background);

    setup_listener();
    redraw();
};


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize_application);
} else initialize_application();

