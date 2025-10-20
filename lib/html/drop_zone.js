
/**
 * File drop zone handler for web page file interactions
 * @copyright 2025 MdONeil
 * @license GNU GPL v3
 * @class
 */
export class drop_zone {
    /**
     * Creates a new file drop zone instance
     * @param {HTMLElement} drop_zone_element - Container element for drop zone
     * @param {HTMLInputElement} file_input - File input element
     * @param {Function} callback - Function called with accepted files
     * @param {string} css_url - URL for CSS stylesheet
     * @param {string} mime_type - Accepted MIME types
     * @param {Object} options - Configuration options
     */
    constructor(drop_zone_element, file_input, callback, css_url, mime_type, options = {}) {
        if (!drop_zone_element?.nodeType || !file_input || file_input.type !== 'file') {
            throw new Error('Invalid elements provided');
        }
        if (typeof callback !== 'function') {
            throw new Error('Callback function required');
        }

        this.drop_zone = drop_zone_element;
        this.file_input = file_input;
        this.callback = callback;
        this.mime_type = mime_type || '';
        this.options = options;
        this.mime_patterns = [];
        this.is_dragging = false;
        this.drag_leave_timeout = null;

        this._compile_mime_patterns();
        this._bound_handlers = this._create_bound_handlers();

        this._inject_css(css_url);
        this._setup_file_input();
        this._setup_event_listeners();
    }

    /**
     * Compiles MIME type patterns for file validation
     * @private
     */
    _compile_mime_patterns() {
        this.mime_patterns.length = 0;
        if (!this.mime_type) return;

        const types = this.mime_type.split(',');

        for (let i = 0, len = types.length; i < len; i++) {
            const type = types[i].trim();
            if (type.endsWith('/*')) {
                const category = type.slice(0, -2);
                this.mime_patterns.push(new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`));
            } else {
                this.mime_patterns.push(new RegExp(`^${type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
            }
        }
    }

    /**
     * Creates bound event handlers
     * @returns {Object} Bound handler methods
     * @private
     */
    _create_bound_handlers() {
        return {
            drag_handle: this._handle_drag_event.bind(this),
            drop: this._handle_drop.bind(this),
            input_change: this._handle_input_change.bind(this),
            click: this._handle_click.bind(this),
            keydown: this._handle_keydown.bind(this)
        };
    }

    /**
     * Injects CSS stylesheet before drop zone element
     * @param {string} css_url - CSS file URL
     * @private
     */
    _inject_css(css_url) {
        if (!css_url) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = css_url;
        this.drop_zone.insertAdjacentElement('beforebegin', link);
    }

    /**
     * Configures file input element attributes
     * @private
     */
    _setup_file_input() {
        const input_style = this.file_input.style;
        input_style.position = 'absolute';
        input_style.opacity = '0';
        input_style.pointerEvents = 'none';
        input_style.width = '0';
        input_style.height = '0';

        this.file_input.accept = this.mime_type;
        this.file_input.multiple = !!this.options.multiple;

        if (this.options.directory) {
            this.file_input.webkitdirectory = true;
            this.file_input.directory = true;
        }
    }

    /**
     * Sets up event listeners for drop zone interactions
     * @private
     */
    _setup_event_listeners() {
        const { drop_zone, file_input, _bound_handlers } = this;
        const passive_false = { passive: false };
        const passive_true = { passive: true };

        drop_zone.addEventListener('dragover', _bound_handlers.drag_handle, passive_false);
        drop_zone.addEventListener('dragenter', _bound_handlers.drag_handle, passive_false);
        drop_zone.addEventListener('dragleave', _bound_handlers.drag_handle, passive_false);
        drop_zone.addEventListener('drop', _bound_handlers.drop, passive_false);

        drop_zone.addEventListener('click', _bound_handlers.click, passive_true);
        drop_zone.addEventListener('touchend', _bound_handlers.click, passive_true);
        file_input.addEventListener('change', _bound_handlers.input_change, passive_true);

        drop_zone.tabIndex = 0;
        drop_zone.addEventListener('keydown', _bound_handlers.keydown, passive_true);
    }

    /**
     * Handles drag-related events
     * @param {DragEvent} event - Drag event
     * @private
     */
    _handle_drag_event(event) {
        event.preventDefault();
        event.stopPropagation();

        switch (event.type) {
            case 'dragover':
            case 'dragenter':
                if (!this.is_dragging) {
                    this.is_dragging = true;
                    this.drop_zone.classList.add('drag-over');
                }
                break;

            case 'dragleave':
                if (this.drag_leave_timeout) {
                    clearTimeout(this.drag_leave_timeout);
                }
                this.drag_leave_timeout = setTimeout(() => {
                    this.is_dragging = false;
                    this.drop_zone.classList.remove('drag-over');
                    this.drag_leave_timeout = null;
                }, 50);
                break;
        }
    }

    /**
     * Handles file drop events
     * @param {DragEvent} event - Drop event
     * @private
     */
    _handle_drop(event) {
        event.preventDefault();
        event.stopPropagation();

        if (this.drag_leave_timeout) {
            clearTimeout(this.drag_leave_timeout);
            this.drag_leave_timeout = null;
        }

        this.is_dragging = false;
        this.drop_zone.classList.remove('drag-over');

        let files = [];
        const data_transfer = event.dataTransfer;
        if (data_transfer?.files) {
            files = Array.from(data_transfer.files);
        }

        this._process_files(files);
    }

    /**
     * Handles file input change events
     * @private
     */
    _handle_input_change() {
        const files = this.file_input.files ? Array.from(this.file_input.files) : [];
        this._process_files(files);
        this._reset_file_input();
    }

    /**
     * Resets file input element
     * @private
     */
    _reset_file_input() {
        const new_input = this.file_input.cloneNode(false);
        const old_input = this.file_input;

        new_input.accept = old_input.accept;
        new_input.multiple = old_input.multiple;
        new_input.webkitdirectory = old_input.webkitdirectory;
        new_input.directory = old_input.directory;

        const input_style = new_input.style;
        input_style.position = 'absolute';
        input_style.opacity = '0';
        input_style.pointerEvents = 'none';
        input_style.width = '0';
        input_style.height = '0';

        if (old_input.parentNode) {
            old_input.parentNode.replaceChild(new_input, old_input);
        }

        this.file_input = new_input;
        this.file_input.addEventListener('change', this._bound_handlers.input_change, { passive: true });
    }

    /**
     * Handles click events on drop zone
     * @param {Event} event - Click event
     * @private
     */
    _handle_click(event) {
        if (event?.type === 'touchend') {
            event.preventDefault();
        }
        this.file_input?.click();
    }

    /**
     * Handles keyboard events for accessibility
     * @param {KeyboardEvent} event - Key event
     * @private
     */
    _handle_keydown(event) {
        if (!event) return;

        const key = event.key;
        const key_code = event.keyCode;

        // Support both key and keyCode for broader browser compatibility
        const is_enter = key === 'Enter' || key_code === 13;
        const is_space = key === ' ' || key_code === 32;

        if (is_enter || is_space) {
            event.preventDefault();
            this._handle_click();
        }
    }

    /**
     * Processes and validates file array
     * @param {File[]} files - Files to process
     * @private
     */
    _process_files(files) {
        if (!Array.isArray(files)) {
            this.callback([]);
            return;
        }

        const accepted_files = [];
        for (let i = 0, len = files.length; i < len; i++) {
            if (this._is_valid_file(files[i])) {
                accepted_files.push(files[i]);
            }
        }

        if (!this.options.multiple && accepted_files.length > 1) {
            this.callback([accepted_files[0]]);
        } else {
            this.callback(accepted_files);
        }
    }

    /**
     * Validates file against MIME type patterns
     * @param {File} file - File to validate
     * @returns {boolean} Validation result
     * @private
     */
    _is_valid_file(file) {
        if (!file || typeof file !== 'object') return false;

        const patterns = this.mime_patterns;
        if (!this.mime_type || !patterns.length) return true;

        const file_type = file.type || '';
        for (let i = 0, len = patterns.length; i < len; i++) {
            if (patterns[i].test(file_type)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Cleans up event listeners and resources
     */
    destroy() {
        const { drop_zone, file_input, _bound_handlers } = this;

        if (this.drag_leave_timeout) {
            clearTimeout(this.drag_leave_timeout);
        }

        if (drop_zone) {
            const events = ['dragover', 'dragenter', 'dragleave', 'drop', 'click', 'touchend', 'keydown'];
            for (let i = 0, len = events.length; i < len; i++) {
                drop_zone.removeEventListener(events[i], _bound_handlers.drag_handle);
            }
        }

        if (file_input) {
            file_input.removeEventListener('change', _bound_handlers.input_change);
        }

        this.drop_zone = null;
        this.file_input = null;
        this.callback = null;
        this.mime_patterns.length = 0;
        this._bound_handlers = {};
    }
}


/*
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <h1>File Drop Zone Example</h1>
    
    <div id="dropZone" class="drop-zone">
        <div>
            <p>📁 Drop files here or click to select</p>
            <p><small>Accepted: Images and PDF files</small></p>
        </div>
    </div>

    <input type="file" id="fileInput" style="display: none;">

    <div id="fileInfo" class="file-info">
        <h3>Selected Files:</h3>
        <div id="fileList"></div>
    </div>

    <script type="module">
        import { drop_zone } from './drop_zone.js';

        // Get DOM elements
        const dropZoneElement = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const fileList = document.getElementById('fileList');

        // File processing callback
        const handleFiles = (files) => {
            fileList.innerHTML = '';
            
            if (files.length === 0) {
                fileList.innerHTML = '<p>No files selected</p>';
                return;
            }

            files.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                
                const fileSize = (file.size / 1024).toFixed(2);
                fileItem.innerHTML = `
                    <strong>${file.name}</strong><br>
                    Type: ${file.type || 'Unknown'} | Size: ${fileSize} KB<br>
                    Last modified: ${new Date(file.lastModified).toLocaleString()}
                `;
                
                fileList.appendChild(fileItem);
            });

            console.log('Processed files:', files);
        };

        // Create drop zone instance
        const fileDrop = new drop_zone(
            dropZoneElement,
            fileInput,
            handleFiles,
            null, // No external CSS
            'image/*,application/pdf',
            {
                multiple: true,
                directory: false
            }
        );

        // Optional: Add some status messages
        dropZoneElement.addEventListener('dragover', () => {
            dropZoneElement.querySelector('p').textContent = '📁 Release to drop files';
        });

        dropZoneElement.addEventListener('dragleave', () => {
            dropZoneElement.querySelector('p').textContent = '📁 Drop files here or click to select';
        });

        // Cleanup on page unload (optional)
        window.addEventListener('beforeunload', () => {
            fileDrop.destroy();
        });

        // Example of programmatic file processing
        window.processExampleFiles = () => {
            // Simulate processing some files
            const exampleFiles = [
                new File(['example content'], 'example.txt', { type: 'text/plain' }),
                new File(['image data'], 'photo.jpg', { type: 'image/jpeg' })
            ];
            handleFiles(exampleFiles);
        };
    </script>
</body>
</html>
*/
