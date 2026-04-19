## 2026-04-19 — step benchmark

Method: automated cross-model eval via `claude -p`. Models: claude-haiku-4-5, claude-sonnet-4-6, claude-opus-4-7. Reps: 1.
Note: "with skill" injects SKILL.md content as library context in the user prompt.

### Scenario: write-step-parse *(critical)*

*Write a groucho-fp Step function that reads ctx.input (a string), parses it as an integer, and returns ctx with ctx.parsed set. Return Either.left if the input is not a valid number.*

**claude-haiku-4-5**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| The step function is async | 0% | 100% | +100pp |
| The step returns Either.right with a spread of ctx plus the new parsed field | 0% | 100% | +100pp |
| The step returns Either.left when the input is not a valid number | 0% | 100% | +100pp |
| The code imports Either from '@ngwes/mini-fp' | 0% | 100% | +100pp |
| The code imports or uses the Step type from 'groucho-fp' | 0% | 100% | +100pp |

**claude-sonnet-4-6**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| The step function is async | 0% | 100% | +100pp |
| The step returns Either.right with a spread of ctx plus the new parsed field | 100% | 100% | +0pp |
| The step returns Either.left when the input is not a valid number | 100% | 100% | +0pp |
| The code imports Either from '@ngwes/mini-fp' | 0% | 100% | +100pp |
| The code imports or uses the Step type from 'groucho-fp' | 0% | 100% | +100pp |

**claude-opus-4-7**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| The step function is async | 0% | 100% | +100pp |
| The step returns Either.right with a spread of ctx plus the new parsed field | 0% | 100% | +100pp |
| The step returns Either.left when the input is not a valid number | 0% | 100% | +100pp |
| The code imports Either from '@ngwes/mini-fp' | 0% | 100% | +100pp |
| The code imports or uses the Step type from 'groucho-fp' | 0% | 100% | +100pp |

### Scenario: frozen-context-immutability *(critical)*

*Write a groucho-fp step that adds a 'validated: true' field to the context. Show the correct immutable pattern.*

**claude-haiku-4-5**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| The step uses spread syntax to create a new context object (e.g. { ...ctx, validated: true }) | 0% | 100% | +100pp |
| The step does not directly assign to ctx properties (no ctx.validated = ...) | 0% | 100% | +100pp |
| The step returns Either.right with the new context | 0% | 100% | +100pp |

**claude-sonnet-4-6**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| The step uses spread syntax to create a new context object (e.g. { ...ctx, validated: true }) | 100% | 100% | +0pp |
| The step does not directly assign to ctx properties (no ctx.validated = ...) | 100% | 100% | +0pp |
| The step returns Either.right with the new context | 0% | 100% | +100pp |

**claude-opus-4-7**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| The step uses spread syntax to create a new context object (e.g. { ...ctx, validated: true }) | 0% | 100% | +100pp |
| The step does not directly assign to ctx properties (no ctx.validated = ...) | 0% | 100% | +100pp |
| The step returns Either.right with the new context | 0% | 100% | +100pp |

### Scenario: step-throws-vs-left

*In groucho-fp, what is the difference between a step returning Either.left and a step throwing an exception? Which hook handles each case?*

**claude-haiku-4-5**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| The response states that Either.left triggers onLeft | 0% | 100% | +100pp |
| The response states that a thrown exception triggers onException | 0% | 100% | +100pp |
| The response distinguishes the two cases clearly | 0% | 0% | +0pp |

**claude-sonnet-4-6**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| The response states that Either.left triggers onLeft | 0% | 100% | +100pp |
| The response states that a thrown exception triggers onException | 0% | 100% | +100pp |
| The response distinguishes the two cases clearly | 0% | 100% | +100pp |

**claude-opus-4-7**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| The response states that Either.left triggers onLeft | 0% | 100% | +100pp |
| The response states that a thrown exception triggers onException | 0% | 100% | +100pp |
| The response distinguishes the two cases clearly | 0% | 0% | +0pp |

---

## Release Gate

**READY** — No universal 0% criteria. No critical regressions.

