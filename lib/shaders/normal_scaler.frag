precision highp float;

uniform sampler2D source_tex;

uniform vec2 source_size;
uniform vec2 target_size;

float terp(float t, float a, float b, float c, float d) {
    float t2 = t * t;
    float t3 = t2 * t;
    return 0.5 * (2.0 * b + (c - a) * t + (2.0 * a - 5.0 * b + 4.0 * c - d) * t2 + (-a + 3.0 * b - 3.0 * c + d) * t3);
}

vec4 texel(float px, float py) {
    px = clamp(px, 0.0, source_size.x - 1.0);
    py = clamp(py, 0.0, source_size.y - 1.0);
    vec2 uv = (vec2(px, py) + 0.5) / source_size;
    return texture2D(source_tex, uv);
}

void main() {
    vec2 pixel = gl_FragCoord.xy;
    
    // CORRECT: Independent scaling for width and height
    vec2 src_pixel = vec2(
        pixel.x * source_size.x / target_size.x,
        pixel.y * source_size.y / target_size.y
    );
    
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
        rgba[ch] = clamp(terp(dy, row0, row1, row2, row3), 0.0, 1.0);
    }

    vec3 normal = rgba.rgb * 2.0 - 1.0;
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