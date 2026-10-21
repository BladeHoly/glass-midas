import { satteri } from '@astrojs/markdown-satteri';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { defineMdastPlugin } from 'satteri';

// Served from a subdirectory on GitHub Pages: DOCS_BASE=/glass-midas/ pnpm build.
const base = process.env.DOCS_BASE ?? '/';

// Root-relative links in Markdown (`/concepts/tiers/`) get the base, so pages can link plainly.
const baseLinks = defineMdastPlugin({
  name: 'base-links',
  link(node, ctx) {
    if (base !== '/' && node.url.startsWith('/') && !node.url.startsWith(base)) {
      ctx.setProperty(node, 'url', base.replace(/\/$/, '') + node.url);
    }
  },
});

export default defineConfig({
  site: 'https://bladeholy.github.io',
  base,
  trailingSlash: 'always',
  markdown: {
    processor: satteri({ mdastPlugins: [baseLinks] }),
    shikiConfig: { theme: 'vitesse-dark' },
  },
  integrations: [mdx(), react()],
});
