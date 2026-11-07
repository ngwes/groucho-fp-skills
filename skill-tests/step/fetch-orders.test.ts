import assert from 'node:assert/strict';
import { tests } from '@ngwes/skill-be/testing';
import { leftOf, rightOf } from '../_shared/either.js';

type Order = { id: string; total: number };
type Ctx = { customerId: string; orders?: Order[] };
type Api = { fetchOrders: (customerId: string) => Promise<Order[]> };

type FetchOrders = (api: Api) => (ctx: Readonly<Ctx>) => unknown;

const test = tests<{ result: FetchOrders }>();

test('adds the orders fetched for the customer', async ({ result }) => {
  const orders = [{ id: 'o1', total: 30 }];
  const asked: string[] = [];
  const api: Api = {
    fetchOrders: async (customerId) => {
      asked.push(customerId);
      return orders;
    },
  };

  assert.deepEqual(await rightOf(result(api)({ customerId: 'c1' })), { customerId: 'c1', orders });
  assert.deepEqual(asked, ['c1']);
});

test('a network failure becomes an upstream error holding it, not a rejection', async ({ result }) => {
  const networkError = new Error('ECONNRESET');
  const api: Api = { fetchOrders: () => Promise.reject(networkError) };

  const error = await leftOf(result(api)({ customerId: 'c1' }));

  assert.equal(error.tag, 'upstream');
  assert.equal(error.cause, networkError);
});
