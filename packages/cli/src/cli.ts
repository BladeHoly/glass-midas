#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_SITE,
  docs,
  list,
  search,
  setup,
  siteFetch,
  type Framework,
  type PackageManager,
} from './commands.js';

const HELP = `glass-midas: the glass-midas docs from the terminal, for you or your agent.

  glass-midas list [components|all|<section>] [--json]   What there is
  glass-midas docs <name>                                A page as Markdown: search, gm-search, concepts/tiers
  glass-midas find <words> [--json]                      Pages that mention them
  glass-midas setup [html|react|astro]                   How to install and load it here

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

async function main(argv: string[]) {
  const json = argv.includes('--json');
  const [command, ...rest] = argv.filter((a) => a !== '--json');
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
