/**
 * Image scaling control interface manager
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 */

import { height_for_width, valid_dim } from "../module/image.js";
import { nearest_power_of_2 } from "../module/math.js";

/**
 * Image scaling control interface manager
 * @class
 */
export class img_scl_crt {
    /**
     * Creates image scaling control interface
     * @param {Object} controls - HTML control elements
     * @param {Function} change_callback - Callback function for control value changes
     */
    constructor(controls, change_callback) {
        this.controls = controls;
        this.change_callback = change_callback || (() => { });
        this.original_width = 0;
        this.original_height = 0;
        this.max_size = 8192;
        this.min_size = 8;
        this.POWERS = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];

        this._cache_controls();
        this._init_controls();
        this._bind_events();
        this._update_ui_state();
        this._disable_all_controls();
    }

    /**
     * Cache frequently accessed control elements
     * @private
     */
    _cache_controls() {
        this.c = {
            max_val: this.controls.max_val,
            width_num: this.controls.width_num,
            height_num: this.controls.height_num,
            width_pow2: this.controls.width_pow2,
            height_pow2: this.controls.height_pow2,
            scl_slider: this.controls.scl_slider,
            sldr_disp: this.controls.sldr_disp,
            max_chk: this.controls.max_chk,
            step_sel: this.controls.step_sel,
            num_sec: this.controls.num_sec,
            pow2_sec: this.controls.pow2_sec,
            filter_sel: this.controls.filter_sel,
            gama_chk: this.controls.gama_chk,
            unsharp_chk: this.controls.unsharp_chk,
            force_chk: this.controls.force_chk,
            ush_amount: this.controls.ush_amount,
            ush_radius: this.controls.ush_radius,
            ush_threshold: this.controls.ush_threshold,
            ush_a_disp: this.controls.ush_a_disp,
            ush_r_disp: this.controls.ush_r_disp,
            ush_t_disp: this.controls.ush_t_disp
        };
    }

    /**
     * Initializes control values and states
     * @private
     */
    _init_controls() {
        const c = this.c;

        c.max_val.value = '4096';
        c.step_sel.value = '0';
        c.width_num.value = '1024';
        c.height_num.value = '1024';
        c.width_pow2.value = '1024';
        c.height_pow2.value = '1024';
        c.scl_slider.value = '100';
        c.sldr_disp.textContent = '100%';
        c.filter_sel.value = 'lanczos3';
        c.ush_amount.value = '0.5';
        c.ush_a_disp.textContent = '0.5';
        c.ush_radius.value = '1.0';
        c.ush_r_disp.textContent = '1.0';
        c.ush_threshold.value = '0';
        c.ush_t_disp.textContent = '0';

        c.width_num.min = this.min_size;
        c.height_num.min = this.min_size;
        c.scl_slider.min = '0.1';

        this._update_max_widgets();
    }

    /**
     * Disables all interactive controls
     * @private
     */
    _disable_all_controls() {
        const disabledControls = [
            this.c.max_val, this.c.width_num, this.c.height_num,
            this.c.width_pow2, this.c.height_pow2, this.c.scl_slider,
            this.c.filter_sel, this.c.gama_chk, this.c.unsharp_chk, this.c.force_chk,
            this.c.ush_amount, this.c.ush_radius, this.c.ush_threshold
        ];

        disabledControls.forEach(control => {
            control.disabled = true;
        });
    }

    /**
     * Enables all interactive controls
     * @private
     */
    _enable_all_controls() {
        const enabledControls = [
            this.c.width_num, this.c.height_num, this.c.width_pow2,
            this.c.height_pow2, this.c.scl_slider, this.c.filter_sel,
            this.c.gama_chk, this.c.unsharp_chk, this.c.force_chk,
            this.c.ush_amount, this.c.ush_radius, this.c.ush_threshold
        ];

        enabledControls.forEach(control => {
            control.disabled = false;
        });

        this._update_ui_state();
    }

    /**
     * Binds event listeners to all controls
     * @private
     */
    _bind_events() {
        const c = this.c;
        const event_handlers = {
            max_chk: () => this._handle_max_size_change(),
            max_val: () => this._handle_max_power2_change(),
            step_sel: () => this._handle_algo_change(),
            width_num: () => this._handle_width_change(),
            height_num: () => this._handle_height_change(),
            width_pow2: () => this._handle_width_power2_change(),
            height_pow2: () => this._handle_height_power2_change(),
            filter_sel: () => this._handle_filter_change(),
            gama_chk: () => this._handle_gama_change(),
            unsharp_chk: () => this._handle_unsharp_toggle(),
            force_chk: () => this._handle_force_change()
        };

        Object.keys(event_handlers).forEach(control => {
            //console.log(control);
            c[control].addEventListener('change', event_handlers[control]);
        });

        c.scl_slider.addEventListener('input', (e) => this._handle_scale_input(e));
        c.scl_slider.addEventListener('change', () => this._handle_scale_change());

        ['ush_amount', 'ush_radius', 'ush_threshold'].forEach((control, index) => {
            c[control].addEventListener('input', () => {
                this._handle_unsharp_param_change(['amount', 'radius', 'threshold'][index]);
            });
        });
    }

    /**
     * Calls the change callback with current settings
     * @private
     */
    _trigger_change_callback() {
        if (this.change_callback && !this.c.width_num.disabled) {
            this.change_callback();
        }
    }

    /**
     * Updates UI state based on current control values
     * @private
     */
    _update_ui_state() {
        const c = this.c;

        if (!c.width_num.disabled) {
            c.max_val.disabled = !c.max_chk.checked;

            const is_fixed = c.step_sel.value === '0';
            c.num_sec.style.display = is_fixed ? 'grid' : 'none';
            c.pow2_sec.style.display = is_fixed ? 'none' : 'grid';

            const unsharp_enabled = c.unsharp_chk.checked;
            c.ush_amount.disabled = !unsharp_enabled;
            c.ush_radius.disabled = !unsharp_enabled;
            c.ush_threshold.disabled = !unsharp_enabled;

        }
    }

    /**
     * Updates max size widgets with efficient DOM operations
     * @private
     */
    _update_max_widgets() {
        const c = this.c;
        const current_width = valid_dim(c.width_num.value, this.min_size, this.max_size);
        const current_height = valid_dim(c.height_num.value, this.min_size, this.max_size);

        c.width_num.max = this.max_size;
        c.width_num.value = current_width;
        c.height_num.max = this.max_size;
        c.height_num.value = current_height;

        const available_powers = this.POWERS.filter(power => power <= this.max_size && power >= this.min_size);
        const options_html = available_powers.map(power => `<option value="${power}">${power}</option>`).join('');

        c.width_pow2.innerHTML = options_html;
        c.height_pow2.innerHTML = options_html;

        c.width_pow2.value = nearest_power_of_2(current_width);
        c.height_pow2.value = nearest_power_of_2(current_height);
    }

    /**
     * Handles max size checkbox change
     * @private
     */
    _handle_max_size_change() {
        const c = this.c;
        if (c.width_num.disabled) return;

        c.max_val.disabled = !c.max_chk.checked;
        this.max_size = c.max_chk.checked ? valid_dim(c.max_val.value, this.min_size, 8192) : 8192;
        this._update_max_widgets();
        this._trigger_change_callback();
    }

    /**
     * Handles max power2 select change
     * @private
     */
    _handle_max_power2_change() {
        if (this.c.width_num.disabled) return;

        this.max_size = valid_dim(this.c.max_val.value, this.min_size, 8192);
        this._update_max_widgets();
        this._trigger_change_callback();
    }

    /**
     * Handles algorithm (step) selection change
     * @private
     */
    _handle_algo_change() {
        if (this.c.width_num.disabled) return;
        this._update_ui_state();
        this._trigger_change_callback();
    }

    /**
     * Handles width number input change
     * @private
     */
    _handle_width_change() {
        const c = this.c;
        if (c.width_num.disabled) return;

        const width = valid_dim(c.width_num.value, this.min_size, this.max_size);
        c.width_num.value = width;
        c.width_pow2.value = nearest_power_of_2(width);
        this._trigger_change_callback();
    }

    /**
     * Handles height number input change
     * @private
     */
    _handle_height_change() {
        const c = this.c;
        if (c.height_num.disabled) return;

        const height = valid_dim(c.height_num.value, this.min_size, this.max_size);
        c.height_num.value = height;
        c.height_pow2.value = nearest_power_of_2(height);
        this._trigger_change_callback();
    }

    /**
     * Handles width power2 select change
     * @private
     */
    _handle_width_power2_change() {
        const c = this.c;
        if (c.width_num.disabled) return;

        const width = valid_dim(c.width_pow2.value, this.min_size, this.max_size);
        c.width_num.value = width;
        this._trigger_change_callback();
    }

    /**
     * Handles height power2 select change
     * @private
     */
    _handle_height_power2_change() {
        const c = this.c;
        if (c.height_num.disabled) return;

        const height = valid_dim(c.height_pow2.value, this.min_size, this.max_size);
        c.height_num.value = height;
        this._trigger_change_callback();
    }

    /**
     * Handles scale scl_slider input
     * @param {Event} e - Input event
     * @private
     */
    _handle_scale_input(e) {
        const c = this.c;
        if (c.width_num.disabled) return;

        const value = parseFloat(e.target.value);
        c.sldr_disp.textContent = `${+(value.toFixed(2))}` + '%';

        if (this.original_width && this.original_height) {
            const new_width = this.original_width * (value / 100);
            const new_height = height_for_width(this.original_width, this.original_height, new_width);

            const valid_width = valid_dim(new_width, this.min_size, this.max_size);
            const valid_height = valid_dim(new_height, this.min_size, this.max_size);

            c.width_num.value = valid_width;
            c.height_num.value = valid_height;
            c.width_pow2.value = nearest_power_of_2(valid_width);
            c.height_pow2.value = nearest_power_of_2(valid_height);

            this._trigger_change_callback();
        }
    }

    /**
     * Handles scale scl_slider change
     * @private
     */
    _handle_scale_change() {
        if (this.c.width_num.disabled) return;
        this._trigger_change_callback();
    }

    /**
     * Handles filter_sel selection changes
     * @private
     */
    _handle_filter_change() {
        if (this.c.width_num.disabled) return;
        this._trigger_change_callback();
    }

    /**
     * Handles gamma correction toggle
     * @private
     */
    _handle_gama_change() {
        if (this.c.width_num.disabled) return;
        this._trigger_change_callback();
    }

    /**
     * Handles unsharp_chk mask toggle
     * @private
     */
    _handle_unsharp_toggle() {
        if (this.c.width_num.disabled) return;
        this._update_ui_state();
        this._trigger_change_callback();
    }

    /**
     * Handles force_chk resize toggle
     * @private
     */
    _handle_force_change() {
        if (this.c.width_num.disabled) return;
        this._trigger_change_callback();
    }

    /**
     * Handles unsharp_chk mask parameter changes
     * @param {string} param - Parameter name
     * @private
     */
    _handle_unsharp_param_change(param) {
        const c = this.c;
        if (c.width_num.disabled) return;

        const value = parseFloat(c[`ush_${param}`].value);
        c[`ush_${param[0]}_disp`].textContent = value.toFixed(2);
        this._trigger_change_callback();
    }

    /**
     * Configures interface for specific image
     * @param {Object} image - Image object with width and height properties
     */
    setup(image) {
        if (image && image.width && image.height) {
            const c = this.c;

            this.original_width = image.width;
            this.original_height = image.height;

            const min_scale_width = (this.min_size / image.width) * 100;
            const min_scale_height = (this.min_size / image.height) * 100;
            const min_scale = Math.max(min_scale_width, min_scale_height);

            const max_scale = Math.min(8192 / image.width, 8192 / image.height) * 100;
            c.scl_slider.max = Math.min(500, Math.round(max_scale));
            c.scl_slider.min = Math.max(0.1, min_scale);

            const initial_width = valid_dim(image.width, this.min_size, this.max_size);
            const initial_height = valid_dim(image.height, this.min_size, this.max_size);

            c.width_num.value = initial_width;
            c.height_num.value = initial_height;
            c.width_pow2.value = nearest_power_of_2(initial_width);
            c.height_pow2.value = nearest_power_of_2(initial_height);

            const initial_scale = Math.max(min_scale, 100);
            c.scl_slider.value = initial_scale;
            c.sldr_disp.textContent = `${+(initial_scale.toFixed(2))}` + '%';

            this._enable_all_controls();
            this._update_max_widgets();
            this._update_ui_state();
            this._trigger_change_callback();
        }
    }

    // Getters with cached element access and dimension validation
    get width() {
        const c = this.c;
        const value = parseInt(c.step_sel.value == '0' ? c.width_num.value : c.width_pow2.value);
        return isNaN(value) ? this.min_size : valid_dim(value, this.min_size, this.max_size);
    }

    get height() {
        const c = this.c;
        const value = parseInt(c.step_sel.value == '0' ? c.height_num.value : c.height_pow2.value);
        return isNaN(value) ? this.min_size : valid_dim(value, this.min_size, this.max_size);
    }

    get filter() { return this.c.filter_sel.value; }
    get gama() { return this.c.gama_chk.checked; }
    get unsharp() { return this.c.unsharp_chk.checked; }
    get force() { return this.c.force_chk.checked; }
    get ush_amount() { return parseFloat(this.c.ush_amount.value); }
    get ush_radius() { return parseFloat(this.c.ush_radius.value); }
    get ush_threshold() { return parseFloat(this.c.ush_threshold.value); }
}
