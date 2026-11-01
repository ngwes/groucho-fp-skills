---
name: pipeline-hooks
description: Pattern guide for groucho-fp 2 hooks — what a hook is, the continue/stop rule, recovering with a default in onLeft, turning exceptions into errors in onException, accepting or rejecting overwrites in onConflictingKeys, and cleanup.
---

## Problem

A step does not simply succeed: it returns a `left`, it throws, or it overwrites a value an earlier step wrote. For each case, decide whether the pipeline recovers and goes on, or stops.

```ts
import { Pipeline } from "@ngwes/groucho-fp";
import type { PipelineOptions, Step } from "@ngwes/groucho-fp";
import { Option, TryAsync, left, right, toEither } from "@ngwes/mini-fp";
```

---

## What a hook is

A hook is a function in `PipelineOptions` that the pipeline calls when a step does not simply succeed. There are three situations, one hook for each:

| Hook | Runs when | It receives |
|---|---|---|
| `onLeft` (optional) | A step returned `left(error)`. | The error, and the context the step received. |
| `onException` (required) | A step threw, or its promise rejected. | The thrown value (`unknown`), and the context the step received. |
| `onConflictingKeys` (required) | A step changed or dropped a value an earlier step wrote. | The keys, the context the step received (`ctx`), and the context it returned (`next`). |

Every hook follows the same rule:

- **`right(ctx)`: continue.** The pipeline goes on with the **next** step, using `ctx` as the current context. The step that failed is not run again.
- **`left(error)`: stop.** Later steps do not run, and the pipeline's result is that `left`.

A hook returns a `StepResult`, like a step: return `right(...)` / `left(...)` directly. Make it `async` only when it awaits something. Without `onLeft`, a step's `left` already stops the pipeline unchanged, so an `onLeft` that only passes the error on adds nothing: leave it out.

Signatures, the execution model and the result type: see the `pipeline` skill.

---

## Recover with a default and continue (`onLeft`)

The carrier quote is optional: when the carrier has no quote, use a flat rate and still compute the total. Any other failure stops the pipeline.

```ts
type Ctx = { cartId: string; subtotal?: number; shipping?: number; total?: number };
type Err =
  | { tag: "cart-not-found"; cartId: string }
  | { tag: "no-quote"; cartId: string }
  | { tag: "crash"; cause: unknown }
  | { tag: "conflict"; keys: ReadonlyArray<string> };

declare const carts: Map<string, number>;
declare const carrier: { quote(cartId: string): Promise<number | undefined> };

const FLAT_SHIPPING = 4.9;

const loadSubtotal: Step<Err, Ctx> = (ctx) =>
  toEither<Err, number>(carts.get(ctx.cartId), { tag: "cart-not-found", cartId: ctx.cartId })
    .map((subtotal) => ({ ...ctx, subtotal }));

// reports the missing quote as a left: the hook decides what it means
const quoteShipping: Step<Err, Ctx> = (ctx) =>
  Option.fromAsync(carrier.quote(ctx.cartId))
    .toEither<Err>({ tag: "no-quote", cartId: ctx.cartId })
    .map((shipping) => ({ ...ctx, shipping }));

const addTotal: Step<Err, Ctx> = (ctx) =>
  right({ ...ctx, total: (ctx.subtotal ?? 0) + (ctx.shipping ?? 0) });

const options: PipelineOptions<Err, Ctx> = {
  onLeft: (error, ctx) =>
    error.tag === "no-quote"
      ? right({ ...ctx, shipping: FLAT_SHIPPING }) // continue: addTotal runs next
      : left(error),                              // stop
  onException: (exception) => left({ tag: "crash", cause: exception }),
  onConflictingKeys: (keys) => left({ tag: "conflict", keys }),
};

const checkoutTotal = (cartId: string): Promise<string> =>
  Pipeline({ cartId }, [loadSubtotal, quoteShipping, addTotal], options).match(
    (ctx) => `total: ${ctx.total}`,
    (error) => `error: ${error.tag}`,
  );
```

- The step reports the failure as a `left`; the recovery lives in the hook. Do not put the default inside the step or in a `try/catch`.
- Branch on the error's tag: recover only the errors you expect, return `left(error)` for the rest.
- `ctx` is the context the failed step received. Spread it (`{ ...ctx, shipping }`) so the earlier steps' outputs are kept.

---

## Turn the exception into an error (`onException`)

The exception is `unknown`: a step can throw an `Error`, a string, or nothing at all (`throw undefined`, `Promise.reject()`). In mini-fp 2 `left(undefined)` throws, so never pass the exception on as the error. Wrap it in your error type, which is always a real value, and keep the raw value as `cause`:

```ts
type ImportCtx = { fileName: string; rows?: ReadonlyArray<string> };
type ImportErr =
  | { tag: "crash"; message: string; cause: unknown }
  | { tag: "conflict"; keys: ReadonlyArray<string> };

const describe = (exception: unknown): string =>
  exception instanceof Error ? exception.message : `non-Error thrown: ${String(exception)}`;

const importOptions: PipelineOptions<ImportErr, ImportCtx> = {
  onException: (exception) => left({ tag: "crash", message: describe(exception), cause: exception }),
  onConflictingKeys: (keys) => left({ tag: "conflict", keys }),
};
```

- Do not read `(exception as Error).message`: for a string or `undefined` it gives `undefined`, or throws.
- Returning `right(ctx)` from `onException` continues with the next step and skips the one that threw. Do it only when that step is safe to skip; usually, stop.
- An expected failure should be a `left` in the step (see the `step` skill), not an exception you sort out here.

---

## Accept or reject an overwrite (`onConflictingKeys`)

`onConflictingKeys(keys, ctx, next)` gets the conflicting keys, the context the step received and the one it returned. Three answers:

| Return | Effect |
|---|---|
| `right(next)` | Accept the step's output, overwrite included, and continue. |
| `right(ctx)` | Drop the step's whole output (its new keys too) and continue. |
| `left(...)` | Stop. |

```ts
type DocCtx = { docId: string; markdown?: string; html?: string; updatedAt?: Date };
type DocErr = { tag: "conflict"; keys: ReadonlyArray<string> } | { tag: "crash"; cause: unknown };

const docOptions: PipelineOptions<DocErr, DocCtx> = {
  onException: (exception) => left({ tag: "crash", cause: exception }),
  // any step may refresh updatedAt; any other overwrite is a bug
  onConflictingKeys: (keys, _ctx, next) =>
    keys.every((key) => key === "updatedAt") ? right(next) : left({ tag: "conflict", keys }),
};
```

- Decide from `keys`, and accept only the keys you expect to be rewritten. Accepting every conflict hides real bugs.
- The keys are typed `keyof Ctx & string`: a typo in the comparison does not compile.
- What counts as a conflict (`!==`, dropped keys, new objects with the same content): see the `step-composition` skill.

---

## Things to know

- **A hook's output is not conflict-checked.** The context a hook returns is trusted: the hook has the last word (it is still frozen). A recovering `onLeft` that overwrites a key does not trigger `onConflictingKeys`. Only add keys when you recover, or compare the keys in the hook yourself.
- **A hook that throws rejects the result.** No other hook is called: the pipeline's `EitherAsync` rejects with that error, and `await` or `match` throws it. Keep hooks simple; if a hook calls code that can throw, turn the failure into a `left` inside the hook (`Try` / `TryAsync`).
- **Cleanup goes in the hook that stops.** The pipeline has no rollback of its own:

```ts
type Tx = { rollback(): Promise<void> };
type TxCtx = { orderId: string; tx?: Tx; saved?: boolean };
type TxErr =
  | { tag: "rejected"; reason: string }
  | { tag: "crash"; cause: unknown }
  | { tag: "conflict"; keys: ReadonlyArray<string> }
  | { tag: "rollback-failed"; cause: unknown; original: TxErr };

// roll back, then stop; a failing rollback becomes an error instead of rejecting the pipeline
const rollBackAndStop = (ctx: Readonly<TxCtx>, error: TxErr) =>
  TryAsync.runAsync(async () => ctx.tx?.rollback()).match(
    () => left<TxErr, TxCtx>(error),
    (cause) => left<TxErr, TxCtx>({ tag: "rollback-failed", cause, original: error }),
  );

const txOptions: PipelineOptions<TxErr, TxCtx> = {
  onLeft: (error, ctx) => rollBackAndStop(ctx, error),
  onException: (exception, ctx) => rollBackAndStop(ctx, { tag: "crash", cause: exception }),
  onConflictingKeys: (keys, ctx) => rollBackAndStop(ctx, { tag: "conflict", keys }),
};
```

---

## Gotchas

- `left(exception)` in `onException`: the exception may be `undefined`, and `left(undefined)` throws. Wrap it.
- A hook's `right` continues with the next step, for all three hooks, `onException` included. To stop, return `left`.
- No `async` on a hook that only returns an `Either`.
- `.catch` on the pipeline result does not exist; a throwing hook is the only rejection. See the `pipeline` skill.

Related skills: `pipeline` (options and execution model), `step` (returning `left` for expected failures), `step-composition` (avoiding conflicts). For `Either`, `Try` and `TryAsync`, see the mini-fp plugin's `either`, `try` and `async-pipelines` skills.
