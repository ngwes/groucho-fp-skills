import assert from 'node:assert/strict';
import { left, right, type Either } from '@ngwes/mini-fp';
import { tests } from '@ngwes/skill-be/testing';

type Ctx = { email: string; userId?: string };
type SignupError = { message: string };
type SignupStep = (ctx: Readonly<Ctx>) => Either<SignupError, Ctx>;

type Deps = {
  signupSteps: SignupStep[];
  signupOptions: {
    onException: (exception: unknown) => Either<SignupError, Ctx>;
    onConflictingKeys: (keys: ReadonlyArray<string>) => Either<SignupError, Ctx>;
  };
  logger: { warn: (message: string) => void };
};

type HandleSignup = (deps: Deps) => (email: string) => Promise<{ status: number; body: string }>;

const test = tests<{ result: HandleSignup }>();

/**
 * Signup stages that create the user id from the email, or fail with `failWith`; `warnings` lists
 * what the code logged.
 */
function fakeDeps(failWith?: string): Deps & { warnings: string[] } {
  const warnings: string[] = [];
  const createUser: SignupStep = (ctx) =>
    failWith === undefined ? right({ ...ctx, userId: `id-${ctx.email}` }) : left({ message: failWith });
  return {
    warnings,
    signupSteps: [createUser],
    signupOptions: {
      onException: (exception) => left({ message: String(exception) }),
      onConflictingKeys: (keys) => left({ message: `conflict: ${keys.join(', ')}` }),
    },
    logger: { warn: (message) => void warnings.push(message) },
  };
}

test('answers 201 with the user id the stages created from the email', async ({ result }) => {
  const response = await result(fakeDeps())('ada@example.com');

  assert.equal(response.status, 201);
  assert.ok(String(response.body).includes('id-ada@example.com'), `body: ${response.body}`);
});

test('answers 400 with the error message when a stage fails', async ({ result }) => {
  const response = await result(fakeDeps('email already registered'))('ada@example.com');

  assert.equal(response.status, 400);
  assert.ok(String(response.body).includes('email already registered'), `body: ${response.body}`);
});

test('logs the error message with logger.warn when a stage fails', async ({ result }) => {
  const deps = fakeDeps('email already registered');

  await result(deps)('ada@example.com');

  assert.ok(
    deps.warnings.some((line) => line.includes('email already registered')),
    `warnings: ${JSON.stringify(deps.warnings)}`,
  );
});

test('logs nothing when the signup succeeds', async ({ result }) => {
  const deps = fakeDeps();

  await result(deps)('ada@example.com');

  assert.deepEqual(deps.warnings, []);
});
