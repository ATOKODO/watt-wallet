import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const [releasePath, installedPath] = process.argv.slice(2);
if (!releasePath || !installedPath) throw new Error('Indiquer le binaire compilé puis le binaire installé.');
const release = await readFile(releasePath);
const installed = await readFile(installedPath);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
if (hash(release) !== hash(installed)) {
  // Tauri replaces its reserved bundle marker while creating the NSIS payload,
  // then restores the unbundled executable. No other byte difference is allowed.
  const sourceMarker = Buffer.from('__TAURI_BUNDLE_TYPE_VAR_UNK');
  const targetMarker = Buffer.from('__TAURI_BUNDLE_TYPE_VAR_NSS');
  const expected = Buffer.from(release);
  let matches = 0,
    offset = expected.indexOf(sourceMarker);
  while (offset !== -1) {
    targetMarker.copy(expected, offset);
    matches++;
    offset = expected.indexOf(sourceMarker, offset + sourceMarker.length);
  }
  if (!matches || hash(expected) !== hash(installed)) {
    throw new Error('Le binaire installé diffère du binaire compilé au-delà du marqueur NSIS Tauri.');
  }
}
console.log(`Binaire NSIS vérifié, SHA-256 : ${hash(installed)}`);
