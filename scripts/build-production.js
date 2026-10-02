import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const vite = join(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
const client = fileURLToPath(new URL('../client/', import.meta.url));
// Override local client/.env URLs: a deployed browser calls its own /api proxy.
const result = spawnSync(process.execPath, [vite, 'build'], {
  cwd: client,
  env: { ...process.env, VITE_API_URL: '/api' },
  stdio: 'inherit',
});
if (result.error) {
  console.error('The production build could not start. Run npm install at the project root.');
}
process.exit(result.status ?? 1);
