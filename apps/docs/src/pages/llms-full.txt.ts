import type { APIRoute } from 'astro';
import { readingOrder, toMarkdown } from '../lib/site';

// Every page as Markdown in one file, in reading order.
export const GET: APIRoute = async () => {
  const pages = (await readingOrder()).map(toMarkdown);
  return new Response(pages.join('\n---\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
