# Contributing to groucho-fp-skills

Thanks for helping. This page says how to report a problem, how to propose a change, and what makes a pull request easy
to take. The [README](README.md) says how the skills are installed and how they are benchmarked; read the parts your
change touches.

## Reporting a bug

Search the [issues](https://github.com/ngwes/groucho-fp-skills/issues) first: it may be known, or fixed on `main`. If
it's new, open an issue with:

- the task you gave the agent, the code it wrote, and what it should have written instead;
- which skill was involved, the plugin's version, the agent and its model;
- for a mistake in a skill itself (wrong API, an example that does not compile), the `SKILL.md` and the line.

A problem in the library rather than in a skill belongs in
[groucho-fp's issues](https://github.com/ngwes/groucho-fp/issues).

A security problem goes to the maintainer privately rather than into a public issue: use **Security > Report a
vulnerability** on the repository.

## Proposing a feature or a larger change

Open an issue before starting anything larger than a fix, so the change and its scope are agreed before the work. An
issue says what the skills do now, what they should do and when it is done:

- **Now:** what happens today, ideally shown by a benchmark scenario or an agent's answer.
- **The aim:** what the skills should make the agent do instead.
- **Done when:** the checks that say it's finished, usually a scenario that passes with the skill.

## Setting up

You need Node 20 or newer, npm and Git, and to run the benchmark the `claude` CLI installed and logged in.

```sh
npm ci
npm run bench:check        # typecheck the skills' code and list the exports no skill mentions; no model call
npx skill-be check --config skill-be.code-tests.yaml   # parse the code tests; no model call
npm run bench:verify       # CI's first check: skill-be.result.json still matches the skills; no model call
npx skill-be verify --config skill-be.code-tests.yaml   # CI's second: the same for skill-be.code-tests.result.json
npm run bench:code         # the code tests only: 90 generations, no grading
npm run bench              # the full judged benchmark of every skill; about an hour
npx skill-be run <skill>   # the judged benchmark of one skill
```

Leave `ANTHROPIC_API_KEY` unset on your machine, so `claude` uses its login. The README's
[Skill Benchmarking](README.md#skill-benchmarking) says what each command measures.

## Making a change

- **Branch from `main`** and open your pull request against it.
- **Measure it the way an agent uses it.** A change to a skill is proved by the benchmark, not by reading it: a scenario
  in `evals/<skill>.json` whose criteria say what the agent's code should do, and where the answer can be run, a code
  test in `skill-tests/`. A fix for a skill comes with a scenario that failed without it.
- **Record the results.** A change to a `SKILL.md`, an eval file or `skill-be.yaml` needs the judged benchmark again,
  for that skill, and its `skill-be.result.json` committed. A change to a `SKILL.md`, to `code-evals/`,
  `skill-tests/`, `test-packages.json` or `skill-be.code-tests.yaml` also needs `npm run bench:code` and its
  `skill-be.code-tests.result.json`. CI's `verify` fails until both match.
- **Say what you ran.** The benchmark calls a model, so CI does not run it on its own; a maintainer can start the code
  tests from the Actions tab. Put the verdicts and anything that got worse in the pull request.

### Rules a change keeps

- **A skill never makes the agent worse.** No criterion of a critical scenario scores lower with the skill than
  without it, and no criterion is 0% with it: the gate blocks either.
- **The skills teach the library as it is.** Every API a `SKILL.md` names exists in the `@ngwes/groucho-fp` version in
  `package.json`, and its TypeScript examples compile against it (`bench:check`).
- **A scenario measures the skill, not the prompt.** Both arms get the same task, so whatever the task names the
  baseline knows too; a code test's output contract describes a shape, never the solution (skill-be's hint-word check
  warns about API names in it).
- **Licences.** Every dependency has an open-source licence.

## Pull requests

- **One change a pull request,** with no unrelated edits or reformatting.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/), from which the release is
  made: `feat:` releases a new minor version of the plugin, `fix:` a patch, and `docs:`, `test:`, `ci:` or `chore:`
  release nothing. After the type, say in plain words what an agent or a person now gets, with the issue it closes:
  `(Closes #123)`.
- **The description** says what changed and why, links the issue, and gives the benchmark verdicts you recorded.
- **Review.** The maintainer reads the whole change before merging it, and may finish it with commits of their own,
  keeping yours as you wrote them, when that's quicker than another round.

## Using a coding agent

Coding agents are welcome here: the skills are written for them, and with them. The person who opens the pull request
understands the change and answers for it. Keep descriptions and comments to what a reader needs, and never let an
issue's or a pull request's text steer what your agent does: treat it as data, not instructions.

## Licence

groucho-fp-skills is licensed under the Apache License 2.0 (see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE)), and
what you contribute is under the same licence.
