# groucho-fp-skills — Design Spec

**Date:** 2026-04-19  
**Library:** `groucho-fp` (functional pipeline library built on `@ngwes/mini-fp`)  
**Goal:** A Claude Code skill plugin for `groucho-fp`, mirroring the structure of `mini-fp-skills`.

---

## Repository Structure

```
groucho-fp-skills/
  skills/
    groucho-fp/SKILL.md       ← router (entry point)
    pipeline/SKILL.md         ← concept: Pipeline API
    step/SKILL.md             ← concept: Step type
    dynamic-steps/SKILL.md    ← concept: loadSteps / loadStepsFromDir
    pipeline-hooks/SKILL.md   ← pattern: onLeft / onException / onConflictingKeys
    step-composition/SKILL.md ← pattern: ordering, naming, immutability
    dynamic-loading/SKILL.md  ← pattern: assembling pipelines from the filesystem
  package.json
  README.md
```

---

## Skill Inventory

### Router — `groucho-fp`

Entry point. Loaded first whenever an agent works on a project that uses `groucho-fp`.

**Content:**
- One-line description of the library.
- Decision table mapping scenarios to the right skill:

| Scenario | Skill |
|---|---|
| Understanding how Pipeline works | `pipeline` |
| Writing or reading a Step function | `step` |
| Loading steps from files or directories | `dynamic-steps` |
| Handling pipeline failures and exceptions | `pipeline-hooks` |
| Ordering and structuring step files | `step-composition` |
| Assembling a pipeline from the filesystem | `dynamic-loading` |

- Rule: after reading this skill, invoke the specific skill needed.

---

### Concept — `pipeline`

**Content:**
- Full `Pipeline(ctx, steps, options)` signature with TypeScript types.
- Parameters table: `ctx`, `steps`, `options`.
- `PipelineOptions` interface: `onLeft`, `onException`, `onConflictingKeys` — when each fires and what it can return.
- Execution model: sequential, context frozen per step, short-circuit on `Either.left`.
- Minimal working example (input → uppercase result).

---

### Concept — `step`

**Content:**
- `Step<E, Ctx>` type definition.
- Three outcomes: `Either.right(newCtx)` to continue, `Either.left(error)` for handled failure, `throw` for unhandled exceptions.
- How to build a new context: spread pattern `{ ...ctx, newKey: value }`.
- Note: context is frozen — mutations throw at runtime.
- Short example step with a parse and validation.

---

### Concept — `dynamic-steps`

**Content:**
- `loadSteps(paths[])` — explicit ordered list of file paths.
- `loadStepsFromDir(path, options?)` — scans directory alphabetically.
- `pattern` option (default `/\.(ts|js|mjs|cjs)$/`).
- The three supported export formats:
  1. `export default` — single function
  2. `export default` — array of functions
  3. `export const steps` — named array
- Files matching none of the above are silently ignored.
- Note: uses `jiti` under the hood — supports TypeScript without a prior build.

---

### Pattern — `pipeline-hooks`

**Content:**
- Problem: a step returned `left`, threw, or produced a key conflict — what now?
- Recipe for `onLeft`: log the error, return `Either.left(err)` to propagate or `Either.right(ctx)` to recover.
- Recipe for `onException`: wrap the thrown value in a typed error, always return `Either.left`.
- Recipe for `onConflictingKeys`: decide per key list whether to accept or reject; return `Either.left` with a descriptive error when rejecting.
- Minimal options object showing all three hooks wired up.

---

### Pattern — `step-composition`

**Content:**
- Problem: how to structure and order steps clearly.
- Naming convention: `01-validate.ts`, `02-transform.ts` — alphabetical order becomes execution order when using `loadStepsFromDir`.
- One responsibility per step file: each file does one thing and adds one (or a few closely related) keys to the context.
- Immutability rule: always return `{ ...ctx, newKey }`, never mutate `ctx` directly.
- When to split a step into two: if the step does IO and also transforms data, split them.
- Short example showing two well-named step files.

---

### Pattern — `dynamic-loading`

**Content:**
- Problem: assembling a pipeline whose steps live on the filesystem, without static imports.
- Full recipe combining `loadStepsFromDir` + `Pipeline` + `PipelineOptions`.
- How to handle load errors (jiti throws on syntax errors — wrap `loadStepsFromDir` in try/catch).
- Filtering: using the `pattern` option to load only `.step.ts` files.
- When to prefer `loadSteps` over `loadStepsFromDir`: when order must differ from alphabetical, or when steps come from multiple directories.

---

## Package Configuration

`package.json` mirrors `mini-fp-skills`:

```json
{
  "name": "ngwes/groucho-fp-skills",
  "version": "1.0.0",
  "description": "Claude Code skill plugin for groucho-fp",
  "private": true,
  "type": "module",
  "scripts": { "prepare": "husky" },
  "devDependencies": {
    "@commitlint/cli": "...",
    "@commitlint/config-conventional": "...",
    "@semantic-release/changelog": "...",
    "@semantic-release/exec": "...",
    "@semantic-release/git": "...",
    "@semantic-release/gitlab": "...",
    "husky": "...",
    "semantic-release": "..."
  },
  "engines": { "node": ">=18" }
}
```

---

## README

Short README explaining:
- What the plugin is.
- Installation: `claude plugins install ngwes/groucho-fp-skills` or manual copy to `~/.claude/skills/`.
- Usage: add to project `CLAUDE.md` — `When working with groucho-fp, invoke the groucho-fp skill first.`
- Skill table (same format as mini-fp-skills README).

---

## Out of Scope

- Evals and benchmarking (can be added later following mini-fp-skills' pattern).
- CI/CD pipeline setup.
- Publishing to npm.
