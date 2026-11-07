import assert from 'node:assert/strict';
import { inspect } from 'node:util';

type EitherLike = { isRight(): boolean; unwrapRight(): unknown; unwrapLeft(): unknown };

function isEither(value: unknown): value is EitherLike {
  const either = value as Partial<EitherLike> | null | undefined;
  return (
    typeof either?.isRight === 'function' &&
    typeof either.unwrapRight === 'function' &&
    typeof either.unwrapLeft === 'function'
  );
}

/**
 * Awaits what the code returned (an Either, a promise of one, or an EitherAsync) and reads it.
 * Fails the test when it is not an Either.
 */
export async function settle(value: unknown): Promise<{ side: 'right' | 'left'; value: unknown }> {
  const either = await value;
  assert.ok(isEither(either), `expected an Either, got ${inspect(either)}`);
  return either.isRight()
    ? { side: 'right', value: either.unwrapRight() }
    : { side: 'left', value: either.unwrapLeft() };
}

/** The value of a right; fails the test on a left. */
export async function rightOf<T = Record<string, unknown>>(value: unknown): Promise<T> {
  const settled = await settle(value);
  assert.equal(settled.side, 'right', `expected a right, got left ${inspect(settled.value)}`);
  return settled.value as T;
}

/** The value of a left; fails the test on a right. */
export async function leftOf<T = Record<string, unknown>>(value: unknown): Promise<T> {
  const settled = await settle(value);
  assert.equal(settled.side, 'left', `expected a left, got right ${inspect(settled.value)}`);
  return settled.value as T;
}
