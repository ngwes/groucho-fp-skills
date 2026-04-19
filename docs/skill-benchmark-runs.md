# Skill Benchmark Runs

Cross-model evaluation log for `@ngwes/mini-fp` skills.

Run with:
```bash
node scripts/run-benchmark.mjs <skill> [--reps N] >> docs/skill-benchmark-runs-log.md
```

---

## Release Gate

A change is **not ready** if any of these are true:

- Any criterion is **0% across all three models** with skill enabled.
- Any **critical scenario** has a negative delta with skill enabled on any model.
- Any model shows a **repeatable regression** that is unexplained.

A change is **ready** when:

- No universal 0% criteria remain, and
- No skill-enabled regressions remain in critical scenarios.

---

## Run Log Template

Copy and fill in manually for quick directional evals (non-automated runs):

```markdown
## YYYY-MM-DD — <skill> benchmark

Method: <automated via run-benchmark.mjs | quick directional eval via subagent>.
Models: claude-haiku-4-5-20251001, claude-sonnet-4-6, claude-opus-4-7. Reps: 3.

### Scenario: <scenario-id> *(critical)*

*<scenario prompt>*

**claude-haiku-4-5**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| <criterion> | 0% | 0% | +0pp |

**claude-sonnet-4-6**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| <criterion> | 0% | 0% | +0pp |

**claude-opus-4-7**

| Criterion | Baseline | With skill | Delta |
|-----------|----------|------------|-------|
| <criterion> | 0% | 0% | +0pp |

---

## Release Gate

- **BLOCKED** (universal 0%): `<scenario-id>` — criterion: *"<criterion>"*
- **BLOCKED** (regression): `<scenario-id>` / <model> — *"<criterion>"*: X% → Y% (-Zpp)

**NOT READY** | **READY** — No universal 0% criteria. No critical regressions.
```

---

<!-- Automated run output appended below this line -->
