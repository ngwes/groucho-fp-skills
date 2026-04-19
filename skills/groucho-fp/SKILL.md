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
