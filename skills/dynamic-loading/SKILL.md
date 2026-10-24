---
name: dynamic-loading
description: Pattern guide for assembling groucho-fp pipelines from step files loaded from the filesystem at runtime.
---

## Problem

You want to build a pipeline whose steps live in separate files, loaded at runtime without static imports or, you want to build a dynamic workflow based on a considerable number of conditions know at runtime and not modelable through classic if/else or other logical expressions

---

## Recipe: full pipeline from a directory

```ts
import { Pipeline, loadStepsFromDir } from "@ngwes/groucho-fp";
import { Either } from "@ngwes/mini-fp";
import type { PipelineOptions } from "@ngwes/groucho-fp";

type Ctx = { userId: string; profile?: Record<string, unknown> };
type Err = { code: string; detail: string };

const options: PipelineOptions<Err, Ctx> = {
  onLeft: async (err) => {
    console.error("Pipeline failed:", err);
    return Either.left(err);
  },
  onException: async (ex) =>
    Either.left({ code: "EXCEPTION", detail: String(ex) }),
  onConflictingKeys: async (keys) =>
    Either.left({ code: "KEY_CONFLICT", detail: keys.join(", ") }),
};

const steps = await loadStepsFromDir<Err, Ctx>("./steps");
const result = await Pipeline({ userId: "42" }, steps, options);

result.fold(
  (err) => console.error("Final error:", err),
  (ctx) => console.log("Done:", ctx),
);
```

---

## Handle load errors

`loadStepsFromDir` uses jiti to import TypeScript files. A syntax error in a step file causes it to throw. Wrap the load call:

```ts
import { loadStepsFromDir } from "@ngwes/groucho-fp";
import type { Step } from "@ngwes/groucho-fp";

type Ctx = { userId: string; profile?: Record<string, unknown> };
type Err = { code: string; detail: string };

let steps: ReadonlyArray<Step<Err, Ctx>>;
try {
  steps = await loadStepsFromDir<Err, Ctx>("./steps");
} catch (ex) {
  console.error("Failed to load steps:", ex);
  process.exit(1);
}
```

---

## Filter by file suffix

Use the `pattern` option to load only files that follow a naming convention:

```ts
const steps = await loadStepsFromDir<Err, Ctx>("./steps", {
  pattern: /\.step\.(ts|js)$/,
});
```

Only `.step.ts` / `.step.js` files are loaded. Type files, helpers, and test files are ignored.

---

## When to prefer loadSteps over loadStepsFromDir

Use `loadSteps(paths[])` when:
- Order must differ from alphabetical.
- Steps come from multiple directories.
- You need conditional inclusion of specific files.

```ts
import { loadSteps } from "@ngwes/groucho-fp";

const steps = await loadSteps<Err, Ctx>([
  "./shared/01-auth.ts",
  "./domain/02-fetch.ts",
  "./domain/03-transform.ts",
]);
```
