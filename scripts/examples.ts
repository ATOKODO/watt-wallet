import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { seedWorkspace, seedLibrary } from '../src/app/domain/seed';
import { copy } from '../src/app/domain/models';
import { encodePack, packSchema, WattPack } from '../src/app/data/wattpack';
import { triangleGlb } from '../tests/fixtures';

await mkdir('examples', { recursive: true });
await mkdir('docs', { recursive: true });
const schema = z.toJSONSchema(packSchema, { target: 'draft-2020-12' });
await writeFile(
  'docs/wattpack.schema.json',
  JSON.stringify(
    { ...schema, title: 'Walletricity exchange manifest v1', $id: 'urn:watt-wallet:wattpack:1' },
    null,
    2,
  ) + '\n',
);
const library: WattPack = { format: 'watt-wallet', version: 1, kind: 'library', definitions: seedLibrary() };
await writeFile('examples/bibliotheque.wattpack', encodePack(library, {}));
await writeFile('examples/bibliotheque.manifest.json', JSON.stringify(library, null, 2) + '\n');
const h = seedWorkspace().homes[0];
h.id = 'example-home';
h.devices.forEach((d, i) => (d.id = `example-device-${i}`));
const scenario = {
  id: 'example-scenario',
  name: 'Chauffage réduit à 4 h équivalentes',
  initialCost: 0,
  devices: copy(h.devices),
  tariff: copy(h.tariff),
};
scenario.devices[0].usage.hoursPerDay = 4;
h.scenarios.push(scenario);
const home: WattPack = { format: 'watt-wallet', version: 1, kind: 'home', home: h };
await writeFile('examples/logement.wattpack', encodePack(home, {}));
await writeFile('examples/logement.manifest.json', JSON.stringify(home, null, 2) + '\n');
const glbDefinition = copy(seedLibrary()[5]);
glbDefinition.id = 'example-custom';
glbDefinition.name = 'Démonstration GLB';
glbDefinition.visual = { kind: 'glb', assetId: 'example-triangle', fallback: 'bulb' };
glbDefinition.notes =
  'Exemple technique de fichier autonome : triangle de démonstration, sans représentation d’un appareil réel.';
await writeFile(
  'examples/modele-personnalise.wattpack',
  encodePack(
    { format: 'watt-wallet', version: 1, kind: 'library', definitions: [glbDefinition] },
    { 'example-triangle': triangleGlb() },
  ),
);
await writeFile('examples/triangle.glb', triangleGlb());
console.log('Schéma et exemples générés dans docs/ et examples/.');
