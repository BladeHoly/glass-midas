import type { APIRoute } from 'astro';
import { readingOrder, toMarkdown } from '../lib/site';

// Every page's Markdown by id, for tools that search the text (the CLI's find).
export const GET: APIRoute = async () => {
  const pages = (await readingOrder()).map((d) => ({ id: d.id, markdown: toMarkdown(d) }));
  return new Response(JSON.stringify(pages), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
