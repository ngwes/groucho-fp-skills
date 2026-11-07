import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Where the compiled tests are: inside skill-be's install folder, so a stage file written under
 * it resolves the packages of test-packages.json, as a stage file of the app resolves the app's.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));

/** A stage file that adds `{ [key]: true }` to the context and records `key` in `calls`. */
export function markingStage(key: string): string {
  return [
    "import { right } from '@ngwes/mini-fp';",
    'export default (ctx: Record<string, unknown>) => {',
    `  (globalThis as { calls?: string[] }).calls?.push(${JSON.stringify(key)});`,
    `  return right({ ...ctx, ${JSON.stringify(key)}: true });`,
    '};',
  ].join('\n');
}

/** A stage file that cannot be imported: the package it imports is not installed. */
export const MISSING_PACKAGE =
  "import { pad } from 'groucho-skill-tests-missing-package';\nexport default (ctx: unknown) => pad(ctx);\n";

/** A file with neither a default export nor a `steps` export. */
export const NO_STAGE = 'export const helper = 1;\n';

/**
 * Writes `files` into `<temp>/<folder>/`, then runs `fn` with `<temp>` as the working directory,
 * so the code's relative path (`./<folder>`) finds them. Restores the working directory and
 * removes `<temp>` afterwards.
 */
export async function inFolder<T>(
  folder: string,
  files: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T> {
  const root = await mkdtemp(path.join(HERE, 'cwd-'));
  const previous = process.cwd();
  try {
    await mkdir(path.join(root, folder));
    for (const [name, text] of Object.entries(files)) {
      await writeFile(path.join(root, folder, name), text);
    }
    process.chdir(root);
    return await fn();
  } finally {
    process.chdir(previous);
    await rm(root, { recursive: true, force: true });
  }
}
