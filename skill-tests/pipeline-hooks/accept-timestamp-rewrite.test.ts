import assert from 'node:assert/strict';
import { Pipeline, type PipelineOptions, type Step } from '@ngwes/groucho-fp';
import { right } from '@ngwes/mini-fp';
import { tests } from '@ngwes/skill-be/testing';
import { leftOf, rightOf } from '../_shared/either.js';

type Ctx = { docId: string; markdown?: string; html?: string; lastModified?: Date };

const test = tests<{ result: PipelineOptions<{ tag: string }, Ctx> }>();

const first = new Date('2026-01-01T10:00:00Z');
const second = new Date('2026-01-01T10:00:05Z');

const load: Step<{ tag: string }, Ctx> = (ctx) =>
  right({ ...ctx, markdown: '# Title', lastModified: first });
const render: Step<{ tag: string }, Ctx> = (ctx) =>
  right({ ...ctx, html: '<h1>Title</h1>', lastModified: second });

test("a later stage's new lastModified is kept and the run goes on", async ({ result }) => {
  let ran = false;
  const after: Step<{ tag: string }, Ctx> = (ctx) => {
    ran = true;
    return right(ctx);
  };

  const ctx = await rightOf<Ctx>(Pipeline({ docId: 'd1' }, [load, render, after], result));

  assert.equal(ctx.html, '<h1>Title</h1>');
  assert.equal(ctx.lastModified?.getTime(), second.getTime());
  assert.equal(ran, true);
});

test("overwriting another value stops the run with a 'conflict' error", async ({ result }) => {
  const rewrite: Step<{ tag: string }, Ctx> = (ctx) => right({ ...ctx, markdown: '# Other' });

  const error = await leftOf(Pipeline({ docId: 'd1' }, [load, rewrite], result));

  assert.equal(error.tag, 'conflict');
  assert.deepEqual([...(error.keys as string[])], ['markdown']);
});

test("overwriting another value together with lastModified is still a 'conflict'", async ({ result }) => {
  const rewrite: Step<{ tag: string }, Ctx> = (ctx) =>
    right({ ...ctx, markdown: '# Other', lastModified: second });

  const error = await leftOf(Pipeline({ docId: 'd1' }, [load, rewrite], result));

  assert.equal(error.tag, 'conflict');
  assert.ok((error.keys as string[]).includes('markdown'), `keys: ${String(error.keys)}`);
});

test("a thrown exception stops the run with a 'crash' error holding it", async ({ result }) => {
  const thrown = new Error('renderer crashed');
  const crash: Step<{ tag: string }, Ctx> = () => {
    throw thrown;
  };

  const error = await leftOf(Pipeline({ docId: 'd1' }, [load, crash], result));

  assert.equal(error.tag, 'crash');
  assert.equal(error.cause, thrown);
});
