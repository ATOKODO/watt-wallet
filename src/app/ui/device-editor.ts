import { LanguageService, TranslatePipe } from './language';
import { Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  POSITION_LIMIT,
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
  imports: [ReactiveFormsModule, IconComponent, TranslatePipe],
  template: `
    @if (!instance()) {
      <div class="definition-tabs" role="tablist" [attr.aria-label]="'Mode d’édition de la fiche' | t">
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="editorTab() === 'form'"
          (click)="setTab('form')"
        >
          {{ 'Formulaire' | t }}
        </button>
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="editorTab() === 'json'"
          (click)="setTab('json')"
        >
          {{ 'JSON' | t }}
        </button>
      </div>
    }
    @if (instance() || editorTab() === 'form') {
      <form [formGroup]="form" (ngSubmit)="submit()" class="device-form">
        <label
          >{{ 'Nom de l’appareil' | t
          }}<input formControlName="name" maxlength="100" [placeholder]="'Ex. Radiateur du salon' | t"
        /></label>
        <div class="form-row">
          <label>{{ 'Marque' | t }}<input formControlName="brand" [placeholder]="'Facultatif' | t" /></label
          ><label
            >{{ 'Référence' | t }}<input formControlName="reference" [placeholder]="'Facultatif' | t"
          /></label>
        </div>
        <label
          >{{ 'Catégorie' | t
          }}<select formControlName="category">
            @for (c of categories; track c) {
              <option [value]="c">{{ c | t }}</option>
            }
          </select></label
        >
        @if (instance()) {
          <div class="form-row">
            <label
              >{{ 'Quantité' | t
              }}<input formControlName="quantity" type="number" min="1" max="10000" step="1" /></label
            ><label
              >{{ 'Puissance nominale' | t }} <span>{{ 'W' | t }}</span
              ><input formControlName="nominalW" type="number" min="0"
            /></label>
          </div>
        } @else {
          <label
            >{{ 'Puissance nominale indicative' | t }} <span>{{ 'W' | t }}</span
            ><input formControlName="nominalW" type="number" min="0"
          /></label>
        }
        <div class="form-divider">{{ 'Consommation & usage' | t }}</div>
        <label
          >{{ 'Méthode de calcul' | t
          }}<select formControlName="method">
            <option value="power">{{ 'Puissance × durée' | t }}</option>
            <option value="cycle">{{ 'Énergie par cycle' | t }}</option>
            <option value="annual">{{ 'Consommation annuelle' | t }}</option>
          </select></label
        >
        @if (form.controls.method.value === 'power') {
          <label
            >{{ 'Puissance moyenne en marche' | t }} <span>{{ 'W' | t }}</span
            ><input formControlName="activeW" type="number" min="0" step="any"
          /></label>
          <div class="form-row">
            <label
              >{{ 'Heures / jour' | t
              }}<input formControlName="hoursPerDay" type="number" min="0" max="24" step="any" /></label
            ><label
              >{{ 'Jours / an' | t
              }}<input formControlName="daysPerYear" type="number" min="0" max="365" step="any"
            /></label>
          </div>
          <p class="field-hint">
            {{
              'Pour un radiateur, indiquez les heures équivalentes à pleine puissance. La température du logement n’est pas modélisée.'
                | t
            }}
          </p>
        }
        @if (form.controls.method.value === 'cycle') {
          <div class="form-row">
            <label
              >{{ 'kWh / cycle' | t
              }}<input formControlName="kwhPerCycle" type="number" min="0" step="any" /></label
            ><label
              >{{ 'Cycles / semaine' | t
              }}<input formControlName="cyclesPerWeek" type="number" min="0" step="any"
            /></label>
          </div>
          <label
            >{{ 'Durée d’un cycle' | t }} <span>{{ 'heures' | t }}</span
            ><input formControlName="cycleHours" type="number" min="0" step="any"
          /></label>
        }
        @if (form.controls.method.value === 'annual') {
          <label
            >{{ 'Consommation annuelle' | t }} <span>{{ 'kWh/an' | t }}</span
            ><input formControlName="kwhPerYear" type="number" min="0" step="any"
          /></label>
          <p class="field-hint">{{ 'Valeur tout compris, veille incluse.' | t }}</p>
        } @else {
          <label
            >{{ 'Puissance en veille' | t }} <span>{{ 'W' | t }}</span
            ><input formControlName="standbyW" type="number" min="0" step="any"
          /></label>
          <p class="field-hint">{{ 'Veille appliquée aux heures restantes sur l’année.' | t }}</p>
        }
        <div class="form-divider">{{ 'Simulation instantanée' | t }}</div>
        <div class="form-row">
          <label
            >{{ 'En marche' | t }} <span>{{ 'W · facultatif' | t }}</span
            ><input formControlName="simulatedRunningW" type="number" min="0" step="any"
          /></label>
          <label
            >{{ 'En veille' | t }} <span>{{ 'W · facultatif' | t }}</span
            ><input formControlName="simulatedStandbyW" type="number" min="0" step="any"
          /></label>
        </div>
        <p class="field-hint">
          {{
            'Ces puissances servent uniquement au simulateur. Si elles sont vides, la puissance moyenne en marche ou celle déduite d’un cycle est utilisée quand elle existe.'
              | t
          }}
        </p>
        <label
          >{{ 'Consommation en heures creuses' | t }} <span>%</span
          ><input formControlName="offPeakPercent" type="number" min="0" max="100" step="any"
        /></label>
        <p class="field-hint">
          {{ 'Utilisé avec le tarif HP/HC. 0 % tant que vous ne le renseignez pas.' | t }}
        </p>
        <div class="form-divider">{{ 'Apparence' | t }}</div>
        <label
          >{{ 'Silhouette' | t
          }}<select formControlName="builtin">
            @for (b of builtinIds; track b) {
              <option [value]="b">{{ visualName(b) | t }}</option>
            }
          </select></label
        >
        <div class="upload-row">
          <button
            class="btn secondary small"
            type="button"
            (click)="importGlb()"
            [disabled]="saving() || importing()"
          >
            <ww-icon name="upload" /> {{ (importing() ? 'Vérification…' : 'Importer un GLB') | t }}
          </button>
          @if (customVisual()) {
            <button type="button" class="text-button" (click)="removeGlb()">
              {{ 'Retirer le GLB' | t }}
            </button>
          }
        </div>
        @if (customVisual()) {
          <p class="field-hint success-text">{{ 'Modèle personnalisé associé à cette fiche.' | t }}</p>
        }
        <p class="field-hint">{{ 'GLB autonome · 20 Mio max · textures PNG/JPEG.' | t }}</p>
        @if (instance()) {
          <div class="form-row">
            <label
              >{{ 'Position X' | t
              }}<input
                formControlName="x"
                type="number"
                [min]="positionLimit * -1"
                [max]="positionLimit"
                step="0.1" /></label
            ><label
              >{{ 'Position Z' | t
              }}<input
                formControlName="z"
                type="number"
                [min]="positionLimit * -1"
                [max]="positionLimit"
                step="0.1"
            /></label>
          </div>
        }
        <label
          >{{ 'Source ou notes' | t }}<textarea formControlName="notes" rows="2" maxlength="2000"></textarea>
        </label>
        @if (error()) {
          <p role="alert" class="inline-error">{{ i18n.error(error()) }}</p>
        }
        @if (jsonDirtyInvalid()) {
          <p role="alert" class="inline-error">
            {{
              'Le JSON contient des erreurs. Corrigez-le ou réinitialisez-le depuis le formulaire avant d’enregistrer.'
                | t
            }}
          </p>
        }
        <button
          class="btn primary full"
          type="submit"
          [disabled]="saving() || importing() || jsonDirtyInvalid()"
        >
          <ww-icon name="check" />
          {{ (instance() ? 'Appliquer les modifications' : 'Enregistrer la fiche') | t }}
        </button>
      </form>
    } @else {
      <div class="definition-json-layout">
        <div class="definition-json-input">
          <details class="json-example">
            <summary>{{ 'Voir un exemple JSON complet' | t }}</summary>
            <pre>{{ jsonExample() }}</pre>
            <button class="btn secondary small" type="button" (click)="loadExample()">
              {{ 'Charger cet exemple' | t }}
            </button>
          </details>
          <label for="definition-json">{{ 'JSON de la fiche' | t }}</label>
          <textarea
            id="definition-json"
            [attr.aria-label]="'JSON de la fiche' | t"
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
            <span>{{ jsonMessage() | t }}</span>
          </div>
          @if (jsonDirtyInvalid()) {
            <button class="text-button" type="button" (click)="resetJsonFromForm()">
              {{ 'Réinitialiser le JSON depuis le formulaire' | t }}
            </button>
          }
          <p class="field-hint">
            {{
              'Les champs suivent le format DeviceDefinition. L’identifiant est conservé par l’application.'
                | t
            }}
          </p>
        </div>
        <aside class="definition-json-preview" [attr.aria-label]="'Prévisualisation de la fiche' | t">
          <span class="eyebrow">{{ 'APERÇU DES DONNÉES' | t }}</span>
          @if (jsonPreview(); as preview) {
            <h3>{{ i18n.deviceName(preview.definition) }}</h3>
            <p>
              {{
                '{0} {1}'
                  | t
                    : [
                        preview.definition.brand ? preview.definition.brand : ('Sans marque' | t),
                        preview.definition.reference,
                      ]
              }}
            </p>
            <dl>
              <div>
                <dt>{{ 'Catégorie' | t }}</dt>
                <dd>{{ preview.definition.category | t }}</dd>
              </div>
              <div>
                <dt>{{ 'Puissance nominale' | t }}</dt>
                <dd>{{ '{0} W' | t: [preview.definition.nominalW | t] }}</dd>
              </div>
              <div>
                <dt>{{ 'Méthode' | t }}</dt>
                <dd>{{ methodLabel(preview.definition) | t }}</dd>
              </div>
              <div>
                <dt>{{ 'Silhouette' | t }}</dt>
                <dd>{{ visualLabel(preview.definition) | t }}</dd>
              </div>
              <div>
                <dt>{{ 'Part en heures creuses' | t }}</dt>
                <dd>{{ '{0} %' | t: [preview.definition.defaultUsage.offPeakPercent | t] }}</dd>
              </div>
            </dl>
            <div class="json-estimate">
              <span>{{ 'Consommation estimée' | t }}</span
              ><strong>{{ '{0} kWh/an' | t: [i18n.number(preview.kwh, 1) | t] }}</strong>
            </div>
          } @else {
            <p class="subtle">
              {{ 'La prévisualisation apparaît dès que le JSON contient une fiche complète et valide.' | t }}
            </p>
          }
        </aside>
      </div>
      @if (error()) {
        <p role="alert" class="inline-error">{{ i18n.error(error()) }}</p>
      }
      <button
        class="btn primary full"
        type="button"
        (click)="submit()"
        [disabled]="saving() || importing() || jsonStatus() !== 'valid' || jsonDirtyInvalid()"
      >
        <ww-icon name="check" /> {{ 'Enregistrer la fiche' | t }}
      </button>
    }
  `,
})
export class DeviceEditorComponent {
  readonly i18n = inject(LanguageService);
  readonly positionLimit = POSITION_LIMIT;
  definition = input.required<DeviceDefinition>();
  instance = input<DeviceInstance | null>(null);
  saving = input(false);
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
  jsonPreview = signal<{ definition: DeviceDefinition; kwh: number } | null>(null);
  jsonDirtyInvalid = signal(false);
  private jsonRevision = 0;
  private loadedKey = '';
  private loadedContent = '';
  private loadedPosition: { x: number; z: number } | null = null;
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
      const key = i
        ? this.store.home()?.id + ':' + (this.store.scenarioId() ?? 'reference') + ':' + i.id
        : 'definition:' + d.id;
      const parsed = definitionSchema.safeParse(d);
      const content = JSON.stringify({
        definition: parsed.success ? parsed.data : d,
        usage: {
          hoursPerDay: u.hoursPerDay,
          daysPerYear: u.daysPerYear,
          cyclesPerWeek: u.cyclesPerWeek,
          cycleHours: u.cycleHours,
          offPeakPercent: u.offPeakPercent,
        },
        quantity: i?.quantity,
      });
      if (key === this.loadedKey && content === this.loadedContent) {
        if (i && (i.position.x !== this.loadedPosition?.x || i.position.z !== this.loadedPosition?.z)) {
          this.form.patchValue({ x: i.position.x, z: i.position.z }, { emitEvent: false });
          this.loadedPosition = { ...i.position };
        }
        return;
      }
      this.loadedKey = key;
      this.loadedContent = content;
      this.loadedPosition = i ? { ...i.position } : null;
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
            name: untracked(() => this.i18n.t('Radiateur du salon')),
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
            notes: untracked(() => this.i18n.t('Exemple indicatif à personnaliser.')),
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
      kwh,
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
    return d.visual.kind === 'builtin' ? this.i18n.builtinName(d.visual.id) : 'GLB personnalisé';
  }
  removeGlb() {
    this.customVisual.set(null);
    if (!this.instance()) this.syncJsonFromForm();
  }
  visualName(id: string) {
    return this.i18n.builtinName(id);
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
    if (this.saving()) return;
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
