import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const frontendDir = resolve(import.meta.dirname, '..');
const rootDir = resolve(frontendDir, '..');
const backendDir = resolve(rootDir, 'backend');
const backendEntry = resolve(backendDir, 'dist', 'main.js');
const viteEntry = resolve(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');

if (!existsSync(backendEntry)) {
  throw new Error('Backend build is missing. Run "npm run build --prefix backend" first.');
}

const resetCommand = process.platform === 'win32'
  ? ['cmd.exe', ['/d', '/s', '/c', 'npm run db:reset']]
  : ['npm', ['run', 'db:reset']];
const resetResult = spawnSync(resetCommand[0], resetCommand[1], {
  cwd: backendDir,
  env: {
    ...process.env,
    RESET_JPTAXI: 'YES',
  },
  encoding: 'utf8',
  stdio: 'inherit',
});

if (resetResult.status !== 0) {
  throw new Error('Unable to reset the E2E database.');
}

const children = [
  spawn(process.execPath, [backendEntry], {
    cwd: backendDir,
    env: { ...process.env, PORT: process.env.PORT || '3000' },
    stdio: 'inherit',
  }),
  spawn(process.execPath, [viteEntry, '--host', '127.0.0.1', '--port', '5173'], {
    cwd: frontendDir,
    env: {
      ...process.env,
      VITE_API_BASE_URL:
        process.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api',
    },
    stdio: 'inherit',
  }),
];

function stop() {
  children.forEach((child) => {
    if (!child.killed) child.kill();
  });
}

process.on('SIGINT', () => {
  stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stop();
  process.exit(0);
});
process.on('exit', stop);

await new Promise((resolvePromise, reject) => {
  children.forEach((child) => {
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code && code !== 0) {
        reject(new Error(`Local stack process exited with code ${code}`));
      }
    });
  });
});
