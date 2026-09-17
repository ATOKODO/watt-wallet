export const MAX_GLB_BYTES = 20 * 1024 * 1024;
export function validateGlb(bytes: Uint8Array): void {
  if (bytes.byteLength < 28 || bytes.byteLength > MAX_GLB_BYTES)
    throw new Error('Le GLB doit faire moins de 20 Mio et contenir une scène valide.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.byteLength
  )
    throw new Error('Fichier GLB 2 invalide ou tronqué.');
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || jsonLength % 4 || 20 + jsonLength > bytes.byteLength)
    throw new Error('Manifeste GLB invalide.');
  let gltf: any;
  try {
    gltf = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
  } catch {
    throw new Error('Manifeste GLB illisible.');
  }
  if (gltf.asset?.version !== '2.0' || !Array.isArray(gltf.scenes) || !gltf.scenes.length)
    throw new Error('Le GLB doit contenir une scène glTF 2.0.');
  const binOffset = 20 + jsonLength;
  let binLength = 0;
  if (binOffset < bytes.byteLength) {
    if (binOffset + 8 > bytes.byteLength || view.getUint32(binOffset + 4, true) !== 0x004e4942)
      throw new Error('Bloc binaire GLB invalide.');
    binLength = view.getUint32(binOffset, true);
    if (binLength % 4 || binOffset + 8 + binLength !== bytes.byteLength)
      throw new Error('Longueur du bloc GLB invalide.');
  }
  if (
    (gltf.buffers ?? []).length > 1 ||
    (gltf.buffers ?? []).some(
      (b: any) =>
        b.uri !== undefined ||
        !Number.isInteger(b.byteLength) ||
        b.byteLength < 0 ||
        b.byteLength > binLength,
    )
  )
    throw new Error('Les buffers GLB doivent être embarqués et valides.');
  for (const v of gltf.bufferViews ?? []) {
    if (
      v.buffer !== 0 ||
      !Number.isInteger(v.byteLength) ||
      v.byteLength < 0 ||
      !Number.isInteger(v.byteOffset ?? 0) ||
      (v.byteOffset ?? 0) < 0 ||
      (v.byteOffset ?? 0) + v.byteLength > (gltf.buffers?.[0]?.byteLength ?? 0)
    )
      throw new Error('Une vue binaire GLB dépasse le fichier.');
  }
  if ((gltf.images ?? []).length > 32) throw new Error('Le modèle contient trop de textures (32 maximum).');
  for (const img of gltf.images ?? []) {
    if (
      img.uri !== undefined ||
      !['image/png', 'image/jpeg'].includes(img.mimeType) ||
      !gltf.bufferViews?.[img.bufferView]
    )
      throw new Error('Utilisez des textures PNG/JPEG embarquées, sans URL externe.');
  }
  const blocked = [
    'KHR_draco_mesh_compression',
    'EXT_meshopt_compression',
    'KHR_meshopt_compression',
    'KHR_texture_basisu',
    'EXT_texture_webp',
  ];
  if ((gltf.extensionsUsed ?? []).some((e: string) => blocked.includes(e)))
    throw new Error('Exportez le GLB sans Draco, Meshopt, KTX2 ou WebP.');
  const supported = [
    'KHR_materials_unlit',
    'KHR_materials_clearcoat',
    'KHR_materials_ior',
    'KHR_materials_specular',
    'KHR_materials_transmission',
    'KHR_materials_volume',
    'KHR_materials_sheen',
    'KHR_materials_emissive_strength',
    'KHR_texture_transform',
    'KHR_mesh_quantization',
  ];
  if ((gltf.extensionsRequired ?? []).some((e: string) => !supported.includes(e)))
    throw new Error('Ce GLB nécessite une extension non prise en charge.');
  if ((gltf.accessors ?? []).some((a: any) => !Number.isInteger(a.count) || a.count < 0 || a.count > 2000000))
    throw new Error('Géométrie GLB trop complexe ou invalide.');
  // Images cannot request huge GPU allocations even when their compressed file is small.
  let totalPixels = 0;
  for (const img of gltf.images ?? []) {
    const v = gltf.bufferViews[img.bufferView];
    const b = bytes.subarray(
      binOffset + 8 + (v.byteOffset ?? 0),
      binOffset + 8 + (v.byteOffset ?? 0) + v.byteLength,
    );
    let width = 0,
      height = 0;
    if (img.mimeType === 'image/png') {
      if (b.length < 24 || new DataView(b.buffer, b.byteOffset, b.length).getUint32(0) !== 0x89504e47)
        throw new Error('Texture PNG invalide.');
      const d = new DataView(b.buffer, b.byteOffset, b.length);
      width = d.getUint32(16);
      height = d.getUint32(20);
    } else {
      if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) throw new Error('Texture JPEG invalide.');
      let pos = 2;
      while (pos + 4 <= b.length) {
        if (b[pos] !== 0xff) throw new Error('Texture JPEG invalide.');
        while (b[pos] === 0xff) pos++;
        const marker = b[pos++];
        if (marker === 0xda || marker === 0xd9) break;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
        if (pos + 2 > b.length) break;
        const length = (b[pos] << 8) | b[pos + 1];
        if (length < 2 || pos + length > b.length) throw new Error('Texture JPEG tronquée.');
        if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8) {
          height = (b[pos + 3] << 8) | b[pos + 4];
          width = (b[pos + 5] << 8) | b[pos + 6];
          break;
        }
        pos += length;
      }
    }
    totalPixels += width * height;
    if (!width || !height || width > 4096 || height > 4096 || totalPixels > 64 * 1024 * 1024)
      throw new Error('Textures invalides ou trop grandes : 4 096 pixels par côté, 64 mégapixels au total.');
  }
}
