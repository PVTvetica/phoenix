/**
 * Applies German UI string replacements from de-ui-replacements.json
 * to components/, contexts/, hooks/ TSX files and selected lib files.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_DIRS = ['components', 'contexts', 'hooks'];
const EXTRA_FILES = [join(ROOT, 'lib', 'time.ts'), join(ROOT, 'lib', 'db', 'system.ts')];

/** Never translate TypeScript / API identifiers via UI string pass. */
const SKIP_KEYS = new Set(['Promise']);

function loadJson(name) {
    const p = join(ROOT, 'scripts', name);
    try {
        return JSON.parse(readFileSync(p, 'utf8'));
    } catch {
        return {};
    }
}

const merged = {
    ...loadJson('de-ui-replacements.json'),
    ...loadJson('de-ui-subtitles-descriptions.json'),
    ...loadJson('de-ui-headings.json'),
};
const replacements = Object.entries(merged)
    .filter(([en, de]) => en && de && en !== de && !SKIP_KEYS.has(en))
    .sort((a, b) => b[0].length - a[0].length);

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Precompile matchers; skip strings that never appear in a file. */
const ATTRS = 'label|title|placeholder|heading|subtitle|description|aria-label|confirmLabel|footerNote|chipLabel';
const rules = replacements
    .filter(([en, de]) => en && de && en !== de)
    .map(([en, de]) => {
        const esc = escapeRe(en);
        const deAttr = de.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const deSingle = de.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return {
            en,
            de,
            attrDouble: new RegExp(`(${ATTRS})="${esc}"`, 'g'),
            attrSingle: new RegExp(`(${ATTRS})='${esc}'`, 'g'),
            toast: new RegExp(`addToast\\("${esc}"`, 'g'),
            desc: new RegExp(`description:\\s*"${esc}"`, 'g'),
            descSingle: new RegExp(`description:\\s*'${esc}'`, 'g'),
            jsx: new RegExp(`>\\s*${esc}\\s*<`, 'g'),
            labelProp: new RegExp(`label:\\s*'${esc}'`, 'g'),
            labelPropD: new RegExp(`label:\\s*"${esc}"`, 'g'),
            groupHeader: new RegExp(`"${esc}":\\s*\\[`, 'g'),
        };
    });

function applyToContent(content) {
    let out = content;
    for (const r of rules) {
        if (!content.includes(r.en)) continue;
        const deEsc = String(r.de).replace(/\$/g, '$$$$');
        out = out
            .replace(r.attrDouble, `$1="${deEsc}"`)
            .replace(r.attrSingle, `$1='${deEsc}'`)
            .replace(r.toast, `addToast("${deEsc}"`)
            .replace(r.desc, `description: "${deEsc}"`)
            .replace(r.descSingle, `description: '${deEsc.replace(/'/g, "\\'")}'`)
            .replace(r.jsx, `>${deEsc}<`)
            .replace(r.labelProp, `label: '${deEsc}'`)
            .replace(r.labelPropD, `label: "${deEsc}"`)
            .replace(r.groupHeader, `"${deEsc}": [`);
    }
    return out;
}

function walkTsx(dir, files = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walkTsx(p, files);
        else if (p.endsWith('.tsx')) files.push(p);
    }
    return files;
}

const files = [];
for (const d of TARGET_DIRS) walkTsx(join(ROOT, d), files);
for (const f of EXTRA_FILES) {
    try {
        statSync(f);
        files.push(f);
    } catch {
        /* skip */
    }
}

let changed = 0;
for (const file of files) {
    const before = readFileSync(file, 'utf8');
    const after = applyToContent(before);
    if (after !== before) {
        writeFileSync(file, after, 'utf8');
        changed++;
    }
}
console.log(`Updated ${changed} of ${files.length} files`);
