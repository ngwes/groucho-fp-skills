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
