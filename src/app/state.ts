import { Injectable, computed, signal } from '@angular/core';
import {
  POSITION_LIMIT,
  DeviceDefinition,
  DeviceInstance,
  Home,
  Scenario,
  Tariff,
  Workspace,
  copy,
  defaultTariff,
  uid,
} from './domain/models';
import { calculate, compare } from './domain/energy';
import { makeInstance, seedWorkspace } from './domain/seed';
import { createRepository, validateWorkspace } from './data/repository';

@Injectable({ providedIn: 'root' })
export class WalletStore {
  readonly repository = createRepository();
  readonly workspace = signal<Workspace | null>(null);
  readonly loadError = signal('');
  readonly saveStatus = signal('Chargement…');
  readonly error = signal('');
  readonly scenarioId = signal<string | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly home = computed(
    () => this.workspace()?.homes.find((h) => h.id === this.workspace()?.activeHomeId) ?? null,
  );
  readonly scenario = computed(() => this.home()?.scenarios.find((s) => s.id === this.scenarioId()) ?? null);
  readonly snapshot = computed(() => this.scenario() ?? this.home());
  readonly devices = computed(() => this.snapshot()?.devices ?? []);
  readonly selected = computed(() => this.devices().find((d) => d.id === this.selectedId()) ?? null);
  readonly result = computed(() =>
    calculate(this.snapshot() ?? { devices: [], tariff: { ...defaultTariff, subscription: 0 } }),
  );
  readonly comparison = computed(() =>
    this.scenario() && this.home()
      ? compare(calculate(this.home()!), this.result(), this.scenario()!.initialCost)
      : null,
  );
  private queue = Promise.resolve();
  private revision = 0;

  async initialize() {
    this.loadError.set('');
    try {
      const existing = await this.repository.load();
      this.workspace.set(existing ?? seedWorkspace());
      this.saveStatus.set('Enregistré sur cet appareil');
      if (!existing) await this.persist(this.workspace()!);
    } catch (e) {
      this.loadError.set(this.message(e));
    }
  }
  message(e: unknown) {
    return e instanceof Error ? e.message : 'Une erreur est survenue.';
  }
  report(e: unknown) {
    this.error.set(this.message(e));
  }
  private persist(w: Workspace) {
    const rev = ++this.revision;
    this.saveStatus.set('Enregistrement…');
    this.queue = this.queue
      .catch(() => {})
      .then(() => this.repository.save(w))
      .then(() => {
        if (rev === this.revision) this.saveStatus.set('Enregistré sur cet appareil');
      })
      .catch((e) => {
        this.saveStatus.set('Échec de la sauvegarde');
        this.report(e);
      });
    return this.queue;
  }
  retrySave() {
    if (this.workspace()) void this.persist(copy(this.workspace()!));
  }
  replace(w: Workspace) {
    validateWorkspace(w);
    this.workspace.set(w);
    void this.persist(copy(w));
  }
  mutate(fn: (w: Workspace) => void) {
    if (!this.workspace()) return;
    try {
      const next = copy(this.workspace()!);
      fn(next);
      this.replace(next);
    } catch (e) {
      this.report(e);
    }
  }
  private current(w: Workspace): Home | Scenario {
    const home = w.homes.find((h) => h.id === w.activeHomeId)!;
    return home.scenarios.find((s) => s.id === this.scenarioId()) ?? home;
  }
  switchHome(id: string) {
    this.scenarioId.set(null);
    this.selectedId.set(null);
    this.mutate((w) => {
      w.activeHomeId = id;
    });
  }
  switchScenario(id: string | null) {
    this.scenarioId.set(id);
    this.selectedId.set(null);
  }
  addHome(name: string) {
    const id = uid();
    this.mutate((w) => {
      w.homes.push({ id, name, tariff: copy(defaultTariff), devices: [], scenarios: [] });
      w.activeHomeId = id;
    });
    this.scenarioId.set(null);
    this.selectedId.set(null);
  }
  addDevice(definition: DeviceDefinition, position?: { x: number; z: number }) {
    const device = makeInstance(definition, this.devices().length);
    if (position) device.position = position;
    this.mutate((w) => this.current(w).devices.push(device));
    this.selectedId.set(device.id);
  }
  updateDevice(value: DeviceInstance) {
    this.mutate((w) => {
      const current = this.current(w);
      current.devices = current.devices.map((d) => (d.id === value.id ? value : d));
    });
  }
  moveDevice(id: string, position: { x: number; z: number }) {
    this.mutate((w) => {
      const d = this.current(w).devices.find((d) => d.id === id);
      if (d) d.position = position;
    });
  }
  moveDevices(positions: { id: string; position: { x: number; z: number } }[]) {
    this.mutate((w) => {
      const byId = new Map(positions.map(({ id, position }) => [id, position]));
      for (const device of this.current(w).devices) {
        const position = byId.get(device.id);
        if (position) device.position = position;
      }
    });
  }
  duplicateDevice(id: string) {
    const d = this.devices().find((d) => d.id === id);
    if (!d) return;
    const next = copy(d);
    next.id = uid();
    next.position.x = Math.min(POSITION_LIMIT, next.position.x + 1);
    next.position.z = Math.min(POSITION_LIMIT, next.position.z + 1);
    this.mutate((w) => this.current(w).devices.push(next));
    this.selectedId.set(next.id);
  }
  removeDevice(id: string) {
    this.mutate((w) => {
      const c = this.current(w);
      c.devices = c.devices.filter((d) => d.id !== id);
    });
    this.selectedId.set(null);
  }
  saveDefinition(d: DeviceDefinition) {
    this.mutate((w) => {
      const index = w.library.findIndex((item) => item.id === d.id);
      if (index < 0) w.library.push(d);
      else w.library[index] = d;
    });
  }
  removeDefinition(id: string) {
    this.mutate((w) => {
      w.library = w.library.filter((d) => d.id !== id);
    });
  }
  updateTariff(tariff: Tariff) {
    this.mutate((w) => {
      this.current(w).tariff = tariff;
    });
  }
  updateObservedAnnualKwh(value: number | null) {
    this.mutate((w) => {
      const home = w.homes.find((h) => h.id === w.activeHomeId)!;
      if (value === null) delete home.observedAnnualKwh;
      else home.observedAnnualKwh = value;
    });
  }
  addScenario(name: string) {
    const id = uid(),
      current = this.snapshot()!;
    this.mutate((w) => {
      const h = w.homes.find((h) => h.id === w.activeHomeId)!;
      h.scenarios.push({
        id,
        name,
        initialCost: 0,
        devices: copy(current.devices),
        tariff: copy(current.tariff),
      });
    });
    this.scenarioId.set(id);
    this.selectedId.set(null);
  }
  updateScenarioCost(initialCost: number) {
    this.mutate((w) => {
      const c = this.current(w);
      if ('initialCost' in c) c.initialCost = initialCost;
    });
  }
  removeScenario() {
    const id = this.scenarioId();
    this.mutate((w) => {
      const h = w.homes.find((h) => h.id === w.activeHomeId)!;
      h.scenarios = h.scenarios.filter((s) => s.id !== id);
    });
    this.scenarioId.set(null);
    this.selectedId.set(null);
  }
}
