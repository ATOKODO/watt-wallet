import { isTauri, invoke } from '@tauri-apps/api/core';
import { Workspace, workspaceSchema } from '../domain/models';
import { validateSnapshot, validateUsage } from '../domain/energy';

export interface WorkspaceRepository {
  load(): Promise<Workspace | null>;
  save(workspace: Workspace): Promise<void>;
  getAsset(id: string): Promise<Uint8Array | null>;
  putAsset(id: string, bytes: Uint8Array): Promise<void>;
}
export const workspaceConflictCode = 'WORKSPACE_CONFLICT';
export class WorkspaceConflictError extends Error {
  constructor() {
    super(
      'Les données ont changé dans une autre fenêtre. Exportez vos modifications si nécessaire, puis rechargez les données avant de continuer.',
    );
    this.name = 'WorkspaceConflictError';
  }
}
export function validateWorkspace(value: unknown): Workspace {
  const parsed = workspaceSchema.safeParse(value);
  if (!parsed.success) {
    const capacity = parsed.error.issues.find(
      (issue) => issue.code === 'too_big' && issue.origin === 'array',
    );
    const messages: Record<string, string> = {
      library:
        'Votre bibliothèque est limitée à 2 000 fiches. Retirez une fiche avant d’en ajouter une autre.',
      homes: 'Vous pouvez conserver au maximum 100 logements.',
      scenarios: 'Ce logement est limité à 50 scénarios. Supprimez un scénario avant d’en créer un autre.',
      devices:
        'Cette configuration est limitée à 500 objets. Utilisez les quantités pour regrouper vos appareils.',
    };
    const message = capacity && messages[String(capacity.path.at(-1))];
    if (message) throw new Error(message);
    throw parsed.error;
  }
  const w = parsed.data;
  if (!w.homes.some((h) => h.id === w.activeHomeId)) throw new Error('Logement actif introuvable.');
  if (
    new Set(w.homes.map((h) => h.id)).size !== w.homes.length ||
    new Set(w.library.map((d) => d.id)).size !== w.library.length
  )
    throw new Error('Identifiants dupliqués.');
  for (const d of w.library) validateUsage(d, d.defaultUsage);
  for (const h of w.homes) {
    if (new Set(h.scenarios.map((s) => s.id)).size !== h.scenarios.length)
      throw new Error('Identifiants de scénarios dupliqués.');
    validateSnapshot(h);
    h.scenarios.forEach(validateSnapshot);
  }
  return w;
}
export class BrowserRepository implements WorkspaceRepository {
  private expected = 'null';
  private db = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('watt-wallet', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('workspace');
      request.result.createObjectStore('assets');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  private async read(store: string, key: string): Promise<any> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const r = db.transaction(store).objectStore(store).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  private async write(store: string, key: string, value: unknown): Promise<void> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, 'readwrite');
      t.objectStore(store).put(value, key);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error ?? new Error('Sauvegarde interrompue.'));
    });
  }
  async load() {
    const w = await this.read('workspace', 'current');
    const parsed = w ? validateWorkspace(w) : null;
    this.expected = JSON.stringify(w ?? null);
    return parsed;
  }
  async save(w: Workspace) {
    const next = validateWorkspace(w),
      serialized = JSON.stringify(next),
      expected = this.expected;
    const db = await this.db;
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('workspace', 'readwrite');
      const store = transaction.objectStore('workspace');
      const request = store.get('current');
      let conflict: WorkspaceConflictError | undefined;
      request.onsuccess = () => {
        if (JSON.stringify(request.result ?? null) !== expected) {
          conflict = new WorkspaceConflictError();
          transaction.abort();
        } else store.put(next, 'current');
      };
      transaction.oncomplete = () => {
        this.expected = serialized;
        resolve();
      };
      transaction.onerror = () => reject(conflict ?? transaction.error);
      transaction.onabort = () =>
        reject(conflict ?? transaction.error ?? new Error('Sauvegarde interrompue.'));
    });
  }
  async getAsset(id: string) {
    return (await this.read('assets', id)) ?? null;
  }
  putAsset(id: string, bytes: Uint8Array) {
    return this.write('assets', id, bytes);
  }
}
class NativeRepository implements WorkspaceRepository {
  private expectedJson: string | null = null;
  async load() {
    const json = await invoke<string | null>('load_workspace');
    const parsed = json ? validateWorkspace(JSON.parse(json)) : null;
    this.expectedJson = json;
    return parsed;
  }
  async save(w: Workspace) {
    const json = JSON.stringify(validateWorkspace(w));
    try {
      await invoke('save_workspace', { json, expectedJson: this.expectedJson });
      this.expectedJson = json;
    } catch (error) {
      if (error === workspaceConflictCode) throw new WorkspaceConflictError();
      throw error;
    }
  }
  async getAsset(id: string) {
    const bytes = await invoke<number[] | null>('read_asset', { id });
    return bytes ? new Uint8Array(bytes) : null;
  }
  async putAsset(id: string, bytes: Uint8Array) {
    await invoke('write_asset', { id, bytes: Array.from(bytes) });
  }
}
export function createRepository(): WorkspaceRepository {
  return isTauri() ? new NativeRepository() : new BrowserRepository();
}

export async function chooseFile(extension: 'glb' | 'wattpack'): Promise<Uint8Array | null> {
  const limit = (extension === 'glb' ? 20 : 100) * 1024 * 1024;
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readFile, stat } = await import('@tauri-apps/plugin-fs');
    const path = await open({ multiple: false, filters: [{ name: extension, extensions: [extension] }] });
    if (!path) return null;
    if ((await stat(path)).size > limit) throw new Error('Le fichier dépasse la taille autorisée.');
    return readFile(path);
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `.${extension}`;
    input.oncancel = () => resolve(null);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (file.size > limit) {
        reject(new Error('Le fichier dépasse la taille autorisée.'));
        return;
      }
      try {
        resolve(new Uint8Array(await file.arrayBuffer()));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}
export async function downloadPack(bytes: Uint8Array, name: string): Promise<boolean> {
  const filename = `${name.replace(/[^\p{L}\p{N}_-]/gu, '-').slice(0, 80)}.wattpack`;
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({
      defaultPath: filename,
      filters: [{ name: 'Watt Wallet', extensions: ['wattpack'] }],
    });
    if (!path) return false;
    await writeFile(path, bytes);
    return true;
  }
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
