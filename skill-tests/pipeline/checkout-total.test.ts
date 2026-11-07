import assert from 'node:assert/strict';
import { tests } from '@ngwes/skill-be/testing';

type Line = { price: number; quantity: number };

type Checkout = (lines: Line[]) => Promise<string>;

const test = tests<{ result: Checkout }>();

/** The amount of a 'total: <amount>' answer; fails the test on any other answer. */
function amountOf(answer: string): number {
  const match = /^total: (.+)$/.exec(answer);
  assert.ok(match, `expected 'total: <amount>', got ${JSON.stringify(answer)}`);
  return Number(match[1]);
}

test('adds 20% VAT to the sum of price times quantity', async ({ result }) => {
  const answer = await result([
    { price: 12.5, quantity: 2 },
    { price: 5, quantity: 1 },
  ]);

  assert.ok(Math.abs(amountOf(answer) - 36) < 0.005, `expected a total of 36, got ${answer}`);
});

test("answers 'error: EMPTY_CART' for a cart with no line", async ({ result }) => {
  assert.equal(await result([]), 'error: EMPTY_CART');
});

test("answers 'error: CRASH' when a stage throws", async ({ result }) => {
  const broken = {
    quantity: 1,
    get price(): number {
      throw new Error('price service down');
    },
  };

  assert.equal(await result([broken]), 'error: CRASH');
});
