import fs from 'node:fs';
import path from 'node:path';

/** A template as @glass-midas/templates' manifest lists it. */
export interface TemplateEntry {
  name: string;
  title: string;
  group: string;
  description: string;
  files: { from: string; to: string }[];
}

// The built templates, read at build time (the build copies them to public/t as well).
const root = path.resolve('../../templates/dist');

export const templates = (): TemplateEntry[] =>
  JSON.parse(fs.readFileSync(`${root}/manifest.json`, 'utf8'));

export function templateFiles(name: string) {
  const template = templates().find((t) => t.name === name);
  if (!template) throw new Error(`No template "${name}" in @glass-midas/templates`);
  return { template, root };
}

/** A template as Markdown, for agents: where it runs, and every file with its link. */
export function templateMarkdown(name: string, site: (p: string) => string) {
  const { template } = templateFiles(name);
  return [
    `Live: ${site(`/t/${name}/preview.html`)}`,
    '',
    'Files (copy them side by side; `art/` is a folder):',
    '',
    ...template.files.map((f) => `- [${f.to}](${site(`/t/${f.from}`)})`),
  ].join('\n');
}
