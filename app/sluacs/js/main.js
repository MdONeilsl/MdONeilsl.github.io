import { LIBRARY_DATA } from "./g.js";

/**
 * Tracks all details elements for closing children behavior
 * @type {Set<HTMLElement>}
 */
const details_elements = new Set();

/**
 * Initializes search functionality
 */
const init_search = () => {
    const search_input = document.getElementById('search-input');

    search_input.addEventListener('input', (event) => {
        const search_term = event.target.value.toLowerCase().trim();

        if (search_term.length < 2) {
            clear_search();
            return;
        }

        perform_search(search_term);
    });
};

/**
 * Performs search across all accordion items
 * @param {string} search_term - The term to search for
 */
const perform_search = (search_term) => {
    clear_search();

    const all_items = document.querySelectorAll('.accordion-item');
    let has_matches = false;

    all_items.forEach(item => {
        const text_content = item.textContent.toLowerCase();
        const should_show = text_content.includes(search_term);

        if (should_show) {
            item.classList.remove('hidden');
            has_matches = true;
            highlight_matching_text(item, search_term);
            expand_parent_sections(item);
        } else {
            item.classList.add('hidden');
        }
    });

    if (!has_matches) {
        show_no_results_message(search_term);
    }
};

/**
 * Highlights matching text within an element
 * @param {HTMLElement} element - The element to search within
 * @param {string} search_term - The term to highlight
 */
const highlight_matching_text = (element, search_term) => {
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const nodes = [];
    let current_node;
    while (current_node = walker.nextNode()) {
        if (current_node.textContent.toLowerCase().includes(search_term)) {
            nodes.push(current_node);
        }
    }

    nodes.forEach(node => {
        const span = document.createElement('span');
        span.innerHTML = node.textContent.replace(
            new RegExp(`(${escape_regex(search_term)})`, 'gi'),
            '<mark class="search-highlight">$1</mark>'
        );
        node.parentNode.replaceChild(span, node);
    });
};

/**
 * Expands all parent sections to reveal matched element
 * @param {HTMLElement} element - The element to reveal
 */
const expand_parent_sections = (element) => {
    let parent = element.parentElement;
    while (parent) {
        const details = parent.closest('details');
        if (details) {
            details.open = true;
        }
        parent = parent.parentElement;
    }
};

/**
 * Clears search results and highlights
 */
const clear_search = () => {
    document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('hidden');
    });

    document.querySelectorAll('.search-highlight').forEach(highlight => {
        const parent = highlight.parentElement;
        if (parent) {
            parent.replaceWith(parent.textContent);
        }
    });

    const no_results = document.getElementById('no-results-message');
    if (no_results) {
        no_results.remove();
    }
};

/**
 * Displays no results message
 * @param {string} search_term - The search term that produced no results
 */
const show_no_results_message = (search_term) => {
    const container = document.getElementById('data-container');
    const message = document.createElement('div');
    message.id = 'no-results-message';
    message.className = 'loading-style';
    message.innerHTML = `
        <div style="color: var(--color-text-muted); font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
        <p>No results found for "<strong>${escape_html(search_term)}</strong>"</p>
        <p style="font-size: 0.8rem; color: var(--color-text-muted);">Try different keywords or check spelling</p>
    `;
    container.appendChild(message);
};

/**
 * Escapes special regex characters
 * @param {string} string - The string to escape
 * @returns {string} - Escaped string
 */
const escape_regex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} - Escaped string
 */
const escape_html = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

/**
 * Generates function signature HTML
 * @param {string} library_name - The library name
 * @param {string} key - The function key
 * @param {Object} obj - The function object
 * @returns {string} - HTML string of the signature
 */
const func_signature = (library_name, key, obj) => {
    const lib_prefix = library_name === "global" ? "" : `${library_name}.`;

    if (!obj.params) {
        return `<code class="terminal-signature">${lib_prefix}${key}</code>`;
    }

    const params_list = obj.params.map(param =>
        `${param.name}: ${param.type}`
    ).join(", ");

    return `<code class="terminal-signature">${lib_prefix}${key}(${params_list}): ${obj.return}</code>`;
};

/**
 * Builds section HTML recursively
 * @param {string} library_name - The library name
 * @param {string} key - The section key
 * @param {Object} obj - The section data object
 * @param {number} level - The nesting level
 * @returns {string} - HTML string of the section
 */
const build_section = (library_name, key, obj, level = 1) => {
    if (!obj || typeof obj !== 'object') {
        return '';
    }

    if (level === 2) {
        if (key !== 'func' && key !== 'var' && key !== 'table') return '';
    }

    let html = '';

    if (level === 2 && key === 'var') {
        html += Object.keys(obj).map(child_key => {
            if (typeof obj[child_key] === "object") return "";
            return `
                <div class="terminal-block">
                    <code class="terminal-signature">${library_name}.${child_key}: ${escape_html(obj[child_key])}</code>
                </div>
            `;
        }).join('');
        return html;
    }

    if (level === 2 && key === 'table') {
        html += Object.keys(obj).map(child_key => {
            const table_obj = obj[child_key];
            if (typeof table_obj !== "object") return "";

            return `
                <div class="terminal-block">
                    <code class="terminal-signature">${library_name}.${child_key}</code>
                    <p class="terminal-desc">${table_obj.desc || ''}</p>
                    ${table_obj.expl ? `<div class="terminal-meta">
                        <code class="terminal-meta-code">${escape_html(table_obj.expl).replace(/\n/g, '<br>').replace(/\t/g, ' &nbsp; &emsp; ')}</code>
                    </div>` : ''}
                </div>
            `;
        }).join('');
        return html;
    }

    const is_definition = obj.desc !== undefined;
    const item_count = Object.keys(obj).length;

    html += `
        <details class="accordion-item">
            <summary class="accordion-summary level-${Math.min(level, 3)}">
                <span class="flex-center">
                    <svg class="arrow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <span>${key}</span>
                    ${!is_definition ? `<span class="item-count">${item_count}</span>` : ''}
                </span>
            </summary>
            <div class="accordion-content">
    `;

    if (is_definition) {
        html += `
            <div class="terminal-block">
                ${func_signature(library_name, key, obj)}
                <p class="terminal-desc">${obj.desc || ''}</p>
                ${obj.expl ? `<div class="terminal-meta">
                    <code class="terminal-meta-code">${escape_html(obj.expl).replace(/\n/g, '<br>')}</code>
                </div>` : ''}
            </div>
        `;
    } else {
        html += Object.keys(obj).map(child_key => {
            if (obj[child_key] && typeof obj[child_key] === 'object') {
                if (level === 1) {
                    return build_section(key, child_key, obj[child_key], level + 1);
                } else {
                    return build_section(library_name, child_key, obj[child_key], level + 1);
                }
            }
            return '';
        }).join('');
    }

    return html + '</div></details>';
};

/**
 * Parses and renders library data
 */
const parse_libs = () => {
    const container = document.getElementById('data-container');

    try {
        container.innerHTML = Object.keys(LIBRARY_DATA).map(category => {
            if (LIBRARY_DATA[category] && typeof LIBRARY_DATA[category] === 'object') {
                return build_section(category, category, LIBRARY_DATA[category], 1);
            }
            return '';
        }).join('');
    } catch (error) {
        console.error('Error parsing libraries:', error);
        container.innerHTML = `
            <div class="loading-style">
                <div style="color: #ef4444; margin-bottom: 0.5rem;">⚠️</div>
                <p>Error loading data</p>
            </div>
        `;
    }
};

/**
 * Sets up accordion behavior for details elements
 */
const setup_accordion_behavior = () => {
    document.querySelectorAll('details').forEach(detail => {
        details_elements.add(detail);

        detail.addEventListener('toggle', () => {
            if (detail.open) {
                // Close all other details at the same level
                const parent = detail.parentElement;
                if (parent) {
                    parent.querySelectorAll('details').forEach(sibling => {
                        if (sibling !== detail) {
                            sibling.open = false;
                        }
                    });
                }
            } else {
                close_all_child_details(detail);
            }
        });
    });
};

/**
 * Recursively closes all child details elements
 * @param {HTMLElement} parent_detail - The parent details element
 */
const close_all_child_details = (parent_detail) => {
    const child_details = parent_detail.querySelectorAll('details');
    child_details.forEach(child_detail => {
        child_detail.open = false;
        close_all_child_details(child_detail);
    });
};

/**
 * Initializes the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('data-container');
    const loading_message = document.getElementById('loading-message');

    init_search();

    setTimeout(() => {
        if (loading_message) {
            loading_message.remove();
        }

        parse_libs();
        setup_accordion_behavior();
    }, 500);
});
