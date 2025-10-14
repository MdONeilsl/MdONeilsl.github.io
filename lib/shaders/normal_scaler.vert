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

// Attributes
attribute vec2 position;

// Uniforms
uniform vec2 source_size;
uniform vec2 target_size;

// Varyings
varying vec2 v_src_pixel;
varying vec2 v_source_clamp;
varying vec2 v_uv_step;

void main() {
    vec2 tex_coord = (position * 0.5) + 0.5;
    v_src_pixel = tex_coord * source_size;
    v_source_clamp = source_size - 1.0;
    v_uv_step = 1.0 / source_size;
    gl_Position = vec4(position, 0.0, 1.0);
}
