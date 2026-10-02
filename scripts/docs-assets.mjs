import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'docs/.vitepress/public');
await mkdir(target, { recursive: true });
await cp(path.join(root, 'docs/screenshots'), path.join(target, 'screenshots'), {
  recursive: true,
  filter: (source) => !source.endsWith('.md'),
});
await cp(path.join(root, 'examples'), path.join(target, 'examples'), { recursive: true });
await cp(path.join(root, 'docs/wattpack.schema.json'), path.join(target, 'wattpack.schema.json'));
await cp(path.join(root, 'public/favicon.svg'), path.join(target, 'favicon.svg'));
await writeFile(path.join(target, '.nojekyll'), '');
console.log('Documentation assets prepared: screenshots, galleries, schema and example packages.');
