import { describe, expect, it } from 'vitest';
import {
  docs,
  find,
  list,
  nextSteps,
  pick,
  resolve,
  resolveTemplate,
  search,
  setup,
  template,
  templates,
  type Fetch,
  type Page,
  type Template,
} from './commands.js';

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

describe('templates', () => {
  const cart: Template = {
    name: 'cart',
    title: 'Cart',
    group: 'Store',
    description: 'Every cost before checkout.',
    files: [
      { from: 'cart/cart.html', to: 'cart.html' },
      { from: 'cart/cart.js', to: 'cart.js' },
      { from: 'cart/cart.css', to: 'cart.css' },
      { from: 'cart/CartPage.tsx', to: 'CartPage.tsx' },
      { from: 'shared/shop.js', to: 'shop.js' },
      { from: 'shared/shop.d.ts', to: 'shop.d.ts' },
      { from: 'shared/ShopKit.tsx', to: 'ShopKit.tsx' },
      { from: 'shared/ondine.css', to: 'ondine.css' },
      { from: 'shared/art/sigil.svg', to: 'art/sigil.svg' },
    ],
  };
  const signIn: Template = { ...cart, name: 'sign-in', title: 'Sign in', group: 'Auth', files: [] };
  const shelf: Fetch = async (path) => {
    if (path === 't/manifest.json') return JSON.stringify([signIn, cart]);
    throw new Error(`404 for ${path}`);
  };
  const bytes = async (path: string) => new TextEncoder().encode(path);

  it('lists them by group', async () => {
    const out = await templates(shelf);
    expect(out).toContain('## Auth');
    expect(out).toContain('- **Cart** (`cart`): Every cost before checkout.');
    expect(JSON.parse(await templates(shelf, true))[1]).not.toHaveProperty('files');
  });

  it('finds one by name or title', () => {
    expect(resolveTemplate([signIn, cart], 'Sign in')?.name).toBe('sign-in');
    expect(resolveTemplate([signIn, cart], 'cart.html')?.name).toBe('cart');
    expect(resolveTemplate([signIn, cart], 'basket')).toBeUndefined();
  });

  it('picks the files each flavor needs', () => {
    const names = (flavor: 'html' | 'react' | 'both') => pick(cart, flavor).map((f) => f.to);
    expect(names('html')).toEqual([
      'cart.html',
      'cart.js',
      'cart.css',
      'shop.js',
      'ondine.css',
      'art/sigil.svg',
    ]);
    expect(names('react')).toEqual([
      'cart.css',
      'CartPage.tsx',
      'shop.js',
      'shop.d.ts',
      'ShopKit.tsx',
      'ondine.css',
      'art/sigil.svg',
    ]);
    expect(names('both')).toHaveLength(9);
  });

  it('fetches the files from t/, and says what to do next', async () => {
    const { template: t, files } = await template(shelf, bytes, 'cart', 'html');
    expect(t.name).toBe('cart');
    expect(new TextDecoder().decode(files[0]!.data)).toBe('t/cart/cart.html');
    const next = nextSteps(t, 'both', 'cart');
    expect(next).toContain('Open `cart/cart.html` in a browser');
    expect(next).toContain('render `<CartPage />` from `cart/CartPage`');
    expect(nextSteps(t, 'html', 'cart')).not.toContain('React');
    await expect(template(shelf, bytes, 'basket')).rejects.toThrow('There are: sign-in, cart.');
  });
});
