// Builds the templates into dist, for the docs to publish and the CLI to copy:
//
// - dist/shared: what templates share (tokens.css from the core, the brand, the auth kit, the art)
// - dist/<name>: each template's own files as written, plus preview.html, the same page wired to
//   this repo's components (not the CDN) and to the docs' theme and tier switches
// - dist/lib: those components, bundled
// - dist/manifest.json: every template and the files it needs, for the docs and the CLI
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { tokensToCss } from '@glass-midas/core';

const templates = JSON.parse(fs.readFileSync('src/templates.json', 'utf8'));
const components = JSON.parse(
  fs.readFileSync(
    fileURLToPath(new URL('../../packages/components/package.json', import.meta.url)),
    'utf8',
  ),
);
const CDN_VERSION = components.version.split('.').slice(0, 2).join('.');
const DIST = 'dist';
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

// What templates share.
write(
  `${DIST}/shared/tokens.css`,
  `/* glass-midas tokens (@glass-midas/core tokensToCss()). */\n${tokensToCss()}\n`,
);
for (const file of fs.readdirSync('src/shared')) {
  fs.copyFileSync(`src/shared/${file}`, `${DIST}/shared/${file}`);
}

// This repo's components, for the previews.
await build({
  entryPoints: ['@glass-midas/components'],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: `${DIST}/lib/components.js`,
  logLevel: 'warning',
});
fs.copyFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.resolve('@glass-midas/components'))),
    'styles.css',
  ),
  `${DIST}/lib/styles.css`,
);

// Wired into each preview: the docs set the theme and the tier from the page around it.
const PREVIEW_SCRIPT = `<script>
  (() => {
    const params = new URLSearchParams(location.search);
    const apply = ({ theme, tier }) => {
      if (theme) document.documentElement.dataset.theme = theme;
      if (tier) for (const el of document.querySelectorAll('[material], gm-surface, gm-button, gm-dialog, gm-popover, gm-menu, gm-nav, gm-search, gm-segmented, gm-tabs, gm-tip, gm-toast')) el.setAttribute('tier', tier);
    };
    apply({ theme: params.get('theme'), tier: params.get('tier') });
    addEventListener('message', (e) => e.origin === location.origin && apply(e.data || {}));
    addEventListener('DOMContentLoaded', () => apply({ tier: params.get('tier') }));
  })();
</script>`;

const names = new Set(templates.map((t) => t.name));
const manifest = [];
for (const t of templates) {
  const dir = `src/${t.name}`;
  const own = fs.readdirSync(dir);
  fs.mkdirSync(`${DIST}/${t.name}`, { recursive: true });
  // As people get them: side by side, so imports from ../shared/ become ./, and the CDN links
  // name the components' current minor version.
  for (const file of own) {
    const text = fs
      .readFileSync(`${dir}/${file}`, 'utf8')
      .replaceAll("from '../shared/", "from './")
      .replace(/@glass-midas\/components@[\d.]+/g, `@glass-midas/components@${CDN_VERSION}`);
    write(`${DIST}/${t.name}/${file}`, text);
  }
  for (const file of t.shared.filter((f) => f.endsWith('.js'))) {
    fs.copyFileSync(`src/shared/${file}`, `${DIST}/${t.name}/${file}`);
  }

  let html = fs.readFileSync(`${dir}/${t.name}.html`, 'utf8');
  html = html
    .replace(
      /https:\/\/cdn\.jsdelivr\.net\/npm\/@glass-midas\/components@[^/]+\/dist\/styles\.css/g,
      '../lib/styles.css',
    )
    .replace(
      /https:\/\/cdn\.jsdelivr\.net\/npm\/@glass-midas\/components@[^/]+\/\+esm/g,
      '../lib/components.js',
    )
    .replace(/href="([\w-]+\.css)"/g, (m, f) =>
      t.shared.includes(f) ? `href="../shared/${f}"` : m,
    )
    .replace(/href="art\//g, 'href="../shared/art/')
    // The brand links home; in a preview that would leave the frame.
    .replace(/href="\/"/g, 'href="#"')
    // Links to other templates go to their previews.
    .replace(/href="([\w-]+)\.html"/g, (m, n) => (names.has(n) ? `href="../${n}/preview.html"` : m))
    .replace('</head>', `${PREVIEW_SCRIPT}\n  </head>`);
  write(`${DIST}/${t.name}/preview.html`, html);

  manifest.push({
    ...t,
    files: [
      ...own.map((f) => ({ from: `${t.name}/${f}`, to: f })),
      ...t.shared.map((f) => ({ from: `shared/${f}`, to: f })),
      ...t.art.map((f) => ({ from: `shared/art/${f}`, to: `art/${f}` })),
    ],
  });
}
write(`${DIST}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`templates: ${templates.map((t) => t.name).join(', ')}`);
