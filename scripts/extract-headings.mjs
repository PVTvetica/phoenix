import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const set = new Set();
const re = /heading="([^"]+)"/g;

function walk(d) {
    for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.tsx')) {
            const c = readFileSync(p, 'utf8');
            let m;
            while ((m = re.exec(c))) set.add(m[1]);
        }
    }
}
walk(join(ROOT, 'components'));
writeFileSync(join(ROOT, 'scripts', 'extracted-headings.txt'), [...set].sort().join('\n'));
console.log('count', set.size);
