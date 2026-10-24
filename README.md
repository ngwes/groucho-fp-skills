# groucho-fp-skills

Claude Code skill plugin for [`@ngwes/groucho-fp`](https://www.npmjs.com/package/@ngwes/groucho-fp) — a functional pipeline library for TypeScript built on `@ngwes/mini-fp`.

These skills are loaded by coding agents (Claude Code, Copilot, Cursor) when working on projects that use `groucho-fp`.

---

## Installation

### Option A: Plugin

This repository is both a plugin and a single-plugin marketplace. In a Claude Code session:

```text
/plugin marketplace add ngwes/groucho-fp-skills
/plugin install groucho-fp@groucho-fp-skills
```

Or from your shell:

```bash
claude plugin marketplace add ngwes/groucho-fp-skills
claude plugin install groucho-fp@groucho-fp-skills
```

Newer Claude Code versions can do both steps at once (2.1.275 or later in a session, 2.1.292 or later in the shell):

```bash
claude plugin install groucho-fp --marketplace ngwes/groucho-fp-skills
```

New versions reach you when you refresh the marketplace and update the plugin:

```bash
claude plugin marketplace update groucho-fp-skills
claude plugin update groucho-fp@groucho-fp-skills
```

If the repository is private, Claude Code clones it with the git credentials already on your machine (for example after `gh auth setup-git`). Set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` if you have no SSH key for GitHub.

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

Installed as a plugin, every skill is namespaced by the plugin name (for example `groucho-fp:groucho-fp` and `groucho-fp:pipeline`). With the manual copy they keep their plain names (`groucho-fp`, `pipeline`).

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
