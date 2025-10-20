precision highp float;

uniform sampler2D u_heightMap;
uniform vec2 u_resolution;
uniform float u_strength;
uniform float u_smoothing;
uniform float u_useScharr;
uniform float u_invertRed;
uniform float u_invertGreen;

varying vec2 v_texCoord;
varying vec2 v_texelSize;

float getHeight(vec2 coord) {
    vec4 sample = texture2D(u_heightMap, coord);
    return (sample.r + sample.g + sample.b) / 3.0;
}

// 3x3 Gaussian blur for quality smoothing
float getSmoothedHeight3x3(vec2 coord) {
    vec2 texel = 1.0 / u_resolution;
    
    // Gaussian kernel weights (3x3)
    float w00 = 0.077847; float w10 = 0.123317; float w20 = 0.077847;
    float w01 = 0.123317; float w11 = 0.195346; float w21 = 0.123317;
    float w02 = 0.077847; float w12 = 0.123317; float w22 = 0.077847;
    
    float sum = 0.0;
    
    sum += getHeight(coord + vec2(-texel.x, -texel.y)) * w00;
    sum += getHeight(coord + vec2( 0.0,      -texel.y)) * w10;
    sum += getHeight(coord + vec2( texel.x,  -texel.y)) * w20;
    
    sum += getHeight(coord + vec2(-texel.x,   0.0)) * w01;
    sum += getHeight(coord + vec2( 0.0,        0.0)) * w11;
    sum += getHeight(coord + vec2( texel.x,    0.0)) * w21;
    
    sum += getHeight(coord + vec2(-texel.x,   texel.y)) * w02;
    sum += getHeight(coord + vec2( 0.0,        texel.y)) * w12;
    sum += getHeight(coord + vec2( texel.x,    texel.y)) * w22;
    
    return sum;
}

// 5x5 Gaussian blur for higher quality smoothing
float getSmoothedHeight5x5(vec2 coord) {
    vec2 texel = 1.0 / u_resolution;
    
    // Gaussian kernel weights (5x5)
    float w00 = 0.003765; float w10 = 0.015019; float w20 = 0.023792; float w30 = 0.015019; float w40 = 0.003765;
    float w01 = 0.015019; float w11 = 0.059912; float w21 = 0.094907; float w31 = 0.059912; float w41 = 0.015019;
    float w02 = 0.023792; float w12 = 0.094907; float w22 = 0.150342; float w32 = 0.094907; float w42 = 0.023792;
    float w03 = 0.015019; float w13 = 0.059912; float w23 = 0.094907; float w33 = 0.059912; float w43 = 0.015019;
    float w04 = 0.003765; float w14 = 0.015019; float w24 = 0.023792; float w34 = 0.015019; float w44 = 0.003765;
    
    float sum = 0.0;
    
    // Row 1
    sum += getHeight(coord + vec2(-2.0 * texel.x, -2.0 * texel.y)) * w00;
    sum += getHeight(coord + vec2(-1.0 * texel.x, -2.0 * texel.y)) * w10;
    sum += getHeight(coord + vec2( 0.0 * texel.x, -2.0 * texel.y)) * w20;
    sum += getHeight(coord + vec2( 1.0 * texel.x, -2.0 * texel.y)) * w30;
    sum += getHeight(coord + vec2( 2.0 * texel.x, -2.0 * texel.y)) * w40;
    
    // Row 2
    sum += getHeight(coord + vec2(-2.0 * texel.x, -1.0 * texel.y)) * w01;
    sum += getHeight(coord + vec2(-1.0 * texel.x, -1.0 * texel.y)) * w11;
    sum += getHeight(coord + vec2( 0.0 * texel.x, -1.0 * texel.y)) * w21;
    sum += getHeight(coord + vec2( 1.0 * texel.x, -1.0 * texel.y)) * w31;
    sum += getHeight(coord + vec2( 2.0 * texel.x, -1.0 * texel.y)) * w41;
    
    // Row 3
    sum += getHeight(coord + vec2(-2.0 * texel.x,  0.0 * texel.y)) * w02;
    sum += getHeight(coord + vec2(-1.0 * texel.x,  0.0 * texel.y)) * w12;
    sum += getHeight(coord + vec2( 0.0 * texel.x,  0.0 * texel.y)) * w22;
    sum += getHeight(coord + vec2( 1.0 * texel.x,  0.0 * texel.y)) * w32;
    sum += getHeight(coord + vec2( 2.0 * texel.x,  0.0 * texel.y)) * w42;
    
    // Row 4
    sum += getHeight(coord + vec2(-2.0 * texel.x,  1.0 * texel.y)) * w03;
    sum += getHeight(coord + vec2(-1.0 * texel.x,  1.0 * texel.y)) * w13;
    sum += getHeight(coord + vec2( 0.0 * texel.x,  1.0 * texel.y)) * w23;
    sum += getHeight(coord + vec2( 1.0 * texel.x,  1.0 * texel.y)) * w33;
    sum += getHeight(coord + vec2( 2.0 * texel.x,  1.0 * texel.y)) * w43;
    
    // Row 5
    sum += getHeight(coord + vec2(-2.0 * texel.x,  2.0 * texel.y)) * w04;
    sum += getHeight(coord + vec2(-1.0 * texel.x,  2.0 * texel.y)) * w14;
    sum += getHeight(coord + vec2( 0.0 * texel.x,  2.0 * texel.y)) * w24;
    sum += getHeight(coord + vec2( 1.0 * texel.x,  2.0 * texel.y)) * w34;
    sum += getHeight(coord + vec2( 2.0 * texel.x,  2.0 * texel.y)) * w44;
    
    return sum;
}

float getSmoothedHeight(vec2 coord) {
    if (u_smoothing < 0.5) {
        return getHeight(coord);
    } else if (u_smoothing < 1.5) {
        return getSmoothedHeight3x3(coord);
    } else {
        return getSmoothedHeight5x5(coord);
    }
}

void main() {
    vec2 texel = 1.0 / u_resolution;
    vec2 coord = v_texCoord;
    
    // Sample 3x3 neighborhood with optional smoothing
    float s0 = getSmoothedHeight(coord + vec2(-texel.x, -texel.y));
    float s1 = getSmoothedHeight(coord + vec2( 0.0,      -texel.y));
    float s2 = getSmoothedHeight(coord + vec2( texel.x,  -texel.y));
    float s3 = getSmoothedHeight(coord + vec2(-texel.x,   0.0));
    float s4 = getSmoothedHeight(coord);
    float s5 = getSmoothedHeight(coord + vec2( texel.x,   0.0));
    float s6 = getSmoothedHeight(coord + vec2(-texel.x,   texel.y));
    float s7 = getSmoothedHeight(coord + vec2( 0.0,        texel.y));
    float s8 = getSmoothedHeight(coord + vec2( texel.x,    texel.y));
    
    // Calculate gradients using selected filter
    float dX, dY;
    float filterMultiplier = 1.0;
    
    if (u_useScharr > 0.5) {
        // Scharr filter - superior rotational symmetry and accuracy
        dX = (-3.0 * s0 + 0.0 * s1 + 3.0 * s2 -10.0 * s3 + 0.0 * s4 + 10.0 * s5 -3.0 * s6 + 0.0 * s7 + 3.0 * s8);
        dY = (-3.0 * s0 - 10.0 * s1 - 3.0 * s2 + 0.0 * s3 + 0.0 * s4 + 0.0 * s5 + 3.0 * s6 + 10.0 * s7 + 3.0 * s8);
        filterMultiplier = 0.4; // Normalize Scharr to match Sobel strength
    } else {
        // Standard Sobel filter
        dX = (-1.0 * s0 + 0.0 * s1 + 1.0 * s2 -2.0 * s3 + 0.0 * s4 + 2.0 * s5 -1.0 * s6 + 0.0 * s7 + 1.0 * s8);
        dY = (-1.0 * s0 - 2.0 * s1 - 1.0 * s2 + 0.0 * s3 + 0.0 * s4 + 0.0 * s5 + 1.0 * s6 + 2.0 * s7 + 1.0 * s8);
        filterMultiplier = 1.0;
    }
    
    dX *= filterMultiplier;
    dY *= filterMultiplier;
    
    // Calculate normal vector with consistent strength
    vec3 normal = vec3(-dX * u_strength, -dY * u_strength, 1.0);
    
    // Apply coordinate system conversions
    if (u_invertRed > 0.5) normal.x = -normal.x;
    if (u_invertGreen > 0.5) normal.y = -normal.y;
    
    // High-quality normalization with edge case handling
    float len = sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (len > 0.001) {
        normal = normal / len;
    } else {
        normal = vec3(0.0, 0.0, 1.0);
    }
    
    // Convert to normal map RGB format [0,1] range
    vec3 normalRGB = normal * 0.5 + 0.5;
    
    // Output final normal map
    gl_FragColor = vec4(normalRGB, 1.0);
}
