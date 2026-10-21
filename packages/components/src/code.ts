import { GlassElement } from './base.js';

/**
 * `<gm-code><pre>…</pre></gm-code>`: a code block on lite glass with a copy button.
 * `label-copy` and `label-copied` translate the button.
 */
export class GmCode extends GlassElement {
  static glassDefaults = { radius: 16 };
  static lite = true;

  #button: HTMLButtonElement | undefined;
  #reset: ReturnType<typeof setTimeout> | undefined;

  protected setup() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gm-copy';
    button.textContent = this.getAttribute('label-copy') ?? 'Copy';
    button.addEventListener('click', () => this.copy());
    this.append(button);
    this.#button = button;
  }

  protected teardown() {
    clearTimeout(this.#reset);
    this.#button?.remove();
  }

  /** Copies the code to the clipboard and confirms it on the button. */
  async copy() {
    const code = this.querySelector('pre')?.innerText ?? '';
    const button = this.#button;
    if (!button) return;
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = this.getAttribute('label-copied') ?? 'Copied';
    } catch {
      // No clipboard access (an insecure page, a denied permission): select it to copy by hand.
      const pre = this.querySelector('pre');
      if (pre) getSelection()?.selectAllChildren(pre);
    }
    clearTimeout(this.#reset);
    this.#reset = setTimeout(() => {
      button.textContent = this.getAttribute('label-copy') ?? 'Copy';
    }, 1600);
  }
}
