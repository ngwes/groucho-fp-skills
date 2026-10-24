---
name: pipeline-hooks
description: Pattern guide for handling onLeft, onException, and onConflictingKeys in groucho-fp pipelines.
---

## Problem

A step returned `Either.left`, threw an exception, or produced a key conflict. How do you handle each case?

---

## Recipe: onLeft — propagate or recover

```ts
import { Either } from "@ngwes/mini-fp";
import type { PipelineOptions } from "@ngwes/groucho-fp";

type AppError = { code: string; detail: string };
type Ctx = Record<string, unknown>;

const options: PipelineOptions<AppError, Ctx> = {
  onLeft: async (err, ctx) => {
    console.error("Pipeline failed:", err);
    return Either.left(err); // propagate

    // To recover and continue:
    // return Either.right({ ...ctx, recovered: true });
  },
  // ...
};
```

Return `Either.right(newCtx)` to recover and let the pipeline continue from the next step.
Return `Either.left(err)` to stop and surface the error.

---

## Recipe: onException — wrap and stop

```ts
type AppError = { code: string; detail: string };
type Ctx = Record<string, unknown>;

const options: PipelineOptions<AppError, Ctx> = {
  onException: async (ex, _ctx) => {
    console.error("Unexpected exception:", ex);
    return Either.left({
      code: "EXCEPTION",
      detail: ex instanceof Error ? ex.message : String(ex),
    });
  },
  // ...
};
```

Unhandled exceptions indicate a programming error — always return `Either.left`.

---

## Recipe: onConflictingKeys — reject with detail

```ts
type AppError = { code: string; detail: string };
type Ctx = Record<string, unknown>;

const options: PipelineOptions<AppError, Ctx> = {
  onConflictingKeys: async (keys, _ctx) => {
    console.warn("Key conflict detected:", keys);
    return Either.left({
      code: "KEY_CONFLICT",
      detail: `Conflicting keys: ${keys.join(", ")}`,
    });
  },
};
```

`keys` is the list of context property names a step tried to overwrite with a different value.
Return `Either.right(ctx)` to accept the overwrite; return `Either.left` to reject it.

---

## Minimal options object (all three hooks)

```ts
import { Either } from "@ngwes/mini-fp";
import type { PipelineOptions } from "@ngwes/groucho-fp";

type AppError = { code: string; detail: string };
type Ctx = Record<string, unknown>;

const options: PipelineOptions<AppError, Ctx> = {
  onLeft: async (err, _ctx) =>
    Either.left(err),

  onException: async (ex, _ctx) =>
    Either.left({ code: "EXCEPTION", detail: String(ex) }),

  onConflictingKeys: async (keys, _ctx) =>
    Either.left({ code: "KEY_CONFLICT", detail: keys.join(", ") }),
};
```
