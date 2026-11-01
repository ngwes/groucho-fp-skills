---
name: dynamic-loading
description: Pattern guide for assembling a groucho-fp 2 pipeline from step files on disk — load then run as one EitherAsync, never run a half-loaded pipeline, load once at startup, mix built-in and loaded steps, keep the steps folder clean, and use npm packages in step files.
---

## Problem

Part of the workflow lives in step files on disk (plugins, per-customer workflows, steps operators add without a redeploy). Load them, put them together with the steps written in the app, and run the pipeline, without ever running it when a file failed to load.

```ts
import { Pipeline, loadStepsFromDir } from "@ngwes/groucho-fp";
import type { LoadError, PipelineOptions, Step } from "@ngwes/groucho-fp";
import { left, right } from "@ngwes/mini-fp";
```

The loaders, the step file shapes and the `LoadError` tags: see the `dynamic-steps` skill.

---

## Recipe: load, then run, as one `EitherAsync`

`loadStepsFromDir` returns an `EitherAsync` of the load errors or the steps. Turn the load errors into the pipeline's error type with `mapLeft`, then run the pipeline with `bindAsync`: it runs only if every file loaded. One `match` at the end handles both kinds of failure.

```ts
type Ctx = { orderId: string; apiKey: string; summary?: string; response?: string };
type Err =
  | { tag: "load-failed"; errors: ReadonlyArray<LoadError> }
  | { tag: "unauthorized" }
  | { tag: "crash"; cause: unknown }
  | { tag: "conflict"; keys: ReadonlyArray<string> };

declare const validKeys: ReadonlySet<string>;

// built into the app: always first and last
const authorize: Step<Err, Ctx> = (ctx) =>
  validKeys.has(ctx.apiKey) ? right(ctx) : left({ tag: "unauthorized" });

const respond: Step<Err, Ctx> = (ctx) =>
  right({ ...ctx, response: `order ${ctx.orderId}: ${ctx.summary ?? "no summary"}` });

const options: PipelineOptions<Err, Ctx> = {
  onException: (exception) => left({ tag: "crash", cause: exception }),
  onConflictingKeys: (keys) => left({ tag: "conflict", keys }),
};

const runWorkflow = (orderId: string, apiKey: string): Promise<string> =>
  loadStepsFromDir<Err, Ctx>("./workflow")
    .mapLeft((errors): Err => ({ tag: "load-failed", errors }))
    .bindAsync((loaded) => Pipeline({ orderId, apiKey }, [authorize, ...loaded, respond], options))
    .match(
      (ctx) => ctx.response ?? "",
      (error) => (error.tag === "load-failed" ? `load failed: ${error.errors.length} file(s)` : `error: ${error.tag}`),
    );
```

- **Fail before running on any `LoadError`.** One file that does not load means no step runs, not a pipeline that silently skips that file's work. Never filter the failed files out and run the rest.
- The loader result is not an array: passing it to `Pipeline` as the steps does not compile.
- No `try/catch`: load failures are values. Use `match`, `mapLeft`, or an `isLeft` check on the awaited `Either`.
- A relative folder resolves against the working directory, not the source file. Pass an absolute path when the app may be started from elsewhere.

---

## Recipe: load once at startup

For a server, load once when it starts and refuse to start on any load error: a broken step file then stops the deploy instead of failing every request. Each request only runs the pipeline:

```ts
type HookCtx = { event: string; handled?: boolean };
type HookErr = { tag: "crash"; cause: unknown } | { tag: "conflict"; keys: ReadonlyArray<string> };

declare const hookOptions: PipelineOptions<HookErr, HookCtx>;

const describeLoadError = (error: LoadError): string =>
  error.tag === "invalid-export" ? `${error.path}: ${error.detail}` : `${error.path}: ${error.tag} (${String(error.cause)})`;

const startServer = async (): Promise<(event: string) => Promise<string>> => {
  const steps = await loadStepsFromDir<HookErr, HookCtx>("./hooks").match(
    (loaded) => loaded,
    (errors) => {
      // every failing file, not only the first
      throw new Error(`not starting, cannot load:\n${errors.map(describeLoadError).join("\n")}`);
    },
  );
  return (event) =>
    Pipeline({ event }, steps, hookOptions).match(
      () => "ok",
      (error) => `error: ${error.tag}`,
    );
};
```

---

## Mix static and loaded steps

- Steps that must always run, in a fixed place (authentication, validation, building the response), stay in the app's code. Put them around the loaded ones: `[...before, ...loaded, ...after]`.
- The loaded steps are typed `Step<E, Ctx>` from the type arguments you give the loader. It only checks at runtime that they are functions, so the step files must use the same context and error types as the app.
- Need several folders, or an order that is not alphabetical? List the files with `loadSteps([...])` (see the `dynamic-steps` skill).

---

## The steps folder holds only step files

Every file the loader's pattern matches must export steps. A helper module or a type-only file in the folder is an `invalid-export` error, and the whole load fails. The default pattern already skips `.d.ts`, `.test.*` and `.spec.*` files.

```text
app/
  workflow/          ← loaded: step files only
    10-enrich.ts
    20-score.ts
    20-score.test.ts ← skipped by the default pattern
  workflow-lib/      ← helpers the step files import
    http.ts
  types.ts           ← Ctx and Err, imported by the app and the step files
```

Or keep helpers in the folder and pass a `pattern` that matches only the step files:

```ts
type Ctx = { input: string; score?: number };
type Err = { tag: "crash"; cause: unknown };

// enrich.step.ts and score.step.ts are loaded; http.ts and types.ts are not
const loaded = loadStepsFromDir<Err, Ctx>("./workflow", { pattern: /\.step\.ts$/ });
```

File names set the run order: see the `step-composition` skill.

---

## Using packages in step files

- A step file can import any npm package, like any module.
- Imports are resolved from **the step file's own folder**, with normal Node resolution (its folder's `node_modules`, then its parents'). A steps folder inside the app uses the app's `node_modules`. A steps folder outside the app (`/opt/acme-plugins`, another repository) needs its own: a `package.json` and `npm install` there.
- A missing package makes that file an `import-failed` `LoadError` (not `not-found`: the file exists), with the "Cannot find module" error as `cause`. Every file is attempted, so it is reported along with the other files' errors.
- If the steps folder brings its own copy of `@ngwes/mini-fp`, keep it on the same major version as the app's: the pipeline consumes the `Either` values the steps return.
- The loader (jiti) only transpiles TypeScript: it does not type-check. A type error in a step file surfaces at run time, as a wrong value or an exception. Type-check the steps folder separately, for example `tsc --noEmit` in CI with a `tsconfig.json` that includes it.

---

## Gotchas

- `Pipeline(ctx, await loadStepsFromDir(dir), options)` does not compile: chain with `bindAsync`, or `match` first.
- `try/catch` around the loader catches nothing: failures are `left` values.
- A server that loads per request starts fine with a broken step file, then fails every request: load once at startup.
- A helper file in the steps folder fails the whole load.
- A package the step file imports must be installed where the step file is, not only in the app.

Related skills: `dynamic-steps` (loader reference, file shapes, `LoadError`), `step-composition` (naming and ordering step files), `pipeline` (running the steps), `pipeline-hooks` (the options). For `EitherAsync` chaining, see the mini-fp plugin's `either` and `async-pipelines` skills.
