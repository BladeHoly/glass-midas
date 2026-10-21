/** One page of the docs, as listed in the site's docs.json. */
export interface Page {
  id: string;
  title: string;
  label: string;
  description: string;
  section: string;
  element?: string;
  markdown: string;
}

/** Reads a path under the docs site, as text. */
export type Fetch = (path: string) => Promise<string>;

export const DEFAULT_SITE = 'https://bladeholy.github.io/glass-midas/';

/** Fetches from the published docs, or from GLASS_MIDAS_DOCS (a local build, a fork). */
export function siteFetch(site = DEFAULT_SITE): Fetch {
  const base = site.endsWith('/') ? site : `${site}/`;
  return async (path) => {
    const res = await fetch(new URL(path, base));
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${new URL(path, base)}`);
    return res.text();
  };
}

const index = async (get: Fetch): Promise<Page[]> => JSON.parse(await get('docs.json'));

// Chips are a class, not an element: shown as written.
const tag = (e: string) => (e.startsWith('.') ? e : `<${e}>`);
const row = (p: Page) =>
  `- **${p.label}**${p.element ? ` \`${tag(p.element)}\`` : ''}: ${p.description} (\`${p.id}\`)`;

/** Components, or every page with "all". */
export async function list(get: Fetch, which = 'components', json = false) {
  const pages = await index(get);
  const shown =
    which === 'all' ? pages : pages.filter((p) => p.section.toLowerCase() === which.toLowerCase());
  if (json) return JSON.stringify(shown, null, 2);
  if (!shown.length) return `No pages in "${which}". Sections: ${sections(pages)}, or "all".`;
  return shown.map(row).join('\n');
}

const sections = (pages: Page[]) => [...new Set(pages.map((p) => p.section))].join(', ');

/** The page a name means: its id or the end of it, its element, its title or label. */
export function resolve(pages: Page[], name: string): Page | undefined {
  const n = name.toLowerCase().replace(/^\/|\/$|\.md$/g, '');
  const tag = n.replace(/^<|>$/g, '');
  return (
    pages.find((p) => p.id === n) ??
    pages.find((p) => p.element === tag) ??
    pages.find((p) => p.id.endsWith(`/${n}`)) ??
    pages.find((p) => p.label.toLowerCase() === n || p.title.toLowerCase() === n)
  );
}

/** A page as Markdown. */
export async function docs(get: Fetch, name: string) {
  const pages = await index(get);
  const page = resolve(pages, name);
  if (!page) {
    const near = find(pages, name).slice(0, 5);
    throw new Error(
      `No page "${name}".${near.length ? ` Did you mean: ${near.map((p) => p.id).join(', ')}?` : ' Try `glass-midas list all`.'}`,
    );
  }
  return get(page.markdown);
}

/** Pages whose title, label, element or description mention every word of the query. */
export function find(pages: Page[], query: string, texts: Record<string, string> = {}) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const all = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const named = pages.filter((p) =>
    all(`${p.title} ${p.label} ${p.element ?? ''} ${p.description}`),
  );
  // Pages that only mention it in their text come after the ones named for it.
  const mentioned = pages.filter((p) => !named.includes(p) && all(texts[p.id] ?? ''));
  return [...named, ...mentioned];
}

/** Pages that match by name and description first, then by their text. */
export async function search(get: Fetch, query: string, json = false) {
  const [pages, full] = await Promise.all([index(get), get('docs-full.json')]);
  const texts: Record<string, string> = Object.fromEntries(
    (JSON.parse(full) as { id: string; markdown: string }[]).map((p) => [p.id, p.markdown]),
  );
  const found = find(pages, query, texts);
  if (json) return JSON.stringify(found, null, 2);
  return found.length ? found.map(row).join('\n') : `Nothing matches "${query}".`;
}

export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm';
export type Framework = 'html' | 'react' | 'astro';

const install = (pm: PackageManager, pkgs: string) =>
  pm === 'npm' ? `npm install ${pkgs}` : `${pm} add ${pkgs}`;

/** How to install and load glass-midas in a kind of project. Needs no network. */
export function setup(framework: Framework, pm: PackageManager) {
  const tokens = `import { tokensToCss } from '@glass-midas/core';\n\ndocument.head.insertAdjacentHTML('beforeend', \`<style>\${tokensToCss()}</style>\`);`;
  const steps: Record<Framework, string> = {
    html: `## Install

\`\`\`sh
${install(pm, '@glass-midas/core @glass-midas/components')}
\`\`\`

## Load it once

\`\`\`ts
import '@glass-midas/components';
import '@glass-midas/components/styles.css';
${tokens}
\`\`\`

## Use it

\`\`\`html
<gm-search hotkey="k" material="frost"></gm-search>
<gm-callout type="tip" heading="Glass">It works.</gm-callout>
\`\`\`

No bundler? Load \`https://cdn.jsdelivr.net/npm/@glass-midas/components/+esm\` in a module script and its \`src/styles.css\`.`,
    react: `## Install

\`\`\`sh
${install(pm, '@glass-midas/core @glass-midas/components @glass-midas/react')}
\`\`\`

## Load it once (your entry file)

\`\`\`ts
import '@glass-midas/components/styles.css';
${tokens}
\`\`\`

## Use it

\`\`\`tsx
import { GlassCallout, GlassSearch } from '@glass-midas/react/components';

<GlassSearch hotkey="k" material="frost" source={(q) => results(q)} onSelect={(e) => go(e.detail.href)} />
<GlassCallout type="tip" heading="Glass">It works.</GlassCallout>
\`\`\`

For your own elements: \`useGlass(ref, options)\` or \`<Glass glass={options}>\` from \`@glass-midas/react\`.`,
    astro: `## Install

\`\`\`sh
${install(pm, '@glass-midas/core @glass-midas/components')}
\`\`\`

## Load it once (your layout)

\`\`\`astro
---
import { tokensToCss } from '@glass-midas/core';
import '@glass-midas/components/styles.css';
---
<style is:inline set:html={tokensToCss()}></style>
<script>import '@glass-midas/components';</script>
\`\`\`

## Use it

The elements render on the server as plain markup and come alive in the browser:

\`\`\`astro
<gm-callout type="tip" heading="Glass">It works.</gm-callout>
\`\`\``,
  };
  return `# glass-midas in ${framework === 'html' ? 'plain HTML' : framework === 'react' ? 'React' : 'Astro'}\n\n${steps[framework]}\n`;
}
