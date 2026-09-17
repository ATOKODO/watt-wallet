import { Component, effect, inject, input, output, signal } from '@angular/core';
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
    <form [formGroup]="form" (ngSubmit)="submit()" class="device-form">
      <label
        >Nom de l’appareil<input formControlName="name" maxlength="100" placeholder="Ex. Radiateur du salon"
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
          <button type="button" class="text-button" (click)="customVisual.set(null)">Retirer le GLB</button>
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
      <button class="btn primary full" type="submit" [disabled]="importing()">
        <ww-icon name="check" /> {{ instance() ? 'Appliquer les modifications' : 'Enregistrer la fiche' }}
      </button>
    </form>
  `,
})
export class DeviceEditorComponent {
  definition = input.required<DeviceDefinition>();
  instance = input<DeviceInstance | null>(null);
  committed = output<{ definition: DeviceDefinition; instance: DeviceInstance | null }>();
  private store = inject(WalletStore);
  private fb = inject(FormBuilder);
  categories = categories;
  builtinIds = builtinIds;
  error = signal('');
  importing = signal(false);
  customVisual = signal<Extract<DeviceDefinition['visual'], { kind: 'glb' }> | null>(null);
  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    brand: '',
    reference: '',
    category: 'Électroménager',
    nominalW: 0,
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
    effect(() => {
      const d = this.definition(),
        i = this.instance(),
        e = d.energy,
        u = i?.usage ?? d.defaultUsage;
      this.form.reset({
        name: d.name,
        brand: d.brand,
        reference: d.reference,
        category: d.category,
        nominalW: d.nominalW,
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
      });
      this.customVisual.set(d.visual.kind === 'glb' ? copy(d.visual) : null);
      this.error.set('');
    });
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
    } catch (e) {
      this.error.set(this.store.message(e));
    } finally {
      this.importing.set(false);
    }
  }
  submit() {
    this.error.set('');
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
