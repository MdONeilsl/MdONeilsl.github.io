
import { elem, ev } from "../../../lib/module/html.js";
import { font } from "../../../lib/module/gui/font.js";
import { color } from "../../../lib/module/gui/color.js";
import { sizei } from "../../../lib/module/gui/size.js";
import { numb } from "../../../lib/module/math/number.js";
import { save_file_on_disk } from "../../../lib/module/system/system.js";

// main.js - Complete Font Texture Generator with Language Support

// ============================================
// LANGUAGE-SPECIFIC CHARACTER SETS
// ============================================

const languageCharacters = {
    'en': '',
    'zh': '的一是不了人在有我他这上个们为到时大来中可也你说生国年着就那和要她出得里后自以会家可下而过天去能对小多然于心学么之都好看起发当没成只如事把还用第样道想作种开美总从无情已面最女但现前些所同日手又行意动方期它头经长儿回位分爱老因很给名法间斯知世什两次使身者被高已亲其进此话常与活正感现些同日手又行意动方期它头经长儿回位分爱老因很给名法间斯知世什两次使身者被高已亲其进此话常与活正感',
    'es': 'áéíóúñüÁÉÍÓÚÑÜ¿¡',
    'hi': 'अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहँंः़ाािीुूृेैोौ्।॥०१२३४५६७८९',
    'ar': 'ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأؤإئىة',
    'pt': 'áàãâéêíóôõúüçÁÀÃÂÉÊÍÓÔÕÚÜÇ',
    'bn': 'অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহংঃঁাািীুূৃেৈোৌ্০১২৩৪৫৬৭৮৯।',
    'ru': 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя',
    'ja': 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンー',
    'de': 'äöüßÄÖÜ',
    'fr': 'àâçéèêëîïôùûüÿÀÂÇÉÈÊËÎÏÔÙÛÜŸ',
    'ko': '가나다라마바사아자차카타파하각낙닥락막박삭악작착칸탄판항거너더러머버서어저처커터퍼허겨녀려며벼셔여져쳐켜텨펴혀고노도로모보소오조초코토포호교뇨료묘효요죠쵸쿄툴표효',
    'it': 'àèéìòùÀÈÉÌÒÙ',
    'nl': 'áéíóúàèëïöüÁÉÍÓÚÀÈËÏÖÜ',
    'pl': 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ',
    'tr': 'çğıöşüÇĞİÖŞÜ',
    'vi': 'àáâãèéêìíòóôõùúýăđĩũơưÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐĨŨƠƯ',
    'th': 'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮะาำิีึืุูเแโใไ็่้๊๋์',
    'fa': 'ابتثجحخدذرزسشصضطظعغفقکلمنهوپچژگ',
    'he': 'אבגדהוזחטיךכלםמןנסעףפץצקרשת',
    'el': 'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'
};
// ============================================
// CONFIGURATION AND STATE MANAGEMENT
// ============================================

const appState = {
    // Character settings
    language: 'en',
    characters: '',
    chunk_len: 1,

    font: new font("monospace", 14, "normal", "normal", "bold"),
    fill_style: 'fill',
    color: new color(color.HEX, "#ffffffff"),
    background: new color(color.HEX, "#00ffffff"),

    // Canvas settings
    canvas_size: new sizei(512, 512),
    max_line_char: 0,
    max_lines_per_canvas: 0,
    canvas_data: [],

    cell_size: new sizei(),
    chars_size: new sizei(),

    // Generated data
    mapping: {},
    char_metrics: new Map()
};

const generateCharacterSet = () => {
    // Start with printable ASCII
    let baseSet = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`;

    // Add language-specific characters
    if (languageCharacters[appState.language]) {
        baseSet += languageCharacters[appState.language];
    }

    // Remove duplicates and sort
    const uniqueChars = Array.from(new Set(baseSet.split(''))).sort();
    return uniqueChars.join('');
}

const measureCharacterMetrics = () => {
    const temp_canvas = document.createElement("canvas");
    const temp_ctx = temp_canvas.getContext("2d");
    temp_ctx.font = appState.font.css;

    let max_ink_span = 0;
    let max_ascent = 0;
    let max_descent = 0;
    let total_width = 0;  // New variable to accumulate total widths
    appState.char_metrics = new Map();

    for (const ch of appState.characters) {
        const m = temp_ctx.measureText(ch);

        const left = m.actualBoundingBoxLeft ?? 0;
        const right = m.actualBoundingBoxRight ?? m.width;
        const ascent = m.actualBoundingBoxAscent ?? appState.font.size;
        const descent = m.actualBoundingBoxDescent ?? 0;

        const char_width = left + right;  // Calculate character width

        max_ink_span = Math.max(max_ink_span, char_width);
        max_ascent = Math.max(max_ascent, ascent);
        max_descent = Math.max(max_descent, descent);
        total_width += char_width;  // Add to total width

        appState.char_metrics.set(ch, { left, right, ascent, descent });
    }

    // Calculate average width instead of using max_ink_span
    const average_width = appState.characters.length > 0
        ? total_width / appState.characters.length
        : 0;

    appState.cell_size.width = Math.ceil(average_width - 1);
    appState.cell_size.height = Math.ceil(max_ascent + max_descent + 2);

    appState.max_line_char = Math.floor(appState.canvas_size.width / appState.cell_size.width);
    appState.max_lines_per_canvas = Math.floor(appState.canvas_size.height / appState.cell_size.height);
    console.log("max_line_char", appState.max_line_char, "max_lines_per_canvas", appState.max_lines_per_canvas);
};

const updateStats = () => {


    appState.characters = elem("charSetTextarea").value;
    appState.chunk_len = numb.parse_int(elem("charsPerCaseSelect").value);

    const fam = elem("fontSelector").value;
    appState.font.family = fam === "" ? "monospace" : fam + " monospace";
    appState.font.style = elem("italicCheckbox").checked ? "italic" : "normal";
    appState.font.variant = elem("smallCapsCheckbox").checked ? "small-caps" : "normal";
    appState.font.weight = elem("boldCheckbox").checked ? "bold" : "normal";
    appState.font.size = numb.parse_int(elem("fontSizeInput").value);

    appState.fill_style = elem("fontTypeSelect").value;

    appState.color.rgb.hex = elem("fontColorPicker").value;
    appState.color.unit.alpha = numb.parse(elem("fontAlpha").value) / 100.0;

    appState.background.rgb.hex = elem("bgColorPicker").value;
    appState.background.unit.alpha = numb.parse(elem("bgAlpha").value) / 100.0;

    appState.canvas_size.width = numb.parse_int(elem("canvasWidthSelect").value);
    appState.canvas_size.height = numb.parse_int(elem("canvasHeightSelect").value);

    console.log(appState);



    // If no characters, show zeros
    if (appState.characters.length === 0) {
        elem('statChars').textContent = '0';
        elem('statTextures').textContent = '0';
        elem('statGrid').textContent = '0×0';
        elem('statMemory').textContent = '0MB';
        elem('textureCount').textContent = '0 textures';
        return;
    }

    // Measure character metrics for calculations
    measureCharacterMetrics();

    // Calculate grid capacity
    const cellsPerTexture = appState.max_line_char * appState.max_lines_per_canvas;
    const charsPerTexture = cellsPerTexture * appState.chunk_len;

    // Calculate number of textures needed
    const deBruijnLength = Math.pow(appState.characters.length, appState.chunk_len);
    let texturesNeeded = Math.ceil(deBruijnLength / charsPerTexture);
    //texturesNeeded -= (appState.chunk_len - 1) * appState.max_lines_per_canvas;

    // Calculate memory usage (approximate - 4 bytes per pixel for RGBA)
    const memoryMB = ((appState.canvas_size.width * appState.canvas_size.height * 4 * texturesNeeded) / (1024 * 1024)).toFixed(1);

    // Update stats display
    elem('statChars').textContent = appState.characters.length;
    elem('statTextures').textContent = texturesNeeded; // Cap at 100
    elem('statGrid').textContent = `${appState.max_line_char}×${appState.max_lines_per_canvas}`;
    elem('statMemory').textContent = `${memoryMB}MB`;

    // Update texture count in header
    const displayTextures = texturesNeeded;
    elem('textureCount').textContent =
        `${displayTextures} texture${displayTextures !== 1 ? 's' : ''}`;
};

const buildCyclicSuperstring = (alphabet, k) => {
    const n = alphabet.length;
    const a = new Uint32Array(n * k);
    const out = [];

    const db = (t, p) => {
        if (t > k) {
            if (k % p === 0) {
                for (let i = 1; i <= p; i++) {
                    out.push(alphabet[a[i]]);
                }
            }
        } else {
            a[t] = a[t - p];
            db(t + 1, p);
            for (let j = a[t - p] + 1; j < n; j++) {
                a[t] = j;
                db(t + 1, t);
            }
        }
    }

    db(1, 1);
    return out.join("");
};

const build_canvas_lines = () => {
    const {
        characters,
        chunk_len,
        max_lines_per_canvas,
        max_line_char
    } = appState;

    const cyclic = buildCyclicSuperstring(characters, chunk_len);
    const cycle_len = cyclic.length;

    const result = [];

    let offset = 0;

    // Helper: extract a horizontally wrapped line
    const getCyclicLine = (start, width) => {
        let line = "";
        const needed = width + (chunk_len - 1); // preserve horizontal wrap

        for (let i = 0; i < needed; i++) {
            line += cyclic[(start + i) % cycle_len];
        }

        return line;
    };

    while (offset < cycle_len) {
        const canvasLines = [];

        for (let l = 0; l < max_lines_per_canvas; l++) {
            canvasLines.push(
                getCyclicLine(offset, max_line_char - 1)
            );

            offset += max_line_char - 1;
            if (offset >= cycle_len) break;
        }

        result.push(canvasLines);
    }

    return result;
};


const attachTabListeners = () => {
    document.querySelectorAll('.texture-tabs').forEach(tabContainer => {
        const tabButtons = tabContainer.querySelectorAll('.tab-btn');

        tabButtons.forEach(button => {
            ev(button, "click", (e) => {
                const target = e.target;
                const tabId = target.getAttribute('data-tab');
                const cardContent = target.closest('.texture-card').querySelector('.texture-card-content');

                // Remove active class from all tabs in this card
                tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });

                // Hide all tab content in this card
                cardContent.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });

                // Activate clicked tab
                target.classList.add('active');
                cardContent.querySelector(`#${tabId}`).classList.add('active');
            });
        });
    });
};

const disable_aliasing = (ctx) => {
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;  // Firefox
    ctx.webkitImageSmoothingEnabled = false; // Older Safari
    ctx.msImageSmoothingEnabled = false;   // IE/Edge
};

const new_card = (index, lines, width, height, family) => {
    const container = document.querySelector('.texture-cards-grid');

    while (lines.length < appState.max_lines_per_canvas) {
        lines.push(" ");
    }

    const card = document.createElement('div');
    card.className = 'texture-card compact-card';
    card.innerHTML = `
        <div class="texture-card-header">
            <h3>Texture #${index + 1}</h3>
            <div class="texture-tabs">
                <button class="tab-btn active" data-tab="preview-${index}">Preview</button>
                <button class="tab-btn" data-tab="data-${index}">Data</button>
            </div>
        </div>
        <div class="texture-card-content">
            <div class="tab-content active" id="preview-${index}">
                <div class="texture-preview">
                    <canvas id="textureCanvas${index}" class="texture-canvas" 
                            width="${width}" height="${height}"></canvas>
                </div>
                <div class="texture-info">
                    <span>${width}×${height}</span>
                    <span>${family}</span>
                </div>
            </div>
            <div class="tab-content" id="data-${index}">
                <div class="data-view">
                    <textarea id="textureData${index}" wrap="off" class="data-textarea" readonly>${lines.join("\n")}</textarea>
                </div>
            </div>
        </div>`;

    container.appendChild(card);
};

const generateAllTextures = () => {
    appState.canvas_data = build_canvas_lines();

    const tempCanvas = document.createElement("canvas");
    const gl = tempCanvas.getContext("webgl2") || tempCanvas.getContext("webgl");
    const useWebGL = !!gl;

    const container = document.querySelector('.texture-cards-grid');
    container.innerHTML = "";

    const uniqueChars = appState.characters;
    const charArray = uniqueChars.split('');
    const charToIndex = {};
    charArray.forEach((ch, i) => charToIndex[ch] = i);
    const numChars = charArray.length;
    const blankIndex = numChars;

    // Original canvas fallback (fixed cell size, no per-char scaling)
    const canv_char = elem("canv_char").getContext('2d');
    canv_char.canvas.width = appState.cell_size.width;
    canv_char.canvas.height = appState.cell_size.height;
    const half_width = appState.cell_size.width / 2;
    const half_height = appState.cell_size.height / 2;

    const canv_tex = elem("canv_tex").getContext('2d');
    canv_tex.canvas.width = appState.cell_size.width * appState.max_line_char;
    canv_tex.canvas.height = appState.cell_size.height * appState.max_lines_per_canvas;

    appState.canvas_data.forEach((lines, index) => {
        canv_tex.clearRect(0, 0, canv_tex.canvas.width, canv_tex.canvas.height);

        for (let row = 0; row < lines.length; ++row) {
            const line = lines[row];
            for (let col = 0; col < line.length; ++col) {
                const char = line[col];

                canv_char.font = appState.font.css;
                canv_char.fillStyle = appState.color.rgba.css;
                canv_char.strokeStyle = appState.color.rgba.css;
                canv_char.textAlign = "center";
                canv_char.textBaseline = "middle";

                canv_char.clearRect(0, 0, appState.cell_size.width, appState.cell_size.height);

                if (appState.fill_style === "fill")
                    canv_char.fillText(char, half_width, half_height);
                else
                    canv_char.strokeText(char, half_width, half_height);

                const dest_x = col * appState.cell_size.width;
                const dest_y = row * appState.cell_size.height;

                canv_tex.drawImage(canv_char.canvas, dest_x, dest_y);
            }
        }

        const width = appState.canvas_size.width;
        const height = appState.canvas_size.height;
        new_card(index, lines, width, height, appState.font.family);

        const finale = document.getElementById(`textureCanvas${index}`).getContext('2d');
        finale.fillStyle = appState.background.rgba.css;
        finale.fillRect(0, 0, width, height);
        finale.drawImage(canv_tex.canvas, 0, 0);
    });

    attachTabListeners();
};

/**
 * create_texture_archive creates a zip archive containing
 * texture image files and related text files for the current font.
 * @returns {Promise<void>}
 */
const create_texture_archive = async () => {
    const zip_archive = new JSZip();

    const font_data = appState.font;
    const font_components = [];

    if (font_data.weight === "bold") {
        font_components.push(font_data.weight);
    }
    if (font_data.style === "italic") {
        font_components.push(font_data.style);
    }
    if (font_data.variant === "small-caps") {
        font_components.push(font_data.variant);
    }

    const base_font_name = `${font_data.family}_${font_components.join("_")}`;

    const texture_cards = document.querySelectorAll(".texture-card-content");

    const dummy_nc_name = [];

    texture_cards.forEach((texture_card, index) => {
        const canvas_element = elem(`textureCanvas${index}`);
        const text_element = elem(`textureData${index}`);

        if (!canvas_element) {
            return;
        }

        const data_url = canvas_element.toDataURL("image/png");
        const base64_content = data_url.split(",")[1];

        const raw_text =
            (text_element &&
                (text_element.value ||
                    text_element.textContent ||
                    text_element.innerText ||
                    "")) ||
            "";

        const file_suffix = `_${index}`;
        const image_file_name = `${base_font_name}${file_suffix}.png`;
        const text_file_name = `${base_font_name}${file_suffix}.txt`;

        zip_archive.file(image_file_name, base64_content, { base64: true });
        zip_archive.file(text_file_name, raw_text);
        dummy_nc_name.push(`notecard_name_${index}`);
    });

    const font_desc = `${base_font_name}:[${appState.max_line_char},${appState.max_lines_per_canvas},${appState.chunk_len},[${dummy_nc_name.join(", ")}]]`;
    zip_archive.file(`${base_font_name}_setting.txt`, font_desc);

    const zip_content = await zip_archive.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
    });

    const object_url = URL.createObjectURL(zip_content);
    await save_file_on_disk("tex-font.zip", object_url);
    setTimeout(() => URL.revokeObjectURL(object_url), 1000);
};

const clearAll = () => {
    elem("languageSelect").value = "en";
    elem("charsPerCaseSelect").value = "1";
    elem("canvasWidthSelect").value = "512";
    elem("canvasHeightSelect").value = "512";
    elem("fontSelector").value = "";
    elem("fontSizeInput").value = "14";
    elem("fontTypeSelect").value = "fill";
    elem("fontColorPicker").value = "#ffffff";
    elem("fontAlpha").value = "100";
    elem("fontAlphaValue").textContent = "100%";
    elem("bgColorPicker").value = "#1a1a2e";
    elem("bgAlpha").value = "0";
    elem("bgAlphaValue").textContent = "0%";

    elem("charSetTextarea").value = generateCharacterSet();
    updateStats();

    const container = document.querySelector('.texture-cards-grid');
    container.innerHTML = "";
    make_empty_card();
};

const set_listener = () => {
    // Set up event listeners

    // Language selection - update character set when changed
    ev("languageSelect", "change", (e) => {
        appState.language = e.target.value;
        elem("charSetTextarea").value = generateCharacterSet();
    });

    ev("charsPerCaseSelect", "change", (e) => {
        appState.charsPerCase = parseInt(e.target.value);
        updateStats();
    });

    ev("canvasWidthSelect", "change", updateStats);
    ev("canvasHeightSelect", "change", updateStats);

    ev("fontSelector", "input", updateStats);
    ev("boldCheckbox", "change", updateStats);
    ev("italicCheckbox", "change", updateStats);
    ev("smallCapsCheckbox", "change", updateStats);
    ev("fontSizeInput", "input", updateStats);
    ev("fontTypeSelect", "change", updateStats);

    ev("fontColorPicker", "input", updateStats);
    ev("fontAlpha", "input", (e) => {
        elem("fontAlphaValue").textContent = `${e.target.value}%`;
        updateStats();
    });

    ev("bgColorPicker", "input", updateStats);
    ev("bgAlpha", "input", (e) => {
        elem("bgAlphaValue").textContent = `${e.target.value}%`;
        updateStats();
    });

    ev("generateBtn", "click", () => {
        updateStats();
        generateAllTextures();
    });
    ev("downloadBtn", "click", create_texture_archive);
    ev("clearBtn", "click", clearAll);
};

const make_empty_card = () => {
    const container = document.querySelector('.texture-cards-grid');

    const exampleCard = document.createElement('div');
    exampleCard.className = 'texture-card compact-card empty-state';
    exampleCard.innerHTML = `
        <div class="texture-card-header">
            <h3>Ready to Generate</h3>
        </div>
        <div class="texture-card-content">
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-font" style="font-size: 48px; color: var(--text-muted); margin-bottom: 20px;"></i>
                <p style="color: var(--text-secondary);">Click "Generate Textures" to create font atlas textures</p>
            </div>
        </div>
    `;

    container.appendChild(exampleCard);
};

const initialize = () => {
    set_listener();

    updateStats();

    make_empty_card();

    elem("charSetTextarea").value = generateCharacterSet();
};

if (document.readyState === 'loading') {
    ev(document, "DOMContentLoaded", initialize);
} else initialize();

/*
Implement a javascript proof of concept

Take font and a string in

make one 128 image by unique char in the string using the font

initialize web gl

Upload all texture to GPU plus a unit array of char code from the string

Render 

*/