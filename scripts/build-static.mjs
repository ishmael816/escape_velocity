import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
// Publish only browser files; the local Node server is not a production function.
await mkdir(path.join(output, 'designs'), { recursive: true });
for (const entry of ['index.html', 'src', 'assets', 'designs/board-art-background.png']) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}
console.log('Static site built in dist/');
