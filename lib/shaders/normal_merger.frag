precision mediump float;

uniform sampler2D base_tex;
uniform sampler2D add_tex;
uniform sampler2D mask_tex;

uniform float y_sign;

varying vec2 v_uv;

vec3 norm(vec3 v) {
    float len = length(v);
    return len > 0.0 ? v / len : v;
}

vec3 cros(vec3 a, vec3 b) {
    return vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

float dt(vec3 a, vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
    float cos_a = cos(angle);
    float sin_a = sin(angle);
    float k = 1.0 - cos_a;
    vec3 u = axis;
    return vec3(
        v.x * (cos_a + u.x * u.x * k) + v.y * (u.x * u.y * k - u.z * sin_a) + v.z * (u.x * u.z * k + u.y * sin_a),
        v.x * (u.y * u.x * k + u.z * sin_a) + v.y * (cos_a + u.y * u.y * k) + v.z * (u.y * u.z * k - u.x * sin_a),
        v.x * (u.z * u.x * k - u.y * sin_a) + v.y * (u.z * u.y * k + u.x * sin_a) + v.z * (cos_a + u.z * u.z * k)
    );
}

void main() {
    vec4 base_c = texture2D(base_tex, v_uv);
    vec3 base_n = base_c.rgb * 2.0 - 1.0;
    base_n.y *= y_sign;

    vec4 add_c = texture2D(add_tex, v_uv);
    vec3 add_n = add_c.rgb * 2.0 - 1.0;
    add_n.y *= y_sign;

    float intensity = texture2D(mask_tex, v_uv).r;

    vec3 z = vec3(0.0, 0.0, 1.0);
    vec3 axis = norm(cros(z, add_n));
    float d = clamp(dt(z, add_n), -1.0, 1.0);
    float angle = acos(d) * intensity;

    vec3 result_n = base_n;
    float axis_len = length(axis);
    if(axis_len > 1e-6 && angle > 1e-6) {
        result_n = norm(rotate(base_n, axis, angle));
    }

    vec3 out_color = result_n * 0.5 + 0.5;
    out_color.y = (result_n.y * y_sign) * 0.5 + 0.5;

    float base_a = base_c.a;
    float add_a = add_c.a;
    float alpha = (1.0 - intensity) * base_a + intensity * add_a;

    gl_FragColor = vec4(out_color, alpha);
}