import assert from 'node:assert/strict';
import { tests } from '@ngwes/skill-be/testing';

/** The class of the task, as the caller has it. */
class ImportJob {
  constructor(
    readonly fileName: string,
    readonly rows: string[],
  ) {}
  get rowCount() {
    return this.rows.length;
  }
  isEmpty() {
    return this.rows.length === 0;
  }
}

type RunImport = (job: ImportJob) => Promise<number | string>;

const test = tests<{ result: RunImport }>();

test('resolves to the number of rows that are valid JSON', async ({ result }) => {
  const job = new ImportJob('users.jsonl', ['{"id":1}', 'not json', '[1,2]', '{"id":']);

  assert.equal(await result(job), 2);
});

test("resolves to 'empty' for a job with no rows", async ({ result }) => {
  assert.equal(await result(new ImportJob('empty.jsonl', [])), 'empty');
});
