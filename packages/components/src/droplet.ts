import { createGlass, type GlassHandle } from '@glass-midas/core';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const reduceMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A glass droplet that slides under the item it marks on a spring, stretching along the way
 * it moves like a drop of liquid. It sits under the item's text (z-index 0 vs 1), as thin clear
 * glass, so the label stays crisp.
 */
export class Droplet {
  readonly el: HTMLSpanElement;
  #glass: GlassHandle;
  #target: () => Box | undefined;
  #s = { x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, vw: 0, vh: 0 };
  #placed = false;
  #running = false;
  #until = 0;
  #observer: ResizeObserver | undefined;

  constructor(container: HTMLElement, target: () => Box | undefined, radius = 999) {
    this.#target = target;
    this.el = document.createElement('span');
    this.el.className = 'gm-droplet';
    this.el.setAttribute('aria-hidden', 'true');
    container.prepend(this.el);
    this.#glass = createGlass(this.el, {
      radius,
      bezel: 10,
      thickness: 16,
      caustics: false,
      blur: '0px',
      specular: 0.45,
      specularSaturation: 3,
    });
    // The items move when the container changes size (fonts loading, a resized window).
    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver(() => this.follow(200));
      this.#observer.observe(container);
    }
  }

  #apply(sx: number, sy: number) {
    const s = this.#s;
    this.el.style.width = `${s.w}px`;
    this.el.style.height = `${s.h}px`;
    this.el.style.transform = `translate(${s.x}px, ${s.y}px) scale(${sx}, ${sy})`;
  }

  /** Moves to the current target and keeps following it for at least `ms`. */
  follow(ms = 600) {
    const goal = this.#target();
    if (!goal) return;
    const s = this.#s;
    if (!this.#placed || reduceMotion()) {
      Object.assign(s, goal, { vx: 0, vy: 0, vw: 0, vh: 0 });
      this.#placed = true;
      this.#apply(1, 1);
      return;
    }
    this.#until = Math.max(this.#until, performance.now() + ms);
    if (this.#running) return;
    this.#running = true;
    let last = performance.now();
    const step = (now: number) => {
      const t = this.#target() ?? goal;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const k = 320; // stiffness
      const c = 28; // damping: a little bounce at the end
      for (const [p, v] of [
        ['x', 'vx'],
        ['y', 'vy'],
        ['w', 'vw'],
        ['h', 'vh'],
      ] as const) {
        s[v] += (k * (t[p] - s[p]) - c * s[v]) * dt;
        s[p] += s[v] * dt;
      }
      this.#apply(
        1 + Math.min(0.3, Math.abs(s.vx) / 2600),
        1 + Math.min(0.3, Math.abs(s.vy) / 2600),
      );
      const close =
        Math.abs(t.x - s.x) + Math.abs(t.y - s.y) + Math.abs(t.w - s.w) + Math.abs(t.h - s.h) <
          0.6 && Math.abs(s.vx) + Math.abs(s.vy) < 10;
      if (close && now > this.#until) {
        Object.assign(s, t, { vx: 0, vy: 0, vw: 0, vh: 0 });
        this.#running = false;
        this.#apply(1, 1);
      } else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  destroy() {
    this.#observer?.disconnect();
    this.#glass.destroy();
    this.el.remove();
  }
}

/** An element's box relative to its offset parent, for a droplet target. */
export const boxOf = (el: HTMLElement): Box => ({
  x: el.offsetLeft,
  y: el.offsetTop,
  w: el.offsetWidth,
  h: el.offsetHeight,
});
