import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { decodePack, encodePack, importCopies, WattPack, MAX_PACK_BYTES } from '../src/app/data/wattpack';
import { validateGlb } from '../src/app/data/glb';
import { seedWorkspace, seedLibrary } from '../src/app/domain/seed';
import { calculate } from '../src/app/domain/energy';
import { copy } from '../src/app/domain/models';
import { buildGlb, triangleGlb } from './fixtures';

function library(): WattPack {
  return { format: 'watt-wallet', version: 1, kind: 'library', definitions: seedLibrary() };
}
describe('wattpack autonome', () => {
  it('aller-retour de la bibliothèque sans ressources', () => {
    const p = library();
    expect(decodePack(encodePack(p, {})).manifest).toEqual(p);
  });
  it('aller-retour du logement avec scénarios, tarifs et résultats recalculés', () => {
    const h = seedWorkspace().homes[0];
    h.scenarios.push({
      id: 'scenario',
      name: 'Essai',
      initialCost: 100,
      devices: copy(h.devices),
      tariff: copy(h.tariff),
    });
    const p: WattPack = { format: 'watt-wallet', version: 1, kind: 'home', home: h };
    const result = decodePack(encodePack(p, {}));
    expect(result.manifest).toEqual(p);
    if (result.manifest.kind === 'home') expect(calculate(result.manifest.home)).toEqual(calculate(h));
  });
  it('partage un seul GLB entre plusieurs fiches', () => {
    const p = library();
    if (p.kind !== 'library') return;
    p.definitions[0].visual = { kind: 'glb', assetId: 'shared', fallback: 'radiator' };
    p.definitions[1].visual = { kind: 'glb', assetId: 'shared', fallback: 'boiler' };
    const b = triangleGlb();
    const decoded = decodePack(encodePack(p, { shared: b }));
    expect(Object.keys(decoded.assets)).toEqual(['shared']);
    expect(decoded.assets['shared']).toEqual(b);
  });
  it('importe des copies sans affecter les données précédentes', () => {
    const w = seedWorkspace(),
      before = copy(w);
    const p = library();
    const imported = importCopies(decodePack(encodePack(p, {})), w);
    expect(w).toEqual(before);
    expect(imported.workspace.library.length).toBe(w.library.length * 2);
    expect(new Set(imported.workspace.library.map((d) => d.id)).size).toBe(imported.workspace.library.length);
  });
  it('remappe logement, scénarios, appareils et ressources', () => {
    const w = seedWorkspace(),
      h = copy(w.homes[0]);
    h.devices[0].definition.visual = { kind: 'glb', assetId: 'shared', fallback: 'radiator' };
    h.scenarios.push({
      id: 's',
      name: 'Test',
      initialCost: 0,
      devices: copy(h.devices),
      tariff: copy(h.tariff),
    });
    const p: WattPack = { format: 'watt-wallet', version: 1, kind: 'home', home: h };
    const result = importCopies(decodePack(encodePack(p, { shared: triangleGlb() })), w);
    const added = result.workspace.homes[1];
    expect(added.id).not.toBe(h.id);
    expect(added.devices[0].id).not.toBe(h.devices[0].id);
    expect(added.scenarios[0].id).not.toBe('s');
    const v = added.devices[0].definition.visual;
    expect(v.kind).toBe('glb');
    if (v.kind === 'glb') expect(result.assets[v.assetId]).toEqual(triangleGlb());
  });
  it('importe un nom de logement de 100 caractères sans dépasser le contrat', () => {
    const home = seedWorkspace().homes[0];
    home.name = 'x'.repeat(100);
    const result = importCopies(
      decodePack(encodePack({ format: 'watt-wallet', version: 1, kind: 'home', home }, {})),
      seedWorkspace(),
    );
    expect(result.workspace.homes[1].name).toHaveLength(100);
    expect(result.workspace.homes[1].name).toMatch(/ \(importé\)$/);
    expect(home.name).toHaveLength(100);
  });
  it('valide les capacités de destination avant de rendre les ressources à importer', () => {
    const workspace = seedWorkspace();
    workspace.library = Array.from({ length: 2000 }, (_, i) => ({
      ...copy(workspace.library[0]),
      id: 'd' + i,
    }));
    const before = copy(workspace);
    const p = library();
    if (p.kind !== 'library') return;
    p.definitions[0].visual = { kind: 'glb', assetId: 'mesh', fallback: 'radiator' };
    expect(() => importCopies(decodePack(encodePack(p, { mesh: triangleGlb() })), workspace)).toThrow(
      '2 000',
    );
    expect(workspace).toEqual(before);
  });
  it('partage un logement dont le manifeste dépasse 2 Mio avec tous ses scénarios', () => {
    const home = seedWorkspace().homes[0];
    home.devices = Array.from({ length: 200 }, (_, i) => ({
      ...copy(home.devices[i % 6]),
      id: 'device-' + i,
    }));
    home.scenarios = Array.from({ length: 18 }, (_, i) => ({
      id: 'scenario-' + i,
      name: 'Scenario ' + i,
      initialCost: 0,
      devices: copy(home.devices),
      tariff: copy(home.tariff),
    }));
    const manifest: WattPack = { format: 'watt-wallet', version: 1, kind: 'home', home };
    expect(new TextEncoder().encode(JSON.stringify(manifest)).length).toBeGreaterThan(2 * 1024 * 1024);
    const decoded = decodePack(encodePack(manifest, {}));
    expect(decoded.manifest).toEqual(manifest);
    if (decoded.manifest.kind === 'home') expect(calculate(decoded.manifest.home)).toEqual(calculate(home));
  });
  it('refuse une version inconnue', () =>
    expect(() =>
      decodePack(zipSync({ 'manifest.json': strToU8(JSON.stringify({ ...library(), version: 2 })) })),
    ).toThrow());
  it('refuse une ressource manquante', () => {
    const p = library();
    if (p.kind !== 'library') return;
    p.definitions[0].visual = { kind: 'glb', assetId: 'missing', fallback: 'bulb' };
    expect(() => decodePack(zipSync({ 'manifest.json': strToU8(JSON.stringify(p)) }))).toThrow();
  });
  it('refuse les ressources non référencées', () =>
    expect(() =>
      decodePack(
        zipSync({ 'manifest.json': strToU8(JSON.stringify(library())), 'assets/unused.glb': triangleGlb() }),
      ),
    ).toThrow());
  it('refuse les chemins sortants et les archives imbriquées', () => {
    for (const name of ['../manifest.json', '/manifest.json', 'assets/other.zip'])
      expect(() =>
        decodePack(zipSync({ 'manifest.json': strToU8(JSON.stringify(library())), [name]: strToU8('x') })),
      ).toThrow();
  });
  it('refuse les identifiants dupliqués', () => {
    const p = library();
    if (p.kind !== 'library') return;
    p.definitions[1].id = p.definitions[0].id;
    expect(() => encodePack(p, {})).toThrow('double');
  });
  it('refuse les archives tronquées et corrompues', () => {
    const b = encodePack(library(), {});
    expect(() => decodePack(b.slice(0, -5))).toThrow();
    const corrupt = new Uint8Array(b);
    corrupt[60] ^= 255;
    expect(() => decodePack(corrupt)).toThrow();
  });
  it('refuse plus de 200 entrées et plus de 100 Mio décompressés avant inflation', () => {
    const files: Record<string, Uint8Array> = { 'manifest.json': strToU8(JSON.stringify(library())) };
    for (let i = 0; i < 200; i++) files[`assets/a${i}.glb`] = new Uint8Array(0);
    expect(() => decodePack(zipSync(files))).toThrow();
    const oversized = zipSync({ 'manifest.json': strToU8(JSON.stringify(library())) });
    const view = new DataView(oversized.buffer);
    const central = view.getUint32(oversized.length - 22 + 16, true);
    view.setUint32(central + 24, MAX_PACK_BYTES + 1, true);
    expect(() => decodePack(oversized)).toThrow('volumineuse');
  });
  it('refuse les valeurs négatives, même dans un scénario', () => {
    const h = seedWorkspace().homes[0];
    h.scenarios = [
      { id: 's', name: 'S', initialCost: 0, tariff: { ...h.tariff, basePrice: -1 }, devices: [] },
    ];
    expect(() =>
      decodePack(
        zipSync({
          'manifest.json': strToU8(
            JSON.stringify({ format: 'watt-wallet', version: 1, kind: 'home', home: h }),
          ),
        }),
      ),
    ).toThrow();
  });
});
describe('GLB', () => {
  it('accepte le modèle autonome standard', () => expect(() => validateGlb(triangleGlb())).not.toThrow());
  it('refuse les buffers externes et textures externes', () => {
    expect(() =>
      validateGlb(
        buildGlb({
          asset: { version: '2.0' },
          scenes: [{}],
          buffers: [{ uri: 'https://example.test/evil.bin', byteLength: 3 }],
        }),
      ),
    ).toThrow();
    expect(() =>
      validateGlb(
        buildGlb({ asset: { version: '2.0' }, scenes: [{}], images: [{ uri: 'file:///private.png' }] }),
      ),
    ).toThrow();
  });
  it('refuse les extensions obligatoires inconnues et Draco', () => {
    expect(() =>
      validateGlb(buildGlb({ asset: { version: '2.0' }, scenes: [{}], extensionsRequired: ['UNKNOWN'] })),
    ).toThrow();
    expect(() =>
      validateGlb(
        buildGlb({ asset: { version: '2.0' }, scenes: [{}], extensionsUsed: ['KHR_draco_mesh_compression'] }),
      ),
    ).toThrow();
  });
  it('refuse les tailles incorrectes et les ressources volumineuses', () => {
    expect(() => validateGlb(new Uint8Array(21 * 1024 * 1024))).toThrow();
    const b = triangleGlb();
    new DataView(b.buffer).setUint32(8, 1, true);
    expect(() => validateGlb(b)).toThrow();
  });
});
