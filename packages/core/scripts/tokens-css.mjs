// Writes dist/tokens.css: the default tokens as a stylesheet, for pages that load them with a
// <link> rather than injecting tokensToCss() at runtime (a strict CSP has no 'unsafe-inline').
import fs from 'node:fs';
import { tokensToCss } from '../dist/index.js';

fs.writeFileSync('dist/tokens.css', `${tokensToCss()}\n`);
