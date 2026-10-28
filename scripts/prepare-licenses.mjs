import { copyFile, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(project, 'dist/watt-wallet');
const browser = path.join(output, 'browser');
const workerManifest = path.join(browser, 'ngsw.json');
await stat(path.join(browser, 'index.html'));
await copyFile(path.join(project, 'LICENSE'), path.join(browser, 'LICENSE.txt'));

const thirdParty = path.join(output, '3rdpartylicenses.txt');
if (!existsSync(thirdParty) && !existsSync(workerManifest)) {
  console.log('Development build: dependency license extraction is disabled.');
  process.exit(0);
}
if (!(await stat(thirdParty)).size) throw Error('The extracted dependency licenses are empty.');
await copyFile(thirdParty, path.join(browser, '3rdpartylicenses.txt'));

if (existsSync(workerManifest)) {
  // Angular generated this manifest before the two notices were copied. Run its
  // public configuration CLI again so both files are available offline as well.
  const current = JSON.parse(await readFile(workerManifest, 'utf8'));
  const baseHref = current.index.slice(0, current.index.lastIndexOf('/') + 1);
  const require = createRequire(import.meta.url);
  const cli = path.join(
    path.dirname(require.resolve('@angular/service-worker/package.json')),
    'ngsw-config.js',
  );
  const result = spawnSync(
    process.execPath,
    [cli, path.relative(project, browser), 'ngsw-config.json', baseHref],
    {
      cwd: project,
      stdio: 'inherit',
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Project and dependency licenses included in the browser distribution.');
