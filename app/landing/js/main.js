/**
 * Starfield animation optimized for performance at 24 FPS
 * @type {HTMLCanvasElement}
 */
const canvas = document.getElementById('canvas');
/**
 * 2D rendering context
 * @type {CanvasRenderingContext2D}
 */
const ctx = canvas.getContext('2d');

/**
 * Number of stars in the starfield
 * @type {number}
 */
const num_stars = 700;

/**
 * Target frames per second
 * @type {number}
 */
const target_fps = 24;

/**
 * Minimum time between frames in milliseconds
 * @type {number}
 */
const frame_interval = 1000 / target_fps;

/**
 * Array containing all star particles
 * @type {Array<Object>}
 */
const starfield_particles = [];

/**
 * Current animation time
 * @type {number}
 */
let time = 0;

/**
 * Timestamp of the last rendered frame
 * @type {number}
 */
let last_frame_time = 0;

/**
 * Animation frame request ID
 * @type {number}
 */
let animation_id = 0;

/**
 * Initializes canvas dimensions and star particles
 */
const initialize_canvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

/**
 * Creates and returns a new star particle
 * @returns {Object} Star particle object
 */
const create_star_particle = () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 1.5 + 0.5,
    base_color: 'rgba(255,255,255,',
    min_brightness: 0.3,
    max_brightness: 1.0,
    brightness: Math.random(),
    twinkle_speed: Math.random() * 0.02 + 0.01,
    alpha_multiplier: 0.7
});

/**
 * Initializes all star particles
 */
const initialize_star_particles = () => {
    starfield_particles.length = 0;
    for (let i = 0; i < num_stars; i++) {
        starfield_particles.push(create_star_particle());
    }
};

/**
 * Updates star brightness with twinkling effect
 * @param {Object} star - Star particle to update
 */
const update_star_brightness = (star) => {
    star.brightness += star.twinkle_speed;

    if (star.brightness > star.max_brightness) {
        star.brightness = star.max_brightness;
        star.twinkle_speed = -Math.abs(star.twinkle_speed);
    } else if (star.brightness < star.min_brightness) {
        star.brightness = star.min_brightness;
        star.twinkle_speed = Math.abs(star.twinkle_speed);
    }
};

/**
 * Draws a single star particle
 * @param {Object} star - Star particle to draw
 */
const draw_star = (star) => {
    const alpha = star.brightness * star.alpha_multiplier;

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `${star.base_color}${alpha})`;
    ctx.fill();
};

/**
 * Renders the entire starfield
 */
const draw_starfield = () => {
    const star_count = starfield_particles.length;

    for (let i = 0; i < star_count; i++) {
        const star = starfield_particles[i];
        update_star_brightness(star);
        draw_star(star);
    }
};

/**
 * Main animation loop with FPS control
 * @param {number} current_time - Current timestamp
 */
const animate = (current_time) => {
    animation_id = requestAnimationFrame(animate);

    const elapsed = current_time - last_frame_time;

    if (elapsed > frame_interval) {
        last_frame_time = current_time - (elapsed % frame_interval);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw_starfield();

        time += 0.01;
    }
};

/**
 * Stops the animation loop
 */
const stop_animation = () => {
    cancelAnimationFrame(animation_id);
};

/**
 * Handles window resize events
 */
const handle_resize = () => {
    const old_width = canvas.width;
    const old_height = canvas.height;

    initialize_canvas();

    // Reposition stars proportionally to new canvas size
    const width_ratio = canvas.width / old_width;
    const height_ratio = canvas.height / old_height;

    const star_count = starfield_particles.length;
    for (let i = 0; i < star_count; i++) {
        const star = starfield_particles[i];
        star.x *= width_ratio;
        star.y *= height_ratio;
    }
};

/**
 * Initializes the application
 */
const initialize_app = () => {
    initialize_canvas();
    initialize_star_particles();
    last_frame_time = performance.now();
    animate(last_frame_time);
};

/**
 * Cleans up resources when page is unloaded
 */
const cleanup = () => {
    stop_animation();
    window.removeEventListener('resize', handle_resize);
    window.removeEventListener('beforeunload', cleanup);
};

// Event listeners
window.addEventListener('resize', handle_resize);
window.addEventListener('beforeunload', cleanup);

// Initialize if DOM is already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize_app);
} else {
    initialize_app();
}
