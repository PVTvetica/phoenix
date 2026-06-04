import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirs = ['components', 'contexts', 'hooks'];
const attrRe = /(?:label|title|placeholder|heading|subtitle|description|aria-label|confirmLabel)(?:=\{)?["']([^"']{3,})["']/g;
const toastRe = /addToast\(["']([^"']{3,})["']/g;
const jsxRe = />\s*([A-Z][A-Za-z0-9][^<{]{2,55}?)\s*</g;
const set = new Set();

function walk(d) {
    for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.tsx')) {
            const c = readFileSync(p, 'utf8');
            let m;
            while ((m = attrRe.exec(c))) set.add(m[1]);
            while ((m = toastRe.exec(c))) set.add(m[1]);
            while ((m = jsxRe.exec(c))) {
                const t = m[1].trim();
                if (!t.includes('fa-') && !/^\d/.test(t)) set.add(t);
            }
        }
    }
}

for (const d of dirs) walk(join(ROOT, d));
const sorted = [...set].sort();
writeFileSync(join(ROOT, 'scripts', 'extracted-ui-strings.txt'), sorted.join('\n'));
console.log('count', sorted.length);
