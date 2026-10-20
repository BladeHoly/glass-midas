import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    starlight({
      title: 'glass-midas',
      description: 'A Liquid Glass style system for the web.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/BladeHoly/glass-midas' },
      ],
      customCss: ['./src/styles/docs.css'],
      sidebar: [
        { label: 'Getting started', items: [{ autogenerate: { directory: 'getting-started' } }] },
        { label: 'Concepts', items: [{ autogenerate: { directory: 'concepts' } }] },
        { label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
        { slug: 'browser-support' },
      ],
    }),
    react(),
  ],
});
