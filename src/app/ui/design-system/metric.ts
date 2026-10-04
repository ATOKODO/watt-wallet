import { Component, input } from '@angular/core';
import { IconComponent } from '../icon';

/** A presentational estimate card. Format and translate values in the caller;
 * the component performs no energy calculations or persistence.
 */
@Component({
  selector: 'article[wwMetric]',
  standalone: true,
  imports: [IconComponent],
  host: { class: 'metric', '[class.metric-monthly]': 'highlighted()' },
  template: `
    <div class="metric-label">
      <span class="metric-symbol" [class]="tone()"><ww-icon [name]="icon()" /></span>
      {{ label() }}
      @if (tag()) {
        <span class="estimate-tag">{{ tag() }}</span>
      }
    </div>
    <div class="metric-value">
      {{ value() }}
      @if (unit()) {
        <span
          >{{ unit() }}<span class="metric-suffix"> {{ suffix() }}</span></span
        >
      } @else if (suffix()) {
        <span class="metric-suffix"> {{ suffix() }}</span>
      }
    </div>
    @if (hint()) {
      <p>{{ hint() }}</p>
    }
  `,
})
export class MetricComponent {
  label = input.required<string>();
  value = input.required<string>();
  unit = input('');
  suffix = input('');
  hint = input('');
  tag = input('');
  icon = input('bolt');
  tone = input<'peach' | 'sage' | 'cream'>('peach');
  highlighted = input(false);
}
