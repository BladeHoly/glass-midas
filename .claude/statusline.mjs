// Status line: model · branch · context used · core/react bundle size vs budget.
// Sizes come from the cache scripts/size.mjs writes on every `pnpm size`.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const color = (code, s) => `\x1b[${code}m${s}\x1b[0m`;

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {}

const parts = [color(36, input.model?.display_name ?? 'claude')];

try {
  const branch = execSync('git branch --show-current', {
    cwd: root,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim();
  if (branch) parts.push(color(35, `⎇ ${branch}`));
} catch {}

const used = input.context_window?.used_percentage;
if (typeof used === 'number') {
  parts.push(color(used > 80 ? 31 : used > 60 ? 33 : 32, `ctx ${Math.round(used)}%`));
}

try {
  const cache = resolve(root, 'node_modules/.cache/glass-midas');
  for (const file of readdirSync(cache)
    .filter((f) => f.startsWith('size-'))
    .sort()) {
    const { name, results } = JSON.parse(readFileSync(resolve(cache, file), 'utf8'));
    for (const r of results) {
      if (r.size === null) continue;
      const label = `${name.replace('@glass-midas/', '')} ${(r.size / 1024).toFixed(1)}/${(r.max / 1024).toFixed(0)}KB`;
      parts.push(color(r.ok ? 32 : 31, label));
    }
  }
} catch {}

console.log(parts.join(dim(' · ')));
