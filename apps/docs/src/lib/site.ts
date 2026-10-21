import { getCollection, type CollectionEntry } from 'astro:content';

export type Doc = CollectionEntry<'docs'>;

/** Sidebar sections, in order, by folder. Pages at the top level go under "More". */
export const SECTIONS: [folder: string, label: string][] = [
  ['getting-started', 'Getting started'],
  ['concepts', 'Concepts'],
  ['components', 'Components'],
  ['reference', 'Reference'],
  ['', 'More'],
];

/** A path under the site's base. */
export const url = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;

export const docPath = (doc: Doc) => `/${doc.id}/`;

const folderOf = (doc: Doc) => (doc.id.includes('/') ? doc.id.split('/')[0]! : '');

export async function sidebar() {
  const docs = await getCollection('docs');
  return SECTIONS.map(([folder, label]) => ({
    label,
    docs: docs
      .filter((d) => folderOf(d) === folder)
      .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title)),
  })).filter((s) => s.docs.length);
}

/** Every page in reading order. */
export async function readingOrder() {
  return (await sidebar()).flatMap((s) => s.docs);
}

/** An MDX page as plain Markdown, for agents: no imports, demos as their source. */
export function toMarkdown(doc: Doc) {
  const body = (doc.body ?? '')
    .replace(/^import .*$\n?/gm, '')
    // Demos become their source; playgrounds go (their markup is under Usage).
    .replace(/<Demo[\s\S]*?html=\{`([\s\S]*?)`\}[\s\S]*?\/>/g, '```html\n$1\n```')
    .replace(/<Playground[\s\S]*?\n\/>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const lines = [`# ${doc.data.title}`, '', `> ${doc.data.description}`, '', body];
  const table = (
    title: string,
    rows: { name: string; type?: string; default?: string; description: string }[],
  ) => {
    if (!rows.length) return;
    lines.push(
      '',
      `## ${title}`,
      '',
      '| Name | Type | Default | Description |',
      '| --- | --- | --- | --- |',
    );
    for (const r of rows) {
      lines.push(
        `| \`${r.name}\` | ${r.type ? `\`${r.type}\`` : ''} | ${r.default ? `\`${r.default}\`` : ''} | ${r.description} |`,
      );
    }
  };
  table('Attributes', doc.data.attributes);
  table('Properties', doc.data.properties);
  table('Events', doc.data.events);
  table('Methods', doc.data.methods);
  return lines.join('\n') + '\n';
}
