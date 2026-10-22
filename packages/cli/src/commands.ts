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

No bundler? Load \`https://cdn.jsdelivr.net/npm/@glass-midas/components/+esm\` in a module script and its \`dist/styles.css\`.`,
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

/** One file of a template: where it is under the site's `t/`, and where it goes in a project. */
export interface TemplateFile {
  from: string;
  to: string;
}

/** A template, as listed in the site's `t/manifest.json`. */
export interface Template {
  name: string;
  title: string;
  group: string;
  description: string;
  files: TemplateFile[];
}

/** Which version of a template to copy: the plain page, the React twin, or both. */
export type Flavor = 'html' | 'react' | 'both';

const manifest = async (get: Fetch): Promise<Template[]> =>
  JSON.parse(await get('t/manifest.json'));

/** Every template, by group. */
export async function templates(get: Fetch, json = false) {
  const all = await manifest(get);
  if (json)
    return JSON.stringify(
      all.map(({ files: _, ...t }) => t),
      null,
      2,
    );
  const groups = [...new Set(all.map((t) => t.group))];
  return groups
    .map(
      (g) =>
        `## ${g}\n\n${all
          .filter((t) => t.group === g)
          .map((t) => `- **${t.title}** (\`${t.name}\`): ${t.description}`)
          .join('\n')}`,
    )
    .join('\n\n');
}

/** The template a name means: its name, or its title. */
export function resolveTemplate(all: Template[], name: string) {
  const n = name.toLowerCase().replace(/\.html$|\.tsx$/, '');
  return all.find((t) => t.name === n) ?? all.find((t) => t.title.toLowerCase() === n);
}

/**
 * The files to copy for a flavor. Plain HTML leaves out the React files (`.tsx`, and the `.d.ts`
 * that type the shared scripts for them); React leaves out the template's own page and script,
 * keeping the shared scripts its twin imports.
 */
export function pick(t: Template, flavor: Flavor): TemplateFile[] {
  const own = (f: TemplateFile) => f.from.startsWith(`${t.name}/`);
  return t.files.filter((f) => {
    if (flavor === 'both') return true;
    const react = f.to.endsWith('.tsx') || f.to.endsWith('.d.ts');
    if (flavor === 'html') return !react;
    return !(own(f) && (f.to.endsWith('.html') || f.to.endsWith('.js')));
  });
}

/** What to do after copying, for that flavor. */
export function nextSteps(t: Template, flavor: Flavor, dir: string) {
  const twin = t.files.find((f) => f.from.startsWith(`${t.name}/`) && f.to.endsWith('.tsx'));
  const component = twin?.to.replace(/\.tsx$/, '');
  // The brand and the shell first, the template's own sheet last, as the page loads them.
  const own = (f: TemplateFile) => Number(f.from.startsWith(`${t.name}/`));
  const css = t.files
    .filter((f) => f.to.endsWith('.css'))
    .sort((a, b) => own(a) - own(b))
    .map((f) => `${dir}/${f.to}`);
  const html = `Open \`${dir}/${t.name}.html\` in a browser: it loads the components from jsDelivr, nothing to install.`;
  const react = `In React, install \`@glass-midas/components\` and \`@glass-midas/react\`, load ${css
    .map((c) => `\`${c}\``)
    .join(
      ', ',
    )} once, render \`<${component} />\` from \`${dir}/${component}\`, and serve \`${dir}/art\` as your site's \`/art/\` (the public folder).`;
  return [
    `Copied **${t.title}** into \`${dir}\`.`,
    '',
    ...(flavor !== 'react' ? [`- ${html}`] : []),
    ...(flavor !== 'html' && component ? [`- ${react}`] : []),
    `- The brand lives in \`${dir}/ondine.css\`: change it, and the template takes yours.`,
  ].join('\n');
}

/** Bytes from the published site, for files that aren't text (pictures). */
export type FetchBytes = (path: string) => Promise<Uint8Array>;

export function siteBytes(site = DEFAULT_SITE): FetchBytes {
  const base = site.endsWith('/') ? site : `${site}/`;
  return async (path) => {
    const res = await fetch(new URL(path, base));
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${new URL(path, base)}`);
    return new Uint8Array(await res.arrayBuffer());
  };
}

/**
 * Fetches a template's files for a flavor, ready to write: each one's path in the project and its
 * bytes. Writing them is the caller's (the CLI's) job.
 */
export async function template(
  get: Fetch,
  bytes: FetchBytes,
  name: string,
  flavor: Flavor = 'both',
) {
  const all = await manifest(get);
  const t = resolveTemplate(all, name);
  if (!t)
    throw new Error(`No template "${name}". There are: ${all.map((x) => x.name).join(', ')}.`);
  // A few at a time: a template with its pictures is dozens of files.
  const wanted = pick(t, flavor);
  const files: { path: string; data: Uint8Array }[] = new Array(wanted.length);
  let next = 0;
  const worker = async () => {
    while (next < wanted.length) {
      const i = next++;
      const f = wanted[i]!;
      try {
        files[i] = { path: f.to, data: await bytes(`t/${f.from}`) };
      } catch (error) {
        throw new Error(`Couldn't fetch ${f.to}: ${(error as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, wanted.length) }, worker));
  return { template: t, files };
}
