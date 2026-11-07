import assert from 'node:assert/strict';
import { Pipeline, type PipelineOptions, type Step } from '@ngwes/groucho-fp';
import { left, right } from '@ngwes/mini-fp';
import { tests } from '@ngwes/skill-be/testing';
import { leftOf, rightOf } from '../_shared/either.js';

type Tx = { commit(): Promise<void>; rollback(): Promise<void> };
type Ctx = { orderId: string; tx?: Tx; saved?: boolean; receiptSent?: boolean };
type SaveError =
  | { tag: 'invalid-order'; reason: string }
  | { tag: 'receipt-failed' }
  | { tag: 'crash'; cause: unknown }
  | { tag: 'conflict'; keys: ReadonlyArray<string> }
  | { tag: 'rollback-failed'; cause: unknown };

const test = tests<{ result: PipelineOptions<SaveError, Ctx> }>();

/** A transaction that records what the code did to it; its rollback rejects with `rollbackError`. */
function fakeTx(rollbackError?: Error): Tx & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    commit: async () => void calls.push('commit'),
    rollback: async () => {
      calls.push('rollback');
      if (rollbackError !== undefined) throw rollbackError;
    },
  };
}

type Case = {
  validate?: Step<SaveError, Ctx>;
  write?: Step<SaveError, Ctx>;
  receipt?: Step<SaveError, Ctx>;
};

/** The order-saving stages of the task: open, validate, write, receipt, commit. */
function stages(tx: Tx, overrides: Case = {}): Step<SaveError, Ctx>[] {
  const open: Step<SaveError, Ctx> = (ctx) => right({ ...ctx, tx });
  const validate: Step<SaveError, Ctx> = (ctx) => right(ctx);
  const write: Step<SaveError, Ctx> = (ctx) => right({ ...ctx, saved: true });
  const receipt: Step<SaveError, Ctx> = (ctx) => right({ ...ctx, receiptSent: true });
  const commit: Step<SaveError, Ctx> = async (ctx) => {
    await ctx.tx?.commit();
    return right(ctx);
  };
  return [
    open,
    overrides.validate ?? validate,
    overrides.write ?? write,
    overrides.receipt ?? receipt,
    commit,
  ];
}

const invalid: Step<SaveError, Ctx> = () => left({ tag: 'invalid-order', reason: 'no lines' });

test('a refused receipt does not cancel the order: the flow commits', async ({ result }) => {
  const tx = fakeTx();
  const refused: Step<SaveError, Ctx> = () => left({ tag: 'receipt-failed' });

  const ctx = await rightOf<Ctx>(Pipeline({ orderId: 'o1' }, stages(tx, { receipt: refused }), result));

  assert.equal(ctx.saved, true);
  assert.deepEqual(tx.calls, ['commit']);
});

test('an invalid order rolls back and stops with its error', async ({ result }) => {
  const tx = fakeTx();

  const error = await leftOf(Pipeline({ orderId: 'o1' }, stages(tx, { validate: invalid }), result));

  assert.deepEqual(error, { tag: 'invalid-order', reason: 'no lines' });
  assert.deepEqual(tx.calls, ['rollback']);
});

test("a thrown exception rolls back and stops with a 'crash' error holding it", async ({ result }) => {
  const tx = fakeTx();
  const thrown = new Error('connection reset');
  const crash: Step<SaveError, Ctx> = () => {
    throw thrown;
  };

  const error = await leftOf(Pipeline({ orderId: 'o1' }, stages(tx, { write: crash }), result));

  assert.equal(error.tag, 'crash');
  assert.equal(error.cause, thrown);
  assert.deepEqual(tx.calls, ['rollback']);
});

test("an overwritten value rolls back and stops with a 'conflict' error", async ({ result }) => {
  const tx = fakeTx();
  const overwrite: Step<SaveError, Ctx> = (ctx) => right({ ...ctx, saved: false });

  const error = await leftOf(Pipeline({ orderId: 'o1' }, stages(tx, { receipt: overwrite }), result));

  assert.equal(error.tag, 'conflict');
  assert.deepEqual([...(error.keys as string[])], ['saved']);
  assert.deepEqual(tx.calls, ['rollback']);
});

test("a failing rollback ends the flow with 'rollback-failed', not a rejection", async ({ result }) => {
  const rollbackError = new Error('rollback refused');
  const tx = fakeTx(rollbackError);

  const error = await leftOf(Pipeline({ orderId: 'o1' }, stages(tx, { validate: invalid }), result));

  assert.equal(error.tag, 'rollback-failed');
  assert.equal(error.cause, rollbackError);
});
