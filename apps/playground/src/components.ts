import { tokensToCss } from '@glass-midas/core';
import '@glass-midas/components/styles.css';
import type { GmSearch } from '@glass-midas/components';
import '@glass-midas/components';

document.head.append(
  Object.assign(document.createElement('style'), { textContent: tokensToCss() }),
);

const pages = [
  { label: 'Intro', href: '#intro', hint: 'Start' },
  { label: 'Install', href: '#install', hint: 'Setup' },
  { label: 'Notes', href: '#notes', hint: 'Callouts' },
];
document.querySelector<GmSearch>('gm-search')!.source = (q) =>
  pages.filter((p) => p.label.toLowerCase().includes(q.toLowerCase()));
