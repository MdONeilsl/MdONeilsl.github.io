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

// === Attributes ===
attribute vec2 a_position;

// === Uniforms ===
uniform vec2 u_src_size;
uniform vec2 u_dest_size;
uniform bool u_is_horizontal;
uniform int u_filter_type;
uniform int u_operation;
uniform float u_sigma;

// === Varyings (sent to fragment shader) ===
varying vec2 v_tex_coord;
varying vec2 v_tex_step;      // single-pixel step in texture coords
varying float v_scale_ratio;  // dest/src ratio (for adaptive sigma, blur etc.)
varying float v_px_dir;       // directional pixel coordinate in destination space
varying vec2 v_step_vec;      // directional step vector for offsets
varying float v_src_dim;      // directional source dimension
varying float v_support;      // adjusted support for resizing
varying float v_center;       // precomputed center for resizing
varying float v_radius;       // precomputed radius for blur
varying float v_sigma;        // adjusted sigma for blur
varying float v_dir_step;     // directional step for blur
varying float v_base_dir_coord; // base directional coord for blur
varying float v_is_horizontal; // 1.0 if horizontal, 0.0 if vertical

void main() {
  // Fullscreen quad: a_position is in [-1, 1] range
  // Convert to normalized texture coordinate [0, 1]
    v_tex_coord = (a_position * 0.5) + 0.5;

  // Compute source-to-destination scale ratio
    vec2 scale = u_dest_size / u_src_size;
    v_scale_ratio = u_is_horizontal ? scale.x : scale.y;

  // Compute texture step for one pixel in destination space
    v_tex_step = vec2(1.0 / u_src_size.x, 1.0 / u_src_size.y);

  // Absolute pixel coordinates in destination image
    vec2 px_pos = v_tex_coord * u_dest_size;

  // Directional values
    v_px_dir = u_is_horizontal ? px_pos.x : px_pos.y;
    v_step_vec = u_is_horizontal ? vec2(v_tex_step.x, 0.0) : vec2(0.0, v_tex_step.y);
    v_src_dim = u_is_horizontal ? u_src_size.x : u_src_size.y;

  // Precompute base_support based on filter_type
    float base_support;
    if(u_filter_type == 0) base_support = 0.5;
    else if(u_filter_type == 1) base_support = 1.0;
    else if(u_filter_type == 2) base_support = 2.0;
    else if(u_filter_type == 3) base_support = 3.0;
    else if(u_filter_type == 4) base_support = 2.0;
    else base_support = 2.0;

  // Precompute adjusted support for resize
    v_support = (v_scale_ratio < 1.0) ? base_support / v_scale_ratio : base_support;

  // Precompute center for resize
    v_center = (v_px_dir + 0.5) / v_scale_ratio - 0.5;

  // Precompute for blur
    v_sigma = u_sigma;
    v_radius = 0.0;
    if(u_operation == 4) {
        v_sigma = max(u_sigma, 0.0001);
        v_radius = ceil(3.0 * v_sigma);
    }
    v_dir_step = u_is_horizontal ? v_tex_step.x : v_tex_step.y;
    v_base_dir_coord = u_is_horizontal ? v_tex_coord.x : v_tex_coord.y;

  // Precompute is_horizontal as float
    v_is_horizontal = u_is_horizontal ? 1.0 : 0.0;

  // Final clip-space position (same as regular fullscreen quad)
    gl_Position = vec4(a_position, 0.0, 1.0);
}