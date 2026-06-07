/**
 * Start Express API (3001) + Vite (3000) together for local development.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';

function run(cmd, args, label) {
    const child = spawn(cmd, args, {
        cwd: root,
        stdio: 'inherit',
        shell: isWin,
        env: { ...process.env, PORT: '3001', FORCE_COLOR: '1' },
    });
    child.on('exit', (code) => {
        if (code && code !== 0) console.error(`[dev-all] ${label} beendet mit Code ${code}`);
    });
    return child;
}

console.log('[dev-all] Baue Server…');
const build = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'build:server'], { cwd: root, stdio: 'inherit', shell: isWin });
build.on('exit', (code) => {
    if (code !== 0) process.exit(code ?? 1);
    console.log('[dev-all] API → http://127.0.0.1:3001  |  Vite → http://localhost:3000');
    const api = run('node', ['--env-file=.env', join('scripts', 'run-dev-api.mjs')], 'API');
    const vite = run(isWin ? 'npm.cmd' : 'npm', ['run', 'dev'], 'Vite');

    const shutdown = () => {
        api.kill();
        vite.kill();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
});
