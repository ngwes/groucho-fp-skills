---
name: step-composition
description: Pattern guide for splitting a groucho-fp 2 workflow into steps — small single-purpose steps sharing one context and one error union, run order and file-name prefixes, outputs that start undefined, and the never-overwrite rule behind conflicts.
---

## Problem

Split a workflow into steps that are easy to read, reorder and test, and that never trip the conflict check.

```ts
import type { Step } from "@ngwes/groucho-fp";
import { left, right, toEither } from "@ngwes/mini-fp";
```

---

## Small steps, one context, one error union

- **One context type** for the pipeline: the caller's inputs are required fields, every step's output is an optional field.
- **One error union `E`**, a tagged variant per failure. Every step is a `Step<E, Ctx>`, so the hooks and the final `match` switch on one `tag`.
- **One job per step**, writing one key (or a small group of keys that belong together). A check that adds nothing returns `right(ctx)`.
- Keep IO and pure work apart: "load the order" and "compute the total" are two steps.

```ts
type Line = { price: number; quantity: number };
type Order = { id: string; customerId: string; lines: ReadonlyArray<Line> };

type OrderCtx = {
  orderId: string;   // given by the caller
  order?: Order;     // loadOrder
  total?: number;    // computeTotal
  chargeId?: string; // charge
};

type OrderErr =
  | { tag: "order-not-found"; orderId: string }
  | { tag: "empty-order"; orderId: string }
  | { tag: "crash"; cause: unknown }
  | { tag: "conflict"; keys: ReadonlyArray<string> };

declare const orders: Map<string, Order>;
declare const payments: { charge(customerId: string, amount: number): Promise<string> };

const loadOrder: Step<OrderErr, OrderCtx> = (ctx) =>
  toEither<OrderErr, Order>(orders.get(ctx.orderId), { tag: "order-not-found", orderId: ctx.orderId })
    .map((order) => ({ ...ctx, order }));

// a check: adds nothing, returns the context it received
const checkNotEmpty: Step<OrderErr, OrderCtx> = (ctx) =>
  (ctx.order?.lines.length ?? 0) > 0 ? right(ctx) : left({ tag: "empty-order", orderId: ctx.orderId });

const computeTotal: Step<OrderErr, OrderCtx> = (ctx) =>
  right({ ...ctx, total: (ctx.order?.lines ?? []).reduce((sum, l) => sum + l.price * l.quantity, 0) });

// IO that may reject: a rejection goes to onException
const charge: Step<OrderErr, OrderCtx> = async (ctx) =>
  right({ ...ctx, chargeId: await payments.charge(ctx.order?.customerId ?? "", ctx.total ?? 0) });

const orderSteps: ReadonlyArray<Step<OrderErr, OrderCtx>> = [loadOrder, checkNotEmpty, computeTotal, charge];

const initial = (orderId: string): OrderCtx => ({ orderId }); // outputs left out
```

How to write each step (mini-fp idioms, `async` or not): see the `step` skill.

---

## Order: the array, or file-name prefixes

- With static steps, the array order is the run order.
- `loadStepsFromDir` runs the files in **alphabetical order of file name**. Prefix the names with numbers of the same width, and leave gaps so a step can be added later without renaming: `10-`, `20-`, `30-`. Without equal width, `10-charge.ts` sorts before `9-check.ts`.
- A file that exports an array of steps runs them in array order, in that file's place.
- **The steps folder holds only step files.** A helper or a type-only file in it is an `invalid-export` error that fails the whole load. Keep shared types and helpers next to the folder, or pass a `pattern` that only matches the step files (see the `dynamic-steps` skill).

```text
orders/
  types.ts                 ← OrderCtx, OrderErr: imported by every step file
  pricing.ts               ← helpers
  steps/                   ← loadStepsFromDir("./orders/steps"): step files only
    10-load-order.ts
    20-check-not-empty.ts
    30-compute-total.ts
    40-charge.ts
    40-charge.test.ts      ← skipped by the default pattern
```

A step file imports the shared types (`OrderCtx` and `OrderErr` from the first example, moved to `orders/types.ts`); it does not declare its own copy:

```ts skip
// orders/steps/20-check-not-empty.ts
import type { Step } from "@ngwes/groucho-fp";
import { left, right } from "@ngwes/mini-fp";
import type { OrderCtx, OrderErr } from "../types";

const checkNotEmpty: Step<OrderErr, OrderCtx> = (ctx) =>
  (ctx.order?.lines.length ?? 0) > 0 ? right(ctx) : left({ tag: "empty-order", orderId: ctx.orderId });

export default checkNotEmpty;
```

---

## Outputs start `undefined`

Writing a key that is `undefined` is how a step adds its output: it is never a conflict. A key that already holds a value (`0`, `""`, `false`, `[]` and `null` included) counts as written.

- Declare every output as an optional field (`total?: number`).
- Leave the outputs out of the initial context: `{ orderId }`, not `{ orderId, total: 0, chargeId: "" }`. With a placeholder, the step that fills the key is reported as a conflict.
- A later step reads an output with a fallback (`ctx.total ?? 0`) or after a check step that guarantees it.

---

## Never overwrite or drop an earlier key

After each step, the pipeline compares the context the step received with the one it returned. A key that held a value **conflicts** when the returned context:

- holds a different value for it, compared with `!==`, or
- does not have it any more.

So:

- **Write a derived value to a new key.** Trim into `text`, then lowercase into `normalized`; do not lowercase over `text`. Or do both in one step that writes `text` once.
- **Keep the references you received.** A new object or array with the same content is a different value: `{ ...ctx, meta: { ...ctx.meta } }`, `{ lang: "en", ...ctx.meta }` or `[...ctx.items].sort()` written back to the same key all conflict. Write the result to a new key (`metaWithDefaults`, `sortedItems`).
- **Do not drop keys.** `const { password, ...rest } = ctx; return right(rest)` conflicts on `password`. Leave it in the context, and leave it out when you build the final result from the pipeline's context.
- **Do not mutate a nested object in place.** The freeze is shallow and the reference does not change, so the check cannot see it.
- When a rewrite is intended (a timestamp every step refreshes), accept it in `onConflictingKeys` for that key only: see the `pipeline-hooks` skill.

```ts
type Item = { sku: string; price: number };
type CartCtx = { items: ReadonlyArray<Item>; sortedItems?: ReadonlyArray<Item>; cheapest?: Item };
type CartErr = { tag: "empty-cart" };

// a new key: items keeps the reference the step received
const sortItems: Step<CartErr, CartCtx> = (ctx) =>
  right({ ...ctx, sortedItems: [...ctx.items].sort((a, b) => a.price - b.price) });

const pickCheapest: Step<CartErr, CartCtx> = (ctx) =>
  toEither<CartErr, Item>(ctx.sortedItems?.[0], { tag: "empty-cart" })
    .map((cheapest) => ({ ...ctx, cheapest }));
```

---

## Plain-object contexts

The pipeline works on frozen shallow copies, which keep an object's own fields, not its prototype. Use plain objects (type aliases, object literals) for the context: a class instance passed as the context loses its methods and getters. Copy the fields you need into the context, or hold the instance in a field (`{ job }`): a field keeps its reference, so its methods still work. See the `pipeline` skill's context rules.

---

## Gotchas

- Placeholder outputs (`0`, `""`, `null`, `[]`) in the initial context make the step that fills them conflict.
- Equal content is not equal: a new object or array in an existing key conflicts.
- A helper file in a loaded steps folder fails the whole load.
- `9-x.ts` runs after `10-y.ts`: use prefixes of equal width.

Related skills: `step` (writing one step), `pipeline` (context rules), `pipeline-hooks` (accepting an intended overwrite), `dynamic-steps` (step file shapes and the loader). For `Either` and `toEither`, see the mini-fp plugin's `either` and `option` skills.
