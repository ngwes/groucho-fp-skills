---
name: step
description: Reference for the Step type in groucho-fp — how to write, type, and return from a step.
---

## Step\<E, Ctx\>

A step is an async function that receives the current context (frozen) and returns `Either<E, Ctx>`.

```ts
import type { Step } from "groucho-fp";
import { Either } from "@ngwes/mini-fp";
```

### Three outcomes

| Return | Effect |
|---|---|
| `Either.right({ ...ctx, newKey: value })` | Pipeline continues with the new context |
| `Either.left(error)` | Pipeline stops; `onLeft` fires |
| `throw` | Pipeline stops; `onException` fires |

### Context is frozen

`ctx` is `Object.freeze`-d before being passed to the step. Mutating it throws at runtime. Always spread:

```ts
// Correct
return Either.right({ ...ctx, parsed: 42 });

// Wrong — throws at runtime
ctx.parsed = 42;
return Either.right(ctx);
```

### Example

```ts
import type { Step } from "groucho-fp";
import { Either } from "@ngwes/mini-fp";

type Ctx = { input: string; parsed?: number };
type Err = { code: string; detail: string };

const parseStep: Step<Err, Ctx> = async (ctx) => {
  const parsed = parseInt(ctx.input, 10);
  if (isNaN(parsed)) return Either.left({ code: "PARSE_ERROR", detail: `"${ctx.input}" is not a number` });
  return Either.right({ ...ctx, parsed });
};
```

### Gotchas

- A step that sets a key already in `ctx` to a **different** value triggers `onConflictingKeys`.
- TypeScript types the context as `Readonly<Ctx>` inside the step — the compiler also prevents direct mutation.
- Throwing inside a step is caught by the pipeline; it calls `onException`, not `onLeft`.
