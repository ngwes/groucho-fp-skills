---
name: step-composition
description: Pattern guide for ordering, naming, and structuring step files in groucho-fp pipelines.
---

## Problem

How do you structure step files so that execution order is clear and each step has one responsibility?

---

## Naming convention

When using `loadStepsFromDir`, files load in alphabetical order. Use numeric prefixes to make order explicit:

```
steps/
  01-validate.ts
  02-fetch-user.ts
  03-transform.ts
  04-persist.ts
```

The filename is the documentation for what the step does and when it runs.

---

## One responsibility per file

Each step file should do one thing and add one (or a small group of closely related) keys to the context:

```ts
// 02-fetch-user.ts
import { Either } from "@ngwes/mini-fp";

export default async (ctx: { userId: string }) => {
  const user = await db.users.findById(ctx.userId);
  return user
    ? Either.right({ ...ctx, user })
    : Either.left({ code: "NOT_FOUND", detail: `User ${ctx.userId} not found` });
};
```

---

## When to split a step into two

Split when a single file does both IO and data transformation:

```
// Before: one file doing two things
02-fetch-and-normalize-user.ts

// After: two focused files
02-fetch-user.ts      ← IO only
03-normalize-user.ts  ← transform only
```

---

## Immutability rule

`ctx` is frozen — always spread it. Never mutate directly:

```ts
// Correct
return Either.right({ ...ctx, result: value });

// Wrong — throws at runtime
ctx.result = value;
return Either.right(ctx);
```

---

## Example: two well-structured step files

```ts
// 01-validate.ts
import { Either } from "@ngwes/mini-fp";

export default async (ctx: { input: string }) => {
  if (!ctx.input.trim())
    return Either.left({ code: "EMPTY_INPUT", detail: "input is empty" });
  return Either.right({ ...ctx, validated: true as const });
};

// 02-transform.ts
import { Either } from "@ngwes/mini-fp";

export default async (ctx: { input: string; validated: true }) =>
  Either.right({ ...ctx, result: ctx.input.toUpperCase() });
```
