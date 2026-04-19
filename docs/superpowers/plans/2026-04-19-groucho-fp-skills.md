# groucho-fp-skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Claude Code skill plugin for `groucho-fp` mirroring the structure of `mini-fp-skills`, with 4 concept skills and 3 pattern skills.

**Architecture:** One SKILL.md per concept/pattern, a router skill as entry point, and repo scaffolding (package.json, README.md, commitlint) copied from mini-fp-skills. No build step, no tests — pure markdown content.

**Tech Stack:** Markdown, JSON, Node.js >=18

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `package.json` | Create | Repo metadata, devDependencies |
| `commitlint.config.js` | Create | Conventional commits config |
| `README.md` | Create | Plugin documentation |
| `skills/groucho-fp/SKILL.md` | Create | Router — entry point |
| `skills/pipeline/SKILL.md` | Create | Concept: Pipeline API |
| `skills/step/SKILL.md` | Create | Concept: Step type |
| `skills/dynamic-steps/SKILL.md` | Create | Concept: loadSteps / loadStepsFromDir |
| `skills/pipeline-hooks/SKILL.md` | Create | Pattern: onLeft / onException / onConflictingKeys |
| `skills/step-composition/SKILL.md` | Create | Pattern: ordering, naming, immutability |
| `skills/dynamic-loading/SKILL.md` | Create | Pattern: assembling pipelines from filesystem |

---

## Task 1: Repo scaffolding

**Files:**
- Create: `package.json`
- Create: `commitlint.config.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ngwes/groucho-fp-skills",
  "version": "1.0.0",
  "description": "Claude Code skill plugin for groucho-fp",
  "private": true,
  "type": "module",
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "@commitlint/cli": "^20.5.0",
    "@commitlint/config-conventional": "^20.5.0",
    "@semantic-release/changelog": "^6.0.3",
    "@semantic-release/exec": "^6.0.3",
    "@semantic-release/git": "^10.0.1",
    "@semantic-release/gitlab": "^13.3.2",
    "husky": "^9.1.7",
    "semantic-release": "^25.0.3"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 2: Create `commitlint.config.js`**

```js
export default {
  extends: ['@commitlint/config-conventional'],
};
```

- [ ] **Step 3: Verify files exist**

Run: `ls` in project root.
Expected: `package.json` and `commitlint.config.js` are listed.

- [ ] **Step 4: Commit**

```bash
git add package.json commitlint.config.js
git commit -m "chore: add repo scaffolding"
```

---

## Task 2: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# groucho-fp-skills

Claude Code skill plugin for [`groucho-fp`](https://www.npmjs.com/package/groucho-fp) — a functional pipeline library for TypeScript built on `@ngwes/mini-fp`.

These skills are loaded by coding agents (Claude Code, Copilot, Cursor) when working on projects that use `groucho-fp`.

---

## Installation

### Option A: Plugin

```bash
claude plugins install ngwes/groucho-fp-skills
```

### Option B: Manual copy

```bash
cp -r skills/. ~/.claude/skills/
```

---

## Usage

Add this to the `CLAUDE.md` in your project (the one that uses `groucho-fp`):

```markdown
When working with groucho-fp, invoke the `groucho-fp` skill first.
```

The agent will load the router skill, identify the right concept or pattern, and invoke the specific skill automatically.

---

## Available Skills

| Skill | Description |
|---|---|
| `groucho-fp` | Router — entry point, decision table, skill index |
| `pipeline` | `Pipeline` API reference |
| `step` | `Step<E, Ctx>` type reference |
| `dynamic-steps` | `loadSteps` and `loadStepsFromDir` reference |
| `pipeline-hooks` | Pattern: handling `onLeft`, `onException`, `onConflictingKeys` |
| `step-composition` | Pattern: ordering, naming conventions, immutability |
| `dynamic-loading` | Pattern: assembling pipelines from the filesystem |
```

- [ ] **Step 2: Verify file exists**

Run: `ls` in project root.
Expected: `README.md` is listed.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Task 3: Router skill — `groucho-fp`

**Files:**
- Create: `skills/groucho-fp/SKILL.md`

- [ ] **Step 1: Create `skills/groucho-fp/SKILL.md`**

```markdown
---
name: groucho-fp
description: Entry point for groucho-fp. Invoke this first when working with the library to select the right concept or pattern skill.
---

`groucho-fp` is a functional pipeline library for TypeScript built on `@ngwes/mini-fp`. It runs sequential steps over a shared context, with hooks for errors, exceptions, and key conflicts.

## Install

```bash
npm install groucho-fp @ngwes/mini-fp
```

## Decision Table

| Scenario | Skill |
|---|---|
| Understanding how Pipeline works | `pipeline` |
| Writing or reading a Step function | `step` |
| Loading steps from files or directories | `dynamic-steps` |
| Handling pipeline failures and exceptions | `pipeline-hooks` |
| Ordering and structuring step files | `step-composition` |
| Assembling a pipeline from the filesystem | `dynamic-loading` |

## Available Skills

| Skill | When to invoke |
|---|---|
| `pipeline` | Understanding the Pipeline API, options, execution model |
| `step` | Writing, typing, or reading a Step function |
| `dynamic-steps` | Using `loadSteps` or `loadStepsFromDir` |
| `pipeline-hooks` | Handling failures, exceptions, or key conflicts |
| `step-composition` | Structuring and ordering step files |
| `dynamic-loading` | Building a pipeline from a directory of step files |

**Rule:** After reading this skill, invoke the specific skill for the concept or pattern you need.
```

- [ ] **Step 2: Verify file exists**

Run: `ls skills/groucho-fp/`
Expected: `SKILL.md` is listed.

- [ ] **Step 3: Commit**

```bash
git add skills/groucho-fp/SKILL.md
git commit -m "feat: add groucho-fp router skill"
```

---

## Task 4: Concept skill — `pipeline`

**Files:**
- Create: `skills/pipeline/SKILL.md`

- [ ] **Step 1: Create `skills/pipeline/SKILL.md`**

```markdown
---
name: pipeline
description: API reference for Pipeline from groucho-fp — signature, options, execution model, and example.
---

## Pipeline

Runs an ordered sequence of steps over a shared context object.

```ts
import { Pipeline } from "groucho-fp";
import type { PipelineOptions } from "groucho-fp";

const result = await Pipeline(initialCtx, steps, options);
```

### Signature

```ts
function Pipeline<E, Ctx extends object>(
  ctx: Ctx,
  steps: ReadonlyArray<Step<E, Ctx>>,
  options: PipelineOptions<E, Ctx>
): Promise<Either<E, Readonly<Ctx>>>
```

### Parameters

| Parameter | Description |
|---|---|
| `ctx` | Initial context. Frozen before the first step runs. |
| `steps` | Ordered array of steps executed sequentially. |
| `options` | Hooks for non-happy-path situations. |

### PipelineOptions

```ts
interface PipelineOptions<E, Ctx extends object> {
  onLeft:            (err: E,      ctx: Readonly<Ctx>) => Promise<Either<E, Readonly<Ctx>>>;
  onException:       (ex: unknown, ctx: Readonly<Ctx>) => Promise<Either<E, Readonly<Ctx>>>;
  onConflictingKeys: (keys: ReadonlyArray<string>, ctx: Readonly<Ctx>) => Promise<Either<E, Readonly<Ctx>>>;
}
```

| Hook | When it fires | What you can do |
|---|---|---|
| `onLeft` | A step returned `Either.left(err)` | Return `right` to recover, `left` to propagate |
| `onException` | A step threw an unhandled exception | Return `right` to recover, `left` to surface the error |
| `onConflictingKeys` | A step overwrote an existing key with a different value | Return `right` to accept, `left` to reject |

### Execution model

1. Steps run **sequentially** in array order.
2. Context is **frozen** before each step — steps must return a new object.
3. If a step returns `Either.left`, subsequent steps are skipped and `onLeft` fires immediately.
4. Exceptions are caught at pipeline level; `onException` receives the last good context.
5. If `onLeft` or `onConflictingKeys` returns `Either.left`, the pipeline stops at that point.

### Example

```ts
import { Pipeline } from "groucho-fp";
import { Either } from "@ngwes/mini-fp";
import type { Step, PipelineOptions } from "groucho-fp";

type Ctx = { input: string; result?: string };
type Err = { message: string };

const step1: Step<Err, Ctx> = async (ctx) =>
  Either.right({ ...ctx, result: ctx.input.toUpperCase() });

const options: PipelineOptions<Err, Ctx> = {
  onLeft:            async (err)  => Either.left(err),
  onException:       async (ex)   => Either.left({ message: String(ex) }),
  onConflictingKeys: async (keys) => Either.left({ message: `Conflict: ${keys.join(", ")}` }),
};

const result = await Pipeline({ input: "hello" }, [step1], options);

result.fold(
  (err) => console.error(err.message),
  (ctx) => console.log(ctx.result), // "HELLO"
);
```
```

- [ ] **Step 2: Verify file exists**

Run: `ls skills/pipeline/`
Expected: `SKILL.md` is listed.

- [ ] **Step 3: Commit**

```bash
git add skills/pipeline/SKILL.md
git commit -m "feat: add pipeline concept skill"
```

---

## Task 5: Concept skill — `step`

**Files:**
- Create: `skills/step/SKILL.md`

- [ ] **Step 1: Create `skills/step/SKILL.md`**

```markdown
---
name: step
description: Reference for the Step type in groucho-fp — how to write, type, and return from a step.
---

## Step\<E, Ctx\>

A step is an async function that receives the current context (frozen) and returns `Either<E, Ctx>`.

```ts
import type { Step } from "groucho-fp";
import { Either } from "@ngwes/mini-fp";

type Step<E, Ctx> = (ctx: Readonly<Ctx>) => Promise<Either<E, Ctx>>;
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
type Err = { message: string };

const parseStep: Step<Err, Ctx> = async (ctx) => {
  const parsed = parseInt(ctx.input, 10);
  if (isNaN(parsed)) return Either.left({ message: `"${ctx.input}" is not a number` });
  return Either.right({ ...ctx, parsed });
};
```

### Gotchas

- A step that sets a key already in `ctx` to a **different** value triggers `onConflictingKeys`.
- TypeScript types the context as `Readonly<Ctx>` inside the step — the compiler also prevents direct mutation.
- Throwing inside a step is caught by the pipeline; it calls `onException`, not `onLeft`.
```

- [ ] **Step 2: Verify file exists**

Run: `ls skills/step/`
Expected: `SKILL.md` is listed.

- [ ] **Step 3: Commit**

```bash
git add skills/step/SKILL.md
git commit -m "feat: add step concept skill"
```

---

## Task 6: Concept skill — `dynamic-steps`

**Files:**
- Create: `skills/dynamic-steps/SKILL.md`

- [ ] **Step 1: Create `skills/dynamic-steps/SKILL.md`**

```markdown
---
name: dynamic-steps
description: Reference for loadSteps and loadStepsFromDir from groucho-fp — dynamic step loading at runtime.
---

## loadSteps

Loads steps from an explicit list of file paths, in the order provided.

```ts
import { loadSteps } from "groucho-fp";

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
import { loadStepsFromDir } from "groucho-fp";

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

export default async (ctx: Ctx) =>
  Either.right({ ...ctx, validated: true });
```

**2. Default export — array of functions**

```ts
// transforms.ts
import { Either } from "@ngwes/mini-fp";

const normalize = async (ctx: Ctx) => Either.right({ ...ctx, value: ctx.value.trim() });
const uppercase = async (ctx: Ctx) => Either.right({ ...ctx, value: ctx.value.toUpperCase() });

export default [normalize, uppercase];
```

**3. Named export `steps`**

```ts
// processors.ts
import { Either } from "@ngwes/mini-fp";

const step1 = async (ctx: Ctx) => Either.right({ ...ctx, a: 1 });
const step2 = async (ctx: Ctx) => Either.right({ ...ctx, b: 2 });

export const steps = [step1, step2];
```

Files that export none of the above are silently ignored — they contribute zero steps.

---

## Runtime notes

- Uses [jiti](https://github.com/unjs/jiti) — TypeScript files are supported without a prior build step.
- `loadStepsFromDir` sorts files alphabetically; use numeric prefixes (`01-`, `02-`) to control execution order.
- A syntax error in any step file causes `loadStepsFromDir` / `loadSteps` to throw — wrap in try/catch.
```

- [ ] **Step 2: Verify file exists**

Run: `ls skills/dynamic-steps/`
Expected: `SKILL.md` is listed.

- [ ] **Step 3: Commit**

```bash
git add skills/dynamic-steps/SKILL.md
git commit -m "feat: add dynamic-steps concept skill"
```

---

## Task 7: Pattern skill — `pipeline-hooks`

**Files:**
- Create: `skills/pipeline-hooks/SKILL.md`

- [ ] **Step 1: Create `skills/pipeline-hooks/SKILL.md`**

```markdown
---
name: pipeline-hooks
description: Pattern guide for handling onLeft, onException, and onConflictingKeys in groucho-fp pipelines.
---

## Problem

A step returned `Either.left`, threw an exception, or produced a key conflict. How do you handle each case?

---

## Recipe: onLeft — propagate or recover

```ts
import { Either } from "@ngwes/mini-fp";
import type { PipelineOptions } from "groucho-fp";

type AppError = { code: string; detail: string };

const options: PipelineOptions<AppError, Ctx> = {
  onLeft: async (err, ctx) => {
    console.error("Pipeline failed:", err);
    return Either.left(err); // propagate

    // To recover and continue:
    // return Either.right({ ...ctx, recovered: true });
  },
  // ...
};
```

Return `Either.right(newCtx)` to recover and let the pipeline continue from the next step.
Return `Either.left(err)` to stop and surface the error.

---

## Recipe: onException — wrap and stop

```ts
const options: PipelineOptions<AppError, Ctx> = {
  onException: async (ex, _ctx) => {
    console.error("Unexpected exception:", ex);
    return Either.left({
      code: "EXCEPTION",
      detail: ex instanceof Error ? ex.message : String(ex),
    });
  },
  // ...
};
```

Unhandled exceptions indicate a programming error — always return `Either.left`.

---

## Recipe: onConflictingKeys — reject with detail

```ts
const options: PipelineOptions<AppError, Ctx> = {
  onConflictingKeys: async (keys, _ctx) => {
    console.warn("Key conflict detected:", keys);
    return Either.left({
      code: "KEY_CONFLICT",
      detail: `Conflicting keys: ${keys.join(", ")}`,
    });
  },
};
```

`keys` is the list of context property names a step tried to overwrite with a different value.
Return `Either.right(ctx)` to accept the overwrite; return `Either.left` to reject it.

---

## Minimal options object (all three hooks)

```ts
import { Either } from "@ngwes/mini-fp";
import type { PipelineOptions } from "groucho-fp";

type AppError = { code: string; detail: string };

const options: PipelineOptions<AppError, Ctx> = {
  onLeft: async (err, _ctx) =>
    Either.left(err),

  onException: async (ex, _ctx) =>
    Either.left({ code: "EXCEPTION", detail: String(ex) }),

  onConflictingKeys: async (keys, _ctx) =>
    Either.left({ code: "KEY_CONFLICT", detail: keys.join(", ") }),
};
```
```

- [ ] **Step 2: Verify file exists**

Run: `ls skills/pipeline-hooks/`
Expected: `SKILL.md` is listed.

- [ ] **Step 3: Commit**

```bash
git add skills/pipeline-hooks/SKILL.md
git commit -m "feat: add pipeline-hooks pattern skill"
```

---

## Task 8: Pattern skill — `step-composition`

**Files:**
- Create: `skills/step-composition/SKILL.md`

- [ ] **Step 1: Create `skills/step-composition/SKILL.md`**

```markdown
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
```

- [ ] **Step 2: Verify file exists**

Run: `ls skills/step-composition/`
Expected: `SKILL.md` is listed.

- [ ] **Step 3: Commit**

```bash
git add skills/step-composition/SKILL.md
git commit -m "feat: add step-composition pattern skill"
```

---

## Task 9: Pattern skill — `dynamic-loading`

**Files:**
- Create: `skills/dynamic-loading/SKILL.md`

- [ ] **Step 1: Create `skills/dynamic-loading/SKILL.md`**

```markdown
---
name: dynamic-loading
description: Pattern guide for assembling groucho-fp pipelines from step files on the filesystem at runtime.
---

## Problem

You want to build a pipeline whose steps live in separate files, loaded at runtime without static imports.

---

## Recipe: full pipeline from a directory

```ts
import { Pipeline, loadStepsFromDir } from "groucho-fp";
import { Either } from "@ngwes/mini-fp";
import type { PipelineOptions } from "groucho-fp";

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
import { loadSteps } from "groucho-fp";
import type { Step } from "groucho-fp";

const steps = await loadSteps<Err, Ctx>([
  "./shared/01-auth.ts",
  "./domain/02-fetch.ts",
  "./domain/03-transform.ts",
]);
```
```

- [ ] **Step 2: Verify file exists**

Run: `ls skills/dynamic-loading/`
Expected: `SKILL.md` is listed.

- [ ] **Step 3: Commit**

```bash
git add skills/dynamic-loading/SKILL.md
git commit -m "feat: add dynamic-loading pattern skill"
```

---

## Task 10: Initialize git and final verification

- [ ] **Step 1: Initialize git repository (if not already initialized)**

Run: `git init`
Expected: `Initialized empty Git repository` or `Reinitialized existing Git repository`.

- [ ] **Step 2: Verify complete file tree**

Run: `find skills -name "SKILL.md" | sort`

Expected output:
```
skills/dynamic-loading/SKILL.md
skills/dynamic-steps/SKILL.md
skills/groucho-fp/SKILL.md
skills/pipeline-hooks/SKILL.md
skills/pipeline/SKILL.md
skills/step-composition/SKILL.md
skills/step/SKILL.md
```

- [ ] **Step 3: Verify root files**

Run: `ls`

Expected: `commitlint.config.js`, `docs/`, `package.json`, `README.md`, `skills/` are all present.
