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

uniform sampler2D source_tex;

// Varyings from vertex shader
varying vec2 v_src_pixel;
varying vec2 v_source_clamp;
varying vec2 v_uv_step;

float terp(float t, float a, float b, float c, float d) {
    float t2 = t * t;
    float t3 = t2 * t;
    return 0.5 * (2.0 * b + (c - a) * t + (2.0 * a - 5.0 * b + 4.0 * c - d) * t2 + (-a + 3.0 * b - 3.0 * c + d) * t3);
}

vec4 texel(float px, float py) {
    px = clamp(px, 0.0, v_source_clamp.x);
    py = clamp(py, 0.0, v_source_clamp.y);
    vec2 uv = (vec2(px, py) + 0.5) * v_uv_step;
    vec4 color = texture2D(source_tex, uv);
    return vec4(color.rgb * 2.0 - 1.0, color.a);
}

void main() {
    vec2 src_pixel = v_src_pixel;
    
    float fx = floor(src_pixel.x);
    float fy = floor(src_pixel.y);
    
    float dx = src_pixel.x - fx;
    float dy = src_pixel.y - fy;

    vec4 rgba;
    for(int ch = 0; ch < 4; ++ch) {
        float row0 = terp(dx, texel(fx - 1.0, fy - 1.0)[ch], texel(fx, fy - 1.0)[ch], texel(fx + 1.0, fy - 1.0)[ch], texel(fx + 2.0, fy - 1.0)[ch]);
        float row1 = terp(dx, texel(fx - 1.0, fy)[ch], texel(fx, fy)[ch], texel(fx + 1.0, fy)[ch], texel(fx + 2.0, fy)[ch]);
        float row2 = terp(dx, texel(fx - 1.0, fy + 1.0)[ch], texel(fx, fy + 1.0)[ch], texel(fx + 1.0, fy + 1.0)[ch], texel(fx + 2.0, fy + 1.0)[ch]);
        float row3 = terp(dx, texel(fx - 1.0, fy + 2.0)[ch], texel(fx, fy + 2.0)[ch], texel(fx + 1.0, fy + 2.0)[ch], texel(fx + 2.0, fy + 2.0)[ch]);
        rgba[ch] = clamp(terp(dy, row0, row1, row2, row3), ch < 3 ? -1.0 : 0.0, 1.0);
    }

    vec3 normal = rgba.rgb;
    float len = length(normal);
    if(len > 1e-8) {
        normal /= len;
    } else {
        normal = vec3(0.0, 0.0, 1.0);
    }

    vec4 color = vec4((normal + 1.0) / 2.0, rgba.a);
    if(color.a != color.a) {
        color.a = 1.0;
    }
    color.a = clamp(color.a, 0.0, 1.0);

    gl_FragColor = color;
}
