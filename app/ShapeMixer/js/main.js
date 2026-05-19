/**
 * Shape Mixer: Professional tool for Second Life users to mix shape data
 * Copyright (C) 2025 MdONeil
 * @license GPL-3.0
 * @version 2.0.0
 */

/** @typedef {Object} shape_parameter
 * @property {string} id
 * @property {string} value
 * @property {string} name
 * @property {string} display
 * @property {string} u8
 * @property {string} type
 * @property {string} wearable
 * @property {string} group
 */

/** @typedef {Object} shape_data
 * @property {string} name
 * @property {Map<string, shape_parameter>} parameters
 */

/** @typedef {Object} app_state
 * @property {Map<string, shape_data>} loaded_shapes
 * @property {string[]} selected_categories
 * @property {boolean} is_processing
 */

class shape_mixer {
    constructor() {
        /** @type {app_state} */
        this.state = {
            loaded_shapes: new Map(),
            selected_categories: [],
            is_processing: false
        };

        /** @type {Object.<string, number[]>} */
        this.parameter_groups = Object.freeze({
            body: [80, 33, 34, 637, 11001],
            head: [682, 647, 193, 646, 773, 662, 629, 1, 18, 10, 14],
            eyes: [690, 24, 196, 650, 880, 769, 21, 23, 765, 518, 664],
            ears: [35, 15, 22, 796],
            nose: [2, 517, 4, 759, 20, 11, 758, 27, 19, 6, 656],
            mouth: [155, 653, 505, 799, 506, 659, 764, 25, 663],
            chin: [7, 17, 185, 760, 665, 12, 5, 13, 8],
            torso: [649, 678, 683, 756, 36, 105, 507, 684, 685, 693, 675, 38, 676, 157],
            legs: [652, 692, 37, 842, 795, 879, 753, 841, 515]
        });

        this.initialize_dom();
        this.bind_events();
        this.cached_elements = new Map();
    }

    /**
     * Initializes dom element references
     */
    initialize_dom() {
        this.elements = {
            loader_frame: document.getElementById('loaderframe'),
            save_button: document.getElementById('save_btn'),
            status_indicator: document.getElementById('status_indicator'),
            progress_bar: document.getElementById('progress_bar')
        };

        if (!this.elements.loader_frame || !this.elements.save_button) {
            throw new Error('Required DOM elements not found');
        }
    }

    /**
     * Binds event listeners
     */
    bind_events() {
        this.elements.save_button.addEventListener('click', () => this.generate_mixed_shape());
        document.addEventListener('dragstart', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());

        this.elements.loader_frame.addEventListener('change', (e) => {
            if (e.target.matches('[data-role="file-input"]')) {
                this.handle_file_load(e);
            }
        });

        this.elements.loader_frame.addEventListener('click', (e) => {
            if (e.target.matches('[data-role="remove-row"]')) {
                this.remove_file_row(e.target.closest('.file-row').id);
            }
        });

        this.elements.loader_frame.addEventListener('change', (e) => {
            if (e.target.matches('[data-category]')) {
                this.handle_category_selection(e.target, e.target.dataset.category);
            }
        });
    }

    /**
     * Generates a unique identifier
     * @returns {string}
     */
    generate_uid = () => {
        return crypto.randomUUID?.() ?? `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Creates dom element with attributes and children
     * @param {string} tag
     * @param {Object} [attrs={}]
     * @param {HTMLElement[]} [children=[]]
     * @returns {HTMLElement}
     */
    create_element = (tag, attrs = {}, children = []) => {
        const element = Object.assign(document.createElement(tag), attrs);
        children.forEach(child => element.appendChild(child));
        return element;
    }

    /**
     * Sanitizes and escapes html content
     * @param {string} str
     * @returns {string}
     */
    sanitize_html = (str) => {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    /**
     * Updates application status
     * @param {string} message
     * @param {string} type - 'info' | 'success' | 'warning' | 'error'
     */
    update_status(message, type = 'info') {
        if (this.elements.status_indicator) {
            this.elements.status_indicator.textContent = message;
            this.elements.status_indicator.className = `status-${type}`;
        }

        console.log(`[shape_mixer:${type}] ${message}`);
    }

    /**
     * Updates progress bar
     * @param {number} percentage
     */
    update_progress(percentage) {
        if (this.elements.progress_bar) {
            this.elements.progress_bar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }
    }

    /**
     * Validates xml structure
     * @param {Document} xml_doc
     * @returns {boolean}
     */
    validate_shape_xml = (xml_doc) => {
        try {
            const archetypes = xml_doc.querySelectorAll('archetype');
            const has_genepool = xml_doc.querySelector('linden_genepool') !== null;

            return archetypes.length > 0 && has_genepool;
        } catch (error) {
            return false;
        }
    }

    /**
 * Parses shape parameters from xml document
 * @param {Document} xml_doc
 * @param {string} file_name
 * @returns {shape_data}
 */
    parse_shape_parameters = (xml_doc, file_name) => {
        const parameters = new Map();
        const param_nodes = xml_doc.querySelectorAll('param[id]');

        for (let i = 0; i < param_nodes.length; i++) {
            const param = param_nodes[i];
            const id = param.getAttribute('id');

            if (id) {
                // Extract all possible attributes
                const parameter_data = {
                    id: id,
                    value: param.getAttribute('value') || '',
                    name: param.getAttribute('name') || '',
                    display: param.getAttribute('display') || '',
                    u8: param.getAttribute('u8') || '',
                    type: param.getAttribute('type') || '',
                    wearable: param.getAttribute('wearable') || '',
                    group: param.getAttribute('group') || ''
                };

                parameters.set(id, parameter_data);
            }
        }

        const archetype = xml_doc.querySelector('archetype');
        const shape_name = archetype?.getAttribute('name') || file_name.replace('.xml', '');

        return {
            name: shape_name,
            parameters
        };
    }

    /**
     * Handles file loading and processing
     * @param {Event} event
     */
    handle_file_load = async (event) => {
        const target = /** @type {HTMLInputElement} */ (event.target);
        const file = target.files?.[0];

        if (!file) {
            this.update_file_status(target, 'empty');
            return;
        }

        if (!file.name.toLowerCase().endsWith('.xml')) {
            this.update_status('Please select an XML file', 'warning');
            this.update_file_status(target, 'error');
            return;
        }

        this.update_file_status(target, 'loading');

        try {
            const text_content = await this.read_file_as_text(file);
            await this.process_shape_file(target, text_content, file.name);
        } catch (error) {
            console.error('File processing error:', error);
            this.update_status(`Error processing ${file.name}: ${error.message}`, 'error');
            this.update_file_status(target, 'error');
        }
    }

    /**
     * Reads file as text with progress tracking
     * @param {File} file
     * @returns {Promise<string>}
     */
    read_file_as_text = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => resolve(e.target?.result?.toString() || '');
            reader.onerror = () => reject(new Error('File reading failed'));
            reader.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = (e.loaded / e.total) * 100;
                    this.update_progress(percent);
                }
            };

            reader.readAsText(file);
        });
    }

    /**
     * Processes and validates shape file
     * @param {HTMLInputElement} target
     * @param {string} xml_content
     * @param {string} file_name
     */
    process_shape_file = async (target, xml_content, file_name) => {
        this.update_progress(10);

        try {
            const parser = new DOMParser();
            const xml_doc = parser.parseFromString(xml_content, 'text/xml');

            const parse_error = xml_doc.querySelector('parsererror');
            if (parse_error) {
                throw new Error('Invalid XML format');
            }

            this.update_progress(50);

            if (!this.validate_shape_xml(xml_doc)) {
                throw new Error('Invalid shape file structure');
            }

            const shape_data = this.parse_shape_parameters(xml_doc, file_name);
            this.state.loaded_shapes.set(file_name, shape_data);

            // Store filename in row for reference
            target.closest('.file-row').dataset.fileName = file_name;

            this.update_progress(100);
            this.update_file_status(target, 'success');
            this.update_status(`Successfully loaded ${file_name}`, 'success');

            if (this.all_rows_loaded()) {
                setTimeout(() => this.add_file_row(), 500);
            }

        } catch (error) {
            this.update_file_status(target, 'error');
            throw error;
        } finally {
            setTimeout(() => this.update_progress(0), 1000);
        }
    }

    /**
     * Updates file input status indicator
     * @param {HTMLInputElement} target
     * @param {string} status - 'empty' | 'loading' | 'success' | 'error'
     */
    update_file_status = (target, status) => {
        const status_map = {
            empty: { emoji: '🟡', text: 'No file' },
            loading: { emoji: '⏳', text: 'Processing...' },
            success: { emoji: '🟢', text: 'Success' },
            error: { emoji: '🔴', text: 'Load failed' }
        };

        const row = target.closest('.file-row');
        const status_element = row?.querySelector('[data-role="status"]');
        const text_element = row?.querySelector('[data-role="status-text"]');

        const status_info = status_map[status] || status_map.empty;

        if (status_element) status_element.textContent = status_info.emoji;
        if (text_element) text_element.textContent = status_info.text;
    }

    /**
     * Checks if all file rows are successfully loaded
     * @returns {boolean}
     */
    all_rows_loaded = () => {
        const rows = document.querySelectorAll('.file-row');
        if (rows.length === 0) return false;

        for (let i = 0; i < rows.length; i++) {
            const status_element = rows[i].querySelector('[data-role="status"]');
            if (status_element?.textContent !== '🟢') {
                return false;
            }
        }
        return true;
    }

    /**
     * Handles category selection with exclusive behavior
     * @param {HTMLInputElement} checkbox
     * @param {string} category
     */
    handle_category_selection(checkbox, category) {
        const row = checkbox.closest('.file-row');
        const status_element = row?.querySelector('[data-role="status"]');

        if (!status_element || status_element.textContent !== '🟢') {
            checkbox.checked = false;
            this.update_status('Please load a file before selecting categories', 'warning');
            return;
        }

        if (checkbox.checked) {
            const other_checkboxes = document.querySelectorAll(`[data-category="${category}"]:checked`);
            for (let i = 0; i < other_checkboxes.length; i++) {
                if (other_checkboxes[i] !== checkbox) {
                    other_checkboxes[i].checked = false;
                }
            }
        }

        this.update_selection_state();
    }

    /**
     * Updates ui state based on current selections
     */
    update_selection_state() {
        const has_selections = document.querySelectorAll('[data-category]:checked').length > 0;
        const has_loaded_files = this.state.loaded_shapes.size > 0;

        this.elements.save_button.disabled = !(has_selections && has_loaded_files);
    }

    /**
     * Adds a new file input row to the interface
     */
    add_file_row() {
        const row_id = this.generate_uid();
        const row = this.create_element('div', {
            className: 'file-row',
            id: row_id
        });

        const categories_html = Object.keys(this.parameter_groups).map(category =>
            `<label class="category-label">
                <input type="checkbox" data-category="${category}">
                <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
            </label>`
        ).join('');

        row.innerHTML = `
            <div class="file-status">
                <span data-role="status">🟡</span>
                <span data-role="status-text">No file selected</span>
            </div>
            <input type="file" accept=".xml" data-role="file-input" class="file-input">
            <div class="categories">
                ${categories_html}
            </div>
            <button type="button" data-role="remove-row" class="remove-btn" title="Remove this file">
                ×
            </button>
        `;

        this.elements.loader_frame.appendChild(row);
        this.update_selection_state();
    }

    /**
     * Removes a file row and cleans up resources
     * @param {string} row_id
     */
    remove_file_row(row_id) {
        const row = document.getElementById(row_id);
        if (!row) return;

        const file_name = row.dataset.fileName;
        if (file_name) {
            this.state.loaded_shapes.delete(file_name);
        }

        row.remove();
        this.update_selection_state();
        this.update_status('File removed', 'info');
    }

    /**
     * Generates the mixed shape xml
     * @returns {Document}
     */
    generate_mixed_shape_xml() {
        const doc = document.implementation.createDocument('', '', null);
        const root = doc.createElement('linden_genepool');
        root.setAttribute('version', '2.0');
        doc.appendChild(root);

        const archetype = doc.createElement('archetype');
        archetype.setAttribute('name', `Mixed Shape ${new Date().toISOString().split('T')[0]}`);
        root.appendChild(archetype);

        const selections = Array.from(document.querySelectorAll('[data-category]:checked'))
            .map(checkbox => ({
                category: checkbox.dataset.category,
                row: checkbox.closest('.file-row'),
                file_name: checkbox.closest('.file-row')?.dataset.fileName
            }))
            .filter(selection => selection.file_name && this.parameter_groups[selection.category]);

        for (const selection of selections) {
            const shape_data = this.state.loaded_shapes.get(selection.file_name);
            if (!shape_data) continue;

            const parameter_ids = this.parameter_groups[selection.category];
            for (const param_id of parameter_ids) {
                const param = shape_data.parameters.get(param_id.toString());
                if (param) {
                    const param_element = doc.createElement('param');

                    // Copy all attributes that exist in the original parameter
                    const attributes = ['id', 'name', 'display', 'value', 'u8', 'type', 'wearable', 'group'];

                    for (const attr of attributes) {
                        if (param[attr] !== undefined && param[attr] !== null && param[attr] !== '') {
                            param_element.setAttribute(attr, param[attr]);
                        }
                    }

                    archetype.appendChild(param_element);
                }
            }
        }

        return doc;
    }

    /**
     * Formats xml document with proper indentation
     * @param {Document} doc
     * @returns {string}
     */
    format_xml = (doc) => {
        const serializer = new XMLSerializer();
        let xml_string = serializer.serializeToString(doc);

        // Simple formatting without XSLT
        const formatted = [];
        let indent = '';
        const tokens = xml_string.split(/(<[^>]+>)/g);

        for (const token of tokens) {
            if (!token.trim()) continue;

            if (token.startsWith('</')) {
                indent = indent.slice(2);
                formatted.push(`${indent}${token}`);
            } else if (token.startsWith('<') && !token.endsWith('/>') && !token.startsWith('<?')) {
                formatted.push(`${indent}${token}`);
                if (!token.startsWith('<!') && !token.includes('</')) {
                    indent += '  ';
                }
            } else if (token.startsWith('<?') || token.startsWith('<!')) {
                formatted.push(token);
            } else {
                formatted.push(`${indent}${token}`);
                if (token.endsWith('/>')) {
                    // indent remains same
                }
            }
        }

        return formatted.join('\n');
    }

    /**
     * Generates and downloads the mixed shape
     */
    async generate_mixed_shape() {
        if (this.state.is_processing) return;

        this.state.is_processing = true;
        this.elements.save_button.disabled = true;
        this.update_status('Generating mixed shape...', 'info');

        try {
            const selected_categories = Array.from(document.querySelectorAll('[data-category]:checked'));
            if (selected_categories.length === 0) {
                throw new Error('No categories selected');
            }

            this.update_progress(30);

            const mixed_doc = this.generate_mixed_shape_xml();
            this.update_progress(70);

            const xml_string = '<?xml version="1.0" encoding="UTF-8"?>\n' + this.format_xml(mixed_doc);
            const blob = new Blob([xml_string], { type: 'text/xml; charset=utf-8' });
            const url = URL.createObjectURL(blob);

            this.update_progress(90);

            const link = this.create_element('a', {
                href: url,
                download: `mixed_shape_${Date.now()}.xml`,
                style: 'display: none;'
            });

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
            this.update_progress(100);

            this.update_status('Mixed shape downloaded successfully!', 'success');

            this.track_event('shape_generated', {
                categories: selected_categories.map(cb => cb.dataset.category),
                file_count: this.state.loaded_shapes.size
            });

        } catch (error) {
            console.error('Shape generation error:', error);
            this.update_status(`Generation failed: ${error.message}`, 'error');
        } finally {
            this.state.is_processing = false;
            this.elements.save_button.disabled = false;
            setTimeout(() => this.update_progress(0), 1000);
        }
    }

    /**
     * Tracks analytics events
     * @param {string} event
     * @param {Object} data
     */
    track_event(event, data = {}) {
        if (typeof gtag !== 'undefined') {
            gtag('event', event, data);
        }
    }

    /**
     * Initializes the application
     */
    initialize() {
        try {
            this.add_file_row();
            this.update_status('Application ready', 'success');
            console.log('shape_mixer initialized successfully');
        } catch (error) {
            console.error('Initialization failed:', error);
            this.update_status('Initialization failed', 'error');
        }
    }
}

// Application bootstrap
document.addEventListener('DOMContentLoaded', () => {
    try {
        const app = new shape_mixer();
        app.initialize();

        window.shape_mixer = app;
    } catch (error) {
        console.error('Failed to bootstrap shape_mixer:', error);
        alert('Application failed to load. Please refresh the page.');
    }
});