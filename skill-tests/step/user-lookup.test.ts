import assert from 'node:assert/strict';
import { tests } from '@ngwes/skill-be/testing';
import { leftOf, rightOf } from '../_shared/either.js';

type User = { id: string; name: string };
type Ctx = { userId: string; user?: User };

type UserLookup = (users: Map<string, User>) => (ctx: Readonly<Ctx>) => unknown;

const test = tests<{ result: UserLookup }>();

const ada: User = { id: 'u1', name: 'Ada' };
const users = new Map([['u1', ada]]);

test('adds the user found for the id and keeps the id', async ({ result }) => {
  assert.deepEqual(await rightOf(result(users)({ userId: 'u1' })), { userId: 'u1', user: ada });
});

test('fails with user-not-found and the id for an unknown user', async ({ result }) => {
  const error = await leftOf(result(users)({ userId: 'u2' }));

  assert.equal(error.tag, 'user-not-found');
  assert.equal(error.userId, 'u2');
});
