import type { APIRoute } from 'astro';
import { sidebar } from '../lib/site';

// The page index for tools (the CLI, agents): every page with its section and Markdown path.
export const GET: APIRoute = async () => {
  const pages = (await sidebar()).flatMap((section) =>
    section.docs.map((d) => ({
      id: d.id,
      title: d.data.title,
      label: d.data.label ?? d.data.title,
      description: d.data.description,
      section: section.label,
      element: d.data.element,
      markdown: `${d.id}.md`,
    })),
  );
  return new Response(JSON.stringify(pages, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
