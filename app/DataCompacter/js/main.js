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
const styleSelect = document.getElementById('select-style');
const delimiterInput = document.getElementById('input-delimiter');
const separatorInput = document.getElementById('input-keyval');
const maxBytesInput = document.getElementById('input-maxbytes');
const maxLinesInput = document.getElementById('input-maxlines');
const inputTextarea = document.getElementById('textarea-input');
const outputTextarea = document.getElementById('textarea-output');
const processBtn = document.getElementById('button-process');
const copyBtn = document.getElementById('button-copy');
const errorDiv = document.getElementById('error-message');

const validateInputs = () => {
    const style = styleSelect.value;
    const delimiter = delimiterInput.value;
    const separator = separatorInput.value;
    const maxBytes = parseInt(maxBytesInput.value);
    const maxLines = parseInt(maxLinesInput.value);
    const input = inputTextarea.value;

    if (!input.trim()) {
        showError('Input data is empty.');
        return false;
    }
    if (style === 'kvp' && !separator) {
        showError('Key-value separator is empty.');
        return false;
    }
    if (isNaN(maxBytes) || maxBytes < 1) {
        showError('Max bytes per line must be a positive integer.');
        return false;
    }
    if (isNaN(maxLines) || maxLines < 1) {
        showError('Max number of lines must be a positive integer.');
        return false;
    }
    if (style === 'json') {
        try {
            JSON.parse(input);
        } catch {
            showError('Invalid JSON input.');
            return false;
        }
    } else if (style === 'kvp') {
        const lines = input.split(delimiter);
        for (let line of lines) {
            if (line.trim() && !line.includes(separator)) {
                showError('Invalid KVP format: missing separator.');
                return false;
            }
        }
    }
    return true;
}

const showError = (message) => {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    processBtn.disabled = true;
}

const clearError = () => {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
}

const updateButtonState = () => {
    const inputStates = {
        list: { separator: true, delimiter: false },
        raw: { separator: true, delimiter: true },
        json: { separator: true, delimiter: true },
        kvp: { separator: false, delimiter: false }
    };

    const state = inputStates[styleSelect.value] || inputStates.kvp;
    separatorInput.disabled = state.separator;
    delimiterInput.disabled = state.delimiter;
    processBtn.disabled = !validateInputs();
};

const getByteLength = (str) => {
    return new TextEncoder().encode(str).length;
}

const processData = () => {
    clearError();
    if (!validateInputs()) return;

    const style = styleSelect.value;
    const delimiter = style === 'json' ? '' : delimiterInput.value;
    const separator = separatorInput.value;
    const maxBytes = parseInt(maxBytesInput.value);
    const maxLines = parseInt(maxLinesInput.value);
    const input = inputTextarea.value;

    let outputLines = [];
    let currentLine = '';
    let currentByteCount = 0;

    if (style === 'raw') {
        const strInput = input.split(/\r?\n/).map(item => item.trim()).filter(Boolean).join('');

        let strWork = '';
        let currentByteLength = 0;

        const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
        const graphemes = [...segmenter.segment(strInput)].map(seg => seg.segment);

        for (const grapheme of graphemes) {
            const charByteLength = getByteLength(grapheme);

            if (currentByteLength + charByteLength > maxBytes) {
                outputLines.push(strWork);

                if (outputLines.length >= maxLines) {
                    showError('Maximum number of lines exceeded.');
                    outputTextarea.value = '';
                    return;
                }

                strWork = '';
                currentByteLength = 0;
            }

            strWork += grapheme;
            currentByteLength += charByteLength;
        }

        if (strWork) {
            outputLines.push(strWork);
        }

    }
    else if (style === 'list') {
        const items = input.split(/\r?\n/).filter(item => item.trim());

        for (let item of items) {
            const itemStr = item.trim();
            const itemBytes = getByteLength(itemStr);
            const delimiterBytes = currentLine && delimiter ? getByteLength(delimiter) : 0;

            if (currentByteCount + itemBytes + delimiterBytes <= maxBytes) {
                currentLine += currentLine && delimiter ? delimiter + itemStr : itemStr;
                currentByteCount += itemBytes + delimiterBytes;
            }
            else {
                if (currentLine) outputLines.push(currentLine);
                if (outputLines.length >= maxLines) {
                    showError('Maximum number of lines exceeded.');
                    outputTextarea.value = '';
                    return;
                }
                currentLine = itemStr;
                currentByteCount = itemBytes;
            }
        }
        if (currentLine) outputLines.push(currentLine);

    }
    else if (style === 'uuidlist') {

        const uuidRegex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

        // Extract all UUIDs from input, preserve first occurrence’s case, ensure uniqueness (case-insensitive)
        const seen = new Set();
        const matches = [];

        (input.match(uuidRegex) || []).forEach(u => {
            const lower = u.toLowerCase();
            if (!seen.has(lower)) {
                seen.add(lower);
                matches.push(u); // keep case as in text
            }
        });

        for (let item of matches) {
            const itemStr = item.trim();
            const itemBytes = getByteLength(itemStr);
            const delimiterBytes = currentLine && delimiter ? getByteLength(delimiter) : 0;

            if (currentByteCount + itemBytes + delimiterBytes <= maxBytes) {
                currentLine += currentLine && delimiter ? delimiter + itemStr : itemStr;
                currentByteCount += itemBytes + delimiterBytes;
            } else {
                if (currentLine) outputLines.push(currentLine);
                if (outputLines.length >= maxLines) {
                    showError('Maximum number of lines exceeded.');
                    outputTextarea.value = '';
                    return;
                }
                currentLine = itemStr;
                currentByteCount = itemBytes;
            }
        }

        if (currentLine) outputLines.push(currentLine);
    }
    else if (style === 'kvp') {
        const pairs = input.split(/\r?\n/).filter(pair => pair.trim());
        for (let pair of pairs) {
            const pairStr = pair.trim();
            if (!pairStr.includes(separator)) {
                showError('Invalid KVP format: missing separator.');
                outputTextarea.value = '';
                return;
            }
            // Split into key and value using the first occurrence of the separator
            const [key, ...rest] = pairStr.split(separator);
            const value = rest.join(separator); // In case value contains the separator
            const kvStr = `${key.trim()}${separator}${value.trim()}`;

            const kvBytes = getByteLength(kvStr);
            const delimiterBytes = currentLine && delimiter ? getByteLength(delimiter) : 0;

            if (currentByteCount + kvBytes + delimiterBytes <= maxBytes) {
                currentLine += currentLine && delimiter ? delimiter + kvStr : kvStr;
                currentByteCount += kvBytes + delimiterBytes;
            }
            else {
                if (currentLine) outputLines.push(currentLine);
                if (outputLines.length >= maxLines) {
                    showError('Maximum number of lines exceeded.');
                    outputTextarea.value = '';
                    return;
                }
                currentLine = kvStr;
                currentByteCount = kvBytes;
            }
        }
        if (currentLine) outputLines.push(currentLine);
    }

    if (outputLines.length > maxLines) {
        showError('Maximum number of lines exceeded.');
        outputTextarea.value = '';
        return;
    }

    outputTextarea.value = outputLines.join('\n');
    //maxLinesInput.value = outputLines.length;
}

styleSelect.addEventListener('change', () => {
    updateButtonState();
});

inputTextarea.addEventListener('input', updateButtonState);
delimiterInput.addEventListener('input', updateButtonState);
separatorInput.addEventListener('input', updateButtonState);
maxBytesInput.addEventListener('input', updateButtonState);
maxLinesInput.addEventListener('input', updateButtonState);

processBtn.addEventListener('click', processData);

copyBtn.addEventListener('click', () => {
    if (outputTextarea.value) {
        navigator.clipboard.writeText(outputTextarea.value);
        //alert('Output copied to clipboard!');
    }
});

inputTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = inputTextarea.selectionStart;
        const end = inputTextarea.selectionEnd;
        inputTextarea.value = inputTextarea.value.substring(0, start) + '\t' + inputTextarea.value.substring(end);
        inputTextarea.selectionStart = inputTextarea.selectionEnd = start + 1;
    }
});

updateButtonState();
