---
name: dynamic-steps
description: Reference for loadSteps and loadStepsFromDir from @ngwes/groucho-fp 2 — loading steps from files at runtime, the step file shapes, and the LoadError results.
---

## loadSteps / loadStepsFromDir

Import step files at runtime with [jiti](https://github.com/unjs/jiti), so a step file can be TypeScript with no build step. They **do not throw** and **do not return an array**: both return

```ts skip
EitherAsync<ReadonlyArray<LoadError>, ReadonlyArray<Step<E, Ctx>>>
```

the steps on the right, or on the left every file that could not be loaded.

```ts
import { Pipeline, loadSteps, loadStepsFromDir } from "@ngwes/groucho-fp";
import type { DynamicStepModule, LoadError, PipelineOptions, Step } from "@ngwes/groucho-fp";
import { left, right } from "@ngwes/mini-fp";
```

---

### `loadSteps(paths)`

Loads a list of files. Relative paths resolve against the working directory. The steps keep the order of the paths, then the order inside each file.

```ts
type Ctx = { input: string; validated?: boolean };
type Err = { message: string };

const fromFiles = loadSteps<Err, Ctx>(["./steps/validate.ts", "./steps/transform.ts"]);
```

### `loadStepsFromDir(dir, options?)`

Loads the step files of a directory (not its sub-directories), in alphabetical order of file name. Prefix the names (`01-validate.ts`, `02-transform.ts`) when the order matters.

```ts
type Ctx = { input: string; validated?: boolean };
type Err = { message: string };

const fromDir = loadStepsFromDir<Err, Ctx>("./steps");

// only the files whose name matches
const onlyStageFiles = loadStepsFromDir<Err, Ctx>("./workflow", { pattern: /\.stage\.ts$/ });
```

| Option | Default | Description |
|---|---|---|
| `pattern` | `.ts`, `.js`, `.mjs`, `.cjs` files, except `.d.ts`, `.test.*` and `.spec.*` | A regular expression tested against each file name. Its `g` and `y` flags are ignored. |

The default already skips declaration files and the tests next to the steps. **Every matched file must export steps**: a helper module or a type-only file in the folder is an `invalid-export` error, and the whole load is a `left`. Keep shared code outside the folder, or pass a `pattern` that only matches the step files.

---

## Using the result

It is an `Either`, not an array. Passing it to `Pipeline` as the steps is a type error; chain on it instead:

```ts
type Ctx = { input: string; upper?: string };
type Err = { message: string };

declare const options: PipelineOptions<Err, Ctx>;

const outcome = await loadStepsFromDir<Err, Ctx>("./steps")
  .mapLeft((errors): Err => ({ message: `${errors.length} step file(s) failed to load` }))
  .bindAsync((steps) => Pipeline({ input: " hello " }, steps, options)) // runs only if the steps loaded
  .match(
    (ctx) => `done: ${ctx.upper}`,
    (error) => `failed: ${error.message}`,
  );
```

Or `await` it and `match` the `Either`. No `try/catch`: load failures are values.

---

## Step file shapes

A step file exports its steps in one of three ways. **If it has a `steps` export, that one is used; otherwise the `default` export.**

**1. Default export: one step**

```ts
// steps/01-trim.ts
type Ctx = { input: string; trimmed?: string };
type Err = { message: string };

const trim: Step<Err, Ctx> = (ctx) => right({ ...ctx, trimmed: ctx.input.trim() });

export default trim;
```

**2. Default export: an array of steps**

```ts
// steps/02-case.ts
type Ctx = { input: string; trimmed?: string; upper?: string };
type Err = { message: string };

const check: Step<Err, Ctx> = (ctx) => (ctx.trimmed ? right(ctx) : left({ message: "empty input" }));
const upper: Step<Err, Ctx> = (ctx) => right({ ...ctx, upper: (ctx.trimmed ?? "").toUpperCase() });

export default [check, upper];
```

**3. Named export `steps`**: use it when the file's `default` export is something else that must stay.

```ts
// steps/03-audit.ts
type Ctx = { input: string; auditedAt?: Date };
type Err = { message: string };

export default { name: "audit" }; // ignored by the loader: `steps` wins

export const steps: ReadonlyArray<Step<Err, Ctx>> = [
  (ctx) => right({ ...ctx, auditedAt: new Date() }),
];
```

An empty array is valid and adds no steps. Anything else (no `steps` or `default` export, an object, an array holding something that is not a function) is an `invalid-export` error. `DynamicStepModule<E, Ctx>` is the type of these three shapes; the loader only checks at runtime that the steps are functions, not their types.

---

## Load errors

```ts skip
type LoadError =
  | { tag: "not-found"; path: string; cause: unknown }
  | { tag: "import-failed"; path: string; cause: unknown }
  | { tag: "invalid-export"; path: string; detail: string };
```

| `tag` | Meaning | Extra field |
|---|---|---|
| `not-found` | The file, or the directory given to `loadStepsFromDir`, does not exist or cannot be read. | `cause` |
| `import-failed` | The file exists but importing it failed: syntax error, a module that throws, a missing dependency. | `cause` |
| `invalid-export` | The file imported fine but has no usable `steps` or `default` export. | `detail` |

Every file is attempted, so a `left` lists all the failures, in file order. **`path` is always absolute**: print it as it is, do not `path.resolve` it again.

```ts
type Ctx = { request: string; response?: string };
type Err = { message: string };

const describeLoadError = (error: LoadError): string => {
  switch (error.tag) {
    case "not-found":
      return `${error.path}: not found (${String(error.cause)})`;
    case "import-failed":
      return `${error.path}: could not be imported (${String(error.cause)})`;
    case "invalid-export":
      return `${error.path}: ${error.detail}`;
  }
};

type Loaded = { ok: true; steps: ReadonlyArray<Step<Err, Ctx>> } | { ok: false; messages: ReadonlyArray<string> };

const loaded: Loaded = await loadSteps<Err, Ctx>(["./plugins/auth.ts", "./plugins/handler.ts"]).match(
  (steps): Loaded => ({ ok: true, steps }),
  (errors): Loaded => ({ ok: false, messages: errors.map(describeLoadError) }),
);
```

---

## Gotchas

- `Pipeline(ctx, await loadSteps(...), options)` does not compile: the result is an `Either`, not the steps. Use `bindAsync` or `match`.
- `try { await loadStepsFromDir(...) } catch` catches nothing: failures are `left` values.
- A helper file in the steps folder fails the whole load (`invalid-export`).
- A `pattern` with `g` or `y` behaves as without them.

Related skills: `dynamic-loading` (building a pipeline from a folder), `step-composition` (naming and ordering step files), `step` and `pipeline`. For `EitherAsync` chaining, see the mini-fp plugin's `either` and `async-pipelines` skills.
