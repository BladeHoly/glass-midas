import { GlassElement } from './base.js';

const MIN_THUMB = 56;

/**
 * `<gm-scrollbar>`: a glass scroll thumb for the page. It mirrors and drives the page's own
 * scroll, so the keyboard, wheel and touch keep working; the stylesheet hides the native
 * scrollbar while it's present, with a mouse. With a smooth-scroll library, set `scroller`
 * so dragging goes through it.
 */
export class GmScrollbar extends GlassElement {
  static glassDefaults = { radius: 999, bezel: 5, thickness: 10, blur: '0px', specular: 0.5 };

  /** Scrolls the page to `y` immediately; replace it to route through a smooth-scroll library. */
  scroller = (y: number) => scrollTo({ top: y, behavior: 'instant' });

  #frame = 0;
  #drag: { startY: number; startScroll: number } | null = null;
  #observer: ResizeObserver | undefined;
  #sync = () => {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => {
      const page = document.documentElement.scrollHeight;
      const view = innerHeight;
      this.hidden = page <= view + 1;
      if (this.hidden) return;
      const height = Math.max(MIN_THUMB, (view / page) * (view - 16));
      const top = 8 + (scrollY / (page - view)) * (view - 16 - height);
      this.style.height = `${height}px`;
      this.style.transform = `translateY(${top}px)`;
    });
  };

  protected setup() {
    this.setAttribute('aria-hidden', 'true');
    addEventListener('scroll', this.#sync, { passive: true });
    addEventListener('resize', this.#sync);
    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver(this.#sync);
      this.#observer.observe(document.body);
    }
    this.addEventListener('pointerdown', this.#down);
    this.addEventListener('pointermove', this.#move);
    this.addEventListener('pointerup', this.#up);
    this.addEventListener('pointercancel', this.#up);
    this.#sync();
  }

  protected teardown() {
    cancelAnimationFrame(this.#frame);
    removeEventListener('scroll', this.#sync);
    removeEventListener('resize', this.#sync);
    this.#observer?.disconnect();
  }

  #down = (e: PointerEvent) => {
    this.setPointerCapture(e.pointerId);
    this.#drag = { startY: e.clientY, startScroll: scrollY };
    this.toggleAttribute('dragging', true);
  };

  #move = (e: PointerEvent) => {
    const d = this.#drag;
    if (!d) return;
    const track = innerHeight - 16 - this.offsetHeight;
    const ratio = (document.documentElement.scrollHeight - innerHeight) / Math.max(track, 1);
    this.scroller(d.startScroll + (e.clientY - d.startY) * ratio);
  };

  #up = () => {
    this.#drag = null;
    this.toggleAttribute('dragging', false);
  };
}
