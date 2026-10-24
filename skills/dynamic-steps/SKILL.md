---
name: dynamic-steps
description: Reference for loadSteps and loadStepsFromDir from groucho-fp — dynamic step loading at runtime.
---

## loadSteps

Loads steps from an explicit list of file paths, in the order provided.

```ts
import { loadSteps } from "@ngwes/groucho-fp";

const steps = await loadSteps<Err, Ctx>([
  "./steps/01-validate.ts",
  "./steps/02-transform.ts",
]);
```

Steps from each file are appended in the order the paths are given.

---

## loadStepsFromDir

Scans a directory and loads all matching step files in **alphabetical order** by filename.

```ts
import { loadStepsFromDir } from "@ngwes/groucho-fp";

const steps = await loadStepsFromDir<Err, Ctx>("./steps");

// With a custom file filter:
const steps = await loadStepsFromDir<Err, Ctx>("./steps", {
  pattern: /\.step\.(ts|js)$/,
});
```

| Option | Default | Description |
|---|---|---|
| `pattern` | `/\.(ts\|js\|mjs\|cjs)$/` | Regex applied to filenames. Only matching files are loaded. |

---

## Step file formats

A step file can export its steps in three ways:

**1. Default export — single function**

```ts
// validate.ts
import { Either } from "@ngwes/mini-fp";

export default async (ctx: Ctx) =>  // Ctx is your context type, defined in your project
  Either.right({ ...ctx, validated: true });
```

**2. Default export — array of functions**

```ts
// transforms.ts
import { Either } from "@ngwes/mini-fp";

const normalize = async (ctx: Ctx) => Either.right({ ...ctx, value: ctx.value.trim() });  // Ctx is your context type, defined in your project
const uppercase = async (ctx: Ctx) => Either.right({ ...ctx, value: ctx.value.toUpperCase() });

export default [normalize, uppercase];
```

**3. Named export `steps`**

```ts
// processors.ts
import { Either } from "@ngwes/mini-fp";

const step1 = async (ctx: Ctx) => Either.right({ ...ctx, a: 1 });  // Ctx is your context type, defined in your project
const step2 = async (ctx: Ctx) => Either.right({ ...ctx, b: 2 });

export const steps = [step1, step2];
```

Files that export none of the above are silently ignored — they contribute zero steps.

---

## Runtime notes

- Uses [jiti](https://github.com/unjs/jiti) — TypeScript files are supported without a prior build step.
- `loadStepsFromDir` sorts files alphabetically; use numeric prefixes (`01-`, `02-`) to control execution order.
- A syntax error in any step file causes `loadStepsFromDir` / `loadSteps` to throw — wrap in try/catch.
