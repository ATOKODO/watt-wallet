import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WalletStore } from '../src/app/state';
import { WorkspaceConflictError } from '../src/app/data/repository';
import { seedWorkspace } from '../src/app/domain/seed';
import { copy, Workspace } from '../src/app/domain/models';
const repository = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), getAsset: vi.fn(), putAsset: vi.fn() }));
vi.mock('../src/app/data/repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/app/data/repository')>()),
  createRepository: () => repository,
}));
beforeEach(() => {
  vi.resetAllMocks();
  repository.load.mockResolvedValue(seedWorkspace());
  repository.save.mockResolvedValue(undefined);
});
async function store() {
  const s = new WalletStore();
  await s.initialize();
  return s;
}
describe('mutations et sauvegardes', () => {
  it('refuse une fiche au-delà de la capacité sans modifier les données', async () => {
    const w = seedWorkspace();
    w.library = Array.from({ length: 2000 }, (_, i) => ({ ...copy(w.library[0]), id: 'd' + i }));
    repository.load.mockResolvedValue(w);
    const s = await store();
    const before = copy(s.workspace());
    expect(await s.saveDefinition({ ...copy(w.library[0]), id: 'new' })).toBe(false);
    expect(s.workspace()).toEqual(before);
    expect(repository.save).not.toHaveBeenCalled();
    expect(s.error()).toContain('2 000');
  });
  it('garde le scénario sélectionné lorsqu’une nouvelle copie est refusée', async () => {
    const w = seedWorkspace();
    const h = w.homes[0];
    h.scenarios = Array.from({ length: 50 }, (_, i) => ({
      id: 's' + i,
      name: 'S' + i,
      initialCost: 0,
      devices: copy(h.devices),
      tariff: copy(h.tariff),
    }));
    repository.load.mockResolvedValue(w);
    const s = await store();
    s.switchScenario('s0');
    expect(await s.addScenario('Trop de scénarios')).toBe(false);
    expect(s.scenarioId()).toBe('s0');
    expect(s.scenario()?.id).toBe('s0');
  });
  it('attend la sauvegarde et conserve la copie locale si le stockage échoue', async () => {
    const s = await store();
    repository.save.mockRejectedValueOnce(new Error('Disque plein'));
    expect(await s.addDevice(s.workspace()!.library[6])).toBe(false);
    expect(s.devices()).toHaveLength(7);
    expect(s.saveStatus()).toBe('Échec de la sauvegarde');
    expect(s.error()).toBe('Disque plein');
    s.retrySave();
    await vi.waitFor(() => expect(s.saveStatus()).toBe('Enregistré sur cet appareil'));
  });
  it('sérialise les sauvegardes de deux modifications rapides', async () => {
    const s = await store();
    let complete!: () => void;
    repository.save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    const first = s.addDevice(s.workspace()!.library[6]);
    const second = s.addDevice(s.workspace()!.library[10]);
    await vi.waitFor(() => expect(repository.save).toHaveBeenCalledTimes(1));
    complete();
    expect(await Promise.all([first, second])).toEqual([true, true]);
    const saved = repository.save.mock.calls.map(([w]) => (w as Workspace).homes[0].devices.length);
    expect(saved).toEqual([7, 8]);
  });
  it('bloque les écritures après conflit jusqu’au rechargement explicite', async () => {
    const s = await store();
    repository.save.mockRejectedValueOnce(new WorkspaceConflictError());
    expect(await s.addDevice(s.workspace()!.library[6])).toBe(false);
    const draft = copy(s.workspace());
    expect(s.saveConflict()).toBe(true);
    s.retrySave();
    expect(await s.addDevice(s.workspace()!.library[10])).toBe(false);
    expect(s.workspace()).toEqual(draft);
    expect(repository.save).toHaveBeenCalledTimes(1);
    await s.initialize();
    expect(s.saveConflict()).toBe(false);
    expect(s.devices()).toHaveLength(6);
    expect(await s.addDevice(s.workspace()!.library[10])).toBe(true);
  });
});
