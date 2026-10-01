import { describe, expect, it, vi } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { validateGlb, MAX_GLB_GEOMETRY_BYTES } from '../src/app/data/glb';
import { loadGlb, disposeObject } from '../src/app/scene/models';
import { buildGlb, oversizedGeometryGlb, triangleGlb } from './fixtures';

const limitMessage = 'La géométrie décodée du GLB dépasse la limite de 64 Mio.';
const glbWithAccessors = (accessors: unknown[]) =>
  buildGlb({ asset: { version: '2.0' }, scenes: [{}], accessors });
describe('budget de géométrie GLB avant chargement', () => {
  it.each([false, true])(
    'refuse les accessors cumulés, position sparse : %s, avant Three.js',
    async (sparse) => {
      const bytes = oversizedGeometryGlb(sparse);
      expect(bytes.byteLength).toBeLessThan(1024);
      const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync');
      try {
        await expect(loadGlb(bytes)).rejects.toThrow(limitMessage);
        expect(parse).not.toHaveBeenCalled();
      } finally {
        parse.mockRestore();
      }
    },
  );
  it('refuse de nombreux attributs sans augmenter le nombre de triangles', () => {
    const bytes = oversizedGeometryGlb(false, 100);
    expect(bytes.byteLength).toBeLessThan(10000);
    expect(() => validateGlb(bytes)).toThrow(limitMessage);
  });
  it('accepte exactement le budget et refuse son dépassement sans allouer de tableaux', () => {
    const accessor = { componentType: 5126, count: MAX_GLB_GEOMETRY_BYTES / 64, type: 'MAT4' };
    expect(() => validateGlb(glbWithAccessors([accessor]))).not.toThrow();
    expect(() => validateGlb(glbWithAccessors([{ ...accessor, count: accessor.count + 1 }]))).toThrow(
      limitMessage,
    );
  });
  it('compte aussi les vues binaires distinctes qui réutilisent le même buffer', () => {
    const binary = new Uint8Array(16 * 1024 * 1024);
    const bytes = buildGlb(
      {
        asset: { version: '2.0' },
        scenes: [{}],
        buffers: [{ byteLength: binary.length }],
        bufferViews: Array.from({ length: 5 }, () => ({ buffer: 0, byteLength: binary.length })),
      },
      binary,
    );
    expect(() => validateGlb(bytes)).toThrow(limitMessage);
  });
  it('accepte un buffer interleaved ordinaire sans compter chaque stride plusieurs fois', () => {
    const count = 600000;
    const binary = new Uint8Array(count * 32);
    const bytes = buildGlb(
      {
        asset: { version: '2.0' },
        scenes: [{}],
        buffers: [{ byteLength: binary.length }],
        bufferViews: [{ buffer: 0, byteLength: binary.length, byteStride: 32 }],
        accessors: [
          { bufferView: 0, byteOffset: 0, componentType: 5126, count, type: 'VEC3' },
          { bufferView: 0, byteOffset: 12, componentType: 5126, count, type: 'VEC3' },
          { bufferView: 0, byteOffset: 24, componentType: 5126, count, type: 'VEC2' },
        ],
      },
      binary,
    );
    expect(() => validateGlb(bytes)).not.toThrow();
  });
  it('réserve la copie supplémentaire des accessors sparse avec buffer de base', () => {
    const count = 1200000;
    const binary = new Uint8Array(count * 16);
    const json = {
      asset: { version: '2.0' },
      scenes: [{}],
      buffers: [{ byteLength: binary.length }],
      bufferViews: [
        { buffer: 0, byteLength: binary.length },
        { buffer: 0, byteLength: 1 },
        { buffer: 0, byteOffset: 4, byteLength: 16 },
      ],
      accessors: [
        { bufferView: 0, componentType: 5126, count, type: 'VEC4' },
        { componentType: 5126, count, type: 'VEC4' },
      ],
    };
    expect(() => validateGlb(buildGlb(json, binary))).not.toThrow();
    const sparse = { count: 1, indices: { bufferView: 1, componentType: 5121 }, values: { bufferView: 2 } };
    const withCopy = { ...json, accessors: [{ ...json.accessors[0], sparse }, json.accessors[1]] };
    expect(() => validateGlb(buildGlb(withCopy, binary))).toThrow(limitMessage);
  });
  it.each([
    { componentType: 9999, count: 3, type: 'VEC3' },
    { componentType: 5126, count: 3, type: 'UNKNOWN' },
    { componentType: 5126, count: -1, type: 'VEC3' },
    { componentType: 5126, count: 3, type: 'VEC3', bufferView: 99 },
  ])('refuse un accessor dont la taille ne peut pas être validée : %j', (accessor) => {
    expect(() => validateGlb(glbWithAccessors([accessor]))).toThrow(
      'Géométrie GLB trop complexe ou invalide.',
    );
  });
  it('accepte et charge une petite géométrie sparse et les attributs sans buffer', async () => {
    const original = oversizedGeometryGlb(true);
    const jsonLength = new DataView(original.buffer).getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(original.subarray(20, 20 + jsonLength)));
    json.accessors.forEach((accessor: { count: number }) => {
      accessor.count = 3;
    });
    const bytes = buildGlb(json, original.slice(20 + jsonLength + 8));
    const model = await loadGlb(bytes);
    expect(model.children).not.toHaveLength(0);
    disposeObject(model);
  });
  it('charge toujours le modèle autonome habituel', async () => {
    const model = await loadGlb(triangleGlb());
    expect(model.children).not.toHaveLength(0);
    disposeObject(model);
  });
});
