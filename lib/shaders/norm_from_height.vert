attribute vec2 a_position;

varying vec2 v_texCoord;
varying vec2 v_texelSize;

void main() {
    // Direct clip space coordinates (full screen quad)
    gl_Position = vec4(a_position, 0.0, 1.0);
    
    // Convert from clip space [-1,1] to texture space [0,1]
    v_texCoord = a_position * 0.5 + 0.5;
    
    // Pre-calculate texel size for fragment shader
    v_texelSize = vec2(1.0) / vec2(1024.0, 1024.0); // Will be overridden by uniform
}
