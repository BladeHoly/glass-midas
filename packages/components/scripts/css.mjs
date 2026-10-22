// Builds the stylesheets from src/css: dist/css/<sheet>.css for each one, and dist/styles.css with
// all of them, the base first. Cascade layers keep the order right whichever sheets a page loads.
import fs from 'node:fs';

const SHEETS = [
  'base',
  'surface',
  'button',
  'callout',
  'code',
  'tabs',
  'segmented',
  'popover',
  'dialog',
  'toast',
  'toggle',
  'slider',
  'field',
  'check',
  'select',
  'otp',
  'table',
  'badge',
  'stat',
  'quantity',
  'nav',
  'search',
  'scrollbar',
  'tip',
];

const found = fs.readdirSync('src/css').map((f) => f.replace(/\.css$/, ''));
const missing = found.filter((f) => !SHEETS.includes(f));
if (missing.length) throw new Error(`add to SHEETS in scripts/css.mjs: ${missing.join(', ')}`);

fs.mkdirSync('dist/css', { recursive: true });
const all = SHEETS.map((name) => {
  const css = fs.readFileSync(`src/css/${name}.css`, 'utf8');
  fs.writeFileSync(`dist/css/${name}.css`, css);
  return css;
});
fs.writeFileSync('dist/styles.css', all.join('\n'));
