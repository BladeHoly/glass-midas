// Empties a package's dist before a build: tsc only adds files, so one whose source was removed
// would linger and ship.
import { rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
