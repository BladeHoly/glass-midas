import { GlassElement } from './base.js';

const stored = (key: string) => {
  try {
    return localStorage.getItem(`gm-tip:${key}`);
  } catch {
    return null;
  }
};

/**
 * `<gm-tip heading="Search everything" remember="search" anchor="search">…</gm-tip>`: a tip that
 * teaches one thing, on frosted glass, with a close button.
 *
 * - In the flow of the page by default; with `anchor`, it floats next to the element with that
 *   id, `placement="bottom"` or `"top"`, with an arrow pointing at it.
 * - Closing it fires a cancelable `gm-dismiss`. With `remember`, a closed tip stays closed on
 *   later visits.
 * - A child with `slot="icon"` becomes its icon; `.gm-tip-actions` holds buttons (chips).
 *
 * The host only positions: the glass is `.gm-tip-card`, and the arrow is its sibling with its own
 * frost, since glass inside glass can't see the page.
 */
export class GmTip extends GlassElement {
  static glassDefaults = { radius: 22, bezel: 16, thickness: 30 };

  #card: HTMLDivElement | undefined;
  #frame = 0;
  #place = () => {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#position());
  };

  protected get glassTarget(): HTMLElement {
    return this.#card ?? this;
  }

  protected setup() {
    if (!this.hasAttribute('material')) this.setAttribute('material', 'frost');
    if (!this.hasAttribute('role')) this.setAttribute('role', 'note');
    const key = this.getAttribute('remember');
    if (key && stored(key) === 'dismissed') this.hidden = true;

    const card = document.createElement('div');
    card.className = 'gm-tip-card';
    const icon = this.querySelector(':scope > [slot="icon"]');
    card.append(...[...this.childNodes].filter((n) => n !== icon));
    const heading = this.getAttribute('heading');
    if (heading) {
      const p = document.createElement('p');
      p.className = 'gm-tip-heading';
      p.textContent = heading;
      card.prepend(p);
    }
    if (icon) card.prepend(icon);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'gm-tip-close';
    close.setAttribute('aria-label', this.getAttribute('label-close') ?? 'Dismiss tip');
    close.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    close.addEventListener('click', () => this.dismiss());
    card.append(close);
    this.#card = card;

    if (this.hasAttribute('anchor')) {
      const arrow = document.createElement('span');
      arrow.className = 'gm-tip-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      this.append(arrow, card);
      addEventListener('scroll', this.#place, { passive: true, capture: true });
      addEventListener('resize', this.#place);
      this.#place();
    } else {
      this.append(card);
    }
  }

  protected teardown() {
    cancelAnimationFrame(this.#frame);
    removeEventListener('scroll', this.#place, { capture: true });
    removeEventListener('resize', this.#place);
    // Put the content back as it was written, so a reconnect builds the tip again.
    const card = this.#card;
    if (card) {
      card.querySelector(':scope > .gm-tip-heading')?.remove();
      card.querySelector(':scope > .gm-tip-close')?.remove();
      this.replaceChildren(...card.childNodes);
    }
    this.#card = undefined;
  }

  /** Closes the tip, unless a `gm-dismiss` listener cancels it; remembers it with `remember`. */
  dismiss() {
    const event = new CustomEvent('gm-dismiss', { cancelable: true, bubbles: true });
    if (!this.dispatchEvent(event)) return;
    this.hidden = true;
    const key = this.getAttribute('remember');
    if (key) {
      try {
        localStorage.setItem(`gm-tip:${key}`, 'dismissed');
      } catch {}
    }
  }

  /** Shows the tip again, and forgets that it was closed. */
  show() {
    const key = this.getAttribute('remember');
    if (key) {
      try {
        localStorage.removeItem(`gm-tip:${key}`);
      } catch {}
    }
    this.hidden = false;
    if (this.hasAttribute('anchor')) this.#place();
  }

  // Next to the anchor, centered on it but kept inside the viewport, the arrow on its middle.
  #position() {
    const target = document.getElementById(this.getAttribute('anchor') ?? '');
    if (!target || this.hidden) return;
    const gap = 12;
    const margin = 8;
    const a = target.getBoundingClientRect();
    const width = this.offsetWidth;
    const height = this.offsetHeight;
    const above = this.getAttribute('placement') === 'top';
    const center = a.left + a.width / 2;
    // Kept inside the viewport; a tip wider than it stays on the left margin rather than off it.
    const left = Math.max(Math.min(center - width / 2, innerWidth - width - margin), margin);
    const top = above ? a.top - height - gap : a.bottom + gap;
    // Fixed is how an anchored tip works, not a style: inline, so no page rule can undo it.
    this.style.position = 'fixed';
    this.style.left = `${left}px`;
    this.style.top = `${top}px`;
    this.style.setProperty('--gm-tip-arrow', `${center - left}px`);
  }
}
