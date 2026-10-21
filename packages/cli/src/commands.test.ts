import { describe, expect, it } from 'vitest';
import { docs, find, list, resolve, search, setup, type Fetch, type Page } from './commands.js';

const pages: Page[] = [
  {
    id: 'concepts/tiers',
    title: 'Tiers',
    label: 'Tiers',
    description: 'How glass-midas picks between refraction, blur and solid.',
    section: 'Concepts',
    markdown: 'concepts/tiers.md',
  },
  {
    id: 'components/search',
    title: 'Search',
    label: 'Search',
    description: 'A glass search box, with results from any source.',
    section: 'Components',
    element: 'gm-search',
    markdown: 'components/search.md',
  },
  {
    id: 'components/nav',
    title: 'Navigation',
    label: 'Nav',
    description: 'A glass bar of links with a liquid droplet.',
    section: 'Components',
    element: 'gm-nav',
    markdown: 'components/nav.md',
  },
];

// A site in memory: the index and one Markdown file per page.
const site: Fetch = async (path) => {
  if (path === 'docs.json') return JSON.stringify(pages);
  if (path === 'docs-full.json') {
    return JSON.stringify([{ id: 'components/search', markdown: 'Try material="frost".' }]);
  }
  const page = pages.find((p) => p.markdown === path);
  if (!page) throw new Error(`404 for ${path}`);
  return `# ${page.title}\n`;
};

describe('list', () => {
  it('lists the components by default', async () => {
    const out = await list(site);
    expect(out).toContain('**Search** `<gm-search>`');
    expect(out).toContain('**Nav** `<gm-nav>`');
    expect(out).not.toContain('Tiers');
  });

  it('lists every page with "all", or JSON', async () => {
    expect(await list(site, 'all')).toContain('Tiers');
    expect(JSON.parse(await list(site, 'concepts', true))).toHaveLength(1);
  });

  it('names the sections when one is unknown', async () => {
    expect(await list(site, 'recipes')).toContain('Sections: Concepts, Components');
  });
});

describe('resolve', () => {
  it('takes an id, its end, an element, a label or a title', () => {
    expect(resolve(pages, 'components/search')?.id).toBe('components/search');
    expect(resolve(pages, 'tiers')?.id).toBe('concepts/tiers');
    expect(resolve(pages, '<gm-nav>')?.id).toBe('components/nav');
    expect(resolve(pages, 'Navigation')?.id).toBe('components/nav');
    expect(resolve(pages, '/components/nav.md')?.id).toBe('components/nav');
  });
});

describe('docs', () => {
  it('returns the page as Markdown', async () => {
    expect(await docs(site, 'gm-search')).toBe('# Search\n');
  });

  it('suggests pages for an unknown name', async () => {
    await expect(docs(site, 'glass')).rejects.toThrow(
      /Did you mean: concepts\/tiers, components\/search, components\/nav/,
    );
  });
});

describe('find', () => {
  it('matches every word anywhere in a page', () => {
    expect(find(pages, 'glass droplet').map((p) => p.id)).toEqual(['components/nav']);
  });

  it('finds words in the text after names and descriptions', async () => {
    expect(await search(site, 'frost')).toContain('**Search** `<gm-search>`');
    // "source" is in the search box's description, and only in the tiers page's text.
    const order = find(pages, 'source', { 'concepts/tiers': 'a source' }).map((p) => p.id);
    expect(order).toEqual(['components/search', 'concepts/tiers']);
  });

  it('says when nothing matches', async () => {
    expect(await search(site, 'webgl')).toBe('Nothing matches "webgl".');
  });
});

describe('setup', () => {
  it('uses the project package manager', () => {
    expect(setup('react', 'pnpm')).toContain(
      'pnpm add @glass-midas/core @glass-midas/components @glass-midas/react',
    );
    expect(setup('html', 'npm')).toContain('npm install @glass-midas/core @glass-midas/components');
  });

  it('shows how to load it in Astro', () => {
    expect(setup('astro', 'yarn')).toContain('<style is:inline set:html={tokensToCss()}>');
  });
});
