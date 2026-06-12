/**
 * Boot smoke-test env (used by app.boot.spec.ts).
 *
 * Auto-fills every key declared in `.env.example` with a dummy value — UNLESS it's
 * already set in the real environment. The boot test can then compile the whole DI
 * graph without a real `.env` or database.
 *
 * Evolutive: when the team adds a new env key, just add it to `.env.example` and it
 * is covered here automatically — no edit to this file needed. (And if a boot-time
 * `getOrThrow` reads a key that ISN'T in `.env.example`, the boot test fails, which
 * correctly forces `.env.example` to stay complete.)
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const examplePath = join(__dirname, '..', '.env.example');

if (existsSync(examplePath)) {
  const lines = readFileSync(examplePath, 'utf8').split('\n');
  for (const line of lines) {
    const key = /^\s*([A-Z0-9_]+)\s*=/.exec(line)?.[1];
    if (!key || process.env[key]) continue;

    if (key === 'DATABASE_URL') {
      // Valid shape so the pg adapter constructor can parse it (it never connects here).
      process.env[key] =
        'postgresql://user:pass@localhost:5432/test?schema=public';
    } else if (/_URL$|_URI$/.test(key)) {
      process.env[key] = 'http://localhost/callback';
    } else {
      process.env[key] = `test-${key.toLowerCase()}`;
    }
  }
}
