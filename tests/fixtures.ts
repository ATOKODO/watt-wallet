export function triangleGlb() {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 1]);
  const json = {
    asset: { version: '2.0', generator: 'Watt Wallet test fixture' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0, mode: 4 }] }],
    materials: [
      {
        pbrMetallicRoughness: { baseColorFactor: [0.4, 0.6, 0.4, 1], metallicFactor: 0, roughnessFactor: 1 },
        doubleSided: true,
      },
    ],
    buffers: [{ byteLength: positions.byteLength }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 1] },
    ],
  };
  return buildGlb(json, new Uint8Array(positions.buffer));
}
export function buildGlb(json: any, binary = new Uint8Array(0)): Uint8Array {
  let text = JSON.stringify(json);
  while (text.length % 4) text += ' ';
  const jsonBytes = new TextEncoder().encode(text),
    result = new Uint8Array(20 + jsonBytes.length + (binary.length ? 8 + binary.length : 0));
  const v = new DataView(result.buffer);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, result.length, true);
  v.setUint32(12, jsonBytes.length, true);
  v.setUint32(16, 0x4e4f534a, true);
  result.set(jsonBytes, 20);
  if (binary.length) {
    const offset = 20 + jsonBytes.length;
    v.setUint32(offset, binary.length, true);
    v.setUint32(offset + 4, 0x004e4942, true);
    result.set(binary, offset + 8);
  }
  return result;
}
