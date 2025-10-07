
export const normalize = v => {
  const x = v[0], y = v[1], z = v[2];
  const len_sq = x * x + y * y + z * z;
  if (len_sq <= 1e-8) return v;
  const len_inv = 1 / Math.sqrt(len_sq);
  return [x * len_inv, y * len_inv, z * len_inv];
};

export const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
];

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const rotate_vector = (vec, axis, angle) => {
    const cos_a = Math.cos(angle);
    const sin_a = Math.sin(angle);
    const k = 1 - cos_a;
    const [x, y, z] = vec;
    const [ux, uy, uz] = axis;

    const rotated = [
        x * (cos_a + ux * ux * k) + y * (ux * uy * k - uz * sin_a) + z * (ux * uz * k + uy * sin_a),
        x * (uy * ux * k + uz * sin_a) + y * (cos_a + uy * uy * k) + z * (uy * uz * k - ux * sin_a),
        x * (uz * ux * k - uy * sin_a) + y * (uz * uy * k + ux * sin_a) + z * (cos_a + uz * uz * k)
    ];
    return normalize(rotated);
};