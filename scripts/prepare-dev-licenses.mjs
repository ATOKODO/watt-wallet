import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(project, '.cache/dev-licenses');
const lock = JSON.parse(await readFile(path.join(project, 'package-lock.json'), 'utf8'));
const separator = '\n' + '-'.repeat(80) + '\n';
const notices = [];
const seen = new Set();

// Development does not run Angular's production license extractor. Collect the
// installed runtime packages instead, without requiring an existing web build.
for (const [directory, entry] of Object.entries(lock.packages)) {
  if (!directory || entry.dev || entry.link) continue;
  const installed = path.join(project, directory);
  const metadata = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
  const identity = `${metadata.name}@${metadata.version}`;
  if (seen.has(identity)) continue;
  seen.add(identity);
  const files = (await readdir(installed, { withFileTypes: true }))
    .filter(
      (file) =>
        file.isFile() && /^(?:(?:mit-)?licen[cs]e|copying|copyright|notice)(?:$|[-._])/i.test(file.name),
    )
    .map((file) => file.name)
    .sort();
  if (!files.length) throw Error('Missing bundled license for ' + identity);
  const texts = await Promise.all(files.map((file) => readFile(path.join(installed, file), 'utf8')));
  notices.push(`Package: ${identity}\nLicense: ${JSON.stringify(metadata.license)}\n\n${texts.join('\n\n')}`);
}
await mkdir(output, { recursive: true });
await copyFile(path.join(project, 'LICENSE'), path.join(output, 'LICENSE.txt'));
await writeFile(path.join(output, '3rdpartylicenses.txt'), notices.join(separator) + '\n');
console.log('Development licenses prepared for ' + notices.length + ' installed runtime packages.');
