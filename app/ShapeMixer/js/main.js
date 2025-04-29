const TABS = Object.freeze({
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

const loadedFiles = new Map();
const $ = document.getElementById.bind(document);
const uid = () => crypto.randomUUID().slice(0, 13);
const el = (tag, attrs = {}) => Object.assign(document.createElement(tag), attrs);
const htmlEscape = str => str?.replace(/[&<>"']/g, m => `&#${m.codePointAt(0)}`) ?? "";

const updateStats = (target, char) => {
    target.parentElement.querySelector('[data-for="stats"]').textContent = char;
};

const loadFile = async e => {
    const target = e.target;
    const file = target.files?.[0];
    if (!file) return updateStats(target, '🟡');

    const parent = target.parentElement;
    const name = file.name;
    parent.dataset.file = htmlEscape(name);
    loadedFiles.delete(name);

    try {
        const text = await file.text();
        parseFile(target, text, name);
    } catch (err) {
        updateStats(target, '🔴');
    }
};

const allRowsLoaded = () => {
    const rows = document.querySelectorAll('.loaderrow');
    return rows.length > 0 && Array.from(rows).every(row =>
        row.querySelector('[data-for="stats"]').textContent === '🟢'
    );
};

const parseFile = (target, xml, name) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const archetypes = doc.querySelectorAll('archetype');
    if (!archetypes.length) {
        updateStats(target, '🔴');
        throw new Error("Invalid XML");
    }

    loadedFiles.set(name, doc);
    updateStats(target, '🟢');
    if (allRowsLoaded()) addRow();
};

const checkExclusive = (checkbox, dataFor) => {
    const row = checkbox.closest('div');
    if (row.querySelector('[data-for="stats"]').textContent !== '🟢') {
        checkbox.checked = false;
        return;
    }

    document.querySelectorAll(`[data-for="${dataFor}"]`).forEach(cb => {
        if (cb !== checkbox) cb.checked = false;
    });
};

const createCheckbox = category => `
    <label>
        <input type="checkbox" data-for="${category}">
        <span>${category}</span>
    </label>
`;

const addRow = () => {
    const id = uid();
    const row = el('div', { className: 'loaderrow', id });
    row.innerHTML = `
    <span data-for="stats">🟡</span>
    <input type="file" data-for="file">
    ${Object.keys(TABS).map(createCheckbox).join('')}
`;

    const loaderFrame = $('loaderframe');
    loaderFrame.append(row);

    const fileInput = row.querySelector('[data-for="file"]');
    fileInput.addEventListener('change', loadFile);

    row.querySelectorAll('[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', e => checkExclusive(e.target, e.target.dataset.for));
    });
};

const XSLT_PRETTY_PRINT = new DOMParser().parseFromString(`
    <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
        <xsl:strip-space elements="*"/>
        <xsl:output method="xml" indent="yes"/>
        <xsl:template match="node()|@*">
            <xsl:copy>
                <xsl:apply-templates select="node()|@*"/>
            </xsl:copy>
        </xsl:template>
    </xsl:stylesheet>
`, 'application/xml');

const saveXML = () => {
    const doc = document.implementation.createDocument('', '', null);

    const root = doc.createElement('linden_genepool');
    root.setAttribute("version", "1.0");
    doc.appendChild(root);

    const archetype = doc.createElement('archetype');
    archetype.setAttribute("name", "???");
    root.appendChild(archetype);

    for (const [category, ids] of Object.entries(TABS)) {
        const checkedBox = document.querySelector(`[data-for="${category}"]:checked`);
        if (!checkedBox) continue;

        const row = checkedBox.closest('.loaderrow');
        const fileName = row.dataset.file;
        const fileDoc = loadedFiles.get(fileName);

        if (!fileDoc) continue;

        ids.forEach(id => {
            const node = fileDoc.querySelector(`param[id="${id}"]`);
            if (node) {
                archetype.appendChild(doc.importNode(node, true));
            }
        });
    }

    const xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(XSLT_PRETTY_PRINT);
    const prettyDoc = xsltProcessor.transformToDocument(doc);

    const xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        new XMLSerializer().serializeToString(prettyDoc);

    const blob = new Blob([xmlString], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: `mixed_shape_${Date.now()}.xml` });

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

addEventListener('DOMContentLoaded', () => {
    addRow();
    $('save_btn').addEventListener('click', saveXML);
});
