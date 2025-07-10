import { setLanguage } from './lang.js';

export class CSSProcessor {
    constructor() {
        this.uidGen = this.uidGenerator();
        this.reset();
    }

    reset() {
        this.defines = {};
        this.classNames = [];
        this.errors = [];
    }

    *uidGenerator() {
        const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const alphanum = letters + '0123456789';
        const used = new Set();
        let i = 0;

        while (true) {
            let n = i++, s = letters[n % letters.length];
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

    isValidClassName(name) {
        return /^[a-zA-Z_][\w-]*$/.test(name) || /^--?[a-zA-Z_][\w-]*$/.test(name);
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    parseDefines(lines) {
        this.reset();

        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed.startsWith('#define')) return;

            const match = trimmed.match(/^#define\s+(\S+)\s*(.*)$/);
            if (!match || !match[1]) {
                this.errors.push(`Line ${idx + 1}: Invalid #define syntax`);
                return;
            }

            let [_, key, value] = match;
            if (value === '__UID__') {
                value = key.startsWith('--') ? '--' + this.uidGen.next().value : this.uidGen.next().value;
            }
            this.defines[key] = value;
            if (!key.startsWith('--') && this.isValidClassName(key)) this.classNames.push(key);
        });
    }

    getUsedClassNames(html) {
        const classNames = new Set();
        const regex = /class\s*=\s*(?:["']([^"']*?)["']|([^\s>]+))/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            (match[1] || match[2] || '').split(/\s+/).forEach(cls => {
                if (cls = cls.trim()) classNames.add(cls);
            });
        }
        return classNames;
    }

    replaceClassNamesInHTML(line) {
        return line.replace(/class\s*=\s*(["'])([^"']*?)\1/gi, (m, q, v) => {
            const newVal = v.split(/\s+/).map(cls => this.defines[cls] || cls).join(' ');
            return `class=${q}${newVal}${q}`;
        });
    }

    removeUnusedCSS(css, usedClasses) {
        return css.replace(/([^{]+)\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g, (match, selectors, body) => {
            const keep = selectors.split(',').some(sel => {
                const classMatches = sel.match(/\.[a-zA-Z_][\w-]*/g);
                return !classMatches || classMatches.some(cls => usedClasses.has(cls.slice(1)));
            });
            return keep ? `${selectors.trim().replace(/\\s+/g, ' ')} { ${body.trim()} }\n` : '';
        }).trim();
    }

    process(input) {
        try {
            const lines = input.split('\n');
            this.parseDefines(lines);
            if (this.errors.length) return { success: false, errors: this.errors };

            let cssLines = [], htmlLines = [], inHtml = false;
            for (const line of lines) {
                if (!line.trim().startsWith('#define')) {
                    if (line.trim().startsWith('<')) inHtml = true;
                    (inHtml ? htmlLines : cssLines).push(line);
                }
            }

            let css = cssLines.join('\n');
            for (const key in this.defines) {
                const val = this.defines[key];
                const regex = new RegExp(
                    key.startsWith('--')
                        ? `${this.escapeRegex(key)}(?=[\s;})])`
                        : `${this.escapeRegex(key)}(?=[^a-zA-Z0-9_-]|$)`,
                    'g'
                );
                css = css.replace(regex, val);
            }

            const html = htmlLines.map(line => {
                let out = this.classNames.length && /class\s*=/i.test(line)
                    ? this.replaceClassNamesInHTML(line)
                    : line;
                for (const key in this.defines) {
                    if (!this.classNames.includes(key)) {
                        const regex = new RegExp(
                            key.startsWith('--')
                                ? `${this.escapeRegex(key)}(?=[\s;})])`
                                : `${this.escapeRegex(key)}(?=[^a-zA-Z0-9_-]|$)`,
                            'g'
                        );
                        out = out.replace(regex, this.defines[key]);
                    }
                }
                return out;
            }).join('\n');

            const used = this.getUsedClassNames(html);
            const finalCss = this.removeUnusedCSS(css, used);

            return { success: true, output: (finalCss + '\n' + html).trim() };
        } catch (err) {
            return { success: false, errors: [`Processing error: ${err.message}`] };
        }
    }
}

// Setup
const processor = new CSSProcessor();

document.getElementById('process').addEventListener('click', () => {
    const input = document.getElementById('input').value;
    const result = processor.process(input);
    document.getElementById('output').textContent = result.success
        ? result.output
        : 'Errors:\n' + result.errors.join('\n');
});

document.getElementById('copy').addEventListener('click', () => {
    const output = document.getElementById('output').textContent;
    navigator.clipboard.writeText(output).then(() => {
        const status = document.getElementById('copy-status');
        status.style.display = 'inline';
        setTimeout(() => { status.style.display = 'none'; }, 2000);
    });
});

document.getElementById('language').addEventListener('change', e => {
    setLanguage(e.target.value);
});

setLanguage('en');
