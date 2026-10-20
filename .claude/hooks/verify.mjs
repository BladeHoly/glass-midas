// Stop hook: before Claude finishes a turn, typechecks and tests the packages
// whose source changed. On failure it exits 2, which sends the output back to
// Claude to fix. Runs at most once per stop, so it can't loop.
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
if (input.stop_hook_active) process.exit(0);

let changed = [];
try {
  changed = execSync('git status --porcelain --untracked-files=all', {
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .split('\n')
    .map((line) => line.slice(3).trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
} catch {
  process.exit(0);
}

const dirs = new Set(
  changed
    .filter((f) => /\.(ts|tsx|mts)$/.test(f))
    .map((f) => f.match(/^((?:packages|apps)\/[^/]+)\//)?.[1])
    .filter(Boolean),
);
if (dirs.size === 0) process.exit(0);

const filters = [...dirs].map((d) => `--filter=./${d}`);
const command = ['pnpm turbo run typecheck test', ...filters, '--output-logs=errors-only'].join(
  ' ',
);
const run = spawnSync(command, {
  cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  encoding: 'utf8',
  shell: true,
});

if (run.status !== 0) {
  process.stderr.write(
    `Typecheck/tests failed in ${[...dirs].join(', ')}:\n${run.stdout}${run.stderr}`.slice(-6000),
  );
  process.exit(2);
}
