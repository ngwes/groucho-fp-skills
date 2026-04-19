#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/run-benchmark.mjs <skill> [--reps N]
 *
 * Examples:
 *   node scripts/run-benchmark.mjs option
 *   node scripts/run-benchmark.mjs either --reps 5
 *
 * Output: markdown to stdout. Pipe to a file or append to docs/skill-benchmark-runs.md.
 *   node scripts/run-benchmark.mjs option >> docs/skill-benchmark-runs.md
 */

import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const skill = args[0];

if (!skill || skill.startsWith('--')) {
  console.error('Usage: node scripts/run-benchmark.mjs <skill> [--reps N]');
  process.exit(1);
}

const repsIdx = args.indexOf('--reps');
const REPS = repsIdx !== -1 ? parseInt(args[repsIdx + 1], 10) : 3;

const MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
];

const GRADER_MODEL = 'claude-haiku-4-5-20251001';

// ── Load files ────────────────────────────────────────────────────────────────

const skillMdPath = join(ROOT, 'skills', skill, 'SKILL.md');
const evalPath = join(ROOT, 'evals', `${skill}.json`);

let skillContent, evalData;

try {
  skillContent = readFileSync(skillMdPath, 'utf8');
} catch {
  console.error(`ERROR: ${skillMdPath} not found`);
  process.exit(1);
}

try {
  evalData = JSON.parse(readFileSync(evalPath, 'utf8'));
} catch (e) {
  console.error(`ERROR: ${evalPath} not found or invalid JSON — ${e.message}`);
  process.exit(1);
}

// ── Claude helpers ────────────────────────────────────────────────────────────

function runClaude(prompt, model) {
  const result = spawnSync(
    'claude',
    ['-p', prompt, '--model', model],
    { encoding: 'utf8', timeout: 120_000, maxBuffer: 10 * 1024 * 1024, cwd: tmpdir() }
  );
  if (result.error) return `[ERROR: ${result.error.message}]`;
  if (result.status !== 0) return `[ERROR: exit ${result.status} — ${result.stderr?.trim()}]`;
  return result.stdout.trim();
}

function grade(criterion, codeOutput) {
  const prompt =
    `You are a strict code evaluator. Answer with exactly one word: YES or NO.\n\n` +
    `Criterion: ${criterion}\n\n` +
    `Code to evaluate:\n${codeOutput}\n\n` +
    `Does the code satisfy this criterion? Answer YES or NO only:`;
  const result = runClaude(prompt, GRADER_MODEL);
  return /^yes/i.test(result.trim()) ? 1 : 0;
}

function fmtPct(n, reps) {
  return `${Math.round((n / reps) * 100)}%`;
}

function fmtDelta(delta) {
  return delta >= 0 ? `+${delta}pp` : `${delta}pp`;
}

function modelShort(model) {
  return model.replace(/-20251001$/, '');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const date = new Date().toISOString().split('T')[0];
const out = [];

out.push(`## ${date} — ${skill} benchmark`);
out.push('');
out.push(`Method: automated cross-model eval via \`claude -p\`. Models: ${MODELS.map(modelShort).join(', ')}. Reps: ${REPS}.`);
out.push(`Note: "with skill" injects SKILL.md content as library context in the user prompt.`);
out.push('');

// results[scenarioId][criterionIdx][model] = { bPct, sPct, delta }
const results = {};

for (const scenario of evalData.scenarios) {
  results[scenario.id] = {};

  out.push(`### Scenario: ${scenario.id}${scenario.critical ? ' *(critical)*' : ''}`);
  out.push('');
  out.push(`*${scenario.prompt}*`);
  out.push('');

  for (const model of MODELS) {
    const short = modelShort(model);
    process.stderr.write(`  [${scenario.id}] ${short} ...\n`);

    const bCounts = new Array(scenario.criteria.length).fill(0);
    const sCounts = new Array(scenario.criteria.length).fill(0);

    for (let r = 0; r < REPS; r++) {
      process.stderr.write(`    rep ${r + 1}/${REPS}\n`);

      const baselineOut = runClaude(scenario.prompt, model);

      const skillPrompt =
        `You have access to the following TypeScript library. Use its APIs when writing the code.\n\n` +
        `--- LIBRARY DOCS ---\n${skillContent}\n--- END LIBRARY DOCS ---\n\n` +
        `Task: ${scenario.prompt}`;
      const skillOut = runClaude(skillPrompt, model);

      for (let c = 0; c < scenario.criteria.length; c++) {
        bCounts[c] += grade(scenario.criteria[c], baselineOut);
        sCounts[c] += grade(scenario.criteria[c], skillOut);
      }
    }

    // Build per-model table
    out.push(`**${short}**`);
    out.push('');
    out.push('| Criterion | Baseline | With skill | Delta |');
    out.push('|-----------|----------|------------|-------|');

    results[scenario.id][model] = [];

    for (let c = 0; c < scenario.criteria.length; c++) {
      const bPct = Math.round((bCounts[c] / REPS) * 100);
      const sPct = Math.round((sCounts[c] / REPS) * 100);
      const delta = sPct - bPct;
      out.push(`| ${scenario.criteria[c]} | ${bPct}% | ${sPct}% | ${fmtDelta(delta)} |`);
      results[scenario.id][model][c] = { bPct, sPct, delta };
    }

    out.push('');
  }
}

// ── Release Gate ──────────────────────────────────────────────────────────────

out.push('---');
out.push('');
out.push('## Release Gate');
out.push('');

const issues = [];

for (const scenario of evalData.scenarios) {
  for (let c = 0; c < scenario.criteria.length; c++) {
    // Universal 0%: skill_pct === 0 on ALL three models
    const allZero = MODELS.every(
      (model) => (results[scenario.id][model]?.[c]?.sPct ?? 0) === 0
    );
    if (allZero) {
      issues.push(
        `**BLOCKED** (universal 0%): \`${scenario.id}\` — criterion: *"${scenario.criteria[c]}"*`
      );
    }

    // Critical regression: skill_pct < baseline_pct on any model
    if (scenario.critical) {
      for (const model of MODELS) {
        const r = results[scenario.id][model]?.[c];
        if (r && r.delta < 0) {
          issues.push(
            `**BLOCKED** (regression): \`${scenario.id}\` / ${modelShort(model)} — *"${scenario.criteria[c]}"*: ${r.bPct}% → ${r.sPct}% (${fmtDelta(r.delta)})`
          );
        }
      }
    }
  }
}

if (issues.length === 0) {
  out.push('**READY** — No universal 0% criteria. No critical regressions.');
} else {
  issues.forEach((i) => out.push(`- ${i}`));
  out.push('');
  out.push('**NOT READY**');
}

out.push('');

console.log(out.join('\n'));
