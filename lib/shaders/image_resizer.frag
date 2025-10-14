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

precision highp float;
precision highp int;

/* Varyings supplied by image_resizer.test.vert */
varying vec2 v_tex_coord;
varying vec2 v_tex_step;      // one-pixel step in texture coords
varying float v_scale_ratio;  // dest/src ratio for this pass
varying float v_px_dir;       // directional pixel coordinate in destination space
varying vec2 v_step_vec;      // directional step vec for sampling offsets
varying float v_src_dim;      // source dimension along pass
varying float v_support;      // adjusted support for resizing
varying float v_center;       // precomputed center for resizing
varying float v_radius;       // precomputed radius for blur
varying float v_sigma;        // adjusted sigma for blur
varying float v_dir_step;     // directional step for blur
varying float v_base_dir_coord; // base directional coord for blur
varying float v_is_horizontal; // 1.0 if horizontal, 0.0 if vertical

/* Uniforms */
uniform sampler2D u_image;
uniform sampler2D u_aux_image;
uniform int u_operation;
uniform int u_filter_type;
uniform bool u_gamma_correct;
uniform float u_amount;
uniform float u_threshold;

/* Operation codes - should match JS orchestration */
const int OP_RESIZE = 0;
const int OP_UNSHARP = 3;
const int OP_GAUSSIAN_BLUR = 4;
const int OP_QUANTIZE = 5;

/* Filter IDs */
const int F_BOX = 0;
const int F_HAMMING = 1;
const int F_LANCZOS2 = 2;
const int F_LANCZOS3 = 3;
const int F_MKS2013 = 4;
const int F_BICUBIC = 5;

/* -------------------------------------------
   Color conversion helpers (per-channel)
   ------------------------------------------- */
vec3 srgb_to_linear(vec3 c) {
    vec3 low = c / 12.92;
    vec3 high = pow((c + 0.055) / 1.055, vec3(2.4));
    vec3 mask = step(vec3(0.04045), c);
    return mix(low, high, mask);
}
vec3 linear_to_srgb(vec3 c) {
    vec3 low = 12.92 * c;
    vec3 high = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
    vec3 mask = step(vec3(0.0031308), c);
    return mix(low, high, mask);
}

/* -------------------------------------------
   Filter kernels (same math as CPU fallback)
   ------------------------------------------- */
float sinc(float x) {
    if(x == 0.0)
        return 1.0;
    float px = 3.141592653589793 * x;
    return sin(px) / px;
}
float filter_box(float x) {
    return (abs(x) <= 0.5) ? 1.0 : 0.0;
}
float filter_hamming(float x) {
    float ax = abs(x);
    if(ax >= 1.0)
        return 0.0;
    return 0.54 + 0.46 * cos(3.141592653589793 * ax);
}
float filter_lanczos(float x, float a) {
    float ax = abs(x);
    if(ax >= a)
        return 0.0;
    return sinc(x) * sinc(x / a);
}
float filter_bicubic(float x) {
    float ax = abs(x);
    if(ax <= 1.0)
        return (1.5 * ax * ax * ax - 2.5 * ax * ax + 1.0);
    else if(ax < 2.0)
        return (-0.5 * ax * ax * ax + 2.5 * ax * ax - 4.0 * ax + 2.0);
    return 0.0;
}
float filter_mks2013(float x) {
    float B = 1.0 / 3.0;
    float C = 1.0 / 3.0;
    float ax = abs(x);
    if(ax < 1.0) {
        return ((12.0 - 9.0 * B - 6.0 * C) * ax * ax * ax +
            (-18.0 + 12.0 * B + 6.0 * C) * ax * ax +
            (6.0 - 2.0 * B)) / 6.0;
    } else if(ax < 2.0) {
        return ((-B - 6.0 * C) * ax * ax * ax +
            (6.0 * B + 30.0 * C) * ax * ax +
            (-12.0 * B - 48.0 * C) * ax +
            (8.0 * B + 24.0 * C)) / 6.0;
    }
    return 0.0;
}
float filter_weight(float x, int type) {
    if(type == F_BOX)
        return filter_box(x);
    if(type == F_HAMMING)
        return filter_hamming(x);
    if(type == F_LANCZOS2)
        return filter_lanczos(x, 2.0);
    if(type == F_LANCZOS3)
        return filter_lanczos(x, 3.0);
    if(type == F_MKS2013)
        return filter_mks2013(x);
    if(type == F_BICUBIC)
        return filter_bicubic(x);
    return 0.0;
}

/* Gaussian helper for blur */
float gaussian(float x, float sigma) {
    float s2 = sigma * sigma;
    return exp(-0.5 * (x * x) / s2);
}

/* -------------------------------------------
   OP_RESIZE - must follow CPU behavior:
   - kernelArg = (center - srcIndex - 0.5) * scale
   - accumulate R,G,B and A separately (no premultiplication)
   - use v_step_vec for sampling offsets
   - convert rgb <-> linear only when appropriate (u_gamma_correct)
   ------------------------------------------- */
vec4 op_resize() {
    float scale = v_scale_ratio; // precomputed dest/src ratio along this pass
    float center = v_center;
    float support = v_support;
    int start = int(max(0.0, floor(center - support)));
    int end = int(min(v_src_dim - 1.0, ceil(center + support)));

    vec3 accum_rgb = vec3(0.0);
    float accum_a = 0.0;
    float wsum = 0.0;

    int floorC = int(floor(center));
  // safe loop bounds: -6..6 (covers lanczos3) — CPU enumerates start..end but loop must be static
    for(int ofs = -6; ofs <= 6; ++ofs) {
        int sidx = floorC + ofs;
        if(sidx < start || sidx > end)
            continue;

    // kernel argument matches CPU: (center - srcIndex - 0.5) * scale
        float kernelArg = (center - float(sidx) - 0.5) * scale;
        float w = filter_weight(kernelArg, u_filter_type);
        if(abs(w) < 1e-6)
            continue;

    // sample coord: base plus ofs * step_vec
        vec2 tc = v_tex_coord + float(ofs) * v_step_vec;
        vec4 s = texture2D(u_image, tc);

        vec3 rgb = s.rgb;
        float a = s.a;

    // When resizing it worked on linear data (if gamma_correct true)
        if(u_gamma_correct)
            rgb = srgb_to_linear(rgb);

        accum_rgb += rgb * w;
        accum_a += a * w;
        wsum += w;
    }

    if(wsum <= 1e-6) {
        return texture2D(u_image, v_tex_coord);
    }

    accum_rgb /= wsum;
    accum_a /= wsum;

    vec3 out_rgb = accum_rgb;
    if(u_gamma_correct)
        out_rgb = linear_to_srgb(out_rgb);

    return vec4(out_rgb, accum_a);
}

/* New op: quantize to 8-bit (simulate CPU byte conversion) */
vec4 op_quantize() {
  // Read color (input is always sRGB)
    vec4 c = texture2D(u_image, v_tex_coord);

  // Assume sRGB
    vec3 srgb = c.rgb;

  // Simulate 8-bit rounding as CPU does: round(value * 255) / 255
    vec3 qrgb = floor(srgb * 255.0 + 0.5) / 255.0;

  // Alpha in CPU path also gets clamped/rounded to byte (src[i+3] * 255)
    float qa = floor(c.a * 255.0 + 0.5) / 255.0;

    return vec4(qrgb, qa);
}

/* -------------------------------------------
   OP_GAUSSIAN_BLUR - performs convolution in sRGB space with reflect padding
   ------------------------------------------- */
vec4 op_blur() {
    int radius = int(v_radius);
    vec3 accum_rgb = vec3(0.0);
    float accum_a = 0.0;
    float wsum = 0.0;

    for(int i = -12; i <= 12; ++i) {
        if(i < -radius || i > radius)
            continue;
        float w = gaussian(float(i), v_sigma);

        float dir_coord = v_base_dir_coord + float(i) * v_dir_step;
        if (dir_coord < 0.0) dir_coord = -dir_coord;
        if (dir_coord > 1.0) dir_coord = 2.0 - dir_coord;
        vec2 tc = mix(vec2(v_tex_coord.x, dir_coord), vec2(dir_coord, v_tex_coord.y), v_is_horizontal);

        vec4 s = texture2D(u_image, tc);
        vec3 rgb = s.rgb;  // always in sRGB space
        float a = s.a;
        accum_rgb += rgb * w;
        accum_a += a * w;
        wsum += w;
    }

    accum_rgb /= wsum;
    accum_a /= wsum;
    vec3 out_rgb = accum_rgb; // no conversion
    return vec4(out_rgb, accum_a);
}

/* -------------------------------------------
   OP_UNSHARP - compute diff in sRGB space,
   then return final color in sRGB
   ------------------------------------------- */
vec4 op_unsharp() {
    vec4 blurred = texture2D(u_image, v_tex_coord);
    vec4 orig = texture2D(u_aux_image, v_tex_coord);

  // Work in sRGB space
    vec3 b_rgb = blurred.rgb;
    vec3 o_rgb = orig.rgb;
    float o_a = orig.a;

    vec3 diff = o_rgb - b_rgb;
    vec3 mask = step(vec3(u_threshold), abs(diff));
    float amount_value = u_amount / 100.0;

  // Add back in sRGB domain
    vec3 sharpened = o_rgb + diff * amount_value * mask;

  // No conversion
    vec3 result_rgb = sharpened;
    return vec4(result_rgb, o_a);
}

/* Main dispatch */
void main() {
    vec4 outC;
    if(u_operation == OP_RESIZE)
        outC = op_resize();
    else if(u_operation == OP_GAUSSIAN_BLUR)
        outC = op_blur();
    else if(u_operation == OP_UNSHARP)
        outC = op_unsharp();
    //else if (u_operation == OP_QUANTIZE) outC = op_quantize();
    else
        outC = texture2D(u_image, v_tex_coord);

    gl_FragColor = clamp(outC, 0.0, 1.0);
}