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

void main() {
    vec2 src_pixel = v_src_pixel;
    float fx = floor(src_pixel.x);
    float fy = floor(src_pixel.y);
    float u = src_pixel.x - fx;
    float v = src_pixel.y - fy;

    vec2 px00 = vec2(fx, fy);
    vec2 px10 = vec2(fx + 1.0, fy);
    vec2 px01 = vec2(fx, fy + 1.0);
    vec2 px11 = vec2(fx + 1.0, fy + 1.0);

    px00.x = clamp(px00.x, 0.0, v_source_clamp.x);
    px00.y = clamp(px00.y, 0.0, v_source_clamp.y);
    px10.x = clamp(px10.x, 0.0, v_source_clamp.x);
    px10.y = clamp(px10.y, 0.0, v_source_clamp.y);
    px01.x = clamp(px01.x, 0.0, v_source_clamp.x);
    px01.y = clamp(px01.y, 0.0, v_source_clamp.y);
    px11.x = clamp(px11.x, 0.0, v_source_clamp.x);
    px11.y = clamp(px11.y, 0.0, v_source_clamp.y);

    vec2 uv00 = (px00 + 0.5) * v_uv_step;
    vec2 uv10 = (px10 + 0.5) * v_uv_step;
    vec2 uv01 = (px01 + 0.5) * v_uv_step;
    vec2 uv11 = (px11 + 0.5) * v_uv_step;

    vec4 tex00 = texture2D(source_tex, uv00);
    vec4 tex10 = texture2D(source_tex, uv10);
    vec4 tex01 = texture2D(source_tex, uv01);
    vec4 tex11 = texture2D(source_tex, uv11);

    vec3 N00 = 2.0 * tex00.rgb - 1.0;
    vec3 N10 = 2.0 * tex10.rgb - 1.0;
    vec3 N01 = 2.0 * tex01.rgb - 1.0;
    vec3 N11 = 2.0 * tex11.rgb - 1.0;

    vec3 interpolatedNormal = 
        (1.0 - u) * (1.0 - v) * N00 +
        u * (1.0 - v) * N10 +
        (1.0 - u) * v * N01 +
        u * v * N11;

    vec3 finalNormal = normalize(interpolatedNormal);
    vec3 outputNormal = (finalNormal + 1.0) * 0.5;

    float outputAlpha = 
        (1.0 - u) * (1.0 - v) * tex00.a +
        u * (1.0 - v) * tex10.a +
        (1.0 - u) * v * tex01.a +
        u * v * tex11.a;

    if(outputAlpha != outputAlpha) {
        outputAlpha = 1.0;
    }
    outputAlpha = clamp(outputAlpha, 0.0, 1.0);
    gl_FragColor = vec4(outputNormal, outputAlpha);
}
