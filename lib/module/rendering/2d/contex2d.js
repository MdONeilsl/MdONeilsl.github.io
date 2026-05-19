import { array } from "../../array.js";
import { type_error } from "../../../error.js";
import { kind_of } from "../../../functions.js";
import { canv_set_pixel_ratio, canvas } from "../../gui/canvas.js";
import { pointi } from "../../gui/point.js";
import { rect_center } from "../../gui/rect.js";
import { new_node } from "../../html.js";

const anchor = new pointi();
const pp = new pointi();

/**************************************************************
 * Utility
 *************************************************************/

export const ctx2d = obj => {
    const kind = kind_of(obj);
    //console.log(obj);
    if (kind === `CanvasRenderingContext2D`) return obj;
    if (kind === `canvas`) return obj.ctx;
    if (kind === `HTMLCanvasElement`) return obj.getContext(`2d`);
    throw new type_error(`obj should be a canvas.`);
};

/**
 * This function sets the image smoothing property on a CanvasRenderingContext2D.
 * It enables or disables image smoothing for all future drawImage calls.
 * 
 * @param {CanvasRenderingContext2D} ctx - The context on which to set the image smoothing.
 * @param {Boolean} on - A boolean value indicating whether to enable (true) or disable (false) image smoothing.
 * 
 * @returns {void} This function does not return any value.
 */
export const ctx_set_smoothing = (ctx, on) => {
    ctx2d(ctx).imageSmoothingEnabled = on === true;
    ctx2d(ctx).mozImageSmoothingEnabled = on === true;
    ctx2d(ctx).oImageSmoothingEnabled = on === true;
    ctx2d(ctx).webkitImageSmoothingEnabled = on === true;
    ctx2d(ctx).msImageSmoothingEnabled = on === true;
};

export const ctx_clear = (ctx, col) => {
    if (kind_of(col) !== `color`) {
        throw new type_error(`col should be a color.`);
    }
    //ctx = ctx2d(ctx);
    ctx_set_fill_color(ctx, col);
    ctx2d(ctx).fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

export const ctx_set_transform = (ctx, mat) => {
    if (kind_of(mat) !== `mat3`) throw new type_error(`transform should be a mat3.`);
    ctx2d(ctx).setTransform(mat[0], mat[1], mat[3], mat[4], mat[6], mat[7]);
};

export const ctx_move_to = (ctx, pos) => {
    ctx2d(ctx).moveTo(pos.x, pos.y);
};

export const ctx_save = ctx => {
    ctx2d(ctx).save();
};

export const ctx_restore = ctx => {
    ctx2d(ctx).restore();
};

/**************************************************************
 * Style
 *************************************************************/

export const ctx_set_fill_color = (ctx, col) => {
    if (kind_of(col) !== `color`) throw new type_error(`col should be a col. ${kind_of(col)}`);
    ctx2d(ctx).fillStyle = col.rgba.css;
};

export const ctx_set_stroke_color = (ctx, col) => {
    if (kind_of(col) !== `color`) throw new type_error(`col should be a col. ${kind_of(col)}`);
    ctx2d(ctx).strokeStyle = col.rgba.css;
};

export const ctx_set_line_width = (ctx, width) => {
    if (kind_of(width) !== `number`) throw new type_error(`width should be a number.`);
    ctx2d(ctx).lineWidth = width;
};

export const ctx_set_alpha = (ctx, alpha) => {
    if (kind_of(alpha) !== `number`) throw new type_error(`alpha should be a number.`);
    ctx2d(ctx).globalAlpha = alpha;
};

// globalCompositeOperation
export const ctx_set_composite_operation = (ctx, op) => {
    if (kind_of(op) !== `string`) throw new type_error(`operator should be a string.`);
    ctx2d(ctx).globalCompositeOperation = op;
};

/**************************************************************
 * Dot
 *************************************************************/

export const ctx_draw_dot = (ctx, pos, radius) => {
    if (!pos.x || !pos.y) throw new type_error(`pos must have a x and y propriety.`);

    const circle = new Path2D();
    circle.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
    ctx2d(ctx).fill(circle);
};

/**************************************************************
 * line
 *************************************************************/

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {line|point|number} p1x 
 * @param {point|number} [p1y] 
 * @param {number} [p2x] 
 * @param {number} [p2y] 
 */
export const ctx_draw_line = (ctx, p1x, p1y, p2x, p2y) => {
    ctx.beginPath();
    const kind = kind_of(p1x);
    if (kind === `line`) {
        ctx_move_to(ctx, p1x.p1);
        const to = p1x.p2;
        ctx2d(ctx).lineTo(to.x, to.y);
    }
    else if (kind === `point`) {
        ctx_move_to(ctx, p1x);
        ctx2d(ctx).lineTo(p1y.x, p1y.y);
    }
    else {
        ctx2d(ctx).moveTo(p1x, p1y);
        ctx2d(ctx).lineTo(p2x, p2y);
    }
    ctx.stroke();
};

/**************************************************************
 * rect
 *************************************************************/

export const ctx_clear_rect = (ctx, rect) => {
    if (kind_of(rect) !== `rect`) throw new type_error(`rect should be a rect.`);
    ctx2d(ctx).clearRect(rect.x, rect.y, rect.width, rect.height);
};

export const ctx_fill_rect = (ctx, rect) => {
    if (kind_of(rect) !== `rect`) throw new type_error(`rect should be a rect.`);
    ctx2d(ctx).fillRect(rect.x, rect.y, rect.width, rect.height);
};

export const ctx_stoke_rect = (ctx, rect) => {
    if (kind_of(rect) !== `rect`) throw new type_error(`rect should be a rect.`);
    ctx2d(ctx).strokeRect(rect.x, rect.y, rect.width, rect.height);
};

/**************************************************************
 * image
 *************************************************************/

/**
 * Draws an image on the canvas with optional source and destination rectangles.
 *
 * @param {contex} canv - The canvas element.
 * @param {image} pix - The image to draw.
 * @param {rect} [src] - The source rectangle to draw from.
 * @param {rect} [dest] - The destination rectangle to draw to.
 *
 * @returns {void} This function does not return any value.
 */
export const ctx_draw_img = (ctx, pix, src, dest, alpha = 1) => {
    if (alpha === 0) return;

    const dx = dest?.x ?? 0;
    const dy = dest?.y ?? 0;
    const dw = dest?.width ?? pix.width;
    const dh = dest?.height ?? pix.height;

    //let adj = array.is_float_array(dest) ? 0 : 1;
    const sx = src?.x ?? 0;
    const sy = src?.y ?? 0;
    const sw = (src?.width ?? pix.width) /*- adj */;
    const sh = (src?.height ?? pix.height) /*- adj*/;
    //console.log(`[${sx}, ${sy}, ${sw}, ${sh}],[${dx}, ${dy}, ${dw}, ${dh}]`);

    const kind = kind_of(pix);

    if (kind == `image`) {
        pix = pix.ImageData;
        kind = `ImageData`;
    }
    
    if (kind === `ImageData`) {
        const canv = new canvas(new_node(`canvas`));
        canv_set_pixel_ratio(canv, pix.width, pix.height);
        canv.ctx.putImageData(pix, 0, 0);
        pix = canv.elem;
    }

    if (alpha !== 1) ctx_set_alpha(ctx, alpha);
    ctx2d(ctx).drawImage(pix, sx, sy, sw, sh, dx, dy, dw, dh);
    if (alpha !== 1) ctx_set_alpha(ctx, 1);
};

export const ctx_get_data = (ctx, rect) => {
    //const adj = array.is_float_array(rect) ? 0 : 1;
    ctx = ctx2d(ctx);
    return ctx.getImageData(
        rect?.x || 0, rect?.y || 0, 
        rect?.width || ctx.canvas.width, 
        rect?.height || ctx.canvas.height);
};

/**************************************************************
 * text
 *************************************************************/

export const ctx_set_font = (ctx, font) => {
    if (kind_of(font) !== `font`) throw new type_error(`font should be a font.`);
    ctx2d(ctx).font = font.css;
};

/**
 * @param {contex} ctx 
 * @param {text} text 
 * @param {rect} box 
 * @param {font} font 
 * @param {color} col 
 */
export const ctx_draw_text = (ctx, text, box, font, col, fill = true) => {
    if (kind_of(text) !== `text`) throw new type_error(`text should be a text.`);
    if (kind_of(box) !== `rect`) throw new type_error(`box should be a rect.`);

    const contex2d = ctx2d(ctx);
    if (font) ctx_set_font(ctx, font);
    if (col) {
        if (fill) ctx_set_fill_color(ctx, col);
        else ctx_set_stroke_color(ctx, col);
    }

    // Set the text alignment based on the specified property.
    contex2d.textAlign = text.align;
    switch (text.align) {
        case `left`: case `start`: anchor.x = box.left; break;
        case `center`: anchor.x = rect_center(box, pp).x; break;
        case `right`: case `end`: anchor.x = box.right; break;
    }

    // Set the text baseline based on the specified property.
    contex2d.textBaseline = text.baseline;
    switch (text.baseline) {
        case `top`: case `hanging`: anchor.y = box.top; break;
        case `middle`: case `alphabetic`: anchor.y = rect_center(box, pp).y; break;
        case `ideographic`: case `bottom`: anchor.y = box.bottom; break;
    }

    // Set the text direction based on the specified property.
    contex2d.direction = text.direction;
    const metric = ctx.measureText(text.string);
    if (text.direction === `rtl`) anchor.x += metric.width;

    // Draw the text at the specified position.
    if (fill) contex2d.fillText(text.string, anchor.x, anchor.y);
    else contex2d.strokeText(text.string, anchor.x, anchor.y);
};


export const ctx_make_bitmap = (ctx,) => {

};