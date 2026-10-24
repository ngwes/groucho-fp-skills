---
name: pipeline
description: API reference for Pipeline from groucho-fp — signature, options, execution model, and example.
---

## Pipeline

Runs an ordered sequence of steps over a shared context object.

```ts
import { Pipeline } from "@ngwes/groucho-fp";
import type { PipelineOptions } from "@ngwes/groucho-fp";

const result = await Pipeline(initialCtx, steps, options);
```

### Signature

```ts
function Pipeline<E, Ctx extends object>(
  ctx: Ctx,
  steps: ReadonlyArray<Step<E, Ctx>>,
  options: PipelineOptions<E, Ctx>
): Promise<Either<E, Readonly<Ctx>>>
```

### Parameters

| Parameter | Description |
|---|---|
| `ctx` | Initial context. Frozen before the first step runs. |
| `steps` | Ordered array of steps executed sequentially. |
| `options` | Hooks for non-happy-path situations. |

### PipelineOptions

```ts
interface PipelineOptions<E, Ctx extends object> {
  onLeft:            (err: E,      ctx: Readonly<Ctx>) => Promise<Either<E, Readonly<Ctx>>>;
  onException:       (ex: unknown, ctx: Readonly<Ctx>) => Promise<Either<E, Readonly<Ctx>>>;
  onConflictingKeys: (keys: ReadonlyArray<string>, ctx: Readonly<Ctx>) => Promise<Either<E, Readonly<Ctx>>>;
}
```

| Hook | When it fires | What you can do |
|---|---|---|
| `onLeft` | A step returned `Either.left(err)` | Return `right` to recover, `left` to propagate |
| `onException` | A step threw an unhandled exception | Return `right` to recover, `left` to surface the error |
| `onConflictingKeys` | A step overwrote an existing key with a different value | Return `right` to accept, `left` to reject |

### Execution model

1. Steps run **sequentially** in array order.
2. Context is **frozen** before each step — steps must return a new object.
3. If a step returns `Either.left`, subsequent steps are skipped and `onLeft` fires immediately.
4. Exceptions are caught at pipeline level; `onException` receives the last good context.
5. If `onLeft` or `onConflictingKeys` returns `Either.left`, the pipeline stops at that point.

### Example

```ts
import { Pipeline } from "@ngwes/groucho-fp";
import { Either } from "@ngwes/mini-fp";
import type { Step, PipelineOptions } from "@ngwes/groucho-fp";

type Ctx = { input: string; result?: string };
type Err = { code: string; detail: string };

const step1: Step<Err, Ctx> = async (ctx) =>
  Either.right({ ...ctx, result: ctx.input.toUpperCase() });

const options: PipelineOptions<Err, Ctx> = {
  onLeft:            async (err)  => Either.left(err),
  onException:       async (ex)   => Either.left({ code: "EXCEPTION", detail: String(ex) }),
  onConflictingKeys: async (keys) => Either.left({ code: "CONFLICT", detail: keys.join(", ") }),
};

const result = await Pipeline({ input: "hello" }, [step1], options);

result.fold(
  (err) => console.error(err.code, err.detail),
  (ctx) => console.log(ctx.result), // "HELLO"
);
```
