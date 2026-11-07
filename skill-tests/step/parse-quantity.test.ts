import assert from 'node:assert/strict';
import { tests } from '@ngwes/skill-be/testing';
import { leftOf, rightOf } from '../_shared/either.js';

type Ctx = { rawQuantity: string; quantity?: number };

const test = tests<{ result: (ctx: Readonly<Ctx>) => unknown }>();

test('adds the parsed quantity and keeps the raw value', async ({ result }) => {
  assert.deepEqual(await rightOf(result({ rawQuantity: '12' })), { rawQuantity: '12', quantity: 12 });
});

for (const raw of ['0', '-3', '2.5', 'abc', '']) {
  test(`fails with invalid-quantity and the raw value for ${JSON.stringify(raw)}`, async ({ result }) => {
    const error = await leftOf(result({ rawQuantity: raw }));

    assert.equal(error.tag, 'invalid-quantity');
    assert.equal(error.raw, raw);
  });
}
