

/**
 * CSS processor for optimizing and minifying CSS with HTML context
 * @class
 */
export class CSSProcessor {
    constructor() {
        this._uid_gen = this._uid_generator();
        this.reset();
    }

    /**
     * Reset processor state
     */
    reset() {
        this._defines = {};
        this._class_names = [];
        this._errors = [];
    }

    /**
     * Generate unique identifiers
     * @generator
     * @yields {string} Unique identifier
     */
    *_uid_generator() {
        const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const alphanum = letters + '0123456789';
        const used = new Set();
        let i = 0;

        while (true) {
            let n = i++;
            let s = letters[n % letters.length];
            n = Math.floor(n / letters.length);

            while (n > 0) {
                s += alphanum[n % alphanum.length];
                n = Math.floor(n / alphanum.length);
            }

            if (!used.has(s)) {
                used.add(s);
                yield s;
            }
        }
    }

    /**
     * Check if class name is valid
     * @param {string} name - Class name to validate
     * @returns {boolean} Validation result
     */
    _is_valid_class_name(name) {
        return /^[a-zA-Z_][\w-]*$/.test(name) || /^--?[a-zA-Z_][\w-]*$/.test(name);
    }

    /**
     * Escape regex special characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    _escape_regex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Parse #define directives
     * @param {string[]} lines - Input lines
     */
    _parse_defines(lines) {
        this.reset();
        const define_regex = /^#define\s+(\S+)\s*(.*)$/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.startsWith('#define')) continue;

            const match = line.match(define_regex);
            if (!match || !match[1]) {
                this._errors.push(`Line ${i + 1}: Invalid #define syntax`);
                continue;
            }

            const key = match[1];
            let value = match[2] || '';

            if (value === '__UID__') {
                value = key.startsWith('--')
                    ? '--' + this._uid_gen.next().value
                    : this._uid_gen.next().value;
            }

            this._defines[key] = value;
            if (!key.startsWith('--') && this._is_valid_class_name(key)) {
                this._class_names.push(key);
            }
        }
    }

    /**
     * Extract used class names from HTML
     * @param {string} html - HTML content
     * @returns {Set<string>} Set of used class names
     */
    _get_used_class_names(html) {
        const class_names = new Set();
        const class_regex = /class\s*=\s*(?:["']([^"']*?)["']|([^\s>]+))/gi;
        let match;

        while ((match = class_regex.exec(html)) !== null) {
            const classes = (match[1] || match[2] || '').split(/\s+/);
            for (let i = 0; i < classes.length; i++) {
                const cls = classes[i].trim();
                if (cls) class_names.add(cls);
            }
        }

        return class_names;
    }

    /**
     * Replace class names in HTML
     * @param {string} line - HTML line
     * @returns {string} Processed line
     */
    _replace_class_names_in_html(line) {
        return line.replace(/class\s*=\s*(["'])([^"']*?)\1/gi, (match, quote, value) => {
            const classes = value.split(/\s+/);
            const new_classes = new Array(classes.length);

            for (let i = 0; i < classes.length; i++) {
                new_classes[i] = this._defines[classes[i]] || classes[i];
            }

            return `class=${quote}${new_classes.join(' ')}${quote}`;
        });
    }

    /**
     * Remove unused CSS rules
     * @param {string} css - CSS content
     * @param {Set<string>} used_classes - Set of used classes
     * @returns {string} Optimized CSS
     */
    _remove_unused_css(css, used_classes) {
        const rule_regex = /([^{]+)\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
        const result = [];
        let match;

        while ((match = rule_regex.exec(css)) !== null) {
            const selectors = match[1];
            const body = match[2];
            let keep = false;

            const selector_list = selectors.split(',');
            for (let i = 0; i < selector_list.length; i++) {
                const selector = selector_list[i].trim();
                const class_matches = selector.match(/\.[a-zA-Z_][\w-]*/g);

                if (!class_matches) {
                    keep = true;
                    break;
                }

                for (let j = 0; j < class_matches.length; j++) {
                    const cls = class_matches[j].slice(1);
                    if (used_classes.has(cls)) {
                        keep = true;
                        break;
                    }
                }

                if (keep) break;
            }

            if (keep) {
                result.push(`${selectors.trim().replace(/\s+/g, ' ')} { ${body.trim()} }`);
            }
        }

        return result.join('\n');
    }

    /**
     * Process CSS and HTML input
     * @param {string} input - Input text containing CSS and HTML
     * @returns {Object} Processing result
     */
    process(input) {
        try {
            const lines = input.split('\n').filter(line => !line.trim().startsWith('//'));

            this._parse_defines(lines);

            if (this._errors.length > 0) {
                return { success: false, errors: this._errors };
            }

            const css_lines = [];
            const html_lines = [];
            let in_html = false;
            const defines_length = Object.keys(this._defines).length;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmed = line.trim();

                if (!trimmed.startsWith('#define')) {
                    if (trimmed.startsWith('<')) in_html = true;
                    (in_html ? html_lines : css_lines).push(line);
                }
            }

            let css = css_lines.join('\n');
            if (defines_length > 0) {
                for (const key in this._defines) {
                    if (Object.prototype.hasOwnProperty.call(this._defines, key)) {
                        const value = this._defines[key];
                        const pattern = key.startsWith('--')
                            ? `${this._escape_regex(key)}(?=[\\s;})])`
                            : `${this._escape_regex(key)}(?=[^a-zA-Z0-9_-]|$)`;
                        const regex = new RegExp(pattern, 'g');
                        css = css.replace(regex, value);
                    }
                }
            }

            const html = html_lines.map(line => {
                let output = line;

                if (this._class_names.length > 0 && /class\s*=/i.test(line)) {
                    output = this._replace_class_names_in_html(line);
                }

                if (defines_length > 0) {
                    for (const key in this._defines) {
                        if (Object.prototype.hasOwnProperty.call(this._defines, key) &&
                            !this._class_names.includes(key)) {
                            const pattern = key.startsWith('--')
                                ? `${this._escape_regex(key)}(?=[\\s;})])`
                                : `${this._escape_regex(key)}(?=[^a-zA-Z0-9_-]|$)`;
                            const regex = new RegExp(pattern, 'g');
                            output = output.replace(regex, this._defines[key]);
                        }
                    }
                }

                return output;
            }).join('\n');

            const used_classes = this._get_used_class_names(html);
            const final_css = this._remove_unused_css(css, used_classes);

            // Format output with clear sections
            let output_parts = [];
            if (final_css.trim()) {
                output_parts.push('// CSS Rules');
                output_parts.push(final_css.trim());
            }

            if (html.trim()) {
                if (output_parts.length > 0) output_parts.push('');
                output_parts.push('// HTML');
                output_parts.push(html.trim());
            }

            const output = output_parts.join('\n');

            return { success: true, output: output };
        } catch (error) {
            return { success: false, errors: [`Processing error: ${error.message}`] };
        }
    }
}

// Initialize processor instance
const processor = new CSSProcessor();

// Cache DOM elements
const process_button = document.getElementById('process');
const input_element = document.getElementById('input');
const output_element = document.getElementById('output');
const copy_button = document.getElementById('copy');
const copy_status = document.getElementById('copy-status');
const language_select = document.getElementById('language');

/**
 * Handle process button click
 */
const handle_process = () => {
    const input = input_element.value;
    const result = processor.process(input);
    output_element.textContent = result.success
        ? result.output
        : 'Errors:\n' + result.errors.join('\n');
};

/**
 * Handle copy button click
 */
const handle_copy = () => {
    const output = output_element.textContent;
    navigator.clipboard.writeText(output).then(() => {
        copy_status.style.display = 'inline';
        setTimeout(() => {
            copy_status.style.display = 'none';
        }, 2000);
    });
};


// Add event listeners
process_button.addEventListener('click', handle_process);
copy_button.addEventListener('click', handle_copy);

// Add some sample content for demonstration
document.addEventListener('DOMContentLoaded', function () {
    const sampleInput = `// Definition
#define coolclass __UID__
#define --main-clr __UID__

// CSS Rules
.coolclass { 
    color: var(--main-clr);
    font-size: 16px;
}

// HTML (Optional)
<div class="coolclass" id="coolclass">Test</div>`;

    document.getElementById('input').value = sampleInput;

    // Process the sample input
    document.getElementById('process').click();
});