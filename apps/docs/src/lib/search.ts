import type { GmSearch, SearchResult } from '@glass-midas/components';

interface Pagefind {
  options(o: { baseUrl: string }): Promise<void>;
  debouncedSearch(q: string): Promise<{ results: { data(): Promise<PagefindData> }[] } | null>;
}
interface PagefindData {
  url: string;
  plain_excerpt: string;
  meta: { title: string };
}

const base = import.meta.env.BASE_URL;
// Pagefind's excerpts come HTML-encoded; the result list renders text.
const decode = (s: string) =>
  new DOMParser().parseFromString(s, 'text/html').body.textContent ?? '';

let pagefind: Promise<Pagefind | null> | undefined;
const loadPagefind = () =>
  (pagefind ??= import(/* @vite-ignore */ `${base}pagefind/pagefind.js`)
    .then(async (pf: Pagefind) => {
      await pf.options({ baseUrl: base });
      return pf;
    })
    // No index in development (it's built after the site): fall back to page titles.
    .catch(() => null));

/** Wires the header search to Pagefind, or to the page list when there's no index. */
export function setupSearch() {
  const search = document.querySelector<GmSearch>('gm-search');
  const json = document.getElementById('gm-pages')?.textContent;
  if (!search || !json) return;
  const pages: SearchResult[] = JSON.parse(json);

  search.source = async (query) => {
    if (!query) return pages.slice(0, 6);
    const pf = await loadPagefind();
    if (!pf) {
      const q = query.toLowerCase();
      return pages.filter((p) => `${p.label} ${p.hint}`.toLowerCase().includes(q));
    }
    const found = await pf.debouncedSearch(query);
    if (!found) return []; // a newer query took over
    const data = await Promise.all(found.results.slice(0, 8).map((r) => r.data()));
    return data.map((d) => ({ label: d.meta.title, href: d.url, hint: decode(d.plain_excerpt) }));
  };
}
