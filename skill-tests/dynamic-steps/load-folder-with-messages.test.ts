import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import { tests } from '@ngwes/skill-be/testing';
import { settle } from '../_shared/either.js';
import { MISSING_PACKAGE, NO_STAGE, inFolder, markingStage } from '../_shared/folder.js';

const test = tests<{ result: () => unknown }>();

/**
 * What loadStages resolved to: the stages or the messages, whether the code returns an Either of
 * them or the bare list.
 */
async function outcome(value: unknown): Promise<{ stages?: unknown[]; messages?: unknown[] }> {
  const resolved = await value;
  if (Array.isArray(resolved)) {
    return resolved.every((item) => typeof item === 'function')
      ? { stages: resolved }
      : { messages: resolved };
  }
  const { side, value: list } = await settle(resolved);
  assert.ok(Array.isArray(list), `expected a list, got ${inspect(list)}`);
  return side === 'right' ? { stages: list } : { messages: list };
}

test('resolves to the stages of the folder when every file loads', async ({ result }) => {
  const { stages, messages } = await inFolder(
    'stages',
    { '01-trim.ts': markingStage('trimmed'), '02-lower.ts': markingStage('lower') },
    () => outcome(result()),
  );

  assert.equal(messages, undefined, `messages: ${inspect(messages)}`);
  assert.equal(stages?.length, 2);
});

test('resolves to one message per failing file, each naming its file', async ({ result }) => {
  const { messages } = await inFolder(
    'stages',
    {
      '01-trim.ts': markingStage('trimmed'),
      '02-dates.ts': MISSING_PACKAGE,
      '03-helpers.ts': NO_STAGE,
    },
    () => outcome(result()),
  );

  assert.ok(messages !== undefined, 'expected messages, got the stages');
  assert.equal(messages.length, 2, `messages: ${inspect(messages)}`);
  const text = messages.map(String);
  assert.equal(text.filter((message) => message.includes('02-dates')).length, 1, inspect(text));
  assert.equal(text.filter((message) => message.includes('03-helpers')).length, 1, inspect(text));
  assert.ok(text.every((message) => !message.includes('01-trim')), inspect(text));
});

test('gives different reasons for a file that cannot be imported and one with no stage', async ({ result }) => {
  const { messages } = await inFolder(
    'stages',
    { '02-dates.ts': MISSING_PACKAGE, '03-helpers.ts': NO_STAGE },
    () => outcome(result()),
  );

  assert.ok(messages !== undefined, 'expected messages, got the stages');
  const [dates, helpers] = messages.map((message) =>
    String(message).replace(/02-dates|03-helpers/g, '<file>'),
  );
  assert.notEqual(dates, helpers);
});
