import { z } from 'zod';
import { strFromU8, strToU8, zipSync, Unzip, UnzipInflate } from 'fflate';
import { DeviceDefinition, Home, Workspace, copy, definitionSchema, homeSchema, uid } from '../domain/models';
import { validateSnapshot, validateUsage } from '../domain/energy';
import { validateGlb } from './glb';

export const MAX_PACK_BYTES = 100 * 1024 * 1024;
export const packSchema = z.discriminatedUnion('kind', [
  z
    .object({
      format: z.literal('watt-wallet'),
      version: z.literal(1),
      kind: z.literal('library'),
      definitions: z.array(definitionSchema).min(1).max(2000),
    })
    .strict(),
  z
    .object({
      format: z.literal('watt-wallet'),
      version: z.literal(1),
      kind: z.literal('home'),
      home: homeSchema,
    })
    .strict(),
]);
export type WattPack = z.infer<typeof packSchema>;
export interface PreparedPack {
  manifest: WattPack;
  assets: Record<string, Uint8Array>;
}
export function definitionsIn(pack: WattPack): DeviceDefinition[] {
  return pack.kind === 'library'
    ? pack.definitions
    : [...pack.home.devices, ...pack.home.scenarios.flatMap((s) => s.devices)].map((d) => d.definition);
}
export function assetIds(pack: WattPack): string[] {
  return [
    ...new Set(definitionsIn(pack).flatMap((d) => (d.visual.kind === 'glb' ? [d.visual.assetId] : []))),
  ];
}
export function validateManifest(input: unknown): WattPack {
  const p = packSchema.parse(input);
  if (p.kind === 'library') {
    const ids = new Set<string>();
    for (const d of p.definitions) {
      if (ids.has(d.id)) throw new Error('Fiches en double dans le paquet.');
      ids.add(d.id);
    }
  } else {
    validateSnapshot(p.home);
    const ids = new Set<string>();
    for (const s of p.home.scenarios) {
      if (ids.has(s.id)) throw new Error('Scénarios en double.');
      ids.add(s.id);
      validateSnapshot(s);
    }
  }
  for (const d of definitionsIn(p)) validateUsage(d, d.defaultUsage);
  return p;
}

export function encodePack(manifest: WattPack, assets: Record<string, Uint8Array>): Uint8Array {
  const valid = validateManifest(manifest);
  const files: Record<string, Uint8Array> = { 'manifest.json': strToU8(JSON.stringify(valid, null, 2)) };
  if (files['manifest.json'].length > 2 * 1024 * 1024) throw new Error('Le manifeste dépasse 2 Mio.');
  for (const id of assetIds(valid)) {
    if (!assets[id]) throw new Error('Un modèle 3D est manquant.');
    validateGlb(assets[id]);
    files[`assets/${id}.glb`] = assets[id];
  }
  if (
    Object.keys(files).length > 200 ||
    Object.values(files).reduce((s, f) => s + f.length, 0) > MAX_PACK_BYTES
  )
    throw new Error('Le paquet dépasse les limites du format.');
  return zipSync(files, { level: 6 });
}

function inspectZip(data: Uint8Array): Map<string, { size: number; crc: number }> {
  if (data.length > MAX_PACK_BYTES || data.length < 22)
    throw new Error('Archive invalide ou supérieure à 100 Mio.');
  const v = new DataView(data.buffer, data.byteOffset, data.length);
  let end = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50 && i + 22 + v.getUint16(i + 20, true) === data.length) {
      end = i;
      break;
    }
  }
  if (end < 0 || v.getUint16(end + 4, true) || v.getUint16(end + 6, true))
    throw new Error('Archive ZIP tronquée ou multiparties non prise en charge.');
  const count = v.getUint16(end + 10, true),
    directorySize = v.getUint32(end + 12, true);
  let pos = v.getUint32(end + 16, true);
  if (!count || count > 200 || v.getUint16(end + 8, true) !== count || pos + directorySize !== end)
    throw new Error('Répertoire ZIP invalide ou trop volumineux.');
  const files = new Map<string, { size: number; crc: number }>();
  let total = 0;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > end || v.getUint32(pos, true) !== 0x02014b50) throw new Error('Répertoire ZIP invalide.');
    const flags = v.getUint16(pos + 8, true),
      method = v.getUint16(pos + 10, true);
    const size = v.getUint32(pos + 24, true),
      compressed = v.getUint32(pos + 20, true);
    const nameLength = v.getUint16(pos + 28, true),
      extra = v.getUint16(pos + 30, true),
      comment = v.getUint16(pos + 32, true);
    const offset = v.getUint32(pos + 42, true);
    if (flags & 1 || ![0, 8].includes(method) || pos + 46 + nameLength + extra + comment > end)
      throw new Error('Archive chiffrée ou compression non prise en charge.');
    const name = strFromU8(data.subarray(pos + 46, pos + 46 + nameLength));
    if (!(name === 'manifest.json' || /^assets\/[a-zA-Z0-9_-]{1,100}\.glb$/.test(name)) || files.has(name))
      throw new Error('Chemin inattendu ou entrée ZIP dupliquée.');
    if (
      offset + 30 > pos ||
      v.getUint32(offset, true) !== 0x04034b50 ||
      v.getUint16(offset + 6, true) !== flags ||
      v.getUint16(offset + 8, true) !== method
    )
      throw new Error('En-tête ZIP incohérent.');
    const localNameLength = v.getUint16(offset + 26, true),
      localExtra = v.getUint16(offset + 28, true);
    if (
      strFromU8(data.subarray(offset + 30, offset + 30 + localNameLength)) !== name ||
      offset + 30 + localNameLength + localExtra + compressed > pos
    )
      throw new Error('Entrée ZIP incohérente.');
    total += size;
    if (total > MAX_PACK_BYTES || size > (name === 'manifest.json' ? 2 : 20) * 1024 * 1024)
      throw new Error('Archive décompressée trop volumineuse.');
    files.set(name, { size, crc: v.getUint32(pos + 16, true) });
    pos += 46 + nameLength + extra + comment;
  }
  if (pos !== end || !files.has('manifest.json'))
    throw new Error('Manifeste manquant ou répertoire ZIP invalide.');
  return files;
}
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function decodePack(data: Uint8Array): PreparedPack {
  const expected = inspectZip(data);
  const files: Record<string, Uint8Array> = {};
  const seen = new Set<string>();
  let failure: Error | undefined;
  const unzip = new Unzip((file) => {
    const meta = expected.get(file.name);
    if (!meta || seen.has(file.name)) {
      failure = new Error('Entrée ZIP inattendue.');
      return;
    }
    seen.add(file.name);
    const parts: Uint8Array[] = [];
    let length = 0;
    file.ondata = (error, chunk, final) => {
      if (error) {
        failure = error;
        return;
      }
      length += chunk.length;
      if (length > meta.size || failure) {
        failure ??= new Error('Taille décompressée incohérente.');
        file.terminate();
        return;
      }
      parts.push(chunk);
      if (final) {
        if (length !== meta.size) {
          failure = new Error('Entrée ZIP tronquée.');
          return;
        }
        const result = new Uint8Array(length);
        let offset = 0;
        for (const part of parts) {
          result.set(part, offset);
          offset += part.length;
        }
        if (crc32(result) !== meta.crc) {
          failure = new Error('Archive corrompue (CRC).');
          return;
        }
        files[file.name] = result;
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < data.length && !failure; offset += 65536)
    unzip.push(data.subarray(offset, offset + 65536), offset + 65536 >= data.length);
  if (failure) throw failure;
  if (Object.keys(files).length !== expected.size) throw new Error('Archive incomplète.');
  const manifest = validateManifest(JSON.parse(strFromU8(files['manifest.json'])));
  const required = assetIds(manifest);
  if (required.length + 1 !== expected.size) throw new Error('Ressources non référencées dans le paquet.');
  const assets: Record<string, Uint8Array> = {};
  for (const id of required) {
    const glb = files[`assets/${id}.glb`];
    if (!glb) throw new Error('Un modèle 3D référencé est absent.');
    validateGlb(glb);
    assets[id] = glb;
  }
  return { manifest, assets };
}

export function importCopies(
  prepared: PreparedPack,
  workspace: Workspace,
): { workspace: Workspace; assets: Record<string, Uint8Array> } {
  const next = copy(workspace),
    p = copy(prepared.manifest);
  const assetMap = new Map(Object.keys(prepared.assets).map((id) => [id, uid()]));
  const assets = Object.fromEntries(Object.entries(prepared.assets).map(([id, b]) => [assetMap.get(id)!, b]));
  function remapDefinition(d: DeviceDefinition) {
    d.id = uid();
    if (d.visual.kind === 'glb') d.visual.assetId = assetMap.get(d.visual.assetId)!;
  }
  if (p.kind === 'library') {
    p.definitions.forEach(remapDefinition);
    next.library.push(...p.definitions);
  } else {
    p.home.id = uid();
    p.home.name += ' (importé)';
    for (const snapshot of [p.home, ...p.home.scenarios]) {
      if ('initialCost' in snapshot) snapshot.id = uid();
      for (const d of snapshot.devices) {
        d.id = uid();
        remapDefinition(d.definition);
      }
    }
    next.homes.push(p.home);
    next.activeHomeId = p.home.id;
  }
  return { workspace: next, assets };
}
