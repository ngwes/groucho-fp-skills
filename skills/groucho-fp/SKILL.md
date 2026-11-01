---
name: groucho-fp
description: Entry point for @ngwes/groucho-fp 2. Invoke this first when working with the library to select the right concept or pattern skill.
---

`@ngwes/groucho-fp` 2 builds typed, functional pipelines in TypeScript on top of `@ngwes/mini-fp` 2. `Pipeline` runs a list of steps, one after the other, over one shared context object. Each step returns an `Either`. When a step fails, throws or overwrites a value, a hook decides whether the pipeline recovers and continues, or stops. `loadSteps` and `loadStepsFromDir` import step files at runtime (TypeScript included, no build step), so a pipeline can be assembled from the filesystem.

## Install

```bash
npm i @ngwes/groucho-fp @ngwes/mini-fp
```

`@ngwes/mini-fp` 2.x (`^2.0.0`) is a peer dependency. For `Either`, `EitherAsync`, `Try` and the rest of mini-fp, install the mini-fp plugin (`/plugin marketplace add ngwes/mini-fp-skills`, then `/plugin install mini-fp@mini-fp-skills`) and use its `either`, `try` and `async-pipelines` skills.

## Decision Table

| Scenario | Use | Skill |
|---|---|---|
| Run several steps in order over one shared object | `Pipeline` | `pipeline` |
| Consume the result: `match`, `map`, `mapLeft`, `onLeft`, return it unawaited | `EitherAsync` result | `pipeline` |
| Write a step, type it, tell an expected failure from a crash | `Step`, `StepResult` | `step` |
| Recover from a failed step with a default and carry on | `onLeft` | `pipeline-hooks` |
| Turn a thrown value into a typed error; roll back on failure | `onException` | `pipeline-hooks` |
| Accept or reject a step overwriting an earlier value | `onConflictingKeys` | `pipeline-hooks` |
| Split one big function into steps; one context, one error union; order | small steps | `step-composition` |
| Steps live in files that are imported at run time | `loadSteps`, `loadStepsFromDir`, `DynamicStepModule` | `dynamic-steps` |
| Handle files that failed to load | `LoadError` | `dynamic-steps` |
| Load the folder, then run it; mix app steps with loaded ones; load once at startup | load then run | `dynamic-loading` |

## Core signatures

The real entry points; the skills cover the rest.

```ts skip
// run the steps over a copy of ctx, in array order
Pipeline(ctx, steps, options)       // EitherAsync<E, Readonly<Ctx>>
type Step<E, Ctx> = (ctx: Readonly<Ctx>) => StepResult<E, Ctx>
type StepResult<E, Ctx> = Either<E, Ctx> | PromiseLike<Either<E, Ctx>>   // also an EitherAsync

interface PipelineOptions<E, Ctx extends object> {
  onLeft?: (error: E, ctx) => StepResult<E, Ctx>                  // optional: without it a left stops the run
  onException: (exception: unknown, ctx) => StepResult<E, Ctx>   // a step threw or its promise rejected
  onConflictingKeys: (keys, ctx, next) => StepResult<E, Ctx>     // a step overwrote or dropped a value
}

// import step files at runtime; they never throw
loadSteps<E, Ctx>(paths)                       // EitherAsync<ReadonlyArray<LoadError>, ReadonlyArray<Step<E, Ctx>>>
loadStepsFromDir<E, Ctx>(dir, { pattern? })    // same; alphabetical file order
type DynamicStepModule<E, Ctx> =               // the three shapes of a step file
  | { default: Step<E, Ctx> }
  | { default: ReadonlyArray<Step<E, Ctx>> }
  | { steps: ReadonlyArray<Step<E, Ctx>> }
type LoadError =
  | { tag: "not-found"; path: string; cause: unknown }
  | { tag: "import-failed"; path: string; cause: unknown }
  | { tag: "invalid-export"; path: string; detail: string }
```

## The rules every skill assumes

- **Every hook follows one rule.** `right(ctx)` recovers: the pipeline continues with the next step, using `ctx`. `left(error)` stops: later steps do not run and the result is that `left`. `onException` and `onConflictingKeys` are required; `onLeft` is optional.
- **A step returns the new context.** Spread the one it received (`right({ ...ctx, total })`), never mutate it. Return `left(error)` for a failure you expect; a throw is an exception, handled by `onException`.
- **The context is a plain object.** Declare the steps' outputs as optional fields and leave them out of the initial context: a field that starts as `0`, `""` or `null` counts as already written, and the step that fills it is reported as a conflict.
- **`Pipeline` returns an `EitherAsync`, not a `Promise`.** Chain on it (`map`, `mapLeft`, `onLeft`, `match`) and await once. There is no `.catch` or `.finally`: failures are `left` values.
- **Wrap exceptions.** In `onException`, return `left({ tag: "crash", cause: exception })`, never `left(exception)`: the thrown value may be `undefined`, and `left(undefined)` throws in mini-fp 2.

```ts
import { left, right } from "@ngwes/mini-fp";
import { Pipeline } from "@ngwes/groucho-fp";
import type { PipelineOptions, Step } from "@ngwes/groucho-fp";

type Ctx = { input: string; parsed?: number; doubled?: number };
type Err =
  | { tag: "not-a-number"; input: string }
  | { tag: "crash"; cause: unknown }
  | { tag: "conflict"; keys: ReadonlyArray<string> };

const parse: Step<Err, Ctx> = (ctx) => {
  const parsed = Number.parseInt(ctx.input, 10);
  return Number.isNaN(parsed) ? left({ tag: "not-a-number", input: ctx.input }) : right({ ...ctx, parsed });
};

const double: Step<Err, Ctx> = (ctx) => right({ ...ctx, doubled: (ctx.parsed ?? 0) * 2 });

const options: PipelineOptions<Err, Ctx> = {
  // recover: a text that is not a number counts as 0, and the next step runs
  onLeft: (error, ctx) => (error.tag === "not-a-number" ? right({ ...ctx, parsed: 0 }) : left(error)),
  onException: (exception) => left({ tag: "crash", cause: exception }),
  onConflictingKeys: (keys) => left({ tag: "conflict", keys }),
};

const run = (input: string): Promise<string> =>
  Pipeline({ input }, [parse, double], options).match(
    (ctx) => `doubled: ${ctx.doubled}`,
    (error) => `error: ${error.tag}`,
  );
```

## Available Skills

| Skill | When to invoke |
|---|---|
| `pipeline` | `Pipeline` signature, execution model, options, the `EitherAsync` result, context rules |
| `step` | Writing, typing or returning from a `Step`; the mini-fp idioms to use inside one |
| `dynamic-steps` | `loadSteps` / `loadStepsFromDir`, the step file shapes, `LoadError` |
| `pipeline-hooks` | Recovering with a default in `onLeft`, wrapping exceptions, accepting or rejecting overwrites, cleanup (pattern) |
| `step-composition` | Splitting a workflow into steps, run order and file-name prefixes, never overwriting an earlier key (pattern) |
| `dynamic-loading` | Assembling a pipeline from step files: load then run, load once, mix app and loaded steps (pattern) |

**Rule:** After reading this skill, invoke the specific skill for the concept or pattern you need.
