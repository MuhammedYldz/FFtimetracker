/**
 * Pure, dependency-free merge logic for sync. Kept separate from sync.ts so it
 * can be unit-tested without React Native / Supabase modules.
 *
 * Last-write-wins by updatedAt; ties and local-only rows favor local; deletes
 * are represented as tombstone nodes so they propagate instead of resurrecting.
 */

export interface Node<T> {
  id: string;
  updatedAt: number;
  deleted: boolean;
  row?: T;
}

export interface MergeResult<T> {
  liveRows: T[]; // non-deleted winners (final local state)
  tombstoneIds: { id: string; updatedAt: number }[]; // deleted winners
  toUpsert: T[]; // local newer & alive -> push full row to remote
  toMarkDeleted: { id: string; updatedAt: number }[]; // local newer & deleted -> mark remote deleted
}

export function mergeTable<T>(local: Node<T>[], remote: Node<T>[]): MergeResult<T> {
  const localMap = new Map(local.map((n) => [n.id, n]));
  const remoteMap = new Map(remote.map((n) => [n.id, n]));
  const ids = new Set([...localMap.keys(), ...remoteMap.keys()]);

  const result: MergeResult<T> = { liveRows: [], tombstoneIds: [], toUpsert: [], toMarkDeleted: [] };

  for (const id of ids) {
    const l = localMap.get(id);
    const r = remoteMap.get(id);
    // Winner: greater updatedAt; tie or local-only -> local; remote-only -> remote.
    const localWins = !!l && (!r || l.updatedAt >= r.updatedAt);
    const winner = localWins ? l! : r!;

    if (winner.deleted) {
      result.tombstoneIds.push({ id, updatedAt: winner.updatedAt });
    } else if (winner.row) {
      result.liveRows.push(winner.row);
    }

    // Push when local is the winner and remote is missing or strictly older.
    if (localWins && (!r || l!.updatedAt > r.updatedAt)) {
      if (l!.deleted) {
        if (r) result.toMarkDeleted.push({ id, updatedAt: l!.updatedAt });
      } else if (l!.row) {
        result.toUpsert.push(l!.row);
      }
    }
  }

  return result;
}
