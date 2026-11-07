import assert from 'node:assert/strict';
import { tests } from '@ngwes/skill-be/testing';

type Deps = {
  geo: { lookup: (email: string) => Promise<string | undefined> };
  store: { save: (email: string, country: string) => Promise<void> };
};

type Subscribe = (deps: Deps) => (email: string) => Promise<string>;

const test = tests<{ result: Subscribe }>();

/** A geo service that answers `country` (or throws `geoError`); `saved` lists the saves. */
function fakeDeps(country: string | undefined, geoError?: Error): Deps & { saved: string[][] } {
  const saved: string[][] = [];
  return {
    saved,
    geo: {
      lookup: async () => {
        if (geoError !== undefined) throw geoError;
        return country;
      },
    },
    store: { save: async (email, found) => void saved.push([email, found]) },
  };
}

test('saves the subscriber with the country found', async ({ result }) => {
  const deps = fakeDeps('FR');

  assert.equal(await result(deps)('ada@example.com'), 'subscribed: FR');
  assert.deepEqual(deps.saved, [['ada@example.com', 'FR']]);
});

test("goes on with the country 'unknown' when the lookup finds none", async ({ result }) => {
  const deps = fakeDeps(undefined);

  assert.equal(await result(deps)('ada@example.com'), 'subscribed: unknown');
  assert.deepEqual(deps.saved, [['ada@example.com', 'unknown']]);
});

test("answers 'error: invalid-email' and saves nobody for an email without '@'", async ({ result }) => {
  const deps = fakeDeps('FR');

  assert.equal(await result(deps)('ada.example.com'), 'error: invalid-email');
  assert.deepEqual(deps.saved, []);
});

test("answers 'error: crash' and saves nobody when the lookup throws", async ({ result }) => {
  const deps = fakeDeps('FR', new Error('geo service down'));

  assert.equal(await result(deps)('ada@example.com'), 'error: crash');
  assert.deepEqual(deps.saved, []);
});
