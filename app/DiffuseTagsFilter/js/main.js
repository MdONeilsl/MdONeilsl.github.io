/**
 * @fileoverview Tag classifier application - Refactored enterprise edition.
 * @version 1.0.0
 */

(function () {
    'use strict';

    // ===========================================================================
    //  CONSTANTS (named constants to eliminate magic numbers)
    // ===========================================================================
    const TOAST_DURATION_MS = 2000;
    const DRAG_HOVER_BACKGROUND = 'rgba(46,204,113,0.08)';
    const LOCAL_TAGS_PATH = './data/tags.json';
    const LOCAL_TEMPLATE_PATH = './data/body_template.json';
    const SAVE_FILENAME_PREFIX = 'tags-three';
    const DATE_FORMAT_OPTIONS = { year: 'numeric', month: '2-digit', day: '2-digit' };

    // ===========================================================================
    //  UTILITY FUNCTIONS (pure)
    // ===========================================================================

    
    /**
     * Creates a deep clone of an object.
     * @template T
     * @param {T} obj - The source object.
     * @returns {T} A deep copy.
     */
    const deep_clone = (obj) => JSON.parse(JSON.stringify(obj));

    /**
     * Escapes HTML special characters.
     * @param {string} unsafe - Raw string.
     * @returns {string} Escaped string.
     */
    const escape_html = (unsafe) => unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    /**
     * Generates a timestamp string for filenames.
     * @returns {string} ISO-like timestamp without colons.
     */
    const get_timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    /**
     * Sorts an array of strings alphabetically (locale‑aware).
     * @param {string[]} arr - Input array.
     * @returns {string[]} Sorted copy.
     */
    const sort_strings = (arr) => [...arr].sort((a, b) => a.localeCompare(b));

    // ===========================================================================
    //  DOM ELEMENT CACHE (singleton)
    // ===========================================================================
    const dom_cache = (() => {
        const elements = {
            tag_file_input: document.getElementById('tagFileInput'),
            file_info: document.getElementById('fileInfo'),
            show_filter_textarea: document.getElementById('showFilter'),
            hide_filter_textarea: document.getElementById('hideFilter'),
            name_filter_input: document.getElementById('nameFilterInput'),
            available_container: document.getElementById('availableTagsContainer'),
            sections_grid: document.getElementById('sectionsGrid'),
            left_count: document.getElementById('leftCount'),
            available_count: document.getElementById('availableCount'),
            classified_count: document.getElementById('classifiedCount'),
            total_count: document.getElementById('totalCount'),
            right_tag_count: document.getElementById('rightTagCount'),
            toast_container: document.getElementById('toastContainer'),
            right_filter_input: document.getElementById('rightSectionFilter'),
            right_filter_count: document.getElementById('rightFilterCount'),
            load_template_btn: document.getElementById('loadTemplateBtn'),
            template_file_input: document.getElementById('templateFileInput'),
        };
        return {
            get: (name) => elements[name],
            all: () => elements,
        };
    })();

    // ===========================================================================
    //  TOAST SERVICE (observer pattern)
    // ===========================================================================
    const toast_service = {
        /**
         * Displays a temporary notification.
         * @param {string} message - Text to show.
         */
        show: (message) => {
            const container = dom_cache.get('toast_container');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), TOAST_DURATION_MS);
        },
    };

    // ===========================================================================
    //  TAG DATA SERVICE (handles tags.json loading & validation)
    // ===========================================================================
    class tag_data_service {
        /** @type {Record<string, string[]>} */
        #all_tags = {};
        /** @type {Set<string>} */
        #classified_tags = new Set();

        /**
         * Loads tags from a JSON string.
         * @param {string} json - Raw JSON data.
         * @throws {Error} On invalid format.
         */
        load_from_json(json) {
            const parsed = JSON.parse(json);
            this.#validate_tags_object(parsed);
            this.#all_tags = parsed;
            this.#prune_classified_tags();
            toast_service.show(`Loaded ${Object.keys(this.#all_tags).length} tags`);
        }

        /**
         * Fetches tags from the default local file.
         * @returns {Promise<void>}
         */
        async load_from_local() {
            const response = await fetch(LOCAL_TAGS_PATH, { headers: { 'Content-Type': 'text/plain' } });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.text();
            this.load_from_json(json);
        }

        /**
         * Returns all tag definitions.
         * @returns {Record<string, string[]>}
         */
        get_all_tags() {
            return { ...this.#all_tags };
        }

        /**
         * Checks whether a tag exists.
         * @param {string} tag_name - Tag name.
         * @returns {boolean}
         */
        has_tag(tag_name) {
            return this.#all_tags.hasOwnProperty(tag_name);
        }

        /**
         * Returns the categories of a tag.
         * @param {string} tag_name
         * @returns {string[]}
         */
        get_categories(tag_name) {
            return this.#all_tags[tag_name] || [];
        }

        /**
         * Total number of defined tags.
         * @returns {number}
         */
        total_count() {
            return Object.keys(this.#all_tags).length;
        }

        /**
         * Marks a tag as classified (placed in a section).
         * @param {string} tag_name
         */
        add_classified(tag_name) {
            this.#classified_tags.add(tag_name);
        }

        /**
         * Removes classification mark.
         * @param {string} tag_name
         */
        remove_classified(tag_name) {
            this.#classified_tags.delete(tag_name);
        }

        /**
         * Checks if a tag is classified.
         * @param {string} tag_name
         * @returns {boolean}
         */
        is_classified(tag_name) {
            return this.#classified_tags.has(tag_name);
        }

        /**
         * Returns all classified tags.
         * @returns {Set<string>}
         */
        get_classified_set() {
            return new Set(this.#classified_tags);
        }

        /**
         * Replaces the classified set.
         * @param {Set<string>} new_set
         */
        set_classified_set(new_set) {
            this.#classified_tags = new Set(new_set);
        }

        /**
         * Resets all classification.
         */
        reset_classified() {
            this.#classified_tags.clear();
        }

        /**
         * Validates the tags object structure.
         * @param {any} obj
         * @private
         */
        #validate_tags_object(obj) {
            if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
                throw new Error('Invalid format: expected object');
            }
            for (const [key, val] of Object.entries(obj)) {
                if (!Array.isArray(val)) {
                    throw new Error(`Invalid value for tag "${key}": expected array of categories`);
                }
            }
        }

        /**
         * Removes classified tags that no longer exist in the data.
         * @private
         */
        #prune_classified_tags() {
            const valid = new Set();
            for (const t of this.#classified_tags) {
                if (this.#all_tags[t]) valid.add(t);
            }
            this.#classified_tags = valid;
        }
    }

    // ===========================================================================
    //  STRUCTURE SERVICE (handles section template)
    // ===========================================================================
    class structure_service {
        /** @type {Record<string, {tags: string[], subs?: string[]}>} */
        #sections = {};
        /** @type {any} */
        #root_value = null;

        /**
         * Loads structure from a template JSON string.
         * @param {string} json - Raw JSON.
         * @param {tag_data_service} tag_service - To validate existing tags.
         */
        load_from_json(json, tag_service) {
            const parsed = JSON.parse(json);
            this.#validate_template_object(parsed);
            this.#root_value = parsed.root ?? null;
            const sections = { ...parsed };
            delete sections.root;
            this.#sections = deep_clone(sections);
            this.#remove_nonexistent_tags(tag_service);
        }

        /**
         * Loads default template from local file.
         * @param {tag_data_service} tag_service
         * @returns {Promise<void>}
         */
        async load_from_local(tag_service) {
            const response = await fetch(LOCAL_TEMPLATE_PATH, { headers: { 'Content-Type': 'text/plain' } });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.text();
            this.load_from_json(json, tag_service);
        }

        /**
         * Returns a shallow copy of all sections.
         * @returns {Record<string, {tags: string[], subs?: string[]}>}
         */
        get_sections() {
            return { ...this.#sections };
        }

        /**
         * Returns the root value.
         * @returns {any}
         */
        get_root() {
            return this.#root_value;
        }

        /**
         * Returns tags of a specific section.
         * @param {string} section_name
         * @returns {string[]}
         */
        get_section_tags(section_name) {
            return this.#sections[section_name]?.tags ?? [];
        }

        /**
         * Adds a tag to a section.
         * @param {string} section_name
         * @param {string} tag_name
         */
        add_tag_to_section(section_name, tag_name) {
            if (this.#sections[section_name] && !this.#sections[section_name].tags.includes(tag_name)) {
                this.#sections[section_name].tags.push(tag_name);
            }
        }

        /**
         * Removes a tag from a section.
         * @param {string} section_name
         * @param {string} tag_name
         * @returns {boolean} True if removed.
         */
        remove_tag_from_section(section_name, tag_name) {
            if (!this.#sections[section_name]) return false;
            const original_length = this.#sections[section_name].tags.length;
            this.#sections[section_name].tags = this.#sections[section_name].tags.filter(t => t !== tag_name);
            return original_length !== this.#sections[section_name].tags.length;
        }

        /**
         * Checks whether a tag exists anywhere in the structure.
         * @param {string} tag_name
         * @returns {boolean}
         */
        is_tag_placed(tag_name) {
            return Object.values(this.#sections).some(section => section.tags.includes(tag_name));
        }

        /**
         * Resets all sections (clears all tags).
         */
        reset_all_tags() {
            for (const section of Object.values(this.#sections)) {
                section.tags = [];
            }
        }

        /**
         * Returns the total number of placed tags.
         * @returns {number}
         */
        total_placed_count() {
            let total = 0;
            for (const section of Object.values(this.#sections)) {
                total += section.tags.length;
            }
            return total;
        }

        /**
         * Exports structure as a plain object ready for JSON.
         * @returns {object}
         */
        export_to_object() {
            const output = {};
            if (this.#root_value !== undefined && this.#root_value !== null) {
                output.root = this.#root_value;
            }
            const sorted_names = sort_strings(Object.keys(this.#sections));
            for (const name of sorted_names) {
                const section = this.#sections[name];
                const entry = { tags: [...section.tags] };
                if (section.subs?.length) entry.subs = [...section.subs];
                output[name] = entry;
            }
            return output;
        }

        /**
         * Validates template object.
         * @param {any} obj
         * @private
         */
        #validate_template_object(obj) {
            if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
                throw new Error('Invalid format: expected object');
            }
            for (const [key, val] of Object.entries(obj)) {
                if (key === 'root') continue;
                if (typeof val !== 'object' || val === null || !Array.isArray(val.tags)) {
                    throw new Error(`Invalid section "${key}": must have a "tags" array.`);
                }
                if (val.subs !== undefined && !Array.isArray(val.subs)) {
                    throw new Error(`Invalid section "${key}": "subs" must be an array if present.`);
                }
            }
        }

        /**
         * Removes tags that are not in the tag service.
         * @param {tag_data_service} tag_service
         * @private
         */
        #remove_nonexistent_tags(tag_service) {
            for (const section of Object.values(this.#sections)) {
                section.tags = section.tags.filter(t => tag_service.has_tag(t));
            }
        }
    }

    // ===========================================================================
    //  FILTER STRATEGY (strategy pattern for tag filtering)
    // ===========================================================================
    class tag_filter_strategy {
        /**
         * @param {string[]} show_keywords
         * @param {string[]} hide_keywords
         * @param {string} name_filter
         */
        constructor(show_keywords, hide_keywords, name_filter) {
            this.show_keywords = show_keywords;
            this.hide_keywords = hide_keywords;
            this.name_filter = name_filter.toLowerCase();
        }

        /**
         * Determines whether a tag passes all filters.
         * @param {string} tag_name
         * @param {string[]} categories
         * @returns {boolean}
         */
        matches(tag_name, categories) {
            // Name filter
            if (this.name_filter && !tag_name.toLowerCase().includes(this.name_filter)) return false;
            const cats_lower = categories.map(c => c.toLowerCase());
            // Show keywords (AND)
            if (this.show_keywords.length && !this.show_keywords.every(kw => cats_lower.some(cat => cat.includes(kw)))) return false;
            // Hide keywords (OR)
            if (this.hide_keywords.length && this.hide_keywords.some(kw => cats_lower.some(cat => cat.includes(kw)))) return false;
            return true;
        }
    }

    // ===========================================================================
    //  TAG PILL FACTORY (factory pattern)
    // ===========================================================================
    class tag_pill_factory {
        /**
         * Creates a draggable tag pill.
         * @param {string} tag_name
         * @param {'available'|'placed'} type
         * @param {string|null} source_section
         * @param {Function} on_delete - Callback for delete button.
         * @returns {HTMLDivElement}
         */
        static create(tag_name, type, source_section, on_delete = null) {
            const pill = document.createElement('div');
            pill.className = `tag-pill ${type}`;
            pill.textContent = tag_name;
            pill.draggable = true;
            pill.dataset.tagName = tag_name;
            if (source_section) pill.dataset.sourceSection = source_section;

            const drag_data = JSON.stringify({ tag_name, source_section, from_left: type === 'available' });

            pill.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', drag_data);
                e.dataTransfer.effectAllowed = 'move';
                pill.classList.add('dragging');
                setTimeout(() => pill.classList.remove('dragging'), 0);
            });

            pill.addEventListener('dragend', () => {
                pill.classList.remove('dragging');
                document.querySelectorAll('.section-card.drop-hover').forEach(card => card.classList.remove('drop-hover'));
            });

            if (type === 'placed' && on_delete) {
                const delete_btn = document.createElement('button');
                delete_btn.className = 'delete-btn';
                delete_btn.textContent = '×';
                delete_btn.title = 'Remove this tag';
                delete_btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    on_delete();
                });
                delete_btn.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                });
                pill.prepend(delete_btn);
            }
            return pill;
        }
    }

    // ===========================================================================
    //  VIEW RENDERER (handles UI updates)
    // ===========================================================================
    class view_renderer {
        /**
         * @param {tag_data_service} tag_service
         * @param {structure_service} struct_service
         * @param {object} dom - cached DOM elements
         */
        constructor(tag_service, struct_service, dom) {
            this.tag_service = tag_service;
            this.struct_service = struct_service;
            this.dom = dom;
            this.right_filter_text = '';
        }

        /**
         * Refreshes both panels and stats.
         */
        refresh_all() {
            this.render_left_panel();
            this.render_right_panel();
            this.update_stats();
        }

        /**
         * Renders the available tags panel.
         */
        render_left_panel() {
            const container = this.dom.available_container;
            if (!container) return;
            const available = this.#get_filtered_available_tags();
            container.innerHTML = '';

            if (available.length === 0) {
                const msg = document.createElement('div');
                msg.className = 'no-tags';
                if (this.tag_service.total_count() === 0) {
                    msg.textContent = 'Load a JSON file to see tags';
                } else if (this.tag_service.get_classified_set().size === this.tag_service.total_count()) {
                    msg.textContent = 'All tags have been classified! 🎉';
                } else {
                    msg.textContent = 'No tags match the current filters';
                }
                container.appendChild(msg);
            } else {
                for (const tag_name of available) {
                    const pill = tag_pill_factory.create(tag_name, 'available', null, null);
                    container.appendChild(pill);
                }
            }
            this.dom.left_count.textContent = available.length;
        }

        /**
         * Renders the right panel (sections with placed tags).
         */
        render_right_panel() {
            const grid = this.dom.sections_grid;
            if (!grid) return;
            const sections = this.struct_service.get_sections();
            const section_names = sort_strings(Object.keys(sections));
            grid.innerHTML = '';
            let total_placed = 0;

            for (const sec_name of section_names) {
                const section = sections[sec_name];
                const card = this.#create_section_card(sec_name, section);
                grid.appendChild(card);
                total_placed += section.tags.length;
            }

            this.#apply_right_filter();
            this.dom.right_tag_count.textContent = `${total_placed} tag${total_placed !== 1 ? 's' : ''} placed`;
        }

        /**
         * Updates the statistics counters.
         */
        update_stats() {
            const total = this.tag_service.total_count();
            const classified = this.tag_service.get_classified_set().size;
            const available = this.#get_filtered_available_tags().length;
            this.dom.available_count.textContent = available;
            this.dom.classified_count.textContent = classified;
            this.dom.total_count.textContent = total;
        }

        /**
         * Sets the right panel filter text.
         * @param {string} text
         */
        set_right_filter(text) {
            this.right_filter_text = text.toLowerCase();
            this.#apply_right_filter();
        }

        /**
         * Returns filtered available tags.
         * @returns {string[]}
         * @private
         */
        #get_filtered_available_tags() {
            const show_keywords = this.#get_keywords_from_textarea(this.dom.show_filter_textarea);
            const hide_keywords = this.#get_keywords_from_textarea(this.dom.hide_filter_textarea);
            const name_filter = this.dom.name_filter_input?.value ?? '';
            const strategy = new tag_filter_strategy(show_keywords, hide_keywords, name_filter);
            const result = [];

            const all_tags = this.tag_service.get_all_tags();
            for (const [tag_name, categories] of Object.entries(all_tags)) {
                if (this.tag_service.is_classified(tag_name)) continue;
                if (strategy.matches(tag_name, categories)) {
                    result.push(tag_name);
                }
            }
            return sort_strings(result);
        }

        /**
         * Extracts keywords from a textarea.
         * @param {HTMLTextAreaElement} ta
         * @returns {string[]}
         * @private
         */
        #get_keywords_from_textarea(ta) {
            if (!ta) return [];
            const val = ta.value.trim();
            return val ? val.split(/[\s,]+/).filter(k => k).map(k => k.toLowerCase()) : [];
        }

        /**
         * Creates a single section card.
         * @param {string} sec_name
         * @param {{tags:string[], subs?:string[]}} section
         * @returns {HTMLDivElement}
         * @private
         */
        #create_section_card(sec_name, section) {
            const card = document.createElement('div');
            card.className = 'section-card';
            card.dataset.sectionName = sec_name;

            const name_el = document.createElement('div');
            name_el.className = 'section-name';
            name_el.textContent = sec_name.replace(/_/g, ' ');
            card.appendChild(name_el);

            if (section.subs?.length) {
                const subs_el = document.createElement('div');
                subs_el.className = 'section-subs';
                subs_el.innerHTML = `└ subs: <span>${section.subs.map(s => s.replace(/_/g, ' ')).join(', ')}</span>`;
                card.appendChild(subs_el);
            }

            const tags_area = document.createElement('div');
            tags_area.className = 'tags-area';
            if (!section.tags.length) tags_area.classList.add('empty');

            for (const tag_name of section.tags) {
                const on_delete = () => this.#handle_delete_tag(sec_name, tag_name);
                const pill = tag_pill_factory.create(tag_name, 'placed', sec_name, on_delete);
                tags_area.appendChild(pill);
            }
            card.appendChild(tags_area);

            if (section.tags.length) {
                const count_el = document.createElement('div');
                count_el.className = 'tag-count';
                count_el.textContent = `${section.tags.length} tag${section.tags.length !== 1 ? 's' : ''}`;
                card.appendChild(count_el);
            }

            // Drag & drop event handlers (Observer pattern)
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                card.classList.add('drop-hover');
            });
            card.addEventListener('dragleave', (e) => {
                if (!card.contains(e.relatedTarget)) card.classList.remove('drop-hover');
            });
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drop-hover');
                this.#handle_drop_on_section(e, sec_name);
            });

            return card;
        }

        /**
         * Handles delete button on a placed tag.
         * @param {string} sec_name
         * @param {string} tag_name
         * @private
         */
        #handle_delete_tag(sec_name, tag_name) {
            this.struct_service.remove_tag_from_section(sec_name, tag_name);
            const still_placed = this.struct_service.is_tag_placed(tag_name);
            if (!still_placed) {
                this.tag_service.remove_classified(tag_name);
            }
            this.refresh_all();
        }

        /**
         * Handles dropping a tag onto a section.
         * @param {DragEvent} e
         * @param {string} target_section
         * @private
         */
        #handle_drop_on_section(e, target_section) {
            try {
                const raw = e.dataTransfer.getData('text/plain');
                if (!raw) return;
                const { tag_name, source_section, from_left } = JSON.parse(raw);
                if (source_section === target_section) return;

                if (!this.tag_service.has_tag(tag_name) && !this.tag_service.is_classified(tag_name)) return;

                // If already in target, do nothing but still remove from source?
                if (this.struct_service.get_section_tags(target_section).includes(tag_name)) {
                    if (source_section) {
                        this.struct_service.remove_tag_from_section(source_section, tag_name);
                    }
                    this.refresh_all();
                    return;
                }

                // Remove from source if any
                if (source_section) {
                    this.struct_service.remove_tag_from_section(source_section, tag_name);
                }

                // Add to target
                this.struct_service.add_tag_to_section(target_section, tag_name);
                this.tag_service.add_classified(tag_name);

                // If we removed from source and tag is no longer anywhere, correct classification
                if (source_section && !this.struct_service.is_tag_placed(tag_name)) {
                    this.tag_service.remove_classified(tag_name);
                }
                if (from_left) {
                    this.tag_service.add_classified(tag_name);
                }
                this.refresh_all();
            } catch (err) {
                console.error('Drop error:', err);
            }
        }

        /**
         * Applies text filter to section cards.
         * @private
         */
        #apply_right_filter() {
            const filter = this.right_filter_text;
            const cards = document.querySelectorAll('.section-card');
            let hidden = 0;
            for (const card of cards) {
                const sec_name = card.dataset.sectionName;
                if (!filter || sec_name.includes(filter)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                    hidden++;
                }
            }
            this.dom.right_filter_count.textContent = hidden ? `${hidden} hidden` : 'all shown';
        }
    }

    // ===========================================================================
    //  COMMAND HANDLERS (command pattern)
    // ===========================================================================
    class command_handlers {
        /**
         * @param {tag_data_service} tag_service
         * @param {structure_service} struct_service
         * @param {view_renderer} renderer
         */
        constructor(tag_service, struct_service, renderer) {
            this.tag_service = tag_service;
            this.struct_service = struct_service;
            this.renderer = renderer;
        }

        /**
         * Saves the current state to a JSON file.
         */
        save_json() {
            const output = this.struct_service.export_to_object();
            const json_str = JSON.stringify(output, null, 2);
            const blob = new Blob([json_str], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${SAVE_FILENAME_PREFIX}-${get_timestamp()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast_service.show('✅ JSON saved successfully!');
        }

        /**
         * Resets all placed tags after confirmation.
         */
        reset_all_tags() {
            if (confirm('Are you sure you want to remove ALL placed tags from all sections?')) {
                this.struct_service.reset_all_tags();
                this.tag_service.reset_classified();
                this.renderer.refresh_all();
                toast_service.show('🔄 All tags reset');
            }
        }

        /**
         * Handles return of a tag to the left panel.
         * @param {string} tag_name
         * @param {string} source_section
         */
        return_tag_to_available(tag_name, source_section) {
            if (source_section && this.struct_service.remove_tag_from_section(source_section, tag_name)) {
                const still_placed = this.struct_service.is_tag_placed(tag_name);
                if (!still_placed) {
                    this.tag_service.remove_classified(tag_name);
                }
                this.renderer.refresh_all();
                toast_service.show(`"${tag_name}" returned to available tags`);
            }
        }
    }

    // ===========================================================================
    //  LEFT PANEL DROP HANDLER (decorator for drop zone)
    // ===========================================================================
    class left_panel_drop_zone {
        /**
         * @param {command_handlers} commands
         * @param {view_renderer} renderer
         * @param {HTMLElement} container
         */
        constructor(commands, renderer, container) {
            this.commands = commands;
            this.renderer = renderer;
            this.container = container;
            this.#attach_events();
        }

        #attach_events() {
            this.container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.container.style.background = DRAG_HOVER_BACKGROUND;
            });
            this.container.addEventListener('dragleave', (e) => {
                if (!this.container.contains(e.relatedTarget)) {
                    this.container.style.background = '';
                }
            });
            this.container.addEventListener('drop', (e) => {
                e.preventDefault();
                this.container.style.background = '';
                try {
                    const raw = e.dataTransfer.getData('text/plain');
                    if (!raw) return;
                    const { tag_name, source_section, from_left } = JSON.parse(raw);
                    if (from_left) return; // already in left panel
                    this.commands.return_tag_to_available(tag_name, source_section);
                } catch (err) {
                    console.error('Left panel drop error:', err);
                }
            });
        }
    }

    // ===========================================================================
    //  APPLICATION INITIALIZATION (module entry point)
    // ===========================================================================
    const init = async () => {
        const dom = dom_cache.all();
        const tag_service = new tag_data_service();
        const struct_service = new structure_service();
        const renderer = new view_renderer(tag_service, struct_service, dom);
        const commands = new command_handlers(tag_service, struct_service, renderer);

        // Load data
        try {
            await tag_service.load_from_local();
        } catch (e) {
            console.warn('Could not load tags.json, waiting for user upload');
            dom.file_info.textContent = 'No file loaded';
        }
        try {
            await struct_service.load_from_local(tag_service);
        } catch (e) {
            console.warn('Could not load body_template.json, using empty structure');
            struct_service.reset_all_tags();
        }

        // Reconcile classified tags from the loaded structure
        const classified_set = new Set();
        const sections = struct_service.get_sections();
        for (const sec of Object.values(sections)) {
            for (const tag of sec.tags) {
                if (tag_service.has_tag(tag)) classified_set.add(tag);
            }
        }
        tag_service.set_classified_set(classified_set);

        renderer.refresh_all();

        // Setup UI event listeners (Observer pattern)
        dom.tag_file_input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            dom.file_info.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    tag_service.load_from_json(ev.target.result);
                    renderer.refresh_all();
                } catch (err) {
                    dom.file_info.textContent = 'Invalid file';
                }
            };
            reader.readAsText(file);
        });

        dom.show_filter_textarea?.addEventListener('input', () => renderer.refresh_all());
        dom.hide_filter_textarea?.addEventListener('input', () => renderer.refresh_all());
        dom.name_filter_input?.addEventListener('input', () => renderer.refresh_all());
        dom.right_filter_input?.addEventListener('input', (e) => renderer.set_right_filter(e.target.value));

        dom.load_template_btn?.addEventListener('click', () => dom.template_file_input.click());
        dom.template_file_input?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    struct_service.load_from_json(ev.target.result, tag_service);
                    // Rebuild classified set
                    const new_classified = new Set();
                    const new_sections = struct_service.get_sections();
                    for (const sec of Object.values(new_sections)) {
                        for (const tag of sec.tags) {
                            if (tag_service.has_tag(tag)) new_classified.add(tag);
                        }
                    }
                    tag_service.set_classified_set(new_classified);
                    renderer.refresh_all();
                    toast_service.show('✅ Template loaded!');
                } catch (err) {
                    toast_service.show('❌ Error loading template');
                }
            };
            reader.readAsText(file);
            dom.template_file_input.value = '';
        });

        // Setup left panel drop zone
        if (dom.available_container) {
            new left_panel_drop_zone(commands, renderer, dom.available_container);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                commands.save_json();
            }
        });

        // Global drop prevention
        document.addEventListener('dragover', (e) => {
            if (e.target === document.body || e.target === document.documentElement) e.preventDefault();
        });
        document.addEventListener('drop', (e) => {
            if (e.target === document.body || e.target === document.documentElement) {
                e.preventDefault();
                document.querySelectorAll('.section-card.drop-hover').forEach(c => c.classList.remove('drop-hover'));
                if (dom.available_container) dom.available_container.style.background = '';
            }
        });

        // Attach save/reset to window for HTML onclick compatibility
        window.saveJSON = () => commands.save_json();
        window.resetAllTags = () => commands.reset_all_tags();
    };

    // Start application
    init().catch(console.error);
})();
