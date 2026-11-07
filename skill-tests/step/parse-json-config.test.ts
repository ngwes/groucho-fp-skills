import assert from 'node:assert/strict';
import { tests } from '@ngwes/skill-be/testing';
import { leftOf, rightOf } from '../_shared/either.js';

type Ctx = { rawConfig: string; config?: unknown };

const test = tests<{ result: (ctx: Readonly<Ctx>) => unknown }>();

/** What JSON.parse says about `text`. */
function parserMessage(text: string): string {
  try {
    JSON.parse(text);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error(`${text} is valid JSON`);
}

test('adds the parsed config and keeps the raw text', async ({ result }) => {
  const rawConfig = '{"port":8080,"debug":true}';

  assert.deepEqual(await rightOf(result({ rawConfig })), {
    rawConfig,
    config: { port: 8080, debug: true },
  });
});

test("fails with bad-config and the parser's message for malformed JSON", async ({ result }) => {
  const rawConfig = '{"port":';

  const error = await leftOf(result({ rawConfig }));

  assert.equal(error.tag, 'bad-config');
  assert.ok(
    String(error.detail).includes(parserMessage(rawConfig)),
    `detail: ${String(error.detail)}`,
  );
});

test('fails with bad-config for an empty string', async ({ result }) => {
  const error = await leftOf(result({ rawConfig: '' }));

  assert.equal(error.tag, 'bad-config');
});
