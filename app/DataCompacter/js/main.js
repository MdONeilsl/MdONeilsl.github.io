/*
    Data Compacter
    Copyright (C) 2025  MdONeil 

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    secondlife:///app/agent/ae929a12-297c-45be-9748-562ee17e937e/about
*/

/** @type {HTMLSelectElement} */
const style_select = document.getElementById('select-style');
/** @type {HTMLInputElement} */
const delimiter_input = document.getElementById('input-delimiter');
/** @type {HTMLInputElement} */
const separator_input = document.getElementById('input-keyval');
/** @type {HTMLInputElement} */
const max_bytes_input = document.getElementById('input-maxbytes');
/** @type {HTMLInputElement} */
const max_lines_input = document.getElementById('input-maxlines');
/** @type {HTMLTextAreaElement} */
const input_textarea = document.getElementById('textarea-input');
/** @type {HTMLTextAreaElement} */
const output_textarea = document.getElementById('textarea-output');
/** @type {HTMLButtonElement} */
const process_btn = document.getElementById('button-process');
/** @type {HTMLButtonElement} */
const copy_btn = document.getElementById('button-copy');
/** @type {HTMLDivElement} */
const error_div = document.getElementById('error-message');

/** @type {TextEncoder} */
const text_encoder = new TextEncoder();

/**
 * Validates all input fields and returns validation status
 * @returns {boolean} True if all inputs are valid, false otherwise
 */
const validate_inputs = () => {
    const style = style_select.value;
    const delimiter = delimiter_input.value;
    const separator = separator_input.value;
    const max_bytes = parseInt(max_bytes_input.value, 10);
    const max_lines = parseInt(max_lines_input.value, 10);
    const input = input_textarea.value;

    if (!input.trim()) {
        show_error('Input data is empty.');
        return false;
    }
    
    if (style === 'kvp' && !separator) {
        show_error('Key-value separator is empty.');
        return false;
    }
    
    if (isNaN(max_bytes) || max_bytes < 1) {
        show_error('Max bytes per line must be a positive integer.');
        return false;
    }
    
    if (isNaN(max_lines) || max_lines < 1) {
        show_error('Max number of lines must be a positive integer.');
        return false;
    }

    if (style === 'kvp') {
        const lines = input.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.includes(separator)) {
                show_error('Invalid KVP format: missing separator.');
                return false;
            }
        }
    }
    
    return true;
};

/**
 * Displays an error message to the user
 * @param {string} message - The error message to display
 */
const show_error = (message) => {
    error_div.textContent = message;
    error_div.style.display = 'block';
    process_btn.disabled = true;
};

/**
 * Clears any displayed error messages
 */
const clear_error = () => {
    error_div.textContent = '';
    error_div.style.display = 'none';
};

/**
 * Updates the button state based on current input values
 */
const update_button_state = () => {
    const input_states = {
        list: { separator: true, delimiter: false },
        raw: { separator: true, delimiter: true },
        uuidlist: { separator: true, delimiter: false },
        kvp: { separator: false, delimiter: false }
    };

    const state = input_states[style_select.value] || input_states.kvp;
    separator_input.disabled = state.separator;
    delimiter_input.disabled = state.delimiter;
    process_btn.disabled = !validate_inputs();
};

/**
 * Calculates the byte length of a string using cached TextEncoder
 * @param {string} str - The string to measure
 * @returns {number} The byte length of the string
 */
const get_byte_length = (str) => {
    return text_encoder.encode(str).length;
};

/**
 * Processes input data based on selected style and constraints
 */
const process_data = () => {
    clear_error();
    if (!validate_inputs()) return;

    const style = style_select.value;
    const delimiter = style === 'raw' ? '' : delimiter_input.value;
    const separator = separator_input.value;
    const max_bytes = parseInt(max_bytes_input.value, 10);
    const max_lines = parseInt(max_lines_input.value, 10);
    const input = input_textarea.value;

    const output_lines = [];
    let current_line = '';
    let current_byte_count = 0;

    /**
     * Adds current line to output and resets line state
     * @returns {boolean} True if max lines not exceeded, false otherwise
     */
    const flush_line = () => {
        if (current_line) {
            if (output_lines.length >= max_lines) {
                show_error('Maximum number of lines exceeded.');
                output_textarea.value = '';
                return false;
            }
            output_lines.push(current_line);
            current_line = '';
            current_byte_count = 0;
        }
        return true;
    };

    /**
     * Processes an item and adds it to the current line
     * @param {string} item_str - The item string to process
     * @param {boolean} [force_flush=false] - Whether to force flush before adding
     * @returns {boolean} True if successful, false if max lines exceeded
     */
    const process_item = (item_str, force_flush = false) => {
        const item_bytes = get_byte_length(item_str);
        const delimiter_bytes = current_line && delimiter ? get_byte_length(delimiter) : 0;
        const total_bytes = item_bytes + delimiter_bytes;

        if (force_flush || current_byte_count + total_bytes > max_bytes) {
            if (!flush_line()) return false;
        }

        if (current_line && delimiter) {
            current_line += delimiter + item_str;
            current_byte_count += delimiter_bytes + item_bytes;
        } else {
            current_line = item_str;
            current_byte_count = item_bytes;
        }
        
        return true;
    };

    try {
        if (style === 'raw') {
            const cleaned_input = input.replace(/\r?\n/g, '').trim();
            if (!cleaned_input) return;
            
            let str_work = '';
            let current_byte_length = 0;

            for (let i = 0; i < cleaned_input.length; i++) {
                const char = cleaned_input[i];
                const char_byte_length = get_byte_length(char);

                if (current_byte_length + char_byte_length > max_bytes) {
                    if (output_lines.length >= max_lines) {
                        show_error('Maximum number of lines exceeded.');
                        output_textarea.value = '';
                        return;
                    }
                    output_lines.push(str_work);
                    str_work = char;
                    current_byte_length = char_byte_length;
                } else {
                    str_work += char;
                    current_byte_length += char_byte_length;
                }
            }

            if (str_work && output_lines.length < max_lines) {
                output_lines.push(str_work);
            }
        } 
        else if (style === 'list' || style === 'uuidlist') {
            const lines = input.split('\n');
            const items = [];
            
            if (style === 'uuidlist') {
                const uuid_regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
                const seen = new Set();
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    let match;
                    while ((match = uuid_regex.exec(line)) !== null) {
                        const uuid = match[0].toLowerCase();
                        if (!seen.has(uuid)) {
                            seen.add(uuid);
                            items.push(match[0]);
                        }
                    }
                }
            } else {
                for (let i = 0; i < lines.length; i++) {
                    const item = lines[i].trim();
                    if (item) items.push(item);
                }
            }

            for (let i = 0; i < items.length; i++) {
                if (!process_item(items[i])) return;
            }
        } 
        else if (style === 'kvp') {
            const lines = input.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                if (!line.includes(separator)) {
                    show_error('Invalid KVP format: missing separator.');
                    output_textarea.value = '';
                    return;
                }
                
                const separator_index = line.indexOf(separator);
                const key = line.substring(0, separator_index).trim();
                const value = line.substring(separator_index + separator.length).trim();
                const kv_str = key + separator + value;
                
                if (!process_item(kv_str)) return;
            }
        }

        if (current_line && output_lines.length < max_lines) {
            output_lines.push(current_line);
        }

        if (output_lines.length > max_lines) {
            show_error('Maximum number of lines exceeded.');
            output_textarea.value = '';
            return;
        }

        output_textarea.value = output_lines.join('\n');
    } catch (error) {
        show_error('An unexpected error occurred during processing.');
        console.error('Processing error:', error);
    }
};

// Event listeners with optimized event handling
style_select.addEventListener('change', update_button_state);
input_textarea.addEventListener('input', update_button_state);
delimiter_input.addEventListener('input', update_button_state);
separator_input.addEventListener('input', update_button_state);
max_bytes_input.addEventListener('input', update_button_state);
max_lines_input.addEventListener('input', update_button_state);

process_btn.addEventListener('click', process_data);

copy_btn.addEventListener('click', () => {
    if (output_textarea.value) {
        navigator.clipboard.writeText(output_textarea.value).catch(err => {
            console.error('Failed to copy text:', err);
        });
    }
});

input_textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = input_textarea.selectionStart;
        const end = input_textarea.selectionEnd;
        input_textarea.value = input_textarea.value.substring(0, start) + '\t' + input_textarea.value.substring(end);
        input_textarea.selectionStart = input_textarea.selectionEnd = start + 1;
        update_button_state();
    }
});

// Initialize button state
update_button_state();