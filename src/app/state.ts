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
import { WorkspaceConflictError, createRepository, validateWorkspace } from './data/repository';

@Injectable({ providedIn: 'root' })
export class WalletStore {
  readonly repository = createRepository();
  readonly workspace = signal<Workspace | null>(null);
  readonly loadError = signal('');
  readonly saveStatus = signal('Chargement…');
  readonly error = signal('');
  readonly saveConflict = signal(false);
  readonly saveFailed = computed(() => this.saveStatus() === 'Échec de la sauvegarde');
  private initializing = false;
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
  private queue: Promise<boolean> = Promise.resolve(true);
  private revision = 0;
  private saveError = '';

  async initialize() {
    this.initializing = true;
    await this.queue;
    this.loadError.set('');
    this.saveConflict.set(false);
    this.error.set('');
    try {
      const existing = await this.repository.load();
      this.workspace.set(existing ?? seedWorkspace());
      this.saveStatus.set('Enregistré sur cet appareil');
      if (!existing && !(await this.persist(this.workspace()!)) && this.saveConflict()) {
        const latest = await this.repository.load();
        if (latest) {
          this.workspace.set(latest);
          this.saveConflict.set(false);
          this.error.set('');
          this.saveStatus.set('Enregistré sur cet appareil');
        }
      }
      this.scenarioId.set(null);
      this.selectedId.set(null);
    } catch (e) {
      this.loadError.set(this.message(e));
    } finally {
      this.initializing = false;
    }
  }
  message(e: unknown) {
    return e instanceof Error ? e.message : 'Une erreur est survenue.';
  }
  report(e: unknown) {
    this.error.set(this.message(e));
  }
  private persist(w: Workspace): Promise<boolean> {
    const rev = ++this.revision;
    this.saveStatus.set('Enregistrement…');
    this.queue = this.queue.then(async () => {
      try {
        if (this.saveConflict()) throw new WorkspaceConflictError();
        await this.repository.save(w);
        if (rev === this.revision) {
          this.saveStatus.set('Enregistré sur cet appareil');
          if (this.error() === this.saveError) this.error.set('');
          this.saveError = '';
        }
        return true;
      } catch (error) {
        if (error instanceof WorkspaceConflictError) this.saveConflict.set(true);
        if (rev === this.revision) this.saveStatus.set('Échec de la sauvegarde');
        this.saveError = this.message(error);
        this.report(error);
        return false;
      }
    });
    return this.queue;
  }
  retrySave() {
    if (this.workspace() && !this.saveConflict()) void this.persist(copy(this.workspace()!));
  }
  replace(w: Workspace): Promise<boolean> {
    if (this.initializing || this.saveConflict()) {
      if (this.saveConflict()) this.report(new WorkspaceConflictError());
      return Promise.resolve(false);
    }
    const next = validateWorkspace(w);
    this.error.set('');
    this.workspace.set(next);
    return this.persist(copy(next));
  }
  mutate(fn: (w: Workspace) => void): Promise<boolean> {
    if (!this.workspace()) return Promise.resolve(false);
    try {
      const next = copy(this.workspace()!);
      fn(next);
      return this.replace(next);
    } catch (error) {
      this.report(error);
      return Promise.resolve(false);
    }
  }
  private current(w: Workspace): Home | Scenario {
    const home = w.homes.find((h) => h.id === w.activeHomeId)!;
    return home.scenarios.find((s) => s.id === this.scenarioId()) ?? home;
  }
  switchHome(id: string) {
    const saved = this.mutate((w) => {
      w.activeHomeId = id;
    });
    if (this.home()?.id === id) {
      this.scenarioId.set(null);
      this.selectedId.set(null);
    }
    return saved;
  }
  switchScenario(id: string | null) {
    this.scenarioId.set(id);
    this.selectedId.set(null);
  }
  addHome(name: string, id: string = uid()) {
    const saved = this.mutate((w) => {
      const existing = w.homes.find((home) => home.id === id);
      if (existing) existing.name = name;
      else w.homes.push({ id, name, tariff: copy(defaultTariff), devices: [], scenarios: [] });
      w.activeHomeId = id;
    });
    if (this.workspace()?.activeHomeId === id) {
      this.scenarioId.set(null);
      this.selectedId.set(null);
    }
    return saved;
  }
  addDevice(definition: DeviceDefinition, position?: { x: number; z: number }, instanceId?: string) {
    const device = makeInstance(definition, this.devices().length);
    if (position) device.position = position;
    if (instanceId) device.id = instanceId;
    const saved = this.mutate((w) => this.current(w).devices.push(device));
    if (this.devices().some((d) => d.id === device.id)) this.selectedId.set(device.id);
    return saved;
  }
  updateDevice(value: DeviceInstance) {
    return this.mutate((w) => {
      const current = this.current(w);
      current.devices = current.devices.map((d) => (d.id === value.id ? value : d));
    });
  }
  moveDevice(id: string, position: { x: number; z: number }) {
    return this.mutate((w) => {
      const d = this.current(w).devices.find((d) => d.id === id);
      if (d) d.position = position;
    });
  }
  moveDevices(positions: { id: string; position: { x: number; z: number } }[]) {
    return this.mutate((w) => {
      const byId = new Map(positions.map(({ id, position }) => [id, position]));
      for (const device of this.current(w).devices) {
        const position = byId.get(device.id);
        if (position) device.position = position;
      }
    });
  }
  duplicateDevice(id: string) {
    const d = this.devices().find((d) => d.id === id);
    if (!d) return Promise.resolve(false);
    const next = copy(d);
    next.id = uid();
    next.position.x = Math.min(POSITION_LIMIT, next.position.x + 1);
    next.position.z = Math.min(POSITION_LIMIT, next.position.z + 1);
    const saved = this.mutate((w) => this.current(w).devices.push(next));
    if (this.devices().some((d) => d.id === next.id)) this.selectedId.set(next.id);
    return saved;
  }
  removeDevice(id: string) {
    const saved = this.mutate((w) => {
      const c = this.current(w);
      c.devices = c.devices.filter((d) => d.id !== id);
    });
    if (!this.devices().some((d) => d.id === id)) this.selectedId.set(null);
    return saved;
  }
  saveDefinition(d: DeviceDefinition) {
    return this.mutate((w) => {
      const index = w.library.findIndex((item) => item.id === d.id);
      if (index < 0) w.library.push(d);
      else w.library[index] = d;
    });
  }
  removeDefinition(id: string) {
    return this.mutate((w) => {
      w.library = w.library.filter((d) => d.id !== id);
    });
  }
  updateTariff(tariff: Tariff) {
    return this.mutate((w) => {
      this.current(w).tariff = tariff;
    });
  }
  updateObservedAnnualKwh(value: number | null) {
    return this.mutate((w) => {
      const home = w.homes.find((h) => h.id === w.activeHomeId)!;
      if (value === null) delete home.observedAnnualKwh;
      else home.observedAnnualKwh = value;
    });
  }
  addScenario(name: string, id: string = uid()) {
    const current = this.snapshot()!;
    const saved = this.mutate((w) => {
      const h = w.homes.find((h) => h.id === w.activeHomeId)!;
      const existing = h.scenarios.find((scenario) => scenario.id === id);
      if (existing) existing.name = name;
      else
        h.scenarios.push({
          id,
          name,
          initialCost: 0,
          devices: copy(current.devices),
          tariff: copy(current.tariff),
        });
    });
    if (this.home()?.scenarios.some((s) => s.id === id)) {
      this.scenarioId.set(id);
      this.selectedId.set(null);
    }
    return saved;
  }
  updateScenarioCost(initialCost: number) {
    return this.mutate((w) => {
      const c = this.current(w);
      if ('initialCost' in c) c.initialCost = initialCost;
    });
  }
  removeScenario() {
    const id = this.scenarioId();
    const saved = this.mutate((w) => {
      const h = w.homes.find((h) => h.id === w.activeHomeId)!;
      h.scenarios = h.scenarios.filter((s) => s.id !== id);
    });
    if (!this.home()?.scenarios.some((s) => s.id === id)) {
      this.scenarioId.set(null);
      this.selectedId.set(null);
    }
    return saved;
  }
}
