import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BuiltinId } from '../domain/models';
import { validateGlb } from '../data/glb';

export class ModelFactory {
  private geometries = new Map<string, THREE.BufferGeometry>();
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private templates = new Map<BuiltinId, THREE.Group>();
  material(color: string) {
    if (!this.materials.has(color))
      this.materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.04 }));
    return this.materials.get(color)!;
  }
  box(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color: string,
    radius = 0.07,
  ) {
    const key = `b:${w}:${h}:${d}:${radius}`;
    if (!this.geometries.has(key))
      this.geometries.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)));
    const mesh = new THREE.Mesh(this.geometries.get(key), this.material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  cylinder(
    parent: THREE.Group,
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    color: string,
    front = false,
    topR = r,
  ) {
    const key = `c:${r}:${topR}:${h}`;
    if (!this.geometries.has(key)) this.geometries.set(key, new THREE.CylinderGeometry(topR, r, h, 32));
    const mesh = new THREE.Mesh(this.geometries.get(key), this.material(color));
    mesh.position.set(x, y, z);
    if (front) mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  create(id: BuiltinId): THREE.Group {
    if (this.templates.has(id)) return this.templates.get(id)!.clone(true);
    const g = new THREE.Group();
    const white = '#eeeae0',
      light = '#faf7ef',
      dark = '#344640',
      steel = '#94a5a0',
      green = '#9eb894';
    const box = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      color: string,
      r?: number,
    ) => this.box(g, w, h, d, x, y, z, color, r);
    const cyl = (
      r: number,
      h: number,
      x: number,
      y: number,
      z: number,
      color: string,
      front = false,
      top?: number,
    ) => this.cylinder(g, r, h, x, y, z, color, front, top);
    if (id === 'fridge' || id === 'freezer') {
      const h = id === 'fridge' ? 2.3 : 1.5;
      box(1.2, h, 1.1, 0, h / 2, 0, white, 0.13);
      box(1.12, h * 0.62, 0.12, 0, h * 0.66, 0.56, light);
      box(1.12, h * 0.31, 0.12, 0, h * 0.18, 0.56, '#dddccb');
      box(0.07, 0.38, 0.07, -0.4, h * 0.67, 0.67, steel);
      box(0.07, 0.23, 0.07, -0.4, h * 0.23, 0.67, steel);
    } else if (id === 'radiator') {
      box(2, 1.3, 0.4, 0, 0.8, 0, '#f0dcbe');
      for (let i = 0; i < 9; i++) box(0.1, 1.05, 0.15, -0.82 + i * 0.205, 0.8, 0.25, '#dcb990', 0.04);
      box(0.25, 0.2, 0.6, -0.65, 0.12, 0, dark);
      box(0.25, 0.2, 0.6, 0.65, 0.12, 0, dark);
      cyl(0.08, 0.1, 0.83, 1.52, 0, dark);
    } else if (id === 'washer' || id === 'dishwasher' || id === 'oven') {
      box(1.5, 1.65, 1.35, 0, 0.85, 0, white, 0.12);
      box(1.4, 0.3, 0.06, 0, 1.43, 0.69, '#d8dbd1');
      cyl(0.1, 0.05, 0.45, 1.43, 0.75, dark, true);
      box(0.42, 0.08, 0.04, -0.35, 1.45, 0.75, dark);
      if (id === 'washer') {
        cyl(0.52, 0.12, 0, 0.74, 0.73, steel, true);
        cyl(0.4, 0.15, 0, 0.74, 0.76, '#334e53', true);
        cyl(0.27, 0.01, 0.03, 0.69, 0.85, '#6d8f93', true);
      } else {
        box(1.24, 1.03, 0.08, 0, 0.68, 0.73, id === 'oven' ? dark : '#d9e0d2');
        box(0.75, 0.08, 0.12, 0, 1.12, 0.82, steel);
        if (id === 'oven') box(0.95, 0.64, 0.04, 0, 0.62, 0.79, '#52676a');
      }
    } else if (id === 'boiler') {
      cyl(0.64, 2.05, 0, 1.2, 0, white);
      cyl(0.64, 0.1, 0, 2.27, 0, light);
      cyl(0.09, 0.27, -0.25, 0.1, 0, '#799aa8');
      cyl(0.09, 0.27, 0.25, 0.1, 0, '#ce8c73');
      box(0.38, 0.43, 0.09, 0, 0.9, 0.62, '#a6bbb8');
      cyl(0.08, 0.06, 0, 0.93, 0.71, dark, true);
    } else if (id === 'ac') {
      box(2.4, 0.85, 0.65, 0, 0.55, 0, white, 0.18);
      box(2.12, 0.18, 0.05, 0, 0.35, 0.34, dark);
      for (let i = 0; i < 3; i++) box(2, 0.03, 0.12, 0, 0.29 + i * 0.065, 0.4, steel, 0.01);
      box(0.12, 0.04, 0.03, 0.85, 0.66, 0.35, '#87b795');
    } else if (id === 'tv' || id === 'pc') {
      box(2.3, 1.4, 0.15, id === 'pc' ? -0.3 : 0, 1.1, 0, dark);
      box(2.12, 1.22, 0.025, id === 'pc' ? -0.3 : 0, 1.13, 0.09, '#8aa7a6');
      box(1.6, 0.3, 0.02, id === 'pc' ? -0.45 : -0.1, 0.75, 0.11, '#a2bfba');
      box(0.14, 0.35, 0.14, 0, 0.24, 0, dark);
      box(0.85, 0.09, 0.5, 0, 0.07, 0, dark);
      if (id === 'pc') {
        box(0.65, 1.25, 0.9, 1.35, 0.65, 0.1, '#46554f');
        cyl(0.1, 0.02, 1.35, 1.03, 0.57, green, true);
        box(0.8, 0.06, 0.45, -0.2, 0.08, 0.8, white);
      }
    } else if (id === 'laptop') {
      box(1.8, 0.1, 1.2, 0, 0.08, 0, steel);
      const screen = box(1.8, 1.14, 0.1, 0, 0.63, -0.52, dark);
      screen.rotation.x = -0.12;
      box(1.63, 0.97, 0.04, 0, 0.65, -0.43, '#a6bfa9');
      box(1.45, 0.02, 0.44, 0, 0.14, -0.05, dark);
      box(0.45, 0.01, 0.24, 0, 0.145, 0.36, '#c5cec6');
    } else if (id === 'router') {
      box(1.5, 0.4, 1, 0, 0.24, 0, white);
      box(0.06, 1.1, 0.06, -0.55, 0.75, -0.36, dark);
      box(0.06, 1.1, 0.06, 0.55, 0.75, -0.36, dark);
      for (let i = 0; i < 4; i++) cyl(0.03, 0.015, -0.35 + i * 0.18, 0.25, 0.51, green, true);
    } else if (id === 'hob') {
      box(1.9, 0.16, 1.4, 0, 0.1, 0, dark);
      for (const x of [-0.48, 0.48])
        for (const z of [-0.32, 0.32]) {
          cyl(0.25, 0.02, x, 0.2, z, '#88918a');
          cyl(0.2, 0.02, x, 0.22, z, '#46554f');
        }
    } else {
      cyl(0.38, 0.14, 0, 0.08, 0, '#c5aa7d');
      cyl(0.19, 0.37, 0, 0.31, 0, steel);
      const sphereKey = 'sphere';
      if (!this.geometries.has(sphereKey))
        this.geometries.set(sphereKey, new THREE.SphereGeometry(0.5, 24, 20));
      const bulb = new THREE.Mesh(this.geometries.get(sphereKey), this.material('#f3dda0'));
      bulb.position.y = 0.86;
      bulb.castShadow = true;
      g.add(bulb);
    }
    this.templates.set(id, g);
    return g.clone(true);
  }
  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.templates.clear();
  }
}

export async function loadGlb(bytes: Uint8Array): Promise<THREE.Group> {
  validateGlb(bytes);
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (!url.startsWith('blob:')) throw new Error('Les ressources externes sont interdites.');
    return url;
  });
  const data = new Uint8Array(bytes).buffer;
  const gltf = await new GLTFLoader(manager).parseAsync(data, '');
  if (!gltf.scene.children.length) {
    disposeObject(gltf.scene);
    throw new Error('Le GLB ne contient aucun objet visible.');
  }
  let triangles = 0;
  gltf.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const p = o.geometry.getAttribute('position');
      triangles += (o.geometry.index?.count ?? p?.count ?? 0) / 3;
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  if (!triangles || triangles > 1000000) {
    disposeObject(gltf.scene);
    throw new Error('Le modèle doit contenir entre 1 et 1 000 000 triangles.');
  }
  const bounds = new THREE.Box3().setFromObject(gltf.scene),
    size = bounds.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((v) => Number.isFinite(v) && v > 0.00001 && v < 1000000)) {
    disposeObject(gltf.scene);
    throw new Error('Le modèle 3D a des dimensions invalides.');
  }
  return gltf.scene;
}
export async function validateRenderableGlb(bytes: Uint8Array) {
  const model = await loadGlb(bytes);
  disposeObject(model);
}
export function disposeObject(group: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        materials.add(m);
        Object.values(m).forEach((v) => {
          if (v instanceof THREE.Texture) textures.add(v);
        });
      });
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => {
    t.dispose();
    if (t.source.data instanceof ImageBitmap) t.source.data.close();
  });
}
