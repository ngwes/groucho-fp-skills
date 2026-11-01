---
name: pipeline
description: API reference for Pipeline from @ngwes/groucho-fp 2 — signature, the EitherAsync result, execution model, options and context rules.
---

## Pipeline

Runs a list of steps, one after the other, over one context object. Returns a mini-fp `EitherAsync`: chain on it, `await` once at the end.

```ts
import { Pipeline } from "@ngwes/groucho-fp";
import type { PipelineOptions, Step } from "@ngwes/groucho-fp";
import { left, right } from "@ngwes/mini-fp";
```

### Signature

```ts skip
function Pipeline<E, Ctx extends object>(
  ctx: Ctx,
  steps: ReadonlyArray<Step<E, Ctx>>,
  options: PipelineOptions<E, Ctx>,
): EitherAsync<E, Readonly<Ctx>>;
```

| Parameter | Description |
|---|---|
| `ctx` | The initial context, a plain object. The pipeline works on a frozen copy of it. |
| `steps` | Run in array order. See the `step` skill. |
| `options` | The hooks: `onLeft` (optional), `onException` and `onConflictingKeys` (required). |

---

## Example

```ts
type Line = { price: number; quantity: number };
type Ctx = { lines: ReadonlyArray<Line>; subtotal?: number; total?: number };
type Err = { code: "EMPTY_CART" } | { code: "CRASH"; cause: unknown } | { code: "CONFLICT"; keys: ReadonlyArray<string> };

const checkCart: Step<Err, Ctx> = (ctx) =>
  ctx.lines.length > 0 ? right(ctx) : left({ code: "EMPTY_CART" });

const sum: Step<Err, Ctx> = (ctx) =>
  right({ ...ctx, subtotal: ctx.lines.reduce((acc, l) => acc + l.price * l.quantity, 0) });

const addVat: Step<Err, Ctx> = (ctx) => right({ ...ctx, total: (ctx.subtotal ?? 0) * 1.2 });

const options: PipelineOptions<Err, Ctx> = {
  onException: (exception) => left({ code: "CRASH", cause: exception }),
  onConflictingKeys: (keys) => left({ code: "CONFLICT", keys }),
};

// chain on the EitherAsync, await once
const checkout = (lines: ReadonlyArray<Line>): Promise<string> =>
  Pipeline({ lines }, [checkCart, sum, addVat], options)
    .map((ctx) => ctx.total ?? 0)
    .onLeft((error) => console.warn(error.code))
    .match(
      (total) => `total: ${total.toFixed(2)}`,
      (error) => `error: ${error.code}`,
    );

// or await first: an Either
const result = await Pipeline({ lines: [] }, [checkCart, sum, addVat], options);
const message = result.match(
  (ctx) => `total: ${ctx.total}`,
  (error) => `error: ${error.code}`,
);
```

---

## The result is an `EitherAsync<E, Readonly<Ctx>>`

- `await` it to get an `Either<E, Readonly<Ctx>>`.
- Or chain first, like any mini-fp `EitherAsync`: `map`, `mapLeft`, `bind`, `bindAsync`, `onRight`, `onLeft`, then `match` / `matchAsync`, which return a `Promise` of the plain value.
- Return it unawaited from a function when the caller should decide how to consume it.
- It is `PromiseLike`, not a `Promise`: `.then` works, `.catch`, `.finally` and `instanceof Promise` do not. Failures are `left` values, so there is nothing to `.catch`. The only rejection is a hook that throws: `await` inside a `try` if your hooks may throw.

---

## Execution model

1. The pipeline freezes a **shallow copy** of `ctx`. Your object is not frozen and is never changed: read the results from the result's context, not from the object you passed in.
2. Each step receives the current context and:
   - returns `right(next)`: if `next` changed or dropped a value already written, `onConflictingKeys` runs; otherwise a frozen copy of `next` becomes the current context.
   - returns `left(error)`: `onLeft` runs. Without `onLeft`, the pipeline stops with `left(error)`.
   - throws, or its promise rejects: `onException` runs.
3. A hook that returns `right(ctx)` **continues with the next step**, using that context. A hook that returns `left(error)` **stops**: later steps do not run and the result is that `left`.
4. After the last step the result is `right` of the current context. With no steps it is `right` of the copy of `ctx`, and no hook runs.

---

## Options

```ts skip
interface PipelineOptions<E, Ctx extends object> {
  onLeft?: (error: E, ctx: Readonly<Ctx>) => StepResult<E, Ctx>;
  onException: (exception: unknown, ctx: Readonly<Ctx>) => StepResult<E, Ctx>;
  onConflictingKeys: (keys: ReadonlyArray<keyof Ctx & string>, ctx: Readonly<Ctx>, next: Readonly<Ctx>) => StepResult<E, Ctx>;
}
```

| Hook | Required | Runs when |
|---|---|---|
| `onLeft` | no | A step returned `left(error)`. Leave it out when a `left` should just stop the pipeline. |
| `onException` | yes | A step threw or its promise rejected. |
| `onConflictingKeys` | yes | A step changed or removed a value an earlier step wrote. `ctx` is what the step received, `next` what it returned. |

A hook returns a `StepResult` like a step: a plain `Either`, a promise of one, or an `EitherAsync`. Return `right(...)` / `left(...)` directly; no `async` needed.

```ts
type OrderCtx = { orderId: string; total?: number };
type OrderErr =
  | { tag: "out-of-stock"; sku: string }
  | { tag: "crash"; cause: unknown }
  | { tag: "conflict"; keys: ReadonlyArray<string> };

const orderOptions: PipelineOptions<OrderErr, OrderCtx> = {
  // a step's left stops the pipeline unchanged: no onLeft needed
  onException: (exception) => left({ tag: "crash", cause: exception }), // wrap: never left(exception)
  onConflictingKeys: (keys) => left({ tag: "conflict", keys }),
};
```

Recovering in `onLeft`, accepting conflicts, cleanup: see the `pipeline-hooks` skill.

---

## Context rules

- **Plain objects only.** The copy keeps the object's own fields, not its prototype: a class instance loses its methods and getters. Build the context from the instance's fields (`{ fileName: job.fileName, rows: job.rows }`), or hold the instance in a field (`{ job }`).
- **Step outputs are optional fields, left out of the initial context.** Writing a key that is `undefined` is how a step adds its output. A field that starts as `0`, `""`, `false` or `null` already counts as written, so the step that fills it triggers `onConflictingKeys`.
- `Readonly<Ctx>` everywhere: steps and hooks return new objects (`{ ...ctx, total }`).

---

## Gotchas

- `.catch` / `.finally` on the result do not exist. Use `match` / `onLeft`, or `await` it in a `try` if a hook may throw.
- `right(undefined)` and `left(undefined)` throw in mini-fp 2. A step can throw `undefined`, so `onException` wraps the exception in your error type.
- `onLeft: async (err) => left(err)` is 1.x boilerplate: delete it.
- Do not mutate the context or expect the object you passed in to be updated.

Related skills: `step` (writing steps), `pipeline-hooks` (hook patterns), `dynamic-steps` (loading steps from files). For `Either` / `EitherAsync` detail, see the mini-fp plugin's `either` and `async-pipelines` skills.
