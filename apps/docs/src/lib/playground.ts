/** One control of a playground: a set of options (chips) or a range (slider). */
export interface Control {
  /** The attribute it sets. */
  name: string;
  /** Choices, shown as chips. */
  options?: string[];
  /** A slider from min to max. */
  min?: number;
  max?: number;
  step?: number;
  /** The starting value. Equal to `omit`, the attribute is left out. */
  value: string | number;
  /** The value that means "no attribute": the component's default, or "auto". */
  omit?: string | number;
  /** Also sets this CSS property, in px, so a radius matches the border-radius. */
  style?: string;
}

export interface PlaygroundState {
  tag: string;
  /** Fixed attributes, written before the controlled ones. */
  attrs: Record<string, string>;
  /** Controlled attributes and their current values. */
  values: Record<string, string>;
  controls: Control[];
  inner: string;
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The attributes as written: fixed ones, then every control not at its omitted value. */
export function attributes(state: PlaygroundState): [string, string][] {
  const value = (c: Control) => state.values[c.name]!;
  const styles = state.controls.filter((c) => c.style).map((c) => `${c.style}: ${value(c)}px`);
  // A control that drives a style merges it into the fixed style, written last.
  const fixed = Object.entries(state.attrs).filter(([n]) => !(n === 'style' && styles.length));
  const controlled = state.controls
    .filter((c) => c.omit === undefined || String(c.omit) !== value(c))
    .map((c): [string, string] => [c.name, value(c)]);
  const base = state.attrs.style ? [state.attrs.style.replace(/;\s*$/, '')] : [];
  const style: [string, string][] = styles.length
    ? [['style', [...base, ...styles].join('; ')]]
    : [];
  return [...fixed, ...controlled, ...style];
}

/** The element's source, highlighted, safe to put in `innerHTML`. */
export function highlight(state: PlaygroundState) {
  const attrs = attributes(state)
    .map(
      ([name, value]) =>
        ` <span class="tok-attr">${name}</span>=<span class="tok-str">"${escape(value)}"</span>`,
    )
    .join('');
  const open = `<span class="tok-tag">&lt;${state.tag}</span>${attrs}<span class="tok-tag">&gt;</span>`;
  const close = `<span class="tok-tag">&lt;/${state.tag}&gt;</span>`;
  const inner = state.inner
    .trim()
    .split('\n')
    .map((line) => `  ${escape(line.trim())}`)
    .join('\n');
  return inner.trim() ? `${open}\n${inner}\n${close}` : `${open}${close}`;
}

/** The element's markup, for rendering it live. */
export function markup(state: PlaygroundState) {
  const attrs = attributes(state)
    .map(([name, value]) => ` ${name}="${value.replace(/"/g, '&quot;')}"`)
    .join('');
  return `<${state.tag}${attrs}>${state.inner}</${state.tag}>`;
}

export function initialState(
  tag: string,
  attrs: Record<string, string>,
  controls: Control[],
  inner: string,
): PlaygroundState {
  const values = Object.fromEntries(controls.map((c) => [c.name, String(c.value)]));
  return { tag, attrs, values, controls, inner };
}
