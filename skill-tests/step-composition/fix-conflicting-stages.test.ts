import assert from 'node:assert/strict';
import { Pipeline, type PipelineOptions, type Step } from '@ngwes/groucho-fp';
import { left } from '@ngwes/mini-fp';
import { tests } from '@ngwes/skill-be/testing';
import { rightOf } from '../_shared/either.js';

type Meta = { source: string; lang?: string };
type Ctx = { raw: string; meta: Meta; text?: string; tokens?: string[] };
type Err =
  | { tag: 'empty' }
  | { tag: 'crash'; cause: unknown }
  | { tag: 'conflict'; keys: ReadonlyArray<string> };

const test = tests<{ result: Step<Err, Ctx>[] }>();

/** Hooks that stop the run on any conflict or exception, as in the task. */
const strict: PipelineOptions<Err, Ctx> = {
  onException: (cause) => left({ tag: 'crash', cause }),
  onConflictingKeys: (keys) => left({ tag: 'conflict', keys }),
};

function run(stages: Step<Err, Ctx>[]) {
  return rightOf<Record<string, unknown>>(
    Pipeline<Err, Ctx>({ raw: '  Hello World  ', meta: { source: 'api' } }, stages, strict),
  );
}

test('the run completes with no conflict and keeps the raw text', async ({ result }) => {
  const ctx = await run(result);

  assert.equal(ctx.raw, '  Hello World  ');
});

test('the run ends with the trimmed, lowercased text', async ({ result }) => {
  const ctx = await run(result);

  assert.ok(Object.values(ctx).includes('hello world'), `context: ${JSON.stringify(ctx)}`);
});

test('the run ends with the tokens of the lowercased text', async ({ result }) => {
  const ctx = await run(result);

  assert.deepEqual(ctx.tokens, ['hello', 'world']);
});

test("the run keeps the metadata's source", async ({ result }) => {
  const ctx = await run(result);

  assert.equal((ctx.meta as Meta).source, 'api');
});
