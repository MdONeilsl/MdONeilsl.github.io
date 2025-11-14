/**
 * @file exporter.js
 * @description GLTF exporter for 3D geometries with shape processing capabilities
 * @version 1.0.0
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

/* =========================
   Constants & Configuration
   ========================= */

const geometry_constants = Object.freeze({
    default_frame_width: 800,
    default_frame_height: 600,
    default_extrusion_depth: 0.1,
    circle_segment_count: 128,
    material_type: Object.freeze({
        front: 0,
        side: 1,
        back: 2
    }),
    normal_threshold: 0.9,
    epsilon: 1e-10,
    max_shapes: 1000
});

const error_codes = Object.freeze({
    invalid_input_data: 'invalid_input_data',
    invalid_frame_dimensions: 'invalid_frame_dimensions',
    no_valid_shapes: 'no_valid_shapes',
    export_operation_failed: 'export_operation_failed',
    shape_processing_failed: 'shape_processing_failed',
    geometry_merge_failed: 'geometry_merge_failed'
});

const shape_types = Object.freeze({
    rectangle: 'rectangle',
    circle: 'circle',
    triangle: 'triangle',
    pentagon: 'pentagon',
    hexagon: 'hexagon'
});

const polygon_sides = Object.freeze({
    [shape_types.triangle]: 3,
    [shape_types.pentagon]: 5,
    [shape_types.hexagon]: 6
});

/* =========================
   Custom Errors & Logging
   ========================= */

/**
 * Custom error for export operations with error codes
 */
class GeometryExportError extends Error {
    /**
     * @param {string} message
     * @param {string} error_code
     * @param {Object|null} details
     */
    constructor(message, error_code, details = null) {
        super(message);
        this.name = 'GeometryExportError';
        this.error_code = error_code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    to_json() {
        return {
            name: this.name,
            message: this.message,
            error_code: this.error_code,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

/**
 * Logger utility with configurable levels
 */
class ExportLogger {
    static levels = { error: 0, warn: 1, info: 2, debug: 3 };
    static current_level = ExportLogger.levels.warn;

    static set_level(level) {
        this.current_level = level;
    }

    static error(message, details = null) {
        if (this.current_level >= this.levels.error) {
            console.error(`[GLTFExport] ERROR: ${message}`, details || '');
        }
    }

    static warn(message, details = null) {
        if (this.current_level >= this.levels.warn) {
            console.warn(`[GLTFExport] WARN: ${message}`, details || '');
        }
    }

    static info(message, details = null) {
        if (this.current_level >= this.levels.info) {
            console.info(`[GLTFExport] INFO: ${message}`, details || '');
        }
    }

    static debug(message, details = null) {
        if (this.current_level >= this.levels.debug) {
            console.debug(`[GLTFExport] DEBUG: ${message}`, details || '');
        }
    }
}

/* =========================
   Geometry Validation & Utilities
   ========================= */

/**
 * @typedef {[number, number]} vec2
 */

/**
 * Validates shape data structure
 * @param {Object} shape_data
 * @returns {boolean}
 */
const validate_shape_data = (shape_data) => {
    if (!shape_data || typeof shape_data !== 'object') {
        return false;
    }

    const { type, width, height, is_temp } = shape_data;

    if (is_temp) return false;
    if (!type || typeof type !== 'string') return false;
    if (typeof width !== 'number' || width <= 0) return false;
    if (typeof height !== 'number' || height <= 0) return false;

    return true;
};

/**
 * Validates polygon has at least 3 vertices
 * @param {vec2[]} polygon
 * @returns {boolean}
 */
const is_valid_polygon = (polygon) => {
    return Array.isArray(polygon) && polygon.length >= 3 &&
        polygon.every(vertex => Array.isArray(vertex) && vertex.length === 2);
};

/**
 * Calculate signed area of polygon to determine winding order
 * @param {vec2[]} polygon
 * @returns {number}
 */
const calculate_signed_area = (polygon) => {
    let area = 0;
    const len = polygon.length;
    for (let i = 0; i < len; i++) {
        const [x1, y1] = polygon[i];
        const [x2, y2] = polygon[(i + 1) % len];
        area += (x1 * y2 - x2 * y1);
    }
    return area;
};

/**
 * Ensure polygon has CCW winding using signed area test
 * @param {vec2[]} polygon
 * @returns {vec2[]}
 */
const ensure_ccw = (polygon) => {
    if (!is_valid_polygon(polygon)) {
        ExportLogger.warn('Invalid polygon provided to ensure_ccw');
        return polygon || [];
    }

    const area = calculate_signed_area(polygon);
    return area < 0 ? polygon.slice().reverse() : polygon.slice();
};

/**
 * Calculate intersection point between two line segments
 * @param {vec2} line_start
 * @param {vec2} line_end
 * @param {vec2} clip_start
 * @param {vec2} clip_end
 * @returns {vec2|null}
 */
const calculate_line_intersection = (line_start, line_end, clip_start, clip_end) => {
    const [x1, y1] = line_start;
    const [x2, y2] = line_end;
    const [x3, y3] = clip_start;
    const [x4, y4] = clip_end;

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (Math.abs(denominator) < geometry_constants.epsilon) {
        return null;
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    if (t >= -geometry_constants.epsilon && t <= 1 + geometry_constants.epsilon &&
        u >= -geometry_constants.epsilon && u <= 1 + geometry_constants.epsilon) {
        const px = x1 + t * (x2 - x1);
        const py = y1 + t * (y2 - y1);
        return [px, py];
    }

    return null;
};

/**
 * Clip polygon using Sutherland-Hodgman algorithm
 * @param {vec2[]} subject_polygon
 * @param {vec2[]} clip_polygon
 * @returns {vec2[]}
 */
const clip_polygon = (subject_polygon, clip_polygon) => {
    if (!is_valid_polygon(subject_polygon) || !is_valid_polygon(clip_polygon)) {
        ExportLogger.warn('Invalid polygons provided for clipping');
        return [];
    }

    let output_list = ensure_ccw(subject_polygon).map(p => [...p]); // Clone points
    const clip_poly_ccw = ensure_ccw(clip_polygon);
    const clip_len = clip_poly_ccw.length;

    let current_clip_point = clip_poly_ccw[clip_len - 1];

    for (let clip_index = 0; clip_index < clip_len; clip_index++) {
        const next_clip_point = clip_poly_ccw[clip_index];
        const input_list = output_list;
        output_list = [];

        if (input_list.length === 0) break;

        const is_point_inside = (test_point) => {
            const dx = next_clip_point[0] - current_clip_point[0];
            const dy = next_clip_point[1] - current_clip_point[1];
            const tx = test_point[0] - current_clip_point[0];
            const ty = test_point[1] - current_clip_point[1];
            return (dx * ty - dy * tx) >= -geometry_constants.epsilon;
        };

        let prev = input_list[input_list.length - 1];
        let prev_inside = is_point_inside(prev);

        for (let i = 0; i < input_list.length; i++) {
            const curr = input_list[i];
            const curr_inside = is_point_inside(curr);

            if (curr_inside) {
                if (!prev_inside) {
                    const inter = calculate_line_intersection(prev, curr, current_clip_point, next_clip_point);
                    if (inter) {
                        // Snap to clip edge endpoint if very close
                        const dist_to_start = Math.hypot(inter[0] - current_clip_point[0], inter[1] - current_clip_point[1]);
                        const dist_to_end = Math.hypot(inter[0] - next_clip_point[0], inter[1] - next_clip_point[1]);
                        if (dist_to_start < geometry_constants.epsilon) {
                            output_list.push([current_clip_point[0], current_clip_point[1]]);
                        } else if (dist_to_end < geometry_constants.epsilon) {
                            output_list.push([next_clip_point[0], next_clip_point[1]]);
                        } else {
                            output_list.push(inter);
                        }
                    }
                }
                output_list.push([curr[0], curr[1]]);
            } else if (prev_inside) {
                const inter = calculate_line_intersection(prev, curr, current_clip_point, next_clip_point);
                if (inter) {
                    const dist_to_start = Math.hypot(inter[0] - current_clip_point[0], inter[1] - current_clip_point[1]);
                    const dist_to_end = Math.hypot(inter[0] - next_clip_point[0], inter[1] - next_clip_point[1]);
                    if (dist_to_start < geometry_constants.epsilon) {
                        output_list.push([current_clip_point[0], current_clip_point[1]]);
                    } else if (dist_to_end < geometry_constants.epsilon) {
                        output_list.push([next_clip_point[0], next_clip_point[1]]);
                    } else {
                        output_list.push(inter);
                    }
                }
            }

            prev = curr;
            prev_inside = curr_inside;
        }

        current_clip_point = next_clip_point;
    }

    return remove_duplicate_vertices(output_list);
};
/**
 * Remove duplicate consecutive vertices from polygon
 * @param {vec2[]} vertices
 * @returns {vec2[]}
 */
const remove_duplicate_vertices = (vertices) => {
    if (vertices.length <= 1) return vertices;

    const cleaned = [vertices[0]];
    const vertices_len = vertices.length;

    for (let i = 1; i < vertices_len; i++) {
        const [last_x, last_y] = cleaned[cleaned.length - 1];
        const [current_x, current_y] = vertices[i];

        if (Math.hypot(last_x - current_x, last_y - current_y) > geometry_constants.epsilon) {
            cleaned.push(vertices[i]);
        }
    }

    if (cleaned.length > 2) {
        const [first_x, first_y] = cleaned[0];
        const [last_x, last_y] = cleaned[cleaned.length - 1];
        if (Math.hypot(first_x - last_x, first_y - last_y) <= geometry_constants.epsilon) {
            cleaned.pop();
        }
    }

    return cleaned.length >= 3 ? cleaned : [];
};

/* =========================
   Shape Generation
   ========================= */

/**
 * Generate polygon points for different shape types
 * @param {Object} shape_data
 * @returns {vec2[]}
 */
const get_polygon_points = (shape_data) => {
    if (!validate_shape_data(shape_data)) {
        ExportLogger.warn('Invalid shape data provided', shape_data);
        return [];
    }

    const { type, x = 0, y = 0, width, height, rotation = 0 } = shape_data;
    const shape_type = String(type).toLowerCase();

    try {
        const center_x = x + width / 2;
        const center_y = y + height / 2;
        const cos_val = Math.cos(rotation);
        const sin_val = Math.sin(rotation);

        const transform_coordinates = (local_x, local_y) => [
            local_x * cos_val - local_y * sin_val + center_x,
            local_x * sin_val + local_y * cos_val + center_y
        ];

        switch (shape_type) {
            case shape_types.rectangle: {
                const half_width = width / 2;
                const half_height = height / 2;
                return [
                    [-half_width, -half_height],
                    [half_width, -half_height],
                    [half_width, half_height],
                    [-half_width, half_height]
                ].map(([local_x, local_y]) => transform_coordinates(local_x, local_y));
            }

            case shape_types.circle: {
                const radius_x = Math.abs(width) / 2;
                const radius_y = Math.abs(height) / 2;
                const points = [];
                const segment_count = geometry_constants.circle_segment_count;

                for (let i = 0; i < segment_count; i++) {
                    const angle = (i / segment_count) * Math.PI * 2;
                    const local_x = radius_x * Math.cos(angle);
                    const local_y = radius_y * Math.sin(angle);
                    points.push(transform_coordinates(local_x, local_y));
                }
                return points;
            }

            default: {
                const sides = polygon_sides[shape_type];
                if (sides) {
                    const radius = Math.abs(width) / 2;
                    const points = [];

                    for (let side_index = 0; side_index < sides; side_index++) {
                        const angle = (side_index / sides) * Math.PI * 2 - Math.PI / 2;
                        const local_x = radius * Math.cos(angle);
                        const local_y = radius * Math.sin(angle);
                        points.push(transform_coordinates(local_x, local_y));
                    }
                    return points;
                }

                ExportLogger.warn(`Unsupported shape type: ${type}`);
                return [];
            }
        }
    } catch (error) {
        ExportLogger.error('Error generating polygon points', { error, shape_data });
        return [];
    }
};

/* =========================
   Three.js Geometry Helpers
   ========================= */

/**
 * Create standardized materials for front, side, and back faces
 * @returns {THREE.Material[]}
 */
const create_geometry_materials = () => [
    new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        name: 'front_face',
        transparent: true,
        opacity: 1.0
    }),
    new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        name: 'side_face',
        transparent: true,
        opacity: 1.0
    }),
    new THREE.MeshBasicMaterial({
        color: 0xff0000,
        name: 'back_face',
        transparent: true,
        opacity: 1.0
    })
];

/**
 * Calculate normal for a triangle defined by three vertices
 * @param {Float32Array} positions
 * @param {number} index_0
 * @param {number} index_1
 * @param {number} index_2
 * @returns {THREE.Vector3}
 */
const calculate_triangle_normal = (positions, index_0, index_1, index_2) => {
    const point_0 = new THREE.Vector3(
        positions[index_0 * 3],
        positions[index_0 * 3 + 1],
        positions[index_0 * 3 + 2]
    );
    const point_1 = new THREE.Vector3(
        positions[index_1 * 3],
        positions[index_1 * 3 + 1],
        positions[index_1 * 3 + 2]
    );
    const point_2 = new THREE.Vector3(
        positions[index_2 * 3],
        positions[index_2 * 3 + 1],
        positions[index_2 * 3 + 2]
    );

    const normal_vector = new THREE.Vector3()
        .subVectors(point_1, point_0)
        .cross(new THREE.Vector3().subVectors(point_2, point_0))
        .normalize();

    return normal_vector;
};

/**
 * Compute representative normal for a geometry group
 * @param {THREE.BufferGeometry} geometry
 * @param {Object} group
 * @returns {THREE.Vector3|null}
 */
const compute_group_representative_normal = (geometry, group) => {
    const position_attribute = geometry.getAttribute('position');
    if (!position_attribute) return null;

    const positions = position_attribute.array;
    const index_attribute = geometry.index;
    const { start, count } = group;

    if (count < 3) return null;

    try {
        if (index_attribute) {
            const indices = index_attribute.array;
            if (start + 2 >= indices.length) return null;

            const idx_0 = indices[start];
            const idx_1 = indices[start + 1];
            const idx_2 = indices[start + 2];

            return calculate_triangle_normal(positions, idx_0, idx_1, idx_2);
        } else {
            const vertex_start = Math.floor(start / 3) * 3;
            if (vertex_start + 2 >= positions.length / 3) return null;

            return calculate_triangle_normal(positions, vertex_start, vertex_start + 1, vertex_start + 2);
        }
    } catch (error) {
        ExportLogger.error('Error computing group normal', { error, group });
        return null;
    }
};

/**
 * Assign material indices based on face normals
 * @param {THREE.BufferGeometry} geometry
 */
const assign_material_indices_by_group = (geometry) => {
    if (!geometry.groups || geometry.groups.length === 0) {
        ExportLogger.warn('No groups found in geometry');
        return;
    }

    const group_count = geometry.groups.length;
    for (let group_index = 0; group_index < group_count; group_index++) {
        const group = geometry.groups[group_index];
        const normal = compute_group_representative_normal(geometry, group);

        if (!normal) {
            geometry.groups[group_index].materialIndex = geometry_constants.material_type.side;
            continue;
        }

        if (normal.z > geometry_constants.normal_threshold) {
            geometry.groups[group_index].materialIndex = geometry_constants.material_type.front;
        } else if (normal.z < -geometry_constants.normal_threshold) {
            geometry.groups[group_index].materialIndex = geometry_constants.material_type.back;
        } else {
            geometry.groups[group_index].materialIndex = geometry_constants.material_type.side;
        }
    }
};

/**
 * Extract vertex indices used by a geometry group
 * @param {THREE.BufferGeometry} geometry
 * @param {Object} group
 * @returns {Set<number>}
 */
const get_vertex_indices_for_group = (geometry, group) => {
    const vertex_indices = new Set();
    const position_attribute = geometry.getAttribute('position');

    if (!position_attribute) return vertex_indices;

    const { start, count } = group;

    if (geometry.index) {
        const indices = geometry.index.array;
        const end_index = Math.min(start + count, indices.length);

        for (let i = start; i < end_index; i++) {
            vertex_indices.add(indices[i]);
        }
    } else {
        const end_index = Math.min(start + count, position_attribute.count);

        for (let i = start; i < end_index; i++) {
            vertex_indices.add(i);
        }
    }

    return vertex_indices;
};

/**
 * Remap UV coordinates for geometry groups
 * @param {THREE.BufferGeometry} geometry
 * @param {number} frame_width
 * @param {number} frame_height
 */
const remap_uvs_for_groups = (geometry, frame_width, frame_height) => {
    const uv_attribute = geometry.getAttribute('uv');
    const position_attribute = geometry.getAttribute('position');

    if (!uv_attribute || !position_attribute || !geometry.groups) {
        return;
    }

    for (const group of geometry.groups) {
        const vertex_indices = get_vertex_indices_for_group(geometry, group);

        for (const vertex_index of vertex_indices) {
            if (vertex_index >= position_attribute.count) continue;

            const x_val = position_attribute.getX(vertex_index);
            const y_val = position_attribute.getY(vertex_index);

            const u_val = x_val;
            const v_val = 1 - y_val;

            if (Number.isFinite(u_val) && Number.isFinite(v_val)) {
                uv_attribute.setXY(vertex_index, u_val, v_val);
            }
        }
    }

    uv_attribute.needsUpdate = true;
};

/* =========================
   Geometry Processing
   ========================= */

/**
 * Process single shape into extruded geometry
 * @param {Object} shape_data
 * @param {number} frame_width
 * @param {number} frame_height
 * @returns {THREE.BufferGeometry|null}
 */
const process_shape_geometry = (shape_data, frame_width, frame_height) => {
    if (!validate_shape_data(shape_data)) {
        return null;
    }

    const shape_points = get_polygon_points(shape_data);
    if (!is_valid_polygon(shape_points)) {
        ExportLogger.debug('Invalid shape points generated', shape_data);
        return null;
    }

    const frame_bounds = [
        [0, 0],
        [frame_width, 0],
        [frame_width, frame_height],
        [0, frame_height]
    ];

    const clipped_points = clip_polygon(shape_points, frame_bounds);
    if (!is_valid_polygon(clipped_points)) {
        ExportLogger.debug('Shape completely outside frame bounds', shape_data);
        return null;
    }

    try {
        const shape = new THREE.Shape();
        const normalized_points = clipped_points.map(([x_val, y_val]) => [
            x_val / frame_width,
            1 - (y_val / frame_height)
        ]);

        shape.moveTo(normalized_points[0][0], normalized_points[0][1]);
        const points_len = normalized_points.length;
        for (let i = 1; i < points_len; i++) {
            shape.lineTo(normalized_points[i][0], normalized_points[i][1]);
        }

        const extrusion_settings = {
            depth: geometry_constants.default_extrusion_depth,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrusion_settings);

        assign_material_indices_by_group(geometry);
        remap_uvs_for_groups(geometry, frame_width, frame_height);

        return geometry;
    } catch (error) {
        ExportLogger.error('Error creating extrusion geometry', { error, shape_data });
        return null;
    }
};

/**
 * Merge geometries by material type
 * @param {THREE.BufferGeometry[]} geometries
 * @returns {THREE.BufferGeometry}
 */
const merge_geometries_by_material = (geometries) => {
    if (!Array.isArray(geometries) || geometries.length === 0) {
        throw new GeometryExportError(
            'No geometries provided for merge',
            error_codes.geometry_merge_failed
        );
    }

    const material_geometries = {
        [geometry_constants.material_type.front]: [],
        [geometry_constants.material_type.side]: [],
        [geometry_constants.material_type.back]: []
    };

    for (const geometry of geometries) {
        if (!geometry.groups || geometry.groups.length === 0) {
            ExportLogger.warn('Geometry has no groups, skipping');
            continue;
        }

        for (const group of geometry.groups) {
            const material_index = group.materialIndex;
            if (material_geometries[material_index] === undefined) {
                ExportLogger.warn(`Unknown material index: ${material_index}`);
                continue;
            }

            try {
                const group_geometry = geometry.clone();

                if (geometry.index) {
                    const indices = geometry.index.array.slice(group.start, group.start + group.count);
                    group_geometry.setIndex(new THREE.BufferAttribute(indices, 1));
                } else {
                    const attribute_names = ['position', 'normal', 'uv'];
                    for (const attr_name of attribute_names) {
                        const attribute = geometry.getAttribute(attr_name);
                        if (attribute) {
                            const item_size = attribute.itemSize;
                            const sliced_array = attribute.array.slice(
                                group.start * item_size,
                                (group.start + group.count) * item_size
                            );
                            group_geometry.setAttribute(
                                attr_name,
                                new THREE.BufferAttribute(sliced_array, item_size)
                            );
                        }
                    }
                }

                const optimized_geometry = BufferGeometryUtils.mergeVertices(group_geometry, 0.001);
                material_geometries[material_index].push(optimized_geometry);

            } catch (error) {
                ExportLogger.error('Error processing geometry group', { error, group });
            }
        }
    }

    const merged_geometries = [];

    for (const [material_index, geom_list] of Object.entries(material_geometries)) {
        if (geom_list.length > 0) {
            try {
                const merged = BufferGeometryUtils.mergeGeometries(geom_list);
                if (merged) {
                    merged_geometries.push({
                        geometry: merged,
                        material_index: parseInt(material_index)
                    });
                }
            } catch (error) {
                ExportLogger.error(`Error merging geometries for material ${material_index}`, error);
            }
        }
    }

    if (merged_geometries.length === 0) {
        return new THREE.BufferGeometry();
    }

    const final_geometry = BufferGeometryUtils.mergeGeometries(
        merged_geometries.map(item => item.geometry)
    );

    final_geometry.clearGroups();
    let current_start = 0;

    for (const { geometry: merged_geo, material_index } of merged_geometries) {
        const count = merged_geo.index ? merged_geo.index.count : merged_geo.getAttribute('position').count / 3;
        final_geometry.addGroup(current_start, count, material_index);
        current_start += count;
    }

    return final_geometry;
};

/* =========================
   Main Export Function
   ========================= */

/**
 * Export shapes to GLTF format
 * @param {Object[]} shape_list
 * @param {Object} export_options
 * @param {number} export_options.frame_width
 * @param {number} export_options.frame_height
 * @param {boolean} export_options.binary
 * @param {boolean} export_options.optimize
 * @returns {Promise<ArrayBuffer|Object|null>}
 */
export const export_to_gltf = async (shape_list, export_options = {}) => {
    const {
        frame_width = geometry_constants.default_frame_width,
        frame_height = geometry_constants.default_frame_height,
        binary = true,
        optimize = true
    } = export_options;

    if (!Array.isArray(shape_list)) {
        throw new GeometryExportError(
            'Shape list must be an array',
            error_codes.invalid_input_data
        );
    }

    if (shape_list.length > geometry_constants.max_shapes) {
        throw new GeometryExportError(
            `Too many shapes (max: ${geometry_constants.max_shapes})`,
            error_codes.invalid_input_data
        );
    }

    if (frame_width <= 0 || frame_height <= 0) {
        throw new GeometryExportError(
            'Frame dimensions must be positive values',
            error_codes.invalid_frame_dimensions,
            { frame_width, frame_height }
        );
    }

    const valid_shapes = shape_list.filter(validate_shape_data);
    ExportLogger.info(`Processing ${valid_shapes.length} valid shapes`);

    if (valid_shapes.length === 0) {
        throw new GeometryExportError(
            'No valid shapes found for export',
            error_codes.no_valid_shapes
        );
    }

    try {
        const geometry_promises = valid_shapes.map(shape =>
            Promise.resolve(process_shape_geometry(shape, frame_width, frame_height))
        );

        const geometry_results = await Promise.all(geometry_promises);
        const valid_geometries = geometry_results.filter(geo => geo !== null);

        ExportLogger.info(`Generated ${valid_geometries.length} valid geometries`);

        if (valid_geometries.length === 0) {
            return null;
        }

        const merged_geometry = valid_geometries.length > 1
            ? merge_geometries_by_material(valid_geometries)
            : valid_geometries[0];

        valid_geometries.forEach(geometry => {
            if (geometry !== merged_geometry) {
                try {
                    geometry.dispose();
                } catch (error) {
                    ExportLogger.warn('Error disposing geometry', error);
                }
            }
        });

        const materials = create_geometry_materials();
        const mesh = new THREE.Mesh(merged_geometry, materials);

        const exporter = new GLTFExporter();
        const gltf_data = await exporter.parseAsync(mesh, { binary });

        try {
            merged_geometry.dispose();
            materials.forEach(material => material.dispose());
        } catch (error) {
            ExportLogger.warn('Error during cleanup', error);
        }

        return gltf_data;

    } catch (error) {
        if (error instanceof GeometryExportError) {
            throw error;
        }

        throw new GeometryExportError(
            `GLTF export operation failed: ${error.message}`,
            error_codes.export_operation_failed,
            { original_error: error.message }
        );
    }
};

export const geometry_export_utils = {
    validate_shape_data,
    get_polygon_points,
    clip_polygon,
    ensure_ccw,
    calculate_line_intersection,
    geometry_constants,
    error_codes
};

export default export_to_gltf;