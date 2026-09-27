import { Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  DeviceDefinition,
  DeviceInstance,
  UsageProfile,
  builtinIds,
  categories,
  copy,
  definitionSchema,
  instanceSchema,
} from '../domain/models';
import { annualEnergy, validateUsage } from '../domain/energy';
import { chooseFile } from '../data/repository';
import { validateGlb } from '../data/glb';
import { WalletStore } from '../state';
import { IconComponent } from './icon';

@Component({
  selector: 'ww-device-editor',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    @if (!instance()) {
      <div class="definition-tabs" role="tablist" aria-label="Mode d’édition de la fiche">
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="editorTab() === 'form'"
          (click)="setTab('form')"
        >
          Formulaire
        </button>
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="editorTab() === 'json'"
          (click)="setTab('json')"
        >
          JSON
        </button>
      </div>
    }
    @if (instance() || editorTab() === 'form') {
      <form [formGroup]="form" (ngSubmit)="submit()" class="device-form">
        <label
          >Nom de l’appareil<input
            formControlName="name"
            maxlength="100"
            placeholder="Ex. Radiateur du salon"
        /></label>
        <div class="form-row">
          <label>Marque<input formControlName="brand" placeholder="Facultatif" /></label
          ><label>Référence<input formControlName="reference" placeholder="Facultatif" /></label>
        </div>
        <label
          >Catégorie<select formControlName="category">
            @for (c of categories; track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select></label
        >
        @if (instance()) {
          <div class="form-row">
            <label
              >Quantité<input formControlName="quantity" type="number" min="1" max="10000" step="1" /></label
            ><label
              >Puissance nominale <span>W</span><input formControlName="nominalW" type="number" min="0"
            /></label>
          </div>
        } @else {
          <label
            >Puissance nominale indicative <span>W</span
            ><input formControlName="nominalW" type="number" min="0"
          /></label>
        }
        <div class="form-divider">Consommation & usage</div>
        <label
          >Méthode de calcul<select formControlName="method">
            <option value="power">Puissance × durée</option>
            <option value="cycle">Énergie par cycle</option>
            <option value="annual">Consommation annuelle</option>
          </select></label
        >
        @if (form.controls.method.value === 'power') {
          <label
            >Puissance moyenne en marche <span>W</span
            ><input formControlName="activeW" type="number" min="0" step="any"
          /></label>
          <div class="form-row">
            <label
              >Heures / jour<input
                formControlName="hoursPerDay"
                type="number"
                min="0"
                max="24"
                step="any" /></label
            ><label
              >Jours / an<input formControlName="daysPerYear" type="number" min="0" max="365" step="any"
            /></label>
          </div>
          <p class="field-hint">
            Pour un radiateur, indiquez les heures équivalentes à pleine puissance. La température du logement
            n’est pas modélisée.
          </p>
        }
        @if (form.controls.method.value === 'cycle') {
          <div class="form-row">
            <label>kWh / cycle<input formControlName="kwhPerCycle" type="number" min="0" step="any" /></label
            ><label
              >Cycles / semaine<input formControlName="cyclesPerWeek" type="number" min="0" step="any"
            /></label>
          </div>
          <label
            >Durée d’un cycle <span>heures</span
            ><input formControlName="cycleHours" type="number" min="0" step="any"
          /></label>
        }
        @if (form.controls.method.value === 'annual') {
          <label
            >Consommation annuelle <span>kWh/an</span
            ><input formControlName="kwhPerYear" type="number" min="0" step="any"
          /></label>
          <p class="field-hint">Valeur tout compris, veille incluse.</p>
        } @else {
          <label
            >Puissance en veille <span>W</span
            ><input formControlName="standbyW" type="number" min="0" step="any"
          /></label>
          <p class="field-hint">Veille appliquée aux heures restantes sur l’année.</p>
        }
        <div class="form-divider">Simulation instantanée</div>
        <div class="form-row">
          <label
            >En marche <span>W · facultatif</span
            ><input formControlName="simulatedRunningW" type="number" min="0" step="any"
          /></label>
          <label
            >En veille <span>W · facultatif</span
            ><input formControlName="simulatedStandbyW" type="number" min="0" step="any"
          /></label>
        </div>
        <p class="field-hint">
          Ces puissances servent uniquement au simulateur. Si elles sont vides, la puissance moyenne en marche
          ou celle déduite d’un cycle est utilisée quand elle existe.
        </p>
        <label
          >Consommation en heures creuses <span>%</span
          ><input formControlName="offPeakPercent" type="number" min="0" max="100" step="any"
        /></label>
        <p class="field-hint">Utilisé avec le tarif HP/HC. 0 % tant que vous ne le renseignez pas.</p>
        <div class="form-divider">Apparence</div>
        <label
          >Silhouette<select formControlName="builtin">
            @for (b of builtinIds; track b) {
              <option [value]="b">{{ visualName(b) }}</option>
            }
          </select></label
        >
        <div class="upload-row">
          <button class="btn secondary small" type="button" (click)="importGlb()" [disabled]="importing()">
            <ww-icon name="upload" /> {{ importing() ? 'Vérification…' : 'Importer un GLB' }}
          </button>
          @if (customVisual()) {
            <button type="button" class="text-button" (click)="removeGlb()">Retirer le GLB</button>
          }
        </div>
        @if (customVisual()) {
          <p class="field-hint success-text">Modèle personnalisé associé à cette fiche.</p>
        }
        <p class="field-hint">GLB autonome · 20 Mio max · textures PNG/JPEG.</p>
        @if (instance()) {
          <div class="form-row">
            <label>Position X<input formControlName="x" type="number" min="-10" max="10" step="0.1" /></label
            ><label>Position Z<input formControlName="z" type="number" min="-8" max="8" step="0.1" /></label>
          </div>
        }
        <label>Source ou notes<textarea formControlName="notes" rows="2" maxlength="2000"></textarea></label>
        @if (error()) {
          <p role="alert" class="inline-error">{{ error() }}</p>
        }
        @if (jsonDirtyInvalid()) {
          <p role="alert" class="inline-error">
            Le JSON contient des erreurs. Corrigez-le ou réinitialisez-le depuis le formulaire avant
            d’enregistrer.
          </p>
        }
        <button class="btn primary full" type="submit" [disabled]="importing() || jsonDirtyInvalid()">
          <ww-icon name="check" /> {{ instance() ? 'Appliquer les modifications' : 'Enregistrer la fiche' }}
        </button>
      </form>
    } @else {
      <div class="definition-json-layout">
        <div class="definition-json-input">
          <details class="json-example">
            <summary>Voir un exemple JSON complet</summary>
            <pre>{{ jsonExample() }}</pre>
            <button class="btn secondary small" type="button" (click)="loadExample()">
              Charger cet exemple
            </button>
          </details>
          <label for="definition-json">JSON de la fiche</label>
          <textarea
            id="definition-json"
            aria-label="JSON de la fiche"
            spellcheck="false"
            [value]="jsonText()"
            (input)="onJsonInput($event)"
          ></textarea>
          <div
            class="json-validation"
            [class.valid]="jsonStatus() === 'valid'"
            [class.invalid]="jsonStatus() !== 'valid'"
            role="status"
          >
            <ww-icon [name]="jsonStatus() === 'valid' ? 'check' : 'info'" />
            <span>{{ jsonMessage() }}</span>
          </div>
          @if (jsonDirtyInvalid()) {
            <button class="text-button" type="button" (click)="resetJsonFromForm()">
              Réinitialiser le JSON depuis le formulaire
            </button>
          }
          <p class="field-hint">
            Les champs suivent le format DeviceDefinition. L’identifiant est conservé par l’application.
          </p>
        </div>
        <aside class="definition-json-preview" aria-label="Prévisualisation de la fiche">
          <span class="eyebrow">APERÇU DES DONNÉES</span>
          @if (jsonPreview(); as preview) {
            <h3>{{ preview.definition.name }}</h3>
            <p>{{ preview.definition.brand || 'Sans marque' }} {{ preview.definition.reference }}</p>
            <dl>
              <div>
                <dt>Catégorie</dt>
                <dd>{{ preview.definition.category }}</dd>
              </div>
              <div>
                <dt>Puissance nominale</dt>
                <dd>{{ preview.definition.nominalW }} W</dd>
              </div>
              <div>
                <dt>Méthode</dt>
                <dd>{{ methodLabel(preview.definition) }}</dd>
              </div>
              <div>
                <dt>Silhouette</dt>
                <dd>{{ visualLabel(preview.definition) }}</dd>
              </div>
              <div>
                <dt>Part en heures creuses</dt>
                <dd>{{ preview.definition.defaultUsage.offPeakPercent }} %</dd>
              </div>
            </dl>
            <div class="json-estimate">
              <span>Consommation estimée</span><strong>{{ preview.kwhLabel }} kWh/an</strong>
            </div>
          } @else {
            <p class="subtle">
              La prévisualisation apparaît dès que le JSON contient une fiche complète et valide.
            </p>
          }
        </aside>
      </div>
      @if (error()) {
        <p role="alert" class="inline-error">{{ error() }}</p>
      }
      <button
        class="btn primary full"
        type="button"
        (click)="submit()"
        [disabled]="importing() || jsonStatus() !== 'valid' || jsonDirtyInvalid()"
      >
        <ww-icon name="check" /> Enregistrer la fiche
      </button>
    }
  `,
})
export class DeviceEditorComponent {
  definition = input.required<DeviceDefinition>();
  instance = input<DeviceInstance | null>(null);
  committed = output<{ definition: DeviceDefinition; instance: DeviceInstance | null }>();
  private store = inject(WalletStore);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  categories = categories;
  builtinIds = builtinIds;
  error = signal('');
  importing = signal(false);
  customVisual = signal<Extract<DeviceDefinition['visual'], { kind: 'glb' }> | null>(null);
  editorTab = signal<'form' | 'json'>('form');
  jsonText = signal('');
  jsonExample = signal('');
  jsonStatus = signal<'valid' | 'syntax' | 'missing' | 'invalid' | 'checking'>('missing');
  jsonMessage = signal('');
  jsonPreview = signal<{ definition: DeviceDefinition; kwhLabel: string } | null>(null);
  jsonDirtyInvalid = signal(false);
  private jsonRevision = 0;
  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    brand: '',
    reference: '',
    category: 'Électroménager',
    nominalW: 0,
    simulatedRunningW: this.fb.control<number | null>(null),
    simulatedStandbyW: this.fb.control<number | null>(null),
    method: 'power',
    activeW: 100,
    standbyW: 0,
    kwhPerCycle: 1,
    kwhPerYear: 100,
    hoursPerDay: 5,
    daysPerYear: 365,
    cyclesPerWeek: 3,
    cycleHours: 2,
    offPeakPercent: 0,
    quantity: 1,
    builtin: 'bulb',
    notes: '',
    x: 0,
    z: 0,
  });
  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.instance() && !this.jsonDirtyInvalid()) this.syncJsonFromForm();
    });
    effect(() => {
      const d = this.definition(),
        i = this.instance(),
        e = d.energy,
        u = i?.usage ?? d.defaultUsage;
      this.form.reset(
        {
          name: d.name,
          brand: d.brand,
          reference: d.reference,
          category: d.category,
          nominalW: d.nominalW,
          simulatedRunningW: d.simulatedRunningW ?? null,
          simulatedStandbyW: d.simulatedStandbyW ?? null,
          method: e.method,
          activeW: e.method === 'power' ? e.activeW : 100,
          standbyW: e.method !== 'annual' ? e.standbyW : 0,
          kwhPerCycle: e.method === 'cycle' ? e.kwhPerCycle : 1,
          kwhPerYear: e.method === 'annual' ? e.kwhPerYear : 100,
          ...u,
          quantity: i?.quantity ?? 1,
          builtin: d.visual.kind === 'builtin' ? d.visual.id : d.visual.fallback,
          notes: d.notes,
          x: i?.position.x ?? 0,
          z: i?.position.z ?? 0,
        },
        { emitEvent: false },
      );
      this.customVisual.set(d.visual.kind === 'glb' ? copy(d.visual) : null);
      this.editorTab.set('form');
      this.jsonDirtyInvalid.set(false);
      this.jsonExample.set(
        JSON.stringify(
          {
            id: d.id,
            name: 'Radiateur du salon',
            brand: '',
            reference: '',
            category: 'Chauffage',
            nominalW: 1500,
            simulatedRunningW: 900,
            simulatedStandbyW: 0,
            energy: { method: 'power', activeW: 900, standbyW: 0 },
            defaultUsage: {
              hoursPerDay: 5,
              daysPerYear: 150,
              cyclesPerWeek: 0,
              cycleHours: 0,
              offPeakPercent: 0,
            },
            visual: { kind: 'builtin', id: 'radiator' },
            notes: 'Exemple indicatif à personnaliser.',
          },
          null,
          2,
        ),
      );
      untracked(() => this.syncJsonFromForm());
      this.error.set('');
    });
  }
  setTab(tab: 'form' | 'json') {
    if (tab === 'json' && !this.jsonDirtyInvalid()) this.syncJsonFromForm();
    this.editorTab.set(tab);
  }
  private draftFromForm(): unknown {
    const v = this.form.getRawValue();
    const usage: UsageProfile = {
      hoursPerDay: v.hoursPerDay,
      daysPerYear: v.daysPerYear,
      cyclesPerWeek: v.cyclesPerWeek,
      cycleHours: v.cycleHours,
      offPeakPercent: v.offPeakPercent,
    };
    return {
      ...this.definition(),
      name: v.name,
      brand: v.brand,
      reference: v.reference,
      category: v.category,
      nominalW: v.nominalW,
      simulatedRunningW: v.simulatedRunningW ?? undefined,
      simulatedStandbyW: v.simulatedStandbyW ?? undefined,
      notes: v.notes,
      energy:
        v.method === 'power'
          ? { method: 'power', activeW: v.activeW, standbyW: v.standbyW }
          : v.method === 'cycle'
            ? { method: 'cycle', kwhPerCycle: v.kwhPerCycle, standbyW: v.standbyW }
            : { method: 'annual', kwhPerYear: v.kwhPerYear },
      defaultUsage: usage,
      visual: this.customVisual()
        ? { ...this.customVisual(), fallback: v.builtin }
        : { kind: 'builtin', id: v.builtin },
    };
  }
  private setJsonError(status: 'syntax' | 'missing' | 'invalid', message: string, fromJson: boolean) {
    this.jsonStatus.set(status);
    this.jsonMessage.set(message);
    this.jsonPreview.set(null);
    this.jsonDirtyInvalid.set(fromJson);
  }
  private acceptJsonDefinition(d: DeviceDefinition, fromJson: boolean) {
    const kwh = annualEnergy({
      id: 'preview',
      definition: d,
      usage: d.defaultUsage,
      quantity: 1,
      position: { x: 0, z: 0 },
    });
    this.jsonPreview.set({
      definition: d,
      kwhLabel: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(kwh),
    });
    this.jsonStatus.set('valid');
    this.jsonMessage.set('JSON valide : tous les champs requis sont présents.');
    this.jsonDirtyInvalid.set(false);
    if (fromJson) {
      const e = d.energy;
      this.form.reset(
        {
          name: d.name,
          brand: d.brand,
          reference: d.reference,
          category: d.category,
          nominalW: d.nominalW,
          simulatedRunningW: d.simulatedRunningW ?? null,
          simulatedStandbyW: d.simulatedStandbyW ?? null,
          method: e.method,
          activeW: e.method === 'power' ? e.activeW : 100,
          standbyW: e.method !== 'annual' ? e.standbyW : 0,
          kwhPerCycle: e.method === 'cycle' ? e.kwhPerCycle : 1,
          kwhPerYear: e.method === 'annual' ? e.kwhPerYear : 100,
          ...d.defaultUsage,
          quantity: 1,
          builtin: d.visual.kind === 'builtin' ? d.visual.id : d.visual.fallback,
          notes: d.notes,
          x: 0,
          z: 0,
        },
        { emitEvent: false },
      );
      this.customVisual.set(d.visual.kind === 'glb' ? copy(d.visual) : null);
    }
  }
  private validateJson(value: unknown, fromJson: boolean) {
    const parsed = definitionSchema.safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path.join('.') || 'fiche';
      const missing = issue.code === 'invalid_type' || (issue.code === 'too_small' && field === 'name');
      this.setJsonError(
        missing ? 'missing' : 'invalid',
        missing
          ? 'Champ requis manquant ou incomplet : ' + field
          : 'Valeur invalide dans ' + field + ' : ' + issue.message,
        fromJson,
      );
      return;
    }
    const definition = { ...parsed.data, id: this.definition().id };
    try {
      validateUsage(definition, definition.defaultUsage);
      if (definition.visual.kind === 'glb' && fromJson) {
        const revision = ++this.jsonRevision;
        this.jsonStatus.set('checking');
        this.jsonMessage.set('Vérification du modèle 3D local…');
        this.jsonPreview.set(null);
        this.jsonDirtyInvalid.set(true);
        void this.store.repository
          .getAsset(definition.visual.assetId)
          .then((asset) => {
            if (revision !== this.jsonRevision) return;
            if (!asset)
              this.setJsonError('invalid', 'Modèle GLB introuvable. Importez-le depuis le formulaire.', true);
            else this.acceptJsonDefinition(definition, true);
          })
          .catch(() => {
            if (revision === this.jsonRevision)
              this.setJsonError('invalid', 'Impossible de vérifier le modèle GLB local.', true);
          });
        return;
      }
      this.acceptJsonDefinition(definition, fromJson);
    } catch (error) {
      this.setJsonError('invalid', error instanceof Error ? error.message : 'Valeur invalide.', fromJson);
    }
  }
  private syncJsonFromForm() {
    ++this.jsonRevision;
    const value = this.draftFromForm();
    this.jsonText.set(JSON.stringify(value, null, 2));
    this.validateJson(value, false);
  }
  onJsonInput(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.jsonText.set(value);
    this.error.set('');
    ++this.jsonRevision;
    try {
      this.validateJson(JSON.parse(value), true);
    } catch {
      this.setJsonError('syntax', 'Syntaxe JSON invalide : vérifiez les virgules et guillemets.', true);
    }
  }
  resetJsonFromForm() {
    this.jsonDirtyInvalid.set(false);
    this.syncJsonFromForm();
    this.error.set('');
  }
  loadExample() {
    this.jsonText.set(this.jsonExample());
    this.onJsonInput({ target: { value: this.jsonExample() } } as unknown as Event);
  }
  methodLabel(d: DeviceDefinition) {
    return d.energy.method === 'power'
      ? 'Puissance × durée'
      : d.energy.method === 'cycle'
        ? 'Énergie par cycle'
        : 'Consommation annuelle';
  }
  visualLabel(d: DeviceDefinition) {
    return d.visual.kind === 'builtin' ? d.visual.id : 'GLB personnalisé';
  }
  removeGlb() {
    this.customVisual.set(null);
    if (!this.instance()) this.syncJsonFromForm();
  }
  visualName(id: string) {
    return (
      this.store.workspace()?.library.find((d) => d.visual.kind === 'builtin' && d.visual.id === id)?.name ??
      id
    );
  }
  async importGlb() {
    this.importing.set(true);
    this.error.set('');
    try {
      const bytes = await chooseFile('glb');
      if (!bytes) return;
      validateGlb(bytes);
      const { validateRenderableGlb } = await import('../scene/models');
      await validateRenderableGlb(bytes);
      const assetId = crypto.randomUUID();
      await this.store.repository.putAsset(assetId, bytes);
      this.customVisual.set({ kind: 'glb', assetId, fallback: this.form.controls.builtin.value as any });
      if (!this.instance()) this.syncJsonFromForm();
    } catch (e) {
      this.error.set(this.store.message(e));
    } finally {
      this.importing.set(false);
    }
  }
  submit() {
    this.error.set('');
    if (this.jsonDirtyInvalid()) {
      this.error.set('Corrigez ou réinitialisez le JSON avant d’enregistrer.');
      return;
    }
    try {
      const v = this.form.getRawValue();
      const usage: UsageProfile = {
        hoursPerDay: v.hoursPerDay,
        daysPerYear: v.daysPerYear,
        cyclesPerWeek: v.cyclesPerWeek,
        cycleHours: v.cycleHours,
        offPeakPercent: v.offPeakPercent,
      };
      const d = definitionSchema.parse({
        ...this.definition(),
        name: v.name,
        brand: v.brand,
        reference: v.reference,
        category: v.category,
        nominalW: v.nominalW,
        simulatedRunningW: v.simulatedRunningW ?? undefined,
        simulatedStandbyW: v.simulatedStandbyW ?? undefined,
        notes: v.notes,
        energy:
          v.method === 'power'
            ? { method: 'power', activeW: v.activeW, standbyW: v.standbyW }
            : v.method === 'cycle'
              ? { method: 'cycle', kwhPerCycle: v.kwhPerCycle, standbyW: v.standbyW }
              : { method: 'annual', kwhPerYear: v.kwhPerYear },
        defaultUsage: usage,
        visual: this.customVisual()
          ? { ...this.customVisual(), fallback: v.builtin }
          : { kind: 'builtin', id: v.builtin },
      });
      validateUsage(d, usage);
      const instance = this.instance()
        ? instanceSchema.parse({
            ...this.instance(),
            definition: d,
            usage,
            quantity: v.quantity,
            position: { x: v.x, z: v.z },
          })
        : null;
      if (instance) annualEnergy(instance);
      this.committed.emit({ definition: d, instance });
    } catch (e) {
      this.error.set(
        e instanceof Error && !('issues' in e)
          ? e.message
          : 'Vérifiez les champs : nom requis, valeurs positives, heures ≤ 24, jours ≤ 365 et pourcentage ≤ 100.',
      );
    }
  }
}
