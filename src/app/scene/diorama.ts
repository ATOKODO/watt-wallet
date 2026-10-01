import { LanguageService, TranslatePipe } from '../ui/language';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DeviceInstance, DeviceResult, POSITION_LIMIT, uid } from '../domain/models';
import { WalletStore } from '../state';
import { ModelFactory, disposeObject, loadGlb } from './models';
import {
  GridBounds,
  GridFootprint,
  GridPosition,
  adaptiveBounds,
  arrangeGrid,
  gridCells,
  minimumBounds,
  nearestFreeGridCell,
} from './grid';
import { IconComponent } from '../ui/icon';
import { Theme } from '../ui/theme';
import { defaultAccent, themeColor } from '../ui/palette';

interface Label {
  id: string;
  name: string;
  percent: string;
  quantity: number;
  x: number;
  y: number;
  selected: boolean;
}
@Component({
  selector: 'ww-diorama',
  standalone: true,
  imports: [IconComponent, TranslatePipe],
  template: `
    <div
      #host
      class="scene-canvas"
      [attr.data-plateau-width]="plateauSize().halfWidth * 2"
      [attr.data-plateau-depth]="plateauSize().halfDepth * 2"
      (dragover)="allowDrop($event)"
      (drop)="drop($event)"
      [attr.aria-label]="'Diorama 3D orbitable du logement' | t"
    >
      @if (failed()) {
        <div class="webgl-fallback">
          <ww-icon name="box" /><strong>{{ 'La vue 3D n’est pas disponible' | t }}</strong>
          <p>{{ 'Votre logement reste accessible dans la liste des appareils ci-dessous.' | t }}</p>
        </div>
      }
      @for (label of labels(); track label.id) {
        <button
          class="object-label"
          [class.selected]="label.selected"
          [title]="label.name + ' · ' + label.percent + ' %'"
          [style.left.px]="label.x"
          [style.top.px]="label.y"
          (pointerdown)="$event.stopPropagation()"
          (click)="selected.emit(label.id)"
        >
          <span
            >{{ label.name }}
            @if (label.quantity > 1) {
              <b>{{ '×{0}' | t: [label.quantity | t] }}</b>
            }</span
          ><strong>{{ '{0} %' | t: [label.percent | t] }}</strong>
        </button>
      }
    </div>
    @if (warning()) {
      <div class="scene-warning" role="status">{{ warning() | t }}</div>
    }
    @if (gridMessage()) {
      <div class="scene-grid-message" role="status">{{ gridMessage() | t }}</div>
    }
    <div class="scene-grid-actions">
      <button type="button" (click)="organize()" [disabled]="failed() || !devices().length">
        <ww-icon name="grid" /> {{ 'Ranger en grille' | t }}
      </button>
      <button
        type="button"
        [attr.aria-pressed]="snap()"
        [class.active]="snap()"
        [disabled]="failed()"
        (click)="snap.set(!snap())"
      >
        <ww-icon name="move" /> {{ 'Accrochage {0}' | t: [(snap() ? 'activé' : 'désactivé') | t] }}
      </button>
    </div>
    <div class="scene-navigation">
      <button [title]="'Zoom avant' | t" [attr.aria-label]="'Zoom avant' | t" (click)="zoom(1.2)">
        <ww-icon name="plus" /></button
      ><button [title]="'Zoom arrière' | t" [attr.aria-label]="'Zoom arrière' | t" (click)="zoom(0.8)">
        <ww-icon name="minus" /></button
      ><span></span
      ><button
        [title]="'Recentrer le plateau' | t"
        [attr.aria-label]="'Recentrer le plateau' | t"
        (click)="reset()"
      >
        <ww-icon name="reset" />
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 420px;
      }
      .scene-canvas {
        width: 100%;
        height: 100%;
        position: absolute;
        inset: 0;
        overflow: hidden;
        touch-action: none;
      }
      .scene-canvas canvas {
        display: block;
        cursor: grab;
      }
      .scene-canvas canvas.orbiting {
        cursor: grabbing;
      }
      .scene-grid-actions {
        position: absolute;
        top: 10px;
        right: 12px;
        display: flex;
        gap: 5px;
        z-index: 3;
      }
      .scene-grid-actions button {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 6px 8px;
        border: 1px solid oklch(from #dce3d1 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        border-radius: 7px;
        background: oklch(from #fffdf7ee l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        color: oklch(from #667b5e l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        font-size: 10px;
        cursor: pointer;
      }
      .scene-grid-actions button.active {
        background: oklch(from #e9f1db l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        border-color: oklch(from #aac394 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        color: oklch(from #315c41 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
      }
      .scene-grid-actions button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .scene-grid-actions ww-icon {
        width: 13px;
        height: 13px;
      }
      .scene-grid-message {
        position: absolute;
        left: 12px;
        bottom: 64px;
        right: 100px;
        z-index: 3;
        width: fit-content;
        max-width: calc(100% - 125px);
        border: 1px solid #e4c3ad;
        background: oklch(from #fff8e9 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        border-radius: 8px;
        padding: 8px 10px;
        color: #8d624f;
        font-size: 11px;
      }
      @media (max-width: 580px) {
        .scene-grid-actions {
          top: 8px;
          right: 8px;
          left: 8px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .scene-grid-actions button {
          font-size: 9px;
          padding: 5px 6px;
        }
      }
      .scene-navigation {
        position: absolute;
        right: 20px;
        bottom: 22px;
        background: oklch(from #fffdf7 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        border: 1px solid oklch(from #e1e4d9 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        box-shadow: 0 3px 9px oklch(from #344c3510 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        border-radius: 12px;
        display: flex;
        padding: 4px;
      }
      .scene-navigation button {
        width: 33px;
        height: 33px;
        border: 0;
        background: none;
        border-radius: 7px;
        display: grid;
        place-items: center;
        color: oklch(from #4a5d50 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        cursor: pointer;
      }
      .scene-navigation button:hover {
        background: oklch(from #e8eddf l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
      }
      .scene-navigation span {
        border-left: 1px solid oklch(from #e1e4d9 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        margin: 5px;
      }
      .object-label {
        position: absolute;
        transform: translate(-50%, -100%);
        display: flex;
        gap: 8px;
        align-items: center;
        border: 1px solid oklch(from #d7dfd1 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        background: #fffffff0;
        color: oklch(from #405046 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        padding: 6px 9px;
        border-radius: 9px;
        font: 10px inherit;
        white-space: nowrap;
        max-width: 210px;
        cursor: pointer;
        box-shadow: 0 4px 14px oklch(from #283e3610 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
      }
      .object-label span {
        font-size: 10px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .object-label strong {
        font-size: 11px;
        color: oklch(from #315c41 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
      }
      .object-label b {
        font-weight: 500;
        color: oklch(from #8a9387 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
      }
      .object-label.selected {
        border-color: oklch(from #4e7b4f l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        background: oklch(from #edf3db l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        z-index: 2;
      }
      .webgl-fallback {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        text-align: center;
        gap: 16px;
        color: oklch(from #74806e l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
      }
      .webgl-fallback ww-icon {
        width: 48px;
        height: 48px;
      }
      .scene-warning {
        position: absolute;
        bottom: 70px;
        left: 20px;
        right: 20px;
        font-size: 12px;
        background: oklch(from #fff8e9 l calc(c * var(--accent-chroma, 1)) var(--accent-hue, h));
        padding: 10px;
        border-radius: 8px;
      }
    `,
  ],
})
export class DioramaComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(LanguageService);
  @ViewChild('host') host!: ElementRef<HTMLDivElement>;
  devices = input.required<DeviceInstance[]>();
  results = input.required<DeviceResult[]>();
  mode = input<'consumption' | 'placement'>('consumption');
  theme = input<Theme>('light');
  accent = input(defaultAccent);
  selectedId = input<string | null>(null);
  selected = output<string>();
  moved = output<{ id: string; position: { x: number; z: number } }>();
  arranged = output<{ id: string; position: { x: number; z: number } }[]>();
  added = output<{ definitionId: string; instanceId: string; position: { x: number; z: number } }>();
  failed = signal(false);
  labels = signal<Label[]>([]);
  warning = signal('');
  gridMessage = signal('');
  snap = signal(true);
  plateauSize = signal<GridBounds>({ ...minimumBounds });
  private boardBounds = { ...minimumBounds };
  private boardScale = 1;
  private sun?: THREE.DirectionalLight;
  private store = inject(WalletStore);
  private renderer?: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera();
  private controls?: OrbitControls;
  private factory = new ModelFactory();
  private objects = new Map<string, THREE.Group>();
  private custom = new Map<string, THREE.Group>();
  private activeCustom = new Set<string>();
  private slots: GridPosition[] = [];
  private pendingDrop?: { id: string; point: GridPosition };
  private guides?: THREE.InstancedMesh;
  private resizeObserver?: ResizeObserver;
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private drag?: { id: string; startX: number; startY: number; offset: THREE.Vector3; changed: boolean };
  private generation = 0;
  private frame = 0;
  private disposed = false;
  private selectionRing?: THREE.Mesh;
  private stage?: THREE.Group;
  constructor() {
    effect(() => {
      this.i18n.language();
      this.requestRender();
    });
    effect(() => {
      this.devices();
      this.results();
      this.mode();
      if (this.renderer) void this.rebuild();
    });
    effect(() => {
      this.selectedId();
      if (this.renderer) this.requestRender();
    });
    effect(() => {
      const enabled = this.snap();
      if (this.guides) this.guides.visible = enabled;
      if (this.renderer) this.requestRender();
    });
    effect(() => {
      const theme = this.theme();
      const accent = this.accent();
      if (this.renderer && this.stage) this.applySceneTheme(theme, accent);
    });
  }
  ngAfterViewInit() {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.renderer.setClearColor('#f1f3e9', 0);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.45;
      this.host.nativeElement.prepend(this.renderer.domElement);
      this.camera.near = 0.1;
      this.camera.far = 150;
      this.reset();
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableRotate = true;
      this.controls.enablePan = true;
      this.controls.enableDamping = false;
      this.controls.rotateSpeed = 0.65;
      this.controls.panSpeed = 0.8;
      this.controls.minZoom = 0.65;
      this.controls.maxZoom = 3;
      this.controls.minPolarAngle = 0.22;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
      this.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      this.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
      this.controls.touches.ONE = THREE.TOUCH.ROTATE;
      this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      this.controls.addEventListener('change', this.requestRender);
      this.controls.addEventListener('start', this.orbitStart);
      this.controls.addEventListener('end', this.orbitEnd);
      this.scene.add(new THREE.HemisphereLight('#fff8e8', '#b6c6b6', 2.6));
      const sun = new THREE.DirectionalLight('#fff3d6', 3.2);
      this.sun = sun;
      sun.position.set(-8, 18, 10);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
      sun.shadow.normalBias = 0.05;
      sun.shadow.bias = -0.0002;
      this.scene.add(sun);
      const fill = new THREE.DirectionalLight('#dceadc', 1.4);
      fill.position.set(8, 7, -7);
      this.scene.add(fill);
      this.stage = new THREE.Group();
      this.factory.box(this.stage, 16.8, 0.4, 13.2, 0, -0.29, 0, '#d7dcca', 0.2);
      this.factory.box(this.stage, 16.7, 0.1, 13.1, 0, -0.045, 0, '#f0eddf', 0.04);
      for (let x = -7; x <= 7; x++)
        for (let z = -5; z <= 5; z++) this.factory.cylinder(this.stage, 0.024, 0.012, x, 0.015, z, '#cfd3c3');
      this.scene.add(this.stage);
      this.selectionRing = new THREE.Mesh(
        new THREE.RingGeometry(0.75, 0.8, 48),
        new THREE.MeshBasicMaterial({
          color: '#4e7952',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        }),
      );
      this.selectionRing.rotation.x = -Math.PI / 2;
      this.selectionRing.position.y = 0.03;
      this.scene.add(this.selectionRing);
      this.applySceneTheme(this.theme(), this.accent());
      const canvas = this.renderer.domElement;
      canvas.addEventListener('pointerdown', this.pointerDown, true);
      canvas.addEventListener('pointermove', this.pointerMove);
      canvas.addEventListener('pointerup', this.pointerUp);
      canvas.addEventListener('pointercancel', this.pointerCancel);
      canvas.addEventListener('webglcontextlost', this.contextLost);
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.host.nativeElement);
      this.resize();
      void this.rebuild();
    } catch {
      this.failed.set(true);
      this.renderer?.dispose();
    }
  }
  private applySceneTheme(theme: Theme, accent: string) {
    const dark = theme === 'dark';
    this.factory.material('#d7dcca').color.set(themeColor(dark ? '#172820' : '#d7dcca', accent));
    this.factory.material('#f0eddf').color.set(themeColor(dark ? '#344b3b' : '#f0eddf', accent));
    this.factory.material('#cfd3c3').color.set(themeColor(dark ? '#708773' : '#cfd3c3', accent));
    if (this.guides)
      (this.guides.material as THREE.MeshBasicMaterial).color.set(
        themeColor(dark ? '#a4c493' : '#7fa66e', accent),
      );
    if (this.selectionRing)
      (this.selectionRing.material as THREE.MeshBasicMaterial).color.set(
        themeColor(dark ? '#a6d394' : '#4e7952', accent),
      );
    this.requestRender();
  }
  private async rebuild() {
    const generation = ++this.generation;
    const next = new Map<string, THREE.Group>(),
      usedAssets = new Set<string>();
    this.warning.set('');
    for (const d of this.devices()) {
      let model: THREE.Group;
      const visual = d.definition.visual;
      if (visual.kind === 'glb') {
        usedAssets.add(visual.assetId);
        try {
          if (!this.custom.has(visual.assetId)) {
            const bytes = await this.store.repository.getAsset(visual.assetId);
            if (!bytes) throw new Error('Modèle introuvable');
            const loaded = await loadGlb(bytes);
            if (generation !== this.generation || this.disposed) {
              disposeObject(loaded);
              this.releaseTemporary(next);
              return;
            }
            this.custom.set(visual.assetId, loaded);
          }
          model = this.custom.get(visual.assetId)!.clone(true);
        } catch {
          this.warning.set(
            'Un modèle personnalisé ne peut pas être affiché. Sa silhouette de remplacement est utilisée.',
          );
          model = this.factory.create(visual.fallback);
        }
      } else model = this.factory.create(visual.id);
      const box = new THREE.Box3().setFromObject(model),
        size = box.getSize(new THREE.Vector3()),
        center = box.getCenter(new THREE.Vector3());
      model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
      const holder = new THREE.Group();
      holder.add(model);
      holder.userData['id'] = d.id;
      const result = this.results().find((r) => r.id === d.id),
        share = result?.share ?? 0;
      const scale =
        this.mode() === 'placement'
          ? 1.9 / Math.max(size.x, size.y, size.z)
          : share > 0
            ? Math.cbrt((share * 58) / Math.max(size.x * size.y * size.z, 0.001))
            : 0.55 / Math.max(size.x, size.y, size.z);
      holder.scale.setScalar(scale);
      holder.position.set(d.position.x, 0.025, d.position.z);
      // Zero-energy markers use separate materials, released on the next rebuild.
      if (result?.kwh === 0)
        holder.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            const originals = Array.isArray(o.material) ? o.material : [o.material];
            const muted = originals.map((m) => {
              const c = m.clone() as THREE.MeshStandardMaterial;
              c.color?.set('#b5bab1');
              c.transparent = true;
              c.opacity = 0.5;
              c.userData['temporary'] = true;
              return c;
            });
            o.material = Array.isArray(o.material) ? muted : muted[0];
          }
        });
      next.set(d.id, holder);
    }
    if (generation !== this.generation || this.disposed) {
      this.releaseTemporary(next);
      return;
    }
    this.releaseTemporary(this.objects);
    this.objects.forEach((o) => this.scene.remove(o));
    this.objects = next;
    next.forEach((o) => this.scene.add(o));
    for (const [id, template] of this.custom)
      if (!usedAssets.has(id)) {
        disposeObject(template);
        this.custom.delete(id);
      }
    this.activeCustom = usedAssets;
    this.updateStage(this.footprints());
    this.updateGrid();
    this.placePendingDrop();
    this.requestRender();
  }
  private footprints(): GridFootprint[] {
    return this.devices().flatMap((device) => {
      const object = this.objects.get(device.id);
      if (!object) return [];
      const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
      return [{ id: device.id, width: size.x, depth: size.z }];
    });
  }
  private updateStage(items: GridFootprint[]) {
    const bounds = adaptiveBounds(items, this.devices());
    if (bounds.halfWidth === this.boardBounds.halfWidth && bounds.halfDepth === this.boardBounds.halfDepth)
      return;
    const scale = Math.max(bounds.halfWidth / 8, bounds.halfDepth / 6);
    const target = this.controls?.target ?? new THREE.Vector3();
    this.camera.position.sub(target).multiplyScalar(scale / this.boardScale);
    this.controls?.target.set(0, 0, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.zoom = 1;
    this.camera.far = 150 * scale;
    this.boardBounds = bounds;
    this.boardScale = scale;
    this.stage?.scale.set(bounds.halfWidth / 8, 1, bounds.halfDepth / 6);
    if (this.sun) {
      this.sun.position.set(-8 * scale, 18 * scale, 10 * scale);
      Object.assign(this.sun.shadow.camera, {
        left: -16 * scale,
        right: 16 * scale,
        top: 16 * scale,
        bottom: -16 * scale,
        far: 60 * scale,
      });
      this.sun.shadow.camera.updateProjectionMatrix();
    }
    this.plateauSize.set(bounds);
    this.gridMessage.set('');
    this.controls?.update();
    this.resize();
  }
  private updateGrid() {
    this.slots = gridCells(this.footprints(), this.boardBounds);
    if (this.guides) {
      this.scene.remove(this.guides);
      this.guides.geometry.dispose();
      (this.guides.material as THREE.Material).dispose();
    }
    this.guides = undefined;
    if (!this.slots.length) return;
    const geometry = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 8);
    const material = new THREE.MeshBasicMaterial({
      color: themeColor(this.theme() === 'dark' ? '#a4c493' : '#7fa66e', this.accent()),
      transparent: true,
      opacity: 0.55,
    });
    const guides = new THREE.InstancedMesh(geometry, material, this.slots.length);
    const dummy = new THREE.Object3D();
    this.slots.forEach((cell, index) => {
      dummy.position.set(cell.x, 0.04, cell.z);
      dummy.updateMatrix();
      guides.setMatrixAt(index, dummy.matrix);
    });
    guides.instanceMatrix.needsUpdate = true;
    guides.visible = this.snap();
    guides.raycast = () => {};
    this.guides = guides;
    this.scene.add(guides);
  }
  organize() {
    const positions = arrangeGrid(this.footprints());
    if (!positions) {
      this.gridMessage.set('Les dimensions d’un modèle empêchent son rangement en grille.');
      return;
    }
    this.gridMessage.set('');
    if (positions.length) this.arranged.emit(positions);
  }
  private nearestAvailable(point: GridPosition, movingId?: string, cells = this.slots): GridPosition | null {
    const items = this.footprints();
    const moving = items.find((item) => item.id === movingId);
    if (!moving) return null;
    const occupied = items
      .filter((item) => item.id !== movingId)
      .map((item) => {
        const box = new THREE.Box3().setFromObject(this.objects.get(item.id)!);
        const center = box.getCenter(new THREE.Vector3());
        return { ...item, position: { x: center.x, z: center.z } };
      });
    return nearestFreeGridCell(
      point,
      cells.filter((cell) => Math.abs(cell.x) <= POSITION_LIMIT && Math.abs(cell.z) <= POSITION_LIMIT),
      occupied,
      moving,
    );
  }
  private placePendingDrop() {
    const pending = this.pendingDrop;
    if (!pending || !this.objects.has(pending.id)) return;
    this.pendingDrop = undefined;
    const items = this.footprints();
    const width = Math.max(...items.map((item) => item.width)) + 0.45;
    const depth = Math.max(...items.map((item) => item.depth)) + 0.45;
    let bounds = { ...this.boardBounds };
    let position = this.nearestAvailable(pending.point, pending.id);
    // Free placement can obstruct several cells; a new drop may need another row.
    for (let attempt = 0; !position && attempt < 16; attempt++) {
      bounds = { halfWidth: bounds.halfWidth + width, halfDepth: bounds.halfDepth + depth };
      position = this.nearestAvailable(pending.point, pending.id, gridCells(items, bounds));
    }
    if (position) this.moved.emit({ id: pending.id, position });
    else
      this.gridMessage.set(
        'Aucune cellule libre ne peut accueillir cet appareil. Déplacez les objets ou utilisez le placement libre.',
      );
  }
  private releaseTemporary(objects: Map<string, THREE.Group>) {
    objects.forEach((g) =>
      g.traverse((o) => {
        if (o instanceof THREE.Mesh)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            if (m.userData['temporary']) m.dispose();
          });
      }),
    );
  }
  private resize() {
    if (!this.renderer) return;
    const { clientWidth: width, clientHeight: height } = this.host.nativeElement;
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    const aspect = width / height;
    const inverseRotation = this.camera.quaternion.clone().invert();
    const projected = new THREE.Box3();
    const objectHeight = Math.max(
      4,
      ...[...this.objects.values()].map((object) => new THREE.Box3().setFromObject(object).max.y),
    );
    for (const x of [-this.boardBounds.halfWidth - 0.5, this.boardBounds.halfWidth + 0.5])
      for (const z of [-this.boardBounds.halfDepth - 0.5, this.boardBounds.halfDepth + 0.5])
        for (const y of [0, objectHeight])
          projected.expandByPoint(new THREE.Vector3(x, y, z).applyQuaternion(inverseRotation));
    const size = projected.getSize(new THREE.Vector3());
    const span = Math.max(17.5 * this.boardScale, size.y * 1.12, (size.x * 1.12) / aspect);
    this.camera.left = (-span * aspect) / 2;
    this.camera.right = (span * aspect) / 2;
    this.camera.top = span / 2;
    this.camera.bottom = -span / 2;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }
  private requestRender = () => {
    if (this.frame || this.disposed || this.failed()) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  };
  private orbitStart = () => this.renderer?.domElement.classList.add('orbiting');
  private orbitEnd = () => this.renderer?.domElement.classList.remove('orbiting');
  private render() {
    if (!this.renderer) return;
    const selected = this.objects.get(this.selectedId() ?? '');
    if (this.selectionRing) {
      this.selectionRing.visible = !!selected;
      if (selected) {
        const size = new THREE.Box3().setFromObject(selected).getSize(new THREE.Vector3());
        this.selectionRing.position.set(selected.position.x, 0.03, selected.position.z);
        this.selectionRing.scale.setScalar(Math.max(size.x, size.z) * 0.8);
      }
    }
    this.renderer.render(this.scene, this.camera);
    const w = this.host.nativeElement.clientWidth,
      h = this.host.nativeElement.clientHeight;
    const candidates: { label: Label; share: number }[] = [];
    for (const d of this.devices()) {
      const object = this.objects.get(d.id);
      if (!object) continue;
      const b = new THREE.Box3().setFromObject(object),
        p = new THREE.Vector3(object.position.x, b.max.y + 0.35, object.position.z).project(this.camera);
      if (Math.abs(p.x) > 1 || Math.abs(p.y) > 1) continue;
      const share = this.results().find((r) => r.id === d.id)?.share ?? 0;
      candidates.push({
        label: {
          id: d.id,
          name: this.i18n.deviceName(d.definition),
          percent: this.i18n.number(share * 100, 1),
          quantity: d.quantity,
          x: ((p.x + 1) * w) / 2,
          y: ((1 - p.y) * h) / 2,
          selected: d.id === this.selectedId(),
        },
        share,
      });
    }
    this.labels.set(this.spaceLabels(candidates, w, h));
  }
  private spaceLabels(candidates: { label: Label; share: number }[], width: number, height: number): Label[] {
    const placed: { x: number; y: number; width: number; height: number }[] = [];
    const result: Label[] = [];
    candidates.sort((a, b) => Number(b.label.selected) - Number(a.label.selected) || b.share - a.share);
    for (const { label } of candidates) {
      const labelWidth = Math.min(
        210,
        Math.max(95, label.name.length * 6.5 + label.percent.length * 7 + (label.quantity > 1 ? 22 : 0) + 34),
      );
      const labelHeight = 28;
      const offsets = [
        [0, 0],
        [0, -32],
        [0, -64],
        [0, 32],
        [-labelWidth * 0.65, -18],
        [labelWidth * 0.65, -18],
        [-labelWidth * 0.65, -50],
        [labelWidth * 0.65, -50],
        [-labelWidth * 0.65, 24],
        [labelWidth * 0.65, 24],
      ];
      for (const [dx, dy] of offsets) {
        const x = Math.max(labelWidth / 2 + 5, Math.min(width - labelWidth / 2 - 5, label.x + dx));
        const y = Math.max(labelHeight + 5, Math.min(height - 5, label.y + dy));
        const rect = { x: x - labelWidth / 2, y: y - labelHeight, width: labelWidth, height: labelHeight };
        if (
          placed.some(
            (other) =>
              rect.x < other.x + other.width + 4 &&
              rect.x + rect.width + 4 > other.x &&
              rect.y < other.y + other.height + 4 &&
              rect.y + rect.height + 4 > other.y,
          )
        )
          continue;
        placed.push(rect);
        result.push({ ...label, x, y });
        break;
      }
    }
    return result;
  }
  private cast(event: { clientX: number; clientY: number }) {
    const rect = this.host.nativeElement.getBoundingClientRect();
    this.ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
  }
  private ground(event: { clientX: number; clientY: number }) {
    this.cast(event);
    return this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
  }
  private pointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.cast(e);
    const hits = this.ray.intersectObjects([...this.objects.values()], true);
    if (!hits.length) return;
    let object: THREE.Object3D | null = hits[0].object;
    while (object && !object.userData['id']) object = object.parent;
    if (!object) return;
    const id = object.userData['id'] as string,
      point = this.ground(e);
    if (!point) return;
    this.selected.emit(id);
    this.drag = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      offset: point.sub(object.position),
      changed: false,
    };
    if (this.controls) this.controls.enabled = false;
    this.renderer?.domElement.setPointerCapture(e.pointerId);
    e.stopImmediatePropagation();
  };
  private pointerMove = (e: PointerEvent) => {
    if (!this.drag) return;
    if (Math.hypot(e.clientX - this.drag.startX, e.clientY - this.drag.startY) < 4 && !this.drag.changed)
      return;
    const point = this.ground(e),
      object = this.objects.get(this.drag.id);
    if (!point || !object) return;
    point.sub(this.drag.offset);
    const target = {
      x: Math.max(
        -Math.min(POSITION_LIMIT, this.boardBounds.halfWidth),
        Math.min(POSITION_LIMIT, this.boardBounds.halfWidth, point.x),
      ),
      z: Math.max(
        -Math.min(POSITION_LIMIT, this.boardBounds.halfDepth),
        Math.min(POSITION_LIMIT, this.boardBounds.halfDepth, point.z),
      ),
    };
    const snapped = this.snap() ? this.nearestAvailable(target, this.drag.id) : target;
    if (!snapped) {
      this.gridMessage.set('Toutes les cellules de la grille sont occupées.');
      return;
    }
    this.gridMessage.set('');
    object.position.x = snapped.x;
    object.position.z = snapped.z;
    this.drag.changed = true;
    this.requestRender();
  };
  private pointerUp = (e: PointerEvent) => {
    if (this.drag) {
      const o = this.objects.get(this.drag.id);
      if (o && this.drag.changed)
        this.moved.emit({
          id: this.drag.id,
          position: { x: Math.round(o.position.x * 100) / 100, z: Math.round(o.position.z * 100) / 100 },
        });
      this.drag = undefined;
    }
    if (this.controls) this.controls.enabled = true;
    if (this.renderer?.domElement.hasPointerCapture(e.pointerId))
      this.renderer.domElement.releasePointerCapture(e.pointerId);
  };
  private pointerCancel = (e: PointerEvent) => {
    this.drag = undefined;
    if (this.controls) this.controls.enabled = true;
    void this.rebuild();
  };
  private contextLost = (e: Event) => {
    e.preventDefault();
    this.failed.set(true);
    this.labels.set([]);
  };
  allowDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }
  drop(e: DragEvent) {
    e.preventDefault();
    const definitionId = e.dataTransfer?.getData('application/x-watt-device');
    if (!definitionId) return;
    const p = this.renderer ? this.ground(e) : null;
    const position = {
      x: Math.max(
        -Math.min(POSITION_LIMIT, this.boardBounds.halfWidth),
        Math.min(POSITION_LIMIT, this.boardBounds.halfWidth, p?.x ?? 0),
      ),
      z: Math.max(
        -Math.min(POSITION_LIMIT, this.boardBounds.halfDepth),
        Math.min(POSITION_LIMIT, this.boardBounds.halfDepth, p?.z ?? 0),
      ),
    };
    const instanceId = uid();
    if (this.snap()) this.pendingDrop = { id: instanceId, point: position };
    this.added.emit({ definitionId, instanceId, position });
  }
  zoom(factor: number) {
    this.camera.zoom = Math.max(0.65, Math.min(3, this.camera.zoom * factor));
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }
  reset() {
    this.camera.position.set(18 * this.boardScale, 21 * this.boardScale, 24 * this.boardScale);
    this.camera.zoom = 1;
    this.camera.lookAt(0, 0, 0);
    this.controls?.target.set(0, 0, 0);
    this.controls?.update();
    this.resize();
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }
  ngOnDestroy() {
    this.disposed = true;
    this.generation++;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.controls?.removeEventListener('change', this.requestRender);
    this.controls?.removeEventListener('start', this.orbitStart);
    this.controls?.removeEventListener('end', this.orbitEnd);
    this.controls?.dispose();
    const c = this.renderer?.domElement;
    c?.removeEventListener('pointerdown', this.pointerDown, true);
    c?.removeEventListener('pointermove', this.pointerMove);
    c?.removeEventListener('pointerup', this.pointerUp);
    c?.removeEventListener('pointercancel', this.pointerCancel);
    c?.removeEventListener('webglcontextlost', this.contextLost);
    this.releaseTemporary(this.objects);
    this.custom.forEach(disposeObject);
    if (this.guides) {
      this.guides.geometry.dispose();
      (this.guides.material as THREE.Material).dispose();
    }
    this.factory.dispose();
    if (this.selectionRing) disposeObject(this.selectionRing);
    this.scene.traverse((o) => {
      if (o instanceof THREE.DirectionalLight) o.shadow.dispose();
    });
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }
}
