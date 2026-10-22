#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import {
  DEFAULT_SITE,
  docs,
  list,
  search,
  nextSteps,
  setup,
  siteBytes,
  siteFetch,
  template,
  templates,
  type Flavor,
  type Framework,
  type PackageManager,
} from './commands.js';

const HELP = `glass-midas: the glass-midas docs from the terminal, for you or your agent.

  glass-midas list [components|all|<section>] [--json]   What there is
  glass-midas docs <name>                                A page as Markdown: search, gm-search, concepts/tiers
  glass-midas find <words> [--json]                      Pages that mention them
  glass-midas setup [html|react|astro]                   How to install and load it here
  glass-midas template [--json]                          The templates: whole screens to start from
  glass-midas template <name> [--html|--react]           Copy one into ./<name> (or --out <dir>);
                     [--out <dir>] [--force]             --force overwrites files already there

Docs come from ${DEFAULT_SITE} (set GLASS_MIDAS_DOCS for another).`;

/** The package manager this project uses, from its lockfile. */
function packageManager(dir: string): PackageManager {
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(dir, 'bun.lock')) || existsSync(join(dir, 'bun.lockb'))) return 'bun';
  return 'npm';
}

/** The kind of project, from its dependencies, when the user doesn't say. */
function framework(dir: string): Framework {
  const has = (name: string) => existsSync(join(dir, 'node_modules', name));
  if (has('astro')) return 'astro';
  if (has('react')) return 'react';
  return 'html';
}

/** Copies a template's files into a folder, refusing to overwrite unless forced. */
async function copy(name: string, flags: { flavor: Flavor; out?: string; force: boolean }) {
  const site = process.env.GLASS_MIDAS_DOCS;
  const { template: t, files } = await template(
    siteFetch(site),
    siteBytes(site),
    name,
    flags.flavor,
  );
  const dir = flags.out ?? t.name;
  const there = files.map((f) => join(dir, f.path)).filter((p) => existsSync(p));
  if (there.length && !flags.force)
    throw new Error(
      `${there.length} ${there.length === 1 ? 'file is' : 'files are'} already there, like ${relative(process.cwd(), there[0]!)}. Use --force to overwrite, or --out <dir> for another folder.`,
    );
  for (const f of files) {
    const path = join(dir, f.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, f.data);
  }
  // Shown with forward slashes on every system, like the paths in the docs.
  const shown = (relative(process.cwd(), dir) || '.').split(sep).join('/');
  return `${nextSteps(t, flags.flavor, shown)}\n\n${files.length} files.`;
}

async function main(argv: string[]) {
  const json = argv.includes('--json');
  const out = argv.indexOf('--out');
  const outDir = out >= 0 ? argv[out + 1] : undefined;
  if (out >= 0 && (!outDir || outDir.startsWith('--'))) throw new Error('--out needs a folder.');
  const flags = new Set(['--json', '--html', '--react', '--force']);
  const [command, ...rest] = argv.filter(
    (a, i) => !flags.has(a) && a !== '--out' && !(out >= 0 && i === out + 1),
  );
  const get = siteFetch(process.env.GLASS_MIDAS_DOCS);
  switch (command) {
    case 'list':
      return list(get, rest[0], json);
    case 'docs':
      if (!rest.length) throw new Error('Which page? For example: glass-midas docs search');
      return docs(get, rest.join(' '));
    case 'find':
      if (!rest.length) throw new Error('Find what? For example: glass-midas find frost');
      return search(get, rest.join(' '), json);
    case 'setup': {
      const kind = rest[0] ?? framework(process.cwd());
      if (!['html', 'react', 'astro'].includes(kind)) throw new Error(`Unknown project "${kind}".`);
      return setup(kind as Framework, packageManager(process.cwd()));
    }
    case 'template':
    case 'templates': {
      if (!rest.length) return templates(get, json);
      if (argv.includes('--html') && argv.includes('--react'))
        throw new Error('Choose --html or --react, or neither for both.');
      const flavor: Flavor = argv.includes('--html')
        ? 'html'
        : argv.includes('--react')
          ? 'react'
          : 'both';
      return copy(rest[0]!, { flavor, out: outDir, force: argv.includes('--force') });
    }
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      return HELP;
    default:
      throw new Error(`Unknown command "${command}".\n\n${HELP}`);
  }
}

main(process.argv.slice(2)).then(
  (out) => console.log(out),
  (error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  },
);
