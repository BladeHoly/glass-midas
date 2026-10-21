import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { toMarkdown, type Doc } from '../lib/site';

// Every page as Markdown at the same path plus `.md`, for agents and copy-paste.
export async function getStaticPaths() {
  const docs = await getCollection('docs');
  return docs.map((doc) => ({ params: { slug: doc.id }, props: { doc } }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(toMarkdown((props as { doc: Doc }).doc), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
