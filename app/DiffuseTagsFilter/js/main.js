(function () {
    'use strict';

    // =========================================================================
    // CONSTANTS
    // =========================================================================
    const TOAST_DURATION_MS = 2000;
    const DRAG_HOVER_BACKGROUND = 'rgba(46,204,113,0.08)';
    const LOCAL_TAGS_PATH = './data/tags.json';
    const LOCAL_TEMPLATE_PATH = './data/body_template.json';
    const SAVE_FILENAME_PREFIX = 'tags-three-weighted';
    const DATE_FORMAT_OPTIONS = { year: 'numeric', month: '2-digit', day: '2-digit' };

    // =========================================================================
    // UTILITIES
    // =========================================================================
    const deep_clone = (obj) => JSON.parse(JSON.stringify(obj));
    const escape_html = (unsafe) => unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const get_timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sort_strings = (arr) => [...arr].sort((a, b) => a.localeCompare(b));

    // =========================================================================
    // DOM CACHE
    // =========================================================================
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
            reset_btn: document.getElementById('resetAllBtn'),
            save_btn: document.getElementById('saveJSONBtn')
        };
        return { get: (name) => elements[name], all: () => elements };
    })();

    // Toast service
    const toast_service = {
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

    // =========================================================================
    // TAG DATA SERVICE (unchanged, manages tag definitions and classification flags)
    // =========================================================================
    class tag_data_service {
        #all_tags = {};
        #classified_tags = new Set();

        load_from_json(json) {
            const parsed = JSON.parse(json);
            this.#validate_tags_object(parsed);
            this.#all_tags = parsed;
            this.#prune_classified_tags();
            toast_service.show(`Loaded ${Object.keys(this.#all_tags).length} tags`);
        }
        async load_from_local() {
            const response = await fetch(LOCAL_TAGS_PATH, { headers: { 'Content-Type': 'text/plain' } });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.text();
            this.load_from_json(json);
        }
        get_all_tags() { return { ...this.#all_tags }; }
        has_tag(tag_name) { return this.#all_tags.hasOwnProperty(tag_name); }
        get_categories(tag_name) { return this.#all_tags[tag_name] || []; }
        total_count() { return Object.keys(this.#all_tags).length; }
        add_classified(tag_name) { this.#classified_tags.add(tag_name); }
        remove_classified(tag_name) { this.#classified_tags.delete(tag_name); }
        is_classified(tag_name) { return this.#classified_tags.has(tag_name); }
        get_classified_set() { return new Set(this.#classified_tags); }
        set_classified_set(new_set) { this.#classified_tags = new Set(new_set); }
        reset_classified() { this.#classified_tags.clear(); }
        #validate_tags_object(obj) {
            if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) throw new Error('Invalid format: expected object');
            for (const [key, val] of Object.entries(obj)) if (!Array.isArray(val)) throw new Error(`Invalid value for tag "${key}": expected array`);
        }
        #prune_classified_tags() {
            const valid = new Set();
            for (const t of this.#classified_tags) if (this.#all_tags[t]) valid.add(t);
            this.#classified_tags = valid;
        }
    }

    // =========================================================================
    // STRUCTURE SERVICE (supports weighted tags: stores objects {name, weight})
    // =========================================================================
    class structure_service {
        #sections = {};      // Record<string, { tags: Array<{name:string, weight:number}>, subs?: string[] }>
        #root_value = null;

        // Normalize tag entries: string -> {name, weight:1} , [name, weight] -> object
        #normalize_tags_array(raw_tags) {
            if (!Array.isArray(raw_tags)) return [];
            return raw_tags.map(item => {
                if (typeof item === 'string') return { name: item, weight: 1.0 };
                if (Array.isArray(item) && item.length >= 1 && typeof item[0] === 'string') {
                    let weight = 1.0;
                    if (typeof item[1] === 'number' && !isNaN(item[1])) weight = item[1];
                    else if (typeof item[1] === 'string') { let parsed = parseFloat(item[1]); if (!isNaN(parsed)) weight = parsed; }
                    return { name: item[0], weight: weight };
                }
                return null;
            }).filter(item => item !== null && item.name);
        }

        load_from_json(json, tag_service) {
            const parsed = JSON.parse(json);
            this.#validate_template_object(parsed);
            this.#root_value = parsed.root ?? null;
            const sections = { ...parsed };
            delete sections.root;
            this.#sections = {};
            for (const [secName, secData] of Object.entries(sections)) {
                const rawTags = secData.tags || [];
                const normalizedTags = this.#normalize_tags_array(rawTags);
                // filter non-existing tags
                const validTags = normalizedTags.filter(t => tag_service.has_tag(t.name));
                this.#sections[secName] = {
                    tags: validTags,
                    subs: Array.isArray(secData.subs) ? [...secData.subs] : []
                };
            }
        }

        async load_from_local(tag_service) {
            const response = await fetch(LOCAL_TEMPLATE_PATH, { headers: { 'Content-Type': 'text/plain' } });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.text();
            this.load_from_json(json, tag_service);
        }

        get_sections() { return deep_clone(this.#sections); }

        // returns array of tag names (for classification checks)
        get_section_tags(section_name) {
            return (this.#sections[section_name]?.tags || []).map(t => t.name);
        }

        // returns full tag objects with weights
        get_section_tag_objects(section_name) {
            return [...(this.#sections[section_name]?.tags || [])];
        }

        add_tag_to_section(section_name, tag_name, weight = 1.0) {
            if (!this.#sections[section_name]) return false;
            const existing = this.#sections[section_name].tags.find(t => t.name === tag_name);
            if (existing) return false;
            this.#sections[section_name].tags.push({ name: tag_name, weight: weight });
            return true;
        }

        remove_tag_from_section(section_name, tag_name) {
            if (!this.#sections[section_name]) return false;
            const initialLen = this.#sections[section_name].tags.length;
            this.#sections[section_name].tags = this.#sections[section_name].tags.filter(t => t.name !== tag_name);
            return initialLen !== this.#sections[section_name].tags.length;
        }

        update_tag_weight(section_name, tag_name, new_weight) {
            if (!this.#sections[section_name]) return false;
            const tagObj = this.#sections[section_name].tags.find(t => t.name === tag_name);
            if (tagObj) {
                tagObj.weight = Math.max(0, Math.min(100, new_weight)); // clamp 0-100
                return true;
            }
            return false;
        }

        is_tag_placed(tag_name) {
            return Object.values(this.#sections).some(section => section.tags.some(t => t.name === tag_name));
        }

        reset_all_tags() {
            for (const section of Object.values(this.#sections)) section.tags = [];
        }

        total_placed_count() {
            let total = 0;
            for (const section of Object.values(this.#sections)) total += section.tags.length;
            return total;
        }

        export_to_object() {
            const output = {};
            if (this.#root_value !== undefined && this.#root_value !== null) output.root = this.#root_value;
            const sorted_names = sort_strings(Object.keys(this.#sections));
            for (const name of sorted_names) {
                const section = this.#sections[name];
                const tags_export = section.tags.map(tagObj => {
                    if (tagObj.weight === 1.0) return tagObj.name;
                    return [tagObj.name, tagObj.weight];
                });
                const entry = { tags: tags_export };
                if (section.subs?.length) entry.subs = [...section.subs];
                output[name] = entry;
            }
            return output;
        }

        #validate_template_object(obj) {
            if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) throw new Error('Invalid format: expected object');
            for (const [key, val] of Object.entries(obj)) {
                if (key === 'root') continue;
                if (typeof val !== 'object' || val === null || !Array.isArray(val.tags)) {
                    throw new Error(`Invalid section "${key}": must have a "tags" array.`);
                }
            }
        }
    }

    // =========================================================================
    // FILTER STRATEGY
    // =========================================================================
    class tag_filter_strategy {
        constructor(show_keywords, hide_keywords, name_filter) {
            this.show_keywords = show_keywords;
            this.hide_keywords = hide_keywords;
            this.name_filter = name_filter.toLowerCase();
        }
        matches(tag_name, categories) {
            if (this.name_filter && !tag_name.toLowerCase().includes(this.name_filter)) return false;
            const cats_lower = categories.map(c => c.toLowerCase());
            if (this.show_keywords.length && !this.show_keywords.every(kw => cats_lower.some(cat => cat.includes(kw)))) return false;
            if (this.hide_keywords.length && this.hide_keywords.some(kw => cats_lower.some(cat => cat.includes(kw)))) return false;
            return true;
        }
    }

    // =========================================================================
    // TAG PILL FACTORY (with weight selector for placed tags)
    // =========================================================================
    class tag_pill_factory {
        static create_available(tag_name) {
            const pill = document.createElement('div');
            pill.className = 'tag-pill available';
            pill.textContent = tag_name;
            pill.draggable = true;
            pill.dataset.tagName = tag_name;
            const dragData = JSON.stringify({ tag_name, source_section: null, from_left: true, weight: 1.0 });
            pill.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', dragData);
                e.dataTransfer.effectAllowed = 'move';
                pill.classList.add('dragging');
                setTimeout(() => pill.classList.remove('dragging'), 0);
            });
            pill.addEventListener('dragend', () => {
                pill.classList.remove('dragging');
                document.querySelectorAll('.section-card.drop-hover').forEach(c => c.classList.remove('drop-hover'));
            });
            return pill;
        }

        static create_placed(tag_name, current_weight, source_section, onDelete, onWeightChange) {
            const pill = document.createElement('div');
            pill.className = 'tag-pill placed';
            pill.draggable = true;
            pill.dataset.tagName = tag_name;
            pill.dataset.sourceSection = source_section;

            // delete button
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = '×';
            delBtn.title = 'Remove this tag';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onDelete) onDelete();
            });
            delBtn.addEventListener('mousedown', (e) => e.stopPropagation());

            // tag name span
            const nameSpan = document.createElement('span');
            nameSpan.className = 'tag-name';
            nameSpan.textContent = tag_name;

            // weight number input
            const weightInput = document.createElement('input');
            weightInput.type = 'number';
            weightInput.step = '0.1';
            weightInput.min = '0';
            weightInput.max = '100';
            weightInput.value = current_weight.toFixed(1);
            weightInput.className = 'weight-input';
            weightInput.title = 'Tag weight (0..100)';

            weightInput.addEventListener('change', (e) => {
                e.stopPropagation();
                let newVal = parseFloat(weightInput.value);
                if (isNaN(newVal)) newVal = 1.0;
                newVal = Math.max(0, Math.min(100, newVal));
                weightInput.value = newVal.toFixed(1);
                if (onWeightChange) onWeightChange(newVal);
            });
            weightInput.addEventListener('click', (e) => e.stopPropagation());
            weightInput.addEventListener('mousedown', (e) => e.stopPropagation());

            pill.appendChild(delBtn);
            pill.appendChild(nameSpan);
            pill.appendChild(weightInput);

            // drag start with current weight (read from input)
            pill.addEventListener('dragstart', (e) => {
                // prevent drag if target is input or delete button
                if (e.target === weightInput || e.target === delBtn) {
                    e.preventDefault();
                    return false;
                }
                const weightValue = parseFloat(weightInput.value) || 1.0;
                const dragData = JSON.stringify({ tag_name, source_section, from_left: false, weight: weightValue });
                e.dataTransfer.setData('text/plain', dragData);
                e.dataTransfer.effectAllowed = 'move';
                pill.classList.add('dragging');
                setTimeout(() => pill.classList.remove('dragging'), 0);
            });
            pill.addEventListener('dragend', () => {
                pill.classList.remove('dragging');
                document.querySelectorAll('.section-card.drop-hover').forEach(c => c.classList.remove('drop-hover'));
            });
            return pill;
        }
    }

    // =========================================================================
    // VIEW RENDERER
    // =========================================================================
    class view_renderer {
        constructor(tag_service, struct_service, dom) {
            this.tag_service = tag_service;
            this.struct_service = struct_service;
            this.dom = dom;
            this.right_filter_text = '';
        }

        refresh_all() {
            this.render_left_panel();
            this.render_right_panel();
            this.update_stats();
        }

        render_left_panel() {
            const container = this.dom.available_container;
            if (!container) return;
            const available = this.#get_filtered_available_tags();
            container.innerHTML = '';
            if (available.length === 0) {
                const msg = document.createElement('div');
                msg.className = 'no-tags';
                if (this.tag_service.total_count() === 0) msg.textContent = 'Load a JSON file to see tags';
                else if (this.tag_service.get_classified_set().size === this.tag_service.total_count()) msg.textContent = 'All tags have been classified! 🎉';
                else msg.textContent = 'No tags match the current filters';
                container.appendChild(msg);
            } else {
                for (const tag_name of available) {
                    container.appendChild(tag_pill_factory.create_available(tag_name));
                }
            }
            this.dom.left_count.textContent = available.length;
        }

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

        update_stats() {
            const total = this.tag_service.total_count();
            const classified = this.tag_service.get_classified_set().size;
            const available = this.#get_filtered_available_tags().length;
            this.dom.available_count.textContent = available;
            this.dom.classified_count.textContent = classified;
            this.dom.total_count.textContent = total;
        }

        set_right_filter(text) {
            this.right_filter_text = text.toLowerCase();
            this.#apply_right_filter();
        }

        #get_filtered_available_tags() {
            const show_keywords = this.#get_keywords_from_textarea(this.dom.show_filter_textarea);
            const hide_keywords = this.#get_keywords_from_textarea(this.dom.hide_filter_textarea);
            const name_filter = this.dom.name_filter_input?.value ?? '';
            const strategy = new tag_filter_strategy(show_keywords, hide_keywords, name_filter);
            const result = [];
            const all_tags = this.tag_service.get_all_tags();
            for (const [tag_name, categories] of Object.entries(all_tags)) {
                if (this.tag_service.is_classified(tag_name)) continue;
                if (strategy.matches(tag_name, categories)) result.push(tag_name);
            }
            return sort_strings(result);
        }

        #get_keywords_from_textarea(ta) {
            if (!ta) return [];
            const val = ta.value.trim();
            return val ? val.split(/[\s,]+/).filter(k => k).map(k => k.toLowerCase()) : [];
        }

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

            for (const tagObj of section.tags) {
                const onDelete = () => this.#handle_delete_tag(sec_name, tagObj.name);
                const onWeightChange = (newWeight) => {
                    this.struct_service.update_tag_weight(sec_name, tagObj.name, newWeight);
                    // show small toast feedback on weight change
                    toast_service.show(`⚖️ ${tagObj.name} weight → ${newWeight.toFixed(1)}`);
                };
                const pill = tag_pill_factory.create_placed(tagObj.name, tagObj.weight, sec_name, onDelete, onWeightChange);
                tags_area.appendChild(pill);
            }
            card.appendChild(tags_area);

            if (section.tags.length) {
                const count_el = document.createElement('div');
                count_el.className = 'tag-count';
                count_el.textContent = `${section.tags.length} tag${section.tags.length !== 1 ? 's' : ''}`;
                card.appendChild(count_el);
            }

            // Drag & Drop events
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

        #handle_delete_tag(sec_name, tag_name) {
            this.struct_service.remove_tag_from_section(sec_name, tag_name);
            if (!this.struct_service.is_tag_placed(tag_name)) {
                this.tag_service.remove_classified(tag_name);
            }
            this.refresh_all();
        }

        #handle_drop_on_section(e, target_section) {
            try {
                const raw = e.dataTransfer.getData('text/plain');
                if (!raw) return;
                const { tag_name, source_section, from_left, weight } = JSON.parse(raw);
                if (source_section === target_section) return;
                if (!this.tag_service.has_tag(tag_name)) return;

                // prevent duplicate in target section
                const targetTags = this.struct_service.get_section_tag_objects(target_section);
                if (targetTags.some(t => t.name === tag_name)) {
                    // already there, but if source exists, remove from source anyway
                    if (source_section) this.struct_service.remove_tag_from_section(source_section, tag_name);
                    if (source_section && !this.struct_service.is_tag_placed(tag_name)) this.tag_service.remove_classified(tag_name);
                    this.refresh_all();
                    return;
                }

                // remove from source if any
                if (source_section) this.struct_service.remove_tag_from_section(source_section, tag_name);
                // add to target with weight (from drag or default 1.0)
                const tagWeight = (weight !== undefined && !isNaN(weight)) ? weight : 1.0;
                this.struct_service.add_tag_to_section(target_section, tag_name, tagWeight);
                this.tag_service.add_classified(tag_name);

                // if we removed from source and tag no longer anywhere, remove classified flag
                if (source_section && !this.struct_service.is_tag_placed(tag_name)) this.tag_service.remove_classified(tag_name);
                if (from_left) this.tag_service.add_classified(tag_name);
                this.refresh_all();
            } catch (err) { console.error('Drop error:', err); }
        }

        #apply_right_filter() {
            const filter = this.right_filter_text;
            const cards = document.querySelectorAll('.section-card');
            let hidden = 0;
            for (const card of cards) {
                const sec_name = card.dataset.sectionName;
                if (!filter || sec_name.toLowerCase().includes(filter)) card.style.display = '';
                else { card.style.display = 'none'; hidden++; }
            }
            if (this.dom.right_filter_count) this.dom.right_filter_count.textContent = hidden ? `${hidden} hidden` : 'all shown';
        }
    }

    // =========================================================================
    // COMMAND HANDLERS
    // =========================================================================
    class command_handlers {
        constructor(tag_service, struct_service, renderer) {
            this.tag_service = tag_service;
            this.struct_service = struct_service;
            this.renderer = renderer;
        }
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
            toast_service.show('✅ Weighted JSON saved!');
        }
        reset_all_tags() {
            if (confirm('Remove ALL placed tags from all sections? (weights will be lost)')) {
                this.struct_service.reset_all_tags();
                this.tag_service.reset_classified();
                this.renderer.refresh_all();
                toast_service.show('🔄 All tags reset');
            }
        }
        return_tag_to_available(tag_name, source_section) {
            if (source_section && this.struct_service.remove_tag_from_section(source_section, tag_name)) {
                if (!this.struct_service.is_tag_placed(tag_name)) this.tag_service.remove_classified(tag_name);
                this.renderer.refresh_all();
                toast_service.show(`"${tag_name}" returned to available`);
            }
        }
    }

    // =========================================================================
    // LEFT PANEL DROP ZONE
    // =========================================================================
    class left_panel_drop_zone {
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
                if (!this.container.contains(e.relatedTarget)) this.container.style.background = '';
            });
            this.container.addEventListener('drop', (e) => {
                e.preventDefault();
                this.container.style.background = '';
                try {
                    const raw = e.dataTransfer.getData('text/plain');
                    if (!raw) return;
                    const { tag_name, source_section, from_left } = JSON.parse(raw);
                    if (from_left) return;
                    this.commands.return_tag_to_available(tag_name, source_section);
                } catch (err) { console.error('Left drop error:', err); }
            });
        }
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    const init = async () => {
        const dom = dom_cache.all();
        const tag_service = new tag_data_service();
        const struct_service = new structure_service();
        const renderer = new view_renderer(tag_service, struct_service, dom);
        const commands = new command_handlers(tag_service, struct_service, renderer);

        try { await tag_service.load_from_local(); } catch (e) { dom.file_info.textContent = 'No file loaded'; }
        try { await struct_service.load_from_local(tag_service); } catch (e) { struct_service.reset_all_tags(); }

        // rebuild classified set from loaded structure
        const classified_set = new Set();
        const sections = struct_service.get_sections();
        for (const sec of Object.values(sections)) {
            for (const tag of sec.tags) if (tag_service.has_tag(tag.name)) classified_set.add(tag.name);
        }
        tag_service.set_classified_set(classified_set);
        renderer.refresh_all();

        // event listeners
        dom.tag_file_input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            dom.file_info.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try { tag_service.load_from_json(ev.target.result); renderer.refresh_all(); }
                catch (err) { dom.file_info.textContent = 'Invalid file'; }
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
                    const new_classified = new Set();
                    const new_sections = struct_service.get_sections();
                    for (const sec of Object.values(new_sections)) for (const t of sec.tags) if (tag_service.has_tag(t.name)) new_classified.add(t.name);
                    tag_service.set_classified_set(new_classified);
                    renderer.refresh_all();
                    toast_service.show('✅ Template + weights loaded!');
                } catch (err) { toast_service.show('❌ Error loading template'); }
            };
            reader.readAsText(file);
            dom.template_file_input.value = '';
        });

        if (dom.available_container) new left_panel_drop_zone(commands, renderer, dom.available_container);
        if (dom.reset_btn) dom.reset_btn.addEventListener('click', () => commands.reset_all_tags());
        if (dom.save_btn) dom.save_btn.addEventListener('click', () => commands.save_json());

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); commands.save_json(); }
        });
        document.addEventListener('dragover', (e) => { if (e.target === document.body || e.target === document.documentElement) e.preventDefault(); });
        document.addEventListener('drop', (e) => {
            if (e.target === document.body || e.target === document.documentElement) {
                e.preventDefault();
                document.querySelectorAll('.section-card.drop-hover').forEach(c => c.classList.remove('drop-hover'));
                if (dom.available_container) dom.available_container.style.background = '';
            }
        });
    };
    init().catch(console.error);
})();
