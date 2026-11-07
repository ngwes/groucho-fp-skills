import assert from 'node:assert/strict';
import { Pipeline, type PipelineOptions, type Step } from '@ngwes/groucho-fp';
import { left, right } from '@ngwes/mini-fp';
import { tests } from '@ngwes/skill-be/testing';
import { leftOf, rightOf } from '../_shared/either.js';

type Ctx = { requestId: string; payload?: { size: number }; saved?: boolean };
type AppError =
  | { tag: 'invalid'; reason: string }
  | { tag: 'crash'; cause: unknown }
  | { tag: 'conflict'; keys: ReadonlyArray<string> };

const test = tests<{ result: PipelineOptions<AppError, Ctx> }>();

const parse: Step<AppError, Ctx> = (ctx) => right({ ...ctx, payload: { size: 3 } });
const save: Step<AppError, Ctx> = (ctx) => right({ ...ctx, saved: true });

test('a run whose stages all succeed ends with their context', async ({ result }) => {
  const ctx = await rightOf<Ctx>(Pipeline({ requestId: 'r1' }, [parse, save], result));

  assert.equal(ctx.saved, true);
});

test("a stage's error stops the run unchanged", async ({ result }) => {
  let saved = false;
  const reject: Step<AppError, Ctx> = () => left({ tag: 'invalid', reason: 'too big' });
  const track: Step<AppError, Ctx> = (ctx) => {
    saved = true;
    return right({ ...ctx, saved: true });
  };

  const error = await leftOf(Pipeline({ requestId: 'r1' }, [parse, reject, track], result));

  assert.deepEqual(error, { tag: 'invalid', reason: 'too big' });
  assert.equal(saved, false);
});

test("a thrown exception stops the run with a 'crash' error holding it", async ({ result }) => {
  const thrown = new Error('disk full');
  const crash: Step<AppError, Ctx> = () => {
    throw thrown;
  };

  const error = await leftOf(Pipeline({ requestId: 'r1' }, [parse, crash], result));

  assert.equal(error.tag, 'crash');
  assert.equal(error.cause, thrown);
});

test("an overwritten value stops the run with a 'conflict' error listing the keys", async ({ result }) => {
  const overwrite: Step<AppError, Ctx> = (ctx) => right({ ...ctx, payload: { size: 4 } });

  const error = await leftOf(Pipeline({ requestId: 'r1' }, [parse, overwrite], result));

  assert.equal(error.tag, 'conflict');
  assert.deepEqual([...(error.keys as string[])], ['payload']);
});
