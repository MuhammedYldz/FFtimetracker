import assert from 'node:assert';
import { mergeTable, type Node } from '../src/sync/merge';

type Row = { id: string; v: string };
const live = (id: string, updatedAt: number, v = id): Node<Row> => ({
  id,
  updatedAt,
  deleted: false,
  row: { id, v },
});
const dead = (id: string, updatedAt: number): Node<Row> => ({ id, updatedAt, deleted: true });

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log('  ✓', name);
}

test('local-only row is kept and pushed', () => {
  const r = mergeTable<Row>([live('a', 10)], []);
  assert.deepEqual(r.liveRows.map((x) => x.id), ['a']);
  assert.deepEqual(r.toUpsert.map((x) => x.id), ['a']);
});

test('remote-only row is pulled, not pushed', () => {
  const r = mergeTable<Row>([], [live('b', 10)]);
  assert.deepEqual(r.liveRows.map((x) => x.id), ['b']);
  assert.equal(r.toUpsert.length, 0);
});

test('newer local wins and is pushed', () => {
  const r = mergeTable<Row>([live('a', 20, 'local')], [live('a', 10, 'remote')]);
  assert.equal(r.liveRows[0].v, 'local');
  assert.equal(r.toUpsert.length, 1);
});

test('newer remote wins and is applied, not pushed', () => {
  const r = mergeTable<Row>([live('a', 10, 'local')], [live('a', 20, 'remote')]);
  assert.equal(r.liveRows[0].v, 'remote');
  assert.equal(r.toUpsert.length, 0);
});

test('tie favors local, no push (remote already equal)', () => {
  const r = mergeTable<Row>([live('a', 10, 'local')], [live('a', 10, 'remote')]);
  assert.equal(r.liveRows[0].v, 'local');
  assert.equal(r.toUpsert.length, 0);
});

test('local delete newer than remote alive -> tombstone + mark remote deleted', () => {
  const r = mergeTable<Row>([dead('a', 20)], [live('a', 10)]);
  assert.equal(r.liveRows.length, 0);
  assert.deepEqual(r.tombstoneIds.map((t) => t.id), ['a']);
  assert.deepEqual(r.toMarkDeleted.map((t) => t.id), ['a']);
});

test('remote delete newer than local alive -> row removed locally, not pushed', () => {
  const r = mergeTable<Row>([live('a', 10)], [dead('a', 20)]);
  assert.equal(r.liveRows.length, 0);
  assert.deepEqual(r.tombstoneIds.map((t) => t.id), ['a']);
  assert.equal(r.toMarkDeleted.length, 0);
  assert.equal(r.toUpsert.length, 0);
});

test('local alive newer than remote delete -> row resurrected and pushed', () => {
  const r = mergeTable<Row>([live('a', 30, 'revived')], [dead('a', 20)]);
  assert.equal(r.liveRows[0].v, 'revived');
  assert.deepEqual(r.toUpsert.map((x) => x.id), ['a']);
});

test('local delete with no remote row -> tombstone, nothing to mark', () => {
  const r = mergeTable<Row>([dead('a', 20)], []);
  assert.deepEqual(r.tombstoneIds.map((t) => t.id), ['a']);
  assert.equal(r.toMarkDeleted.length, 0);
});

test('mixed set merges independently', () => {
  const r = mergeTable<Row>(
    [live('keep', 5), live('newer', 30, 'L'), dead('gone', 9)],
    [live('newer', 10, 'R'), live('remoteonly', 1)],
  );
  const liveIds = r.liveRows.map((x) => x.id).sort();
  assert.deepEqual(liveIds, ['keep', 'newer', 'remoteonly']);
  assert.equal(r.liveRows.find((x) => x.id === 'newer')!.v, 'L');
  assert.deepEqual(r.tombstoneIds.map((t) => t.id), ['gone']);
});

console.log(`\n${passed} merge tests passed.`);
