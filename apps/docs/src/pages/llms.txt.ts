import type { APIRoute } from 'astro';
import { sidebar, url } from '../lib/site';

// The llms.txt index (https://llmstxt.org): what the project is, then every page as Markdown.
export const GET: APIRoute = async ({ site }) => {
  const abs = (path: string) => new URL(url(path), site).href;
  const lines = [
    '# glass-midas',
    '',
    '> A Liquid Glass style system for the web: design tokens, a refraction engine with fallbacks (refract, blur, solid tiers), headless primitives, React bindings, a WebGL renderer and glass Web Components.',
    '',
    `Every page is available as Markdown at its URL plus \`.md\`. All pages in one file: ${abs('/llms-full.txt')}`,
  ];
  for (const section of await sidebar()) {
    lines.push('', `## ${section.label}`, '');
    for (const d of section.docs) {
      lines.push(`- [${d.data.title}](${abs(`/${d.id}.md`)}): ${d.data.description}`);
    }
  }
  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
