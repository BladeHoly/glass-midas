// Checks what each entry costs a consumer: bundles it with esbuild (minified,
// dependencies external), gzips the result and compares it with the
// "sizeBudget" map (entry -> max bytes) in the current package's package.json.
// Exits 1 when an entry is over budget or missing. With --json, prints the
// measurements instead, for the glass-review skill.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const cwd = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8'));
const external = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });

const results = [];
for (const [file, max] of Object.entries(pkg.sizeBudget ?? {})) {
  const entry = resolve(cwd, file);
  let size = null;
  if (existsSync(entry)) {
    const out = await build({
      entryPoints: [entry],
      bundle: true,
      minify: true,
      format: 'esm',
      external,
      write: false,
      logLevel: 'silent',
    });
    size = gzipSync(out.outputFiles[0].contents).length;
  }
  results.push({ file, size, max, ok: size !== null && size <= max });
}

// The status line reads the last measurement from here instead of rebuilding.
const cacheDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../node_modules/.cache/glass-midas',
);
mkdirSync(cacheDir, { recursive: true });
writeFileSync(
  resolve(cacheDir, `size-${pkg.name.replace(/[@/]/g, '_')}.json`),
  JSON.stringify({ name: pkg.name, results }),
);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ name: pkg.name, results }));
} else {
  for (const r of results) {
    const shown = r.size === null ? 'missing (run build)' : `${r.size} B gz`;
    console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${pkg.name} ${r.file}: ${shown} / ${r.max} B`);
  }
}
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
