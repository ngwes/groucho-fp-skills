import assert from 'node:assert/strict';
import { left, right, type Either } from '@ngwes/mini-fp';
import { tests } from '@ngwes/skill-be/testing';
import { MISSING_PACKAGE, NO_STAGE, inFolder, markingStage } from '../_shared/folder.js';

type Ctx = { orderId: string; summary?: string };
type AppError = { tag: string };
type AppStage = (ctx: Readonly<Ctx>) => Either<AppError, Ctx>;

type Deps = {
  authorize: AppStage;
  summarize: AppStage;
  workflowOptions: {
    onException: (exception: unknown) => Either<AppError, Ctx>;
    onConflictingKeys: (keys: ReadonlyArray<string>) => Either<AppError, Ctx>;
  };
};

type RunWorkflow = (deps: Deps) => (orderId: string) => Promise<string>;

const test = tests<{ result: RunWorkflow }>();

/** The stages the workflow files and these stages ran, in order (see markingStage). */
const calls: string[] = [];
(globalThis as { calls?: string[] }).calls = calls;

/** The app's two stages; `authorize` fails with `denied` when it is given. */
function fakeDeps(denied?: string): Deps {
  return {
    authorize: (ctx) => {
      calls.push('authorize');
      return denied === undefined ? right(ctx) : left({ tag: denied });
    },
    summarize: (ctx) => {
      calls.push('summarize');
      return right({ ...ctx, summary: `summary of ${ctx.orderId}` });
    },
    workflowOptions: {
      onException: () => left({ tag: 'crash' }),
      onConflictingKeys: () => left({ tag: 'conflict' }),
    },
  };
}

const twoStages = { '10-check.ts': markingStage('check'), '20-price.ts': markingStage('price') };

test('runs authorize, the folder stages in name order, then summarize', async ({ result }) => {
  calls.length = 0;

  const answer = await inFolder('workflow', twoStages, () => result(fakeDeps())('o1'));

  assert.equal(answer, 'summary of o1');
  assert.deepEqual(calls, ['authorize', 'check', 'price', 'summarize']);
});

test("resolves to 'load failed: <count>' and runs no stage when files fail to load", async ({ result }) => {
  calls.length = 0;
  const files = { ...twoStages, '30-dates.ts': MISSING_PACKAGE, '40-helpers.ts': NO_STAGE };

  const answer = await inFolder('workflow', files, () => result(fakeDeps())('o1'));

  assert.equal(answer, 'load failed: 2');
  assert.deepEqual(calls, []);
});

test("resolves to 'error: <tag>' when a stage fails", async ({ result }) => {
  calls.length = 0;

  const answer = await inFolder('workflow', twoStages, () => result(fakeDeps('denied'))('o1'));

  assert.equal(answer, 'error: denied');
  assert.deepEqual(calls, ['authorize']);
});
