---
name: step
description: Reference for Step and StepResult in @ngwes/groucho-fp 2 — how to write, type and return from a step, with the mini-fp idioms to use inside one.
---

## Step\<E, Ctx\>

A step takes the current context (frozen) and returns an `Either` of an error or the next context, sync or async.

```ts
import type { Step, StepResult } from "@ngwes/groucho-fp";
import { Option, Try, TryAsync, left, right, toEither } from "@ngwes/mini-fp";
import type { Either } from "@ngwes/mini-fp";
```

```ts skip
type StepResult<E, Ctx> = Either<E, Ctx> | PromiseLike<Either<E, Ctx>>;
type Step<E, Ctx> = (ctx: Readonly<Ctx>) => StepResult<E, Ctx>;
```

`StepResult` covers a plain `Either`, a `Promise<Either>` (an `async` function) and a mini-fp `EitherAsync`. Hooks return the same type.

### Three outcomes

| The step | Effect |
|---|---|
| returns `right({ ...ctx, newField })` | The pipeline continues with the new context. |
| returns `left(error)` | An expected failure: `onLeft` runs, or the pipeline stops if there is none. |
| throws, or its promise rejects | An exception: `onException` runs. |

---

## Return what you have: no `async` just to return an `Either`

```ts
type Ctx = { rawQuantity: string; quantity?: number };
type Err = { tag: "invalid-quantity"; raw: string };

// sync: return the Either directly
const parseQuantity: Step<Err, Ctx> = (ctx) => {
  const quantity = Number(ctx.rawQuantity);
  return Number.isInteger(quantity) && quantity > 0
    ? right({ ...ctx, quantity })
    : left({ tag: "invalid-quantity", raw: ctx.rawQuantity });
};
```

Use `async` only when the step awaits something. A mini-fp async chain (`EitherAsync`) is returned as it is, with no `async`/`await` (see below).

---

## The context: spread it, never mutate it

- `ctx` is a frozen `Readonly<Ctx>`. Return a new object: `{ ...ctx, quantity }`.
- Declare every field a step writes as **optional**, and leave it out of the initial context. Outputs start `undefined`; writing an `undefined` key is not a conflict.
- Do not change or drop a key an earlier step wrote, and keep the object references you received: a new object with the same content (`{ ...ctx, user: { ...ctx.user } }`) is a conflict. Both trigger `onConflictingKeys`.
- A step that adds nothing returns the context it received: `right(ctx)`. Never `right(undefined)`, `right()` or `right(voidCall())`: mini-fp 2 throws on an empty `Either`.

```ts
type AuditCtx = { orderId: string; total?: number };

declare const audit: { log(orderId: string): void };

const recordAudit: Step<{ message: string }, AuditCtx> = (ctx) => {
  audit.log(ctx.orderId);
  return right(ctx);
};
```

---

## mini-fp idioms inside a step

### Nullable lookup: `toEither`

```ts
type User = { id: string; name: string };
type UserCtx = { userId: string; user?: User };
type UserErr = { tag: "user-not-found"; userId: string };

declare const users: Map<string, User>;

const findUser: Step<UserErr, UserCtx> = (ctx) =>
  toEither<UserErr, User>(users.get(ctx.userId), { tag: "user-not-found", userId: ctx.userId })
    .map((user) => ({ ...ctx, user }));
```

`Option.from(value).toEither(error)` is equivalent.

### Throwing code: `Try.run(...).toEither().mapLeft(...)`

```ts
type Config = { port: number };
type ConfigCtx = { rawConfig: string; config?: Config };
type ConfigErr = { tag: "bad-config"; detail: string };

const parseConfig: Step<ConfigErr, ConfigCtx> = (ctx) =>
  Try.run(() => JSON.parse(ctx.rawConfig) as Config)
    .toEither()
    .mapLeft((error): ConfigErr => ({ tag: "bad-config", detail: String(error) }))
    .map((config) => ({ ...ctx, config }));
```

No `try/catch`: the parse error becomes a `left`, so `onLeft` handles it instead of `onException`.

### Async work: `EitherAsync` chains, `bindAsync`

```ts
type Order = { id: string; amount: number };
type OrdersCtx = { customerId: string; orders?: ReadonlyArray<Order>; reservationId?: string };
type OrdersErr = { tag: "upstream"; cause: unknown } | { tag: "no-orders" } | { tag: "out-of-stock" };

declare const api: {
  fetchOrders(customerId: string): Promise<Order[]>;
  findLatestOrder(customerId: string): Promise<Order | undefined>;
};
declare const inventory: { reserve(order: Order): Promise<Either<OrdersErr, string>> };

// a promise that may reject: TryAsync, no async/await
const fetchOrders: Step<OrdersErr, OrdersCtx> = (ctx) =>
  TryAsync.runAsync(() => api.fetchOrders(ctx.customerId))
    .toEither()
    .mapLeft((cause): OrdersErr => ({ tag: "upstream", cause }))
    .map((orders) => ({ ...ctx, orders }));

// a promise of a nullable value, then another async call that returns an Either
const reserveLatest: Step<OrdersErr, OrdersCtx> = (ctx) =>
  Option.fromAsync(api.findLatestOrder(ctx.customerId))
    .toEither<OrdersErr>({ tag: "no-orders" })
    .bindAsync((order) => inventory.reserve(order))
    .map((reservationId) => ({ ...ctx, reservationId }));
```

`bindAsync` chains a call that returns a `Promise<Either>` or an `EitherAsync`; `map` adds the result to the context. Await once at the end, or not at all: the pipeline awaits the step.

---

## Gotchas

- `right(undefined)` / `left(undefined)` throw. Return `right(ctx)` when nothing changes, and always give `left` an error value.
- An expected failure is a `left`, not a `throw`: a throw goes to `onException`.
- No `async` on a step that only returns an `Either` or an `EitherAsync`.
- Mutating `ctx` throws at runtime (it is frozen) and does not compile (`Readonly<Ctx>`).

Related skills: `pipeline` (running steps), `pipeline-hooks` (what happens after a `left`, an exception or a conflict), `step-composition` (organizing steps). For `Either`, `Option`, `Try` and async chains, see the mini-fp plugin's `either`, `option`, `try` and `async-pipelines` skills.
