/**
 * Shape Mixer: Tool for Second Life users to mix shape data from different shapes and create uploadable XML files.
 * Copyright (C) 2025 MdONeil
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 * 
 * secondlife:///app/agent/ae929a12-297c-45be-9748-562ee17e937e/about
 */

/** @type {Object.<string, number[]>} */
const tabs = Object.freeze({
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

/** @type {Map<string, Document>} */
const loaded_files = new Map();

/** @type {Function} */
const $ = document.getElementById.bind(document);

/** @type {Document} */
const xslt_pretty_print = new DOMParser().parseFromString(
    `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
        <xsl:strip-space elements="*"/>
        <xsl:output method="xml" indent="yes"/>
        <xsl:template match="node()|@*">
            <xsl:copy>
                <xsl:apply-templates select="node()|@*"/>
            </xsl:copy>
        </xsl:template>
    </xsl:stylesheet>`,
    'application/xml'
);

/**
 * Generates a unique identifier
 * @returns {string}
 */
const generate_uid = () => crypto.randomUUID().slice(0, 13);

/**
 * Creates a DOM element with specified attributes
 * @param {string} tag - The HTML tag name
 * @param {Object} [attrs={}] - Element attributes
 * @returns {HTMLElement}
 */
const create_element = (tag, attrs = {}) => Object.assign(document.createElement(tag), attrs);

/**
 * Escapes HTML special characters
 * @param {string} str - String to escape
 * @returns {string}
 */
const escape_html = str => str?.replace(/[&<>"']/g, m => `&#${m.codePointAt(0)};`) ?? '';

/**
 * Updates status indicator for a file input
 * @param {HTMLInputElement} target - The file input element
 * @param {string} character - Status character/emoji
 */
const update_status = (target, character) => {
    const stats_element = target.parentElement?.querySelector('[data-for="stats"]');
    if (stats_element) stats_element.textContent = character;
};

/**
 * Loads and processes a selected file
 * @param {Event} event - File input change event
 */
const load_file = async event => {
    const target = /** @type {HTMLInputElement} */ (event.target);
    const file = target.files?.[0];
    if (!file) {
        update_status(target, '🟡');
        return;
    }

    const parent = target.parentElement;
    const name = file.name;
    parent.dataset.file = escape_html(name);
    loaded_files.delete(name);

    try {
        const text = await file.text();
        parse_file(target, text, name);
    } catch (error) {
        update_status(target, '🔴');
    }
};

/**
 * Checks if all file rows are successfully loaded
 * @returns {boolean}
 */
const all_rows_loaded = () => {
    const rows = document.querySelectorAll('.loaderrow');
    if (rows.length === 0) return false;
    
    for (let i = 0; i < rows.length; i++) {
        const stats_element = rows[i].querySelector('[data-for="stats"]');
        if (!stats_element || stats_element.textContent !== '🟢') return false;
    }
    return true;
};

/**
 * Parses XML file content and stores the document
 * @param {HTMLInputElement} target - File input element
 * @param {string} xml - XML content as string
 * @param {string} name - File name
 */
const parse_file = (target, xml, name) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const archetypes = doc.querySelectorAll('archetype');
    
    if (!archetypes.length) {
        update_status(target, '🔴');
        throw new Error('Invalid XML');
    }

    loaded_files.set(name, doc);
    update_status(target, '🟢');
    
    if (all_rows_loaded()) add_row();
};

/**
 * Handles exclusive checkbox behavior for categories
 * @param {HTMLInputElement} checkbox - The changed checkbox
 * @param {string} data_for - Category identifier
 */
const handle_exclusive_check = (checkbox, data_for) => {
    const row = checkbox.closest('.loaderrow');
    const stats_element = row?.querySelector('[data-for="stats"]');
    
    if (!stats_element || stats_element.textContent !== '🟢') {
        checkbox.checked = false;
        return;
    }

    const checkboxes = document.querySelectorAll(`[data-for="${data_for}"]`);
    for (let i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i] !== checkbox) {
            /** @type {HTMLInputElement} */ (checkboxes[i]).checked = false;
        }
    }
};

/**
 * Creates checkbox HTML for a category
 * @param {string} category - Category name
 * @returns {string}
 */
const create_checkbox_html = category => `
    <label>
        <input type="checkbox" data-for="${category}">
        <span>${category}</span>
    </label>
`;

/**
 * Adds a new file input row to the interface
 */
const add_row = () => {
    const id = generate_uid();
    const row = create_element('div', { className: 'loaderrow', id });
    
    row.innerHTML = `
        <span data-for="stats">🟡</span>
        <input type="file" data-for="file">
        ${Object.keys(tabs).map(create_checkbox_html).join('')}
    `;

    const loader_frame = $('loaderframe');
    if (loader_frame) loader_frame.append(row);

    const file_input = row.querySelector('[data-for="file"]');
    if (file_input) file_input.addEventListener('change', load_file);

    const checkboxes = row.querySelectorAll('[type="checkbox"]');
    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].addEventListener('change', event => {
            handle_exclusive_check(/** @type {HTMLInputElement} */ (event.target), 
                                 event.target.dataset.for);
        });
    }
};

/**
 * Generates and downloads the mixed shape XML file
 */
const save_xml = () => {
    const doc = document.implementation.createDocument('', '', null);
    const root = doc.createElement('linden_genepool');
    root.setAttribute('version', '1.0');
    doc.appendChild(root);

    const archetype = doc.createElement('archetype');
    archetype.setAttribute('name', '???');
    root.appendChild(archetype);

    for (const [category, ids] of Object.entries(tabs)) {
        const checked_box = document.querySelector(`[data-for="${category}"]:checked`);
        if (!checked_box) continue;

        const row = checked_box.closest('.loaderrow');
        const file_name = row?.dataset.file;
        if (!file_name) continue;

        const file_doc = loaded_files.get(file_name);
        if (!file_doc) continue;

        for (let i = 0; i < ids.length; i++) {
            const node = file_doc.querySelector(`param[id="${ids[i]}"]`);
            if (node) {
                archetype.appendChild(doc.importNode(node, true));
            }
        }
    }

    const xslt_processor = new XSLTProcessor();
    xslt_processor.importStylesheet(xslt_pretty_print);
    const pretty_doc = xslt_processor.transformToDocument(doc);

    const xml_string = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        new XMLSerializer().serializeToString(pretty_doc);

    const blob = new Blob([xml_string], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = create_element('a', { 
        href: url, 
        download: `mixed_shape_${Date.now()}.xml` 
    });

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    add_row();
    const save_button = $('save_btn');
    if (save_button) save_button.addEventListener('click', save_xml);
});