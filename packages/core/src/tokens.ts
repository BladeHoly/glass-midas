/** Design tokens. Every token is exposed as a CSS custom property `--gm-<group>-<name>`. */
export const tokens = {
  blur: { sm: '8px', md: '16px', lg: '28px' },
  /** Glass height in px for the refract tier; thicker glass bends more. */
  thickness: { thin: '12px', md: '24px', thick: '40px' },
  saturation: { md: '160%', lg: '200%' },
  tint: {
    light: 'rgb(255 255 255 / 0.18)',
    dark: 'rgb(20 20 28 / 0.32)',
    /** Opaque enough to read text on with no backdrop effect, for the solid tier. */
    solid: 'rgb(28 28 36 / 0.88)',
  },
  highlight: { edge: 'rgb(255 255 255 / 0.55)', glow: 'rgb(255 255 255 / 0.12)' },
  radius: { sm: '10px', md: '18px', lg: '28px', pill: '999px' },
} as const;

export type Tokens = typeof tokens;
export type TokenGroup = keyof Tokens;

export function tokenVar<G extends TokenGroup>(group: G, name: keyof Tokens[G] & string): string {
  return `var(--gm-${group}-${name})`;
}

/** Serializes the tokens as a CSS rule, ready to inject or write to a stylesheet. */
export function tokensToCss(selector = ':root', source: Tokens = tokens): string {
  const lines: string[] = [];
  for (const [group, values] of Object.entries(source)) {
    for (const [name, value] of Object.entries(values)) {
      lines.push(`  --gm-${group}-${name}: ${value};`);
    }
  }
  return `${selector} {\n${lines.join('\n')}\n}`;
}
