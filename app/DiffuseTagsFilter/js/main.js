(function () {
    // ============ STATE ============
    let allTagsData = {};                  // { tagName: [category1, ...] }
    let classifiedTags = new Set();        // tags currently placed somewhere
    let structureData = {};                // deep clone of initial structure

    // ============ INITIAL STRUCTURE ============
    const initialStructure = {
        "body": {
            "tags": [],
            "subs": ["head", "upper_body", "lower_body", "gender", "muscles_mass", "skin"]
        },
        "head": {
            "tags": [],
            "subs": ["face", "hair", "ears", "chin", "neck", "horns"]
        },
        "face": {
            "tags": [],
            "subs": ["eyes", "nose", "mouth", "forehead", "temples", "eyebrows", "cheeks"]
        },
        "eyes": {
            "tags": [],
            "subs": ["eyes_ball", "under_eye", "eyelids"]
        },
        "eyes_ball": { "tags": [] },
        "under_eye": { "tags": [] },
        "eyelids": { "tags": [] },
        "nose": {
            "tags": [],
            "subs": ["bridge", "nostrils", "tip"]
        },
        "bridge": { "tags": [] },
        "nostrils": { "tags": [] },
        "tip": { "tags": [] },
        "mouth": {
            "tags": [],
            "subs": ["lips", "teeth", "tongue"]
        },
        "lips": { "tags": [] },
        "teeth": { "tags": [] },
        "tongue": { "tags": [] },
        "forehead": { "tags": [] },
        "temples": { "tags": [] },
        "eyebrows": { "tags": [] },
        "cheeks": {
            "tags": [],
            "subs": ["cheekbones", "jawline"]
        },
        "cheekbones": { "tags": [] },
        "jawline": { "tags": [] },
        "hair": { "tags": [] },
        "ears": { "tags": [] },
        "chin": { "tags": [] },
        "neck": { "tags": [] },
        "horns": { "tags": [] },
        "upper_body": {
            "tags": [],
            "subs": ["torso", "arms"]
        },
        "torso": {
            "tags": [],
            "subs": ["chest", "back", "shoulders", "flank", "abdomen", "waist"]
        },
        "chest": {
            "tags": [],
            "subs": ["sternum"]
        },
        "sternum": { "tags": [] },
        "back": {
            "tags": [],
            "subs": ["back_upper", "back_lower", "scapula", "spine"]
        },
        "back_upper": {
            "tags": [],
            "subs": ["wings"]
        },
        "wings": { "tags": [] },
        "back_lower": {
            "tags": [],
            "subs": ["tail"]
        },
        "tail": { "tags": [] },
        "scapula": { "tags": [] },
        "spine": { "tags": [] },
        "shoulders": { "tags": [] },
        "flank": { "tags": [] },
        "abdomen": {
            "tags": [],
            "subs": ["belly"]
        },
        "belly": {
            "tags": [],
            "subs": ["navel"]
        },
        "navel": { "tags": [] },
        "waist": { "tags": [] },
        "arms": {
            "tags": [],
            "subs": ["upper_arm", "elbow", "forearm", "wrist", "veins", "hands"]
        },
        "upper_arm": { "tags": [] },
        "elbow": { "tags": [] },
        "forearm": { "tags": [] },
        "wrist": { "tags": [] },
        "veins": { "tags": [] },
        "hands": {
            "tags": [],
            "subs": ["palm", "back_hand", "fingers"]
        },
        "palm": { "tags": [] },
        "back_hand": { "tags": [] },
        "fingers": {
            "tags": [],
            "subs": ["thumb", "knuckles", "nails_fingers"]
        },
        "thumb": { "tags": [] },
        "knuckles": { "tags": [] },
        "nails_fingers": { "tags": [] },
        "lower_body": {
            "tags": [],
            "subs": ["groin", "thighs", "knees", "calves", "shin", "ankle", "feet"]
        },
        "groin": {
            "tags": [],
            "subs": ["hips", "genitals", "butt"]
        },
        "hips": { "tags": [] },
        "genitals": { "tags": [] },
        "butt": {
            "tags": [],
            "subs": ["asshole"]
        },
        "asshole": { "tags": [] },
        "thighs": { "tags": [] },
        "knees": { "tags": [] },
        "calves": { "tags": [] },
        "shin": { "tags": [] },
        "ankle": { "tags": [] },
        "feet": {
            "tags": [],
            "subs": ["toes"]
        },
        "toes": {
            "tags": [],
            "subs": ["nails_toes"]
        },
        "nails_toes": { "tags": [] },
        "gender": { "tags": [] },
        "muscles_mass": { "tags": [] },
        "skin": { "tags": [] }
    };

    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    structureData = deepClone(initialStructure);

    // ============ DOM REFS ============
    const tagFileInput = document.getElementById('tagFileInput');
    const fileInfo = document.getElementById('fileInfo');
    const showFilterTA = document.getElementById('showFilter');
    const hideFilterTA = document.getElementById('hideFilter');
    const nameFilterInput = document.getElementById('nameFilterInput');
    const availableTagsContainer = document.getElementById('availableTagsContainer');
    const sectionsGrid = document.getElementById('sectionsGrid');
    const leftCountEl = document.getElementById('leftCount');
    const availableCountEl = document.getElementById('availableCount');
    const classifiedCountEl = document.getElementById('classifiedCount');
    const totalCountEl = document.getElementById('totalCount');
    const rightTagCountEl = document.getElementById('rightTagCount');
    const toastContainer = document.getElementById('toastContainer');
    const rightSectionFilter = document.getElementById('rightSectionFilter');
    const rightFilterCount = document.getElementById('rightFilterCount');
    const loadTemplateBtn = document.getElementById('loadTemplateBtn');
    const templateFileInput = document.getElementById('templateFileInput');

    // ============ TOAST ============
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 2000);
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // ============ FILE LOADING (tags) ============
    const parse_tags_file = async (json) => {
        try {
            const parsed = JSON.parse(json);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                throw new Error('Invalid format: expected object');
            }
            for (const [key, val] of Object.entries(parsed)) {
                if (!Array.isArray(val)) {
                    throw new Error(`Invalid value for tag "${key}": expected array of categories`);
                }
            }
            allTagsData = parsed;
            // Clean up classified tags that no longer exist
            const newClassified = new Set();
            for (const t of classifiedTags) {
                if (allTagsData[t] !== undefined) newClassified.add(t);
            }
            classifiedTags = newClassified;
            // Remove from structure any tags not in new data
            for (const sectionName of Object.keys(structureData)) {
                structureData[sectionName].tags = structureData[sectionName].tags.filter(
                    t => allTagsData[t] !== undefined
                );
            }
            showToast(`Loaded ${Object.keys(allTagsData).length} tags`);
            refreshAll();
        } catch (err) {
            alert('Error loading JSON: ' + err.message);
            fileInfo.textContent = 'Invalid file';
        }
    };

    const load_local_tags = async () => {
        try {
            const response = await fetch('./data/tags.json', { 
                headers: { 'Content-Type': 'text/plain' }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            parse_tags_file(await response.text());
        } catch (error) {
            console.error('Error loading file:', error);
            return null;
        }
    };


    tagFileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        fileInfo.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function (ev) {
            parse_tags_file(ev.target.result);
        };
        reader.readAsText(file);
    });

    // ============ FILTERS (left panel) ============
    function getFilterKeywords(textarea) {
        const val = textarea.value.trim();
        if (!val) return [];
        return val.split(/[\s,]+/).filter(k => k.length > 0).map(k => k.toLowerCase());
    }

    function getAvailableTags() {
        const showKeywords = getFilterKeywords(showFilterTA);
        const hideKeywords = getFilterKeywords(hideFilterTA);
        const nameFilter = nameFilterInput.value.trim().toLowerCase();
        const available = [];
        for (const [tagName, categories] of Object.entries(allTagsData)) {
            if (classifiedTags.has(tagName)) continue;
            // Name filter check
            if (nameFilter && !tagName.toLowerCase().includes(nameFilter)) continue;
            const catsLower = categories.map(c => c.toLowerCase());
            if (showKeywords.length > 0) {
                const matchesShow = showKeywords.every(kw => catsLower.some(cat => cat.includes(kw)));
                if (!matchesShow) continue;
            }
            if (hideKeywords.length > 0) {
                const matchesHide = hideKeywords.some(kw => catsLower.some(cat => cat.includes(kw)));
                if (matchesHide) continue;
            }
            available.push(tagName);
        }
        available.sort((a, b) => a.localeCompare(b));
        return available;
    }

    // ============ RENDER LEFT PANEL ============
    function renderLeftPanel() {
        const available = getAvailableTags();
        availableTagsContainer.innerHTML = '';
        if (available.length === 0) {
            const msg = document.createElement('div');
            msg.className = 'no-tags';
            if (Object.keys(allTagsData).length === 0) {
                msg.textContent = 'Load a JSON file to see tags';
            } else if (classifiedTags.size === Object.keys(allTagsData).length) {
                msg.textContent = 'All tags have been classified! 🎉';
            } else {
                msg.textContent = 'No tags match the current filters';
            }
            availableTagsContainer.appendChild(msg);
        } else {
            available.forEach(tagName => {
                const pill = createTagPill(tagName, 'available', null);
                availableTagsContainer.appendChild(pill);
            });
        }
        leftCountEl.textContent = available.length;
        updateStats();
    }

    function createTagPill(tagName, type, sourceSection) {
        const pill = document.createElement('div');
        pill.className = `tag-pill ${type}`;
        pill.textContent = tagName;
        pill.draggable = true;
        pill.dataset.tagName = tagName;
        if (sourceSection) {
            pill.dataset.sourceSection = sourceSection;
        }

        pill.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                tagName: tagName,
                sourceSection: sourceSection || null,
                fromLeft: type === 'available'
            }));
            e.dataTransfer.effectAllowed = 'move';
            pill.classList.add('dragging');
            setTimeout(() => {
                if (pill.classList.contains('dragging')) {
                    pill.classList.remove('dragging');
                }
            }, 0);
        });

        pill.addEventListener('dragend', function (e) {
            pill.classList.remove('dragging');
            document.querySelectorAll('.section-card.drop-hover').forEach(card => {
                card.classList.remove('drop-hover');
            });
        });

        if (type === 'placed') {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Remove this tag';
            deleteBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                deleteTagFromSection(sourceSection, tagName);
            });
            deleteBtn.addEventListener('mousedown', function (e) {
                e.stopPropagation();
                e.preventDefault();
            });
            pill.insertBefore(deleteBtn, pill.firstChild);
        }

        return pill;
    }

    function deleteTagFromSection(sectionName, tagName) {
        if (structureData[sectionName]) {
            structureData[sectionName].tags = structureData[sectionName].tags.filter(t => t !== tagName);
        }
        let stillClassified = false;
        for (const sec of Object.values(structureData)) {
            if (sec.tags.includes(tagName)) {
                stillClassified = true;
                break;
            }
        }
        if (!stillClassified) {
            classifiedTags.delete(tagName);
        }
        refreshAll();
    }

    // ============ RENDER RIGHT PANEL ============
    function applyRightFilter() {
        const filterText = rightSectionFilter.value.trim().toLowerCase();
        const cards = sectionsGrid.querySelectorAll('.section-card');
        let hiddenCount = 0;
        cards.forEach(card => {
            const sectionName = card.dataset.sectionName;
            if (!filterText || sectionName.includes(filterText)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
                hiddenCount++;
            }
        });
        rightFilterCount.textContent = hiddenCount > 0 ? `${hiddenCount} hidden` : 'all shown';
    }

    function renderRightPanel() {
        sectionsGrid.innerHTML = '';
        const sectionNames = Object.keys(structureData).sort((a, b) => a.localeCompare(b));

        sectionNames.forEach(sectionName => {
            const section = structureData[sectionName];
            const card = document.createElement('div');
            card.className = 'section-card';
            card.dataset.sectionName = sectionName;

            const nameEl = document.createElement('div');
            nameEl.className = 'section-name';
            nameEl.textContent = sectionName.replace(/_/g, ' ');
            card.appendChild(nameEl);

            if (section.subs && section.subs.length > 0) {
                const subsEl = document.createElement('div');
                subsEl.className = 'section-subs';
                subsEl.innerHTML = '└ subs: <span>' + section.subs.map(s => s.replace(/_/g, ' ')).join(', ') + '</span>';
                card.appendChild(subsEl);
            }

            const tagsArea = document.createElement('div');
            tagsArea.className = 'tags-area';
            if (section.tags.length === 0) {
                tagsArea.classList.add('empty');
            }
            section.tags.forEach(tagName => {
                const pill = createTagPill(tagName, 'placed', sectionName);
                tagsArea.appendChild(pill);
            });
            card.appendChild(tagsArea);

            if (section.tags.length > 0) {
                const countEl = document.createElement('div');
                countEl.className = 'tag-count';
                countEl.textContent = section.tags.length + ' tag' + (section.tags.length > 1 ? 's' : '');
                card.appendChild(countEl);
            }

            // Drop events
            card.addEventListener('dragover', function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                card.classList.add('drop-hover');
            });

            card.addEventListener('dragleave', function (e) {
                if (!card.contains(e.relatedTarget)) {
                    card.classList.remove('drop-hover');
                }
            });

            card.addEventListener('drop', function (e) {
                e.preventDefault();
                card.classList.remove('drop-hover');
                try {
                    const rawData = e.dataTransfer.getData('text/plain');
                    if (!rawData) return;
                    const data = JSON.parse(rawData);
                    const tagName = data.tagName;
                    const sourceSection = data.sourceSection;
                    const fromLeft = data.fromLeft;
                    handleTagDrop(tagName, sourceSection, sectionName, fromLeft);
                } catch (err) {
                    console.error('Drop error:', err);
                }
            });

            sectionsGrid.appendChild(card);
        });

        applyRightFilter();

        let totalPlaced = 0;
        for (const sec of Object.values(structureData)) {
            totalPlaced += sec.tags.length;
        }
        rightTagCountEl.textContent = totalPlaced + ' tag' + (totalPlaced !== 1 ? 's' : '') + ' placed';
        updateStats();
    }

    function handleTagDrop(tagName, sourceSection, targetSection, fromLeft) {
        if (sourceSection === targetSection) return;
        if (!allTagsData[tagName] && !classifiedTags.has(tagName)) return;

        if (structureData[targetSection] && structureData[targetSection].tags.includes(tagName)) {
            if (sourceSection && structureData[sourceSection]) {
                structureData[sourceSection].tags = structureData[sourceSection].tags.filter(t => t !== tagName);
            }
            refreshAll();
            return;
        }

        if (sourceSection && structureData[sourceSection]) {
            structureData[sourceSection].tags = structureData[sourceSection].tags.filter(t => t !== tagName);
        }

        if (structureData[targetSection]) {
            structureData[targetSection].tags.push(tagName);
        }

        classifiedTags.add(tagName);

        if (sourceSection) {
            let stillExists = false;
            for (const sec of Object.values(structureData)) {
                if (sec.tags.includes(tagName)) {
                    stillExists = true;
                    break;
                }
            }
            if (!stillExists) {
                classifiedTags.delete(tagName);
            }
        }

        if (fromLeft) {
            classifiedTags.add(tagName);
        }

        refreshAll();
    }

    // ============ LEFT PANEL DROP (return tag) ============
    window.handleLeftPanelDragOver = function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        availableTagsContainer.style.background = 'rgba(46,204,113,0.08)';
    };

    window.handleLeftPanelDragLeave = function (e) {
        if (!availableTagsContainer.contains(e.relatedTarget)) {
            availableTagsContainer.style.background = '';
        }
    };

    window.handleLeftPanelDrop = function (e) {
        e.preventDefault();
        availableTagsContainer.style.background = '';
        try {
            const rawData = e.dataTransfer.getData('text/plain');
            if (!rawData) return;
            const data = JSON.parse(rawData);
            const tagName = data.tagName;
            const sourceSection = data.sourceSection;
            const fromLeft = data.fromLeft;
            if (fromLeft) return;

            if (sourceSection && structureData[sourceSection]) {
                structureData[sourceSection].tags = structureData[sourceSection].tags.filter(t => t !== tagName);
            }

            let stillClassified = false;
            for (const sec of Object.values(structureData)) {
                if (sec.tags.includes(tagName)) {
                    stillClassified = true;
                    break;
                }
            }
            if (!stillClassified) {
                classifiedTags.delete(tagName);
            }

            refreshAll();
            showToast(`"${tagName}" returned to available tags`);
        } catch (err) {
            console.error('Left panel drop error:', err);
        }
    };

    // ============ UPDATE STATS ============
    function updateStats() {
        const total = Object.keys(allTagsData).length;
        const classified = classifiedTags.size;
        const available = getAvailableTags().length;
        availableCountEl.textContent = available;
        classifiedCountEl.textContent = classified;
        totalCountEl.textContent = total;
    }

    // ============ REFRESH ALL ============
    function refreshAll() {
        renderLeftPanel();
        renderRightPanel();
        updateStats();
    }

    // ============ EVENT LISTENERS ============
    showFilterTA.addEventListener('input', refreshAll);
    hideFilterTA.addEventListener('input', refreshAll);
    nameFilterInput.addEventListener('input', refreshAll);

    rightSectionFilter.addEventListener('input', function () {
        applyRightFilter();
    });

    // ============ LOAD TEMPLATE (custom body structure) ============
    loadTemplateBtn.addEventListener('click', function () {
        templateFileInput.click();
    });

    templateFileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                    throw new Error('Invalid format: expected object');
                }
                // Validate each entry
                for (const [key, val] of Object.entries(parsed)) {
                    if (typeof val !== 'object' || val === null || !Array.isArray(val.tags)) {
                        throw new Error(`Invalid section "${key}": must have a "tags" array.`);
                    }
                    if (val.subs !== undefined && !Array.isArray(val.subs)) {
                        throw new Error(`Invalid section "${key}": "subs" must be an array if present.`);
                    }
                }
                // Replace structure data, reset all tags
                structureData = deepClone(parsed);
                classifiedTags.clear();

                // Clear tags in new structure
                for (const section of Object.values(structureData)) {
                    const tags = section.tags.filter(k => k.length > 0).map(k => k.toLowerCase());
                    tags.forEach(tagName => { classifiedTags.add(tagName) });
                }

                showToast('✅ Template loaded! Tags reset.');
                refreshAll();
            } catch (err) {
                alert('Error loading template: ' + err.message);
            }
        };
        reader.readAsText(file);
        // Reset file input so the same file can be loaded again
        templateFileInput.value = '';
    });

    // ============ SAVE JSON ============
    window.saveJSON = function () {
        const output = {};
        const sortedKeys = Object.keys(structureData).sort((a, b) => a.localeCompare(b));
        for (const key of sortedKeys) {
            const section = structureData[key];
            const entry = { tags: [...section.tags] };
            if (section.subs && section.subs.length > 0) {
                entry.subs = [...section.subs];
            }
            output[key] = entry;
        }
        const jsonStr = JSON.stringify(output, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.download = `classified-tags-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('✅ JSON saved successfully!');
    };

    // ============ RESET ALL ============
    window.resetAllTags = function () {
        if (confirm('Are you sure you want to remove ALL placed tags from all sections?')) {
            for (const section of Object.values(structureData)) {
                section.tags = [];
            }
            classifiedTags.clear();
            refreshAll();
            showToast('🔄 All tags reset');
        }
    };

    // ============ GLOBAL DROP HANDLERS ============
    document.addEventListener('dragover', function (e) {
        if (e.target === document.body || e.target === document.documentElement) {
            e.preventDefault();
        }
    });

    document.addEventListener('drop', function (e) {
        if (e.target === document.body || e.target === document.documentElement) {
            e.preventDefault();
            document.querySelectorAll('.section-card.drop-hover').forEach(c => c.classList.remove('drop-hover'));
            availableTagsContainer.style.background = '';
        }
    });

    // ============ KEYBOARD SHORTCUT ============
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveJSON();
        }
    });

    // ============ INITIAL RENDER ============
    function init() {
        load_local_tags();
        
        classifiedTags = new Set();
        allTagsData = {};
        refreshAll();
        fileInfo.textContent = 'No file loaded';
        rightSectionFilter.value = '';
        applyRightFilter();
        nameFilterInput.value = '';
    }

    init();

    console.log('🏷️ Tag Classifier v2 ready!');
})();