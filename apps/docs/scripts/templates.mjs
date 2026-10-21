// Copies the built templates (@glass-midas/templates) into public/t, where the docs serve their
// previews and files and the CLI fetches them.
import fs from 'node:fs';

const from = '../../templates/dist';
if (!fs.existsSync(`${from}/manifest.json`)) {
  throw new Error('Build the templates first: pnpm --filter @glass-midas/templates build');
}
fs.rmSync('public/t', { recursive: true, force: true });
fs.cpSync(from, 'public/t', { recursive: true });
