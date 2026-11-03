import { define, GlassElement } from './base.js';

export interface ToastOptions {
  /** A button next to the message, as a chip. */
  action?: { label: string; onClick: () => void };
  /** How long it shows, in ms; 0 keeps it until dismissed. */
  duration?: number;
  /**
   * Toasts with the same key don't stack: a new one updates the one on screen (its message and
   * action) and starts its time again. For things that add up, like «3 files saved».
   */
  key?: string;
}

/**
 * `<gm-toast duration="4000">Saved</gm-toast>`: a short message on frosted glass that goes away on
 * its own, waiting while the pointer or focus is on it. Usually made with `toast()`.
 * Dismissing it fires `gm-dismiss`.
 */
export class GmToast extends GlassElement {
  static glassDefaults = { radius: 22, bezel: 14, thickness: 26 };

  #timer: ReturnType<typeof setTimeout> | undefined;
  #left = 0;
  #since = 0;
  #pause = () => {
    clearTimeout(this.#timer);
    this.#left -= Date.now() - this.#since;
  };
  #resume = () => this.#start(this.#left);

  protected setup() {
    if (!this.hasAttribute('material')) this.setAttribute('material', 'frost');
    this.setAttribute('role', 'status');
    for (const type of ['pointerenter', 'focusin']) this.addEventListener(type, this.#pause);
    for (const type of ['pointerleave', 'focusout']) this.addEventListener(type, this.#resume);
    this.#start(Number(this.getAttribute('duration') ?? 4000));
  }

  protected teardown() {
    clearTimeout(this.#timer);
  }

  #start(ms: number) {
    clearTimeout(this.#timer);
    this.#left = ms;
    this.#since = Date.now();
    if (ms > 0) this.#timer = setTimeout(() => this.dismiss(), ms);
  }

  /** Changes its message and starts its time again (`toast()` does it for a repeated `key`). */
  update(message: string, duration = Number(this.getAttribute('duration') ?? 4000)) {
    const text = this.querySelector(':scope > span');
    if (text) text.textContent = message;
    this.setAttribute('duration', String(duration));
    this.#start(duration);
  }

  /** Fades it out and removes it. */
  dismiss() {
    if (this.hasAttribute('leaving')) return;
    this.setAttribute('leaving', '');
    this.dispatchEvent(new CustomEvent('gm-dismiss', { bubbles: true }));
    setTimeout(() => this.remove(), 200);
  }
}

/**
 * Shows a toast at the bottom of the page, above the others (three at most), and returns it.
 * The region they stack in is announced politely to screen readers.
 */
export function toast(message: string, options: ToastOptions = {}): GmToast {
  let region = document.querySelector<HTMLElement>('.gm-toasts');
  if (!region) {
    region = document.createElement('div');
    region.className = 'gm-toasts';
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  if (options.key) {
    const same = [...region.querySelectorAll<GmToast>('gm-toast:not([leaving])')].find(
      (t) => t.dataset.key === options.key,
    );
    if (same) {
      same.querySelector(':scope > button.gm-chip')?.remove();
      addAction(same, options.action);
      same.update(message, options.duration ?? 4000);
      return same;
    }
  }
  const el = document.createElement('gm-toast') as GmToast;
  if (options.key) el.dataset.key = options.key;
  el.setAttribute('duration', String(options.duration ?? 4000));
  const text = document.createElement('span');
  text.textContent = message;
  el.append(text);
  addAction(el, options.action);
  region.append(el);
  const shown = region.querySelectorAll<GmToast>('gm-toast:not([leaving])');
  if (shown.length > 3) shown[0]!.dismiss();
  return el;
}

function addAction(el: GmToast, action: ToastOptions['action']) {
  if (!action) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'gm-chip';
  button.textContent = action.label;
  button.addEventListener('click', () => {
    action.onClick();
    el.dismiss();
  });
  el.append(button);
}

define('gm-toast', GmToast);
