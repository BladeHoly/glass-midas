import { Base } from './base.js';

/**
 * `<gm-slider><input type="range" min="0" max="100" value="40"></gm-slider>`: a range on a light
 * track, filled up to its value, with a knob that stretches while held. The native input does the
 * work (keyboard, forms, screen readers); this paints the fill. It isn't glass: like a chip, it
 * sits inside glass.
 */
export class GmSlider extends Base {
  #input: HTMLInputElement | null = null;

  connectedCallback() {
    this.#input = this.querySelector('input[type="range"]');
    this.#input?.addEventListener('input', this.sync);
    this.sync();
  }

  disconnectedCallback() {
    this.#input?.removeEventListener('input', this.sync);
  }

  /** Repaints the fill; call it after setting the input's value from code. */
  sync = () => {
    const input = this.#input;
    if (!input) return;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const ratio = max > min ? (Number(input.value) - min) / (max - min) : 0;
    this.style.setProperty('--gm-fill', `${ratio * 100}%`);
  };
}
