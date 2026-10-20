// PostToolUse hook: runs Prettier on the file Claude just edited or wrote,
// if it's inside the repo. Never blocks; a file Prettier can't parse is left as is.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path;
const inRepo = file && !relative(root, resolve(file)).startsWith('..');

if (inRepo) {
  try {
    const info = await prettier.getFileInfo(file, {
      ignorePath: resolve(root, '.prettierignore'),
    });
    if (!info.ignored && info.inferredParser) {
      const source = readFileSync(file, 'utf8');
      const config = (await prettier.resolveConfig(file)) ?? {};
      const formatted = await prettier.format(source, { ...config, filepath: file });
      if (formatted !== source) writeFileSync(file, formatted);
    }
  } catch {}
}
