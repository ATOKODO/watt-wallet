import { MetricComponent } from './ui/design-system/metric';
import { ButtonDirective } from './ui/design-system/button';
import { LanguageService, TranslatePipe } from './ui/language';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from './ui/icon';
import { ThemeService } from './ui/theme';
import { themeColor } from './ui/palette';
import { DeviceEditorComponent } from './ui/device-editor';
import { DioramaComponent } from './scene/diorama';
import { WalletStore } from './state';
import { annualBreakdown, calculate } from './domain/energy';
import { PowerState, powerEstimate, simulatedTotal } from './domain/power';
import {
  BuiltinId,
  DeviceDefinition,
  DeviceInstance,
  categoryColors,
  categories,
  copy,
  defaultUsage,
  tariffSchema,
  uid,
} from './domain/models';
import {
  PreparedPack,
  WattPack,
  assetIds,
  decodePack,
  definitionsIn,
  encodePack,
  createImportPlan,
  applyImportPlan,
} from './data/wattpack';
import { WorkspaceConflictError, chooseFile, downloadPack } from './data/repository';
import { validateRenderableGlb } from './scene/models';

@Component({
  selector: 'ww-app',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    MetricComponent,
    ButtonDirective,
    ReactiveFormsModule,
    IconComponent,
    DeviceEditorComponent,
    DioramaComponent,
    TranslatePipe,
  ],
  templateUrl: './app.html',
})
export class AppComponent {
  readonly i18n = inject(LanguageService);
  store = inject(WalletStore);
  theme = inject(ThemeService);
  private fb = inject(FormBuilder);
  private readonly injector = inject(Injector);
  @ViewChild('deviceInspector') private deviceInspector?: ElementRef<HTMLElement>;
  private readonly compactQuery = window.matchMedia('(max-width: 760px)');
  readonly compactLayout = signal(this.compactQuery.matches);
  tab = signal<'home' | 'scenarios' | 'library'>('home');
  mode = signal<'consumption' | 'placement'>('consumption');
  search = signal('');
  category = signal('Tous');
  toast = signal('');
  busy = signal(false);
  modalError = signal('');
  modal = signal<
    | 'new-home'
    | 'new-scenario'
    | 'rename-home'
    | 'tariff'
    | 'bill'
    | 'device'
    | 'import'
    | 'palette'
    | 'language'
    | null
  >(null);
  editingDefinition = signal<DeviceDefinition | null>(null);
  prepared = signal<PreparedPack | null>(null);
  categories = categories;
  colors = categoryColors;
  private toastTimer = 0;
  private nameCreationId?: string;
  private importPlan: PreparedPack | null = null;
  nameForm = this.fb.nonNullable.group({ name: ['', [Validators.required, Validators.maxLength(100)]] });
  tariffForm = this.fb.nonNullable.group({
    mode: 'base',
    basePrice: 0.25,
    peakPrice: 0.27,
    offPeakPrice: 0.2,
    subscription: 180,
  });
  costForm = this.fb.nonNullable.group({ initialCost: 0 });
  billForm = this.fb.nonNullable.group({ annualKwh: 0 });
  powerStates = signal<Record<string, PowerState>>({});
  filteredLibrary = computed(() => {
    const q = this.search().toLocaleLowerCase(this.i18n.locale());
    return (this.store.workspace()?.library ?? []).filter(
      (d) =>
        (this.category() === 'Tous' || d.category === this.category()) &&
        `${this.i18n.deviceName(d)} ${d.name} ${d.brand} ${d.reference}`.toLocaleLowerCase('fr').includes(q),
    );
  });
  count = computed(() => this.store.devices().reduce((s, d) => s + d.quantity, 0));
  donut = computed(() => {
    let start = 0;
    const parts = this.store
      .result()
      .categories.filter((c) => c.share > 0)
      .map((c) => {
        const end = start + c.share * 100;
        const part = `${this.colors[c.name]} ${start}% ${end}%`;
        start = end;
        return part;
      });
    return parts.length
      ? `conic-gradient(${parts.join(',')})`
      : this.theme.theme() === 'dark'
        ? themeColor('#485d49', this.theme.accent())
        : themeColor('#e8eade', this.theme.accent());
  });
  selectedResult = computed(() => this.store.result().devices.find((d) => d.id === this.store.selectedId()));
  powerContext = computed(() => `${this.store.home()?.id ?? ''}:${this.store.scenarioId() ?? 'reference'}`);
  currentPowerStates = computed(() => {
    const prefix = this.powerContext();
    const states = this.powerStates();
    return Object.fromEntries(
      this.store.devices().map((device) => [device.id, states[`${prefix}:${device.id}`] ?? 'off']),
    ) as Record<string, PowerState>;
  });
  powerRows = computed(() =>
    this.store.devices().map((device) => {
      const state = this.currentPowerStates()[device.id];
      return { device, state, estimate: powerEstimate(device, state) };
    }),
  );
  powerSummary = computed(() => simulatedTotal(this.store.devices(), this.currentPowerStates()));
  selectedBreakdown = computed(() => {
    const selected = this.store.selected();
    return selected ? annualBreakdown(selected) : null;
  });
  billComparison = computed(() => {
    const home = this.store.home();
    if (!home || home.observedAnnualKwh === undefined) return null;
    const estimated = calculate(home).kwh;
    return { observed: home.observedAnnualKwh, estimated, difference: home.observedAnnualKwh - estimated };
  });
  @ViewChild('modalDialog') set modalDialog(el: ElementRef<HTMLDialogElement> | undefined) {
    if (el)
      queueMicrotask(() => {
        if (el.nativeElement.isConnected && !el.nativeElement.open) el.nativeElement.showModal();
      });
  }
  constructor() {
    const updateLayout = (event: MediaQueryListEvent) => this.compactLayout.set(event.matches);
    this.compactQuery.addEventListener('change', updateLayout);
    inject(DestroyRef).onDestroy(() => this.compactQuery.removeEventListener('change', updateLayout));
    void this.store.initialize();
  }
  editInstalledDevice(id: string) {
    this.store.selectedId.set(id);
    afterNextRender(
      () => {
        const panel = this.deviceInspector?.nativeElement;
        if (!panel || this.store.selectedId() !== id) return;
        panel.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'start',
        });
        panel.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
  number(value: number, digits = 0) {
    return this.i18n.number(value, digits);
  }
  money(value: number, digits = 0) {
    return this.i18n.money(value, digits);
  }
  visualId(d: DeviceDefinition): BuiltinId {
    return d.visual.kind === 'builtin' ? d.visual.id : d.visual.fallback;
  }
  energyLabel(d: DeviceDefinition) {
    const e = d.energy;
    return e.method === 'power'
      ? `${this.number(e.activeW)} W`
      : e.method === 'cycle'
        ? `${this.number(e.kwhPerCycle, 2)} kWh/cycle`
        : `${this.number(e.kwhPerYear)} kWh/an`;
  }
  powerLabel(watts: number) {
    return watts >= 1000 ? `${this.number(watts / 1000, 2)} kW` : `${this.number(watts, 1)} W`;
  }
  powerBasis(basis: ReturnType<typeof powerEstimate>['basis']) {
    if (basis === 'entered') return 'Valeur indicative de la fiche';
    if (basis === 'active-average') return 'Moyenne en marche';
    if (basis === 'cycle-average') return 'Moyenne du cycle, sans les pointes';
    if (basis === 'standby') return 'Puissance en veille';
    if (basis === 'unknown') return 'Puissance à renseigner dans la fiche';
    return 'Arrêté';
  }
  setPowerState(id: string, state: PowerState) {
    this.powerStates.update((states) => ({ ...states, [`${this.powerContext()}:${id}`]: state }));
  }
  setAllPowerStates(state: PowerState) {
    const prefix = this.powerContext();
    this.powerStates.update((states) => {
      const next = { ...states };
      for (const device of this.store.devices()) next[`${prefix}:${device.id}`] = state;
      return next;
    });
  }
  openBill() {
    this.billForm.reset({ annualKwh: this.store.home()?.observedAnnualKwh ?? 0 });
    this.modalError.set('');
    this.modal.set('bill');
  }
  async saveBill() {
    const value = this.billForm.controls.annualKwh.value;
    if (!Number.isFinite(value) || value <= 0 || value > 1e9) {
      this.modalError.set('Indiquez une consommation sur 12 mois supérieure à zéro.');
      return;
    }
    await this.commitModalChange(
      () => this.store.updateObservedAnnualKwh(value),
      'Repère de facture enregistré',
    );
  }
  clearBill() {
    return this.commitModalChange(() => this.store.updateObservedAnnualKwh(null), 'Repère de facture retiré');
  }
  inputValue(e: Event) {
    return (e.target as HTMLInputElement).value;
  }
  notify(message: string) {
    this.toast.set(message);
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.set(''), 4000);
  }
  async add(d: DeviceDefinition) {
    if (await this.store.addDevice(d)) {
      this.tab.set('home');
      this.notify(this.i18n.t('{0} ajouté au logement', [this.i18n.deviceName(d)]));
    }
  }
  drag(event: DragEvent, d: DeviceDefinition) {
    event.dataTransfer?.setData('application/x-watt-device', d.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  }
  drop(value: { definitionId: string; instanceId: string; position: { x: number; z: number } }) {
    const d = this.store.workspace()?.library.find((d) => d.id === value.definitionId);
    if (d) void this.store.addDevice(d, value.position, value.instanceId);
  }
  chooseTab(tab: 'home' | 'scenarios' | 'library') {
    this.tab.set(tab);
  }
  openName(type: 'new-home' | 'new-scenario' | 'rename-home') {
    this.nameCreationId = uid();
    this.modalError.set('');
    this.nameForm.reset({
      name:
        type === 'new-scenario'
          ? this.i18n.t('Scénario {0}', [1 + (this.store.home()?.scenarios.length ?? 0)])
          : type === 'rename-home'
            ? this.store.home()!.name
            : '',
    });
    this.modal.set(type);
  }
  async saveName() {
    const name = this.nameForm.controls.name.value.trim();
    if (!name || name.length > 100) {
      this.modalError.set('Indiquez un nom de 1 à 100 caractères.');
      return;
    }
    const type = this.modal();
    const saved = await this.commitModalChange(() => {
      if (type === 'new-home') return this.store.addHome(name, this.nameCreationId);
      if (type === 'new-scenario') return this.store.addScenario(name, this.nameCreationId);
      return this.store.mutate((w) => {
        w.homes.find((h) => h.id === w.activeHomeId)!.name = name;
      });
    });
    if (saved && type === 'new-scenario') {
      this.tab.set('scenarios');
      this.costForm.reset({ initialCost: 0 });
    }
  }

  openTariff() {
    this.tariffForm.reset(this.store.snapshot()!.tariff);
    this.modalError.set('');
    this.modal.set('tariff');
  }
  async saveTariff() {
    try {
      const tariff = tariffSchema.parse(this.tariffForm.getRawValue());
      await this.commitModalChange(() => this.store.updateTariff(tariff), 'Tarif mis à jour');
    } catch {
      this.modalError.set('Indiquez des prix valides, positifs ou nuls.');
    }
  }
  selectScenario(id: string | null) {
    this.store.switchScenario(id);
    this.costForm.reset({ initialCost: this.store.scenario()?.initialCost ?? 0 });
  }
  async saveCost() {
    const cost = this.costForm.controls.initialCost.value;
    if (cost === null || !Number.isFinite(cost) || cost < 0 || cost > 1e9) {
      this.store.error.set('Le surcoût doit être un montant positif ou nul.');
      return;
    }
    if (await this.store.updateScenarioCost(cost)) this.notify('Surcoût enregistré');
  }
  newDefinition() {
    this.editingDefinition.set({
      id: uid(),
      name: '',
      brand: '',
      reference: '',
      category: 'Électroménager',
      nominalW: 100,
      energy: { method: 'power', activeW: 100, standbyW: 0 },
      defaultUsage: copy(defaultUsage),
      visual: { kind: 'builtin', id: 'bulb' },
      notes: '',
    });
    this.modalError.set('');
    this.modal.set('device');
  }
  editDefinition(d: DeviceDefinition) {
    this.modalError.set('');
    this.editingDefinition.set(copy(d));
    this.modal.set('device');
  }
  saveDefinition(event: { definition: DeviceDefinition; instance: DeviceInstance | null }) {
    return this.commitModalChange(
      () => this.store.saveDefinition(event.definition),
      'Fiche enregistrée dans la bibliothèque',
    );
  }
  async saveDevice(event: { definition: DeviceDefinition; instance: DeviceInstance | null }) {
    if (event.instance && (await this.store.updateDevice(event.instance))) this.notify('Appareil mis à jour');
  }
  async saveInstanceAsDefinition() {
    const d = this.store.selected();
    if (!d) return;
    const definition = copy(d.definition);
    definition.id = uid();
    definition.defaultUsage = copy(d.usage);
    if (await this.store.saveDefinition(definition))
      this.notify('Une copie de la fiche a été ajoutée à la bibliothèque');
  }
  deleteDefinition(d: DeviceDefinition) {
    if (
      window.confirm(
        this.i18n.t('Supprimer « {0} » de la bibliothèque ? Les appareils déjà installés seront conservés.', [
          this.i18n.deviceName(d),
        ]),
      )
    )
      this.store.removeDefinition(d.id);
  }
  private async commitModalChange(change: () => Promise<boolean>, message?: string): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    this.modalError.set('');
    try {
      if (!(await change())) {
        this.modalError.set(this.store.error());
        return false;
      }
      this.busy.set(false);
      this.closeModal();
      if (message) this.notify(message);
      return true;
    } catch (error) {
      this.modalError.set(this.store.message(error));
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  reloadWorkspace() {
    if (
      window.confirm(
        this.i18n.t(
          'Recharger les données enregistrées ? Les modifications non sauvegardées dans cette fenêtre seront abandonnées. Exportez-les avant de continuer si vous souhaitez les conserver.',
        ),
      )
    ) {
      void this.store.initialize();
    }
  }
  closeModal() {
    if (this.busy()) return;
    this.modal.set(null);
    this.prepared.set(null);
    this.importPlan = null;
    this.nameCreationId = undefined;
    this.modalError.set('');
  }
  cancelModal(event: Event) {
    event.preventDefault();
    this.closeModal();
  }
  async exportPack(definition?: DeviceDefinition, entireLibrary = false) {
    this.busy.set(true);
    try {
      const manifest: WattPack =
        definition || entireLibrary
          ? {
              format: 'watt-wallet',
              version: 1,
              kind: 'library',
              definitions: definition ? [definition] : this.store.workspace()!.library,
            }
          : { format: 'watt-wallet', version: 1, kind: 'home', home: this.store.home()! };
      const assets: Record<string, Uint8Array> = {};
      for (const id of assetIds(manifest)) {
        const bytes = await this.store.repository.getAsset(id);
        if (!bytes) throw new Error('Une ressource 3D est manquante.');
        assets[id] = bytes;
      }
      const bytes = encodePack(manifest, assets);
      if (
        await downloadPack(
          bytes,
          definition?.name ?? (entireLibrary ? 'bibliotheque-watt-wallet' : this.store.home()!.name),
        )
      )
        this.notify('Fichier .wattpack exporté');
    } catch (e) {
      this.store.report(e);
    } finally {
      this.busy.set(false);
    }
  }
  async openImport() {
    this.busy.set(true);
    try {
      const bytes = await chooseFile('wattpack');
      if (!bytes) return;
      const p = decodePack(bytes);
      for (const b of Object.values(p.assets)) await validateRenderableGlb(b);
      this.prepared.set(p);
      this.importPlan = null;
      this.modal.set('import');
    } catch (e) {
      this.store.report(e);
    } finally {
      this.busy.set(false);
    }
  }
  importCount() {
    const p = this.prepared();
    return p ? definitionsIn(p.manifest).length : 0;
  }
  assetCount() {
    return Object.keys(this.prepared()?.assets ?? {}).length;
  }
  async confirmImport() {
    if (!this.prepared() || this.busy()) return;
    this.busy.set(true);
    this.modalError.set('');
    try {
      if (this.store.saveConflict()) throw new WorkspaceConflictError();
      const plan = (this.importPlan ??= createImportPlan(this.prepared()!));
      const before = this.store.workspace()!;
      let result = applyImportPlan(plan, before);
      for (const [id, bytes] of Object.entries(result.assets))
        await this.store.repository.putAsset(id, bytes);
      if (this.store.workspace() !== before) result = applyImportPlan(plan, this.store.workspace()!);
      if (!(await this.store.replace(result.workspace))) {
        this.modalError.set(this.store.error());
        return;
      }
      this.store.scenarioId.set(null);
      this.store.selectedId.set(null);
      this.tab.set(this.prepared()!.manifest.kind === 'home' ? 'home' : 'library');
      this.busy.set(false);
      this.closeModal();
      this.notify('Import terminé. Vos données existantes ont été conservées.');
    } catch (e) {
      this.modalError.set(this.store.message(e));
    } finally {
      this.busy.set(false);
    }
  }
}
