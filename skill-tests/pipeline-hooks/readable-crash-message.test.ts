import assert from 'node:assert/strict';
import { Pipeline, type PipelineOptions, type Step } from '@ngwes/groucho-fp';
import { right } from '@ngwes/mini-fp';
import { tests } from '@ngwes/skill-be/testing';
import { leftOf } from '../_shared/either.js';

type Ctx = { fileName: string; rows?: string[]; imported?: number };
type ImportError =
  | { tag: 'crash'; message: string; cause: unknown }
  | { tag: 'conflict'; keys: ReadonlyArray<string> }
  | { tag: 'invalid-row'; line: number };

const test = tests<{ result: PipelineOptions<ImportError, Ctx> }>();

const read: Step<ImportError, Ctx> = (ctx) => right({ ...ctx, rows: ['a', 'b'] });

/** The error of a run whose second stage fails the way `fail` does. */
function crashOf(options: PipelineOptions<ImportError, Ctx>, fail: Step<ImportError, Ctx>) {
  return leftOf(Pipeline({ fileName: 'users.csv' }, [read, fail], options));
}

function assertReadable(message: unknown): void {
  assert.equal(typeof message, 'string', `message: ${String(message)}`);
  assert.ok((message as string).trim().length > 0, 'the message is empty');
  assert.ok(!(message as string).includes('[object'), `message: ${String(message)}`);
}

test('an Error becomes a crash whose message is the error message', async ({ result }) => {
  const thrown = new Error('unexpected token at line 3');

  const error = await crashOf(result, () => {
    throw thrown;
  });

  assert.equal(error.tag, 'crash');
  assert.ok(String(error.message).includes('unexpected token at line 3'), `message: ${error.message}`);
  assert.equal(error.cause, thrown);
});

test('a thrown string becomes a crash with a readable message', async ({ result }) => {
  const error = await crashOf(result, () => {
    throw 'bad quote';
  });

  assert.equal(error.tag, 'crash');
  assertReadable(error.message);
  assert.equal(error.cause, 'bad quote');
});

test('throw undefined becomes a crash with a readable message', async ({ result }) => {
  const error = await crashOf(result, () => {
    throw undefined;
  });

  assert.equal(error.tag, 'crash');
  assertReadable(error.message);
});

test('a promise rejected with no reason becomes a crash with a readable message', async ({ result }) => {
  const error = await crashOf(result, () => Promise.reject());

  assert.equal(error.tag, 'crash');
  assertReadable(error.message);
});

test("an overwritten value stops the run with a 'conflict' error", async ({ result }) => {
  const error = await crashOf(result, (ctx) => right({ ...ctx, rows: ['c'] }));

  assert.equal(error.tag, 'conflict');
  assert.deepEqual([...(error.keys as string[])], ['rows']);
});
