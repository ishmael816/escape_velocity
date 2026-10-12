import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
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
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const pool=JSON.parse(await readFile(path.join(root,'data/cardpool-v24.2.json'),'utf8'));
let commit=process.env.VERCEL_GIT_COMMIT_SHA||null;
if(!commit)try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{}
await writeFile(path.join(output,'version.json'),JSON.stringify({version:pkg.version,commit,rules:pool.rules.version,cardTypes:pool.cards.length,totalCards:pool.cards.reduce((n,c)=>n+c.copies,0),hours:[4,8]},null,2)+'\n');
