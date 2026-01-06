precision mediump float;

uniform sampler2D tex0;
uniform sampler2D tex1;
uniform sampler2D tex2;

uniform int num_terms0;
uniform int num_terms1;
uniform int num_terms2;
uniform int num_terms3;

uniform float constant0;
uniform float constant1;
uniform float constant2;
uniform float constant3;

uniform float coeffs0[4];
uniform float coeffs1[4];
uniform float coeffs2[4];
uniform float coeffs3[4];

uniform int input_idxs0[4];
uniform int input_idxs1[4];
uniform int input_idxs2[4];
uniform int input_idxs3[4];

uniform int channels0[4];
uniform int channels1[4];
uniform int channels2[4];
uniform int channels3[4];

varying vec2 v_uv;

void main() {
    vec4 color = vec4(0.0);

    float val = constant0;
    for(int t = 0; t < 4; ++t) {
        if(t < num_terms0) {
            float coeff = coeffs0[t];
            int input_idx = input_idxs0[t];
            int channel = channels0[t];
            vec4 in_color;
            if(input_idx == 0) {
                in_color = texture2D(tex0, v_uv);
            } else if(input_idx == 1) {
                in_color = texture2D(tex1, v_uv);
            } else {
                in_color = texture2D(tex2, v_uv);
            }
            float in_val;
            if(channel == 0)
                in_val = in_color.r;
            else if(channel == 1)
                in_val = in_color.g;
            else if(channel == 2)
                in_val = in_color.b;
            else
                in_val = in_color.a;
            val += coeff * in_val;
        }
    }
    color.r = clamp(val, 0.0, 1.0);

    val = constant1;
    for(int t = 0; t < 4; ++t) {
        if(t < num_terms1) {
            float coeff = coeffs1[t];
            int input_idx = input_idxs1[t];
            int channel = channels1[t];
            vec4 in_color;
            if(input_idx == 0) {
                in_color = texture2D(tex0, v_uv);
            } else if(input_idx == 1) {
                in_color = texture2D(tex1, v_uv);
            } else {
                in_color = texture2D(tex2, v_uv);
            }
            float in_val;
            if(channel == 0)
                in_val = in_color.r;
            else if(channel == 1)
                in_val = in_color.g;
            else if(channel == 2)
                in_val = in_color.b;
            else
                in_val = in_color.a;
            val += coeff * in_val;
        }
    }
    color.g = clamp(val, 0.0, 1.0);

    val = constant2;
    for(int t = 0; t < 4; ++t) {
        if(t < num_terms2) {
            float coeff = coeffs2[t];
            int input_idx = input_idxs2[t];
            int channel = channels2[t];
            vec4 in_color;
            if(input_idx == 0) {
                in_color = texture2D(tex0, v_uv);
            } else if(input_idx == 1) {
                in_color = texture2D(tex1, v_uv);
            } else {
                in_color = texture2D(tex2, v_uv);
            }
            float in_val;
            if(channel == 0)
                in_val = in_color.r;
            else if(channel == 1)
                in_val = in_color.g;
            else if(channel == 2)
                in_val = in_color.b;
            else
                in_val = in_color.a;
            val += coeff * in_val;
        }
    }
    color.b = clamp(val, 0.0, 1.0);

    val = constant3;
    for(int t = 0; t < 4; ++t) {
        if(t < num_terms3) {
            float coeff = coeffs3[t];
            int input_idx = input_idxs3[t];
            int channel = channels3[t];
            vec4 in_color;
            if(input_idx == 0) {
                in_color = texture2D(tex0, v_uv);
            } else if(input_idx == 1) {
                in_color = texture2D(tex1, v_uv);
            } else {
                in_color = texture2D(tex2, v_uv);
            }
            float in_val;
            if(channel == 0)
                in_val = in_color.r;
            else if(channel == 1)
                in_val = in_color.g;
            else if(channel == 2)
                in_val = in_color.b;
            else
                in_val = in_color.a;
            val += coeff * in_val;
        }
    }
    color.a = clamp(val, 0.0, 1.0);

    gl_FragColor = color;
}