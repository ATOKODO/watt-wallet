import { Directive, input } from '@angular/core';

/** Native button styling shared by the application and the component catalogue.
 * Keep native type, disabled, focus and click behavior on the button itself.
 */
@Directive({
  selector: 'button[wwButton]',
  standalone: true,
  host: {
    class: 'btn',
    '[class.primary]': "wwButton() === 'primary'",
    '[class.secondary]': "wwButton() === 'secondary'",
    '[class.small]': "wwButtonSize() === 'small'",
  },
})
export class ButtonDirective {
  /** Primary for the main action; secondary for supporting actions. */
  wwButton = input<'primary' | 'secondary'>('secondary');
  /** Compact controls use the small size. */
  wwButtonSize = input<'regular' | 'small'>('regular');
}
