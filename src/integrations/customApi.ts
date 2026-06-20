import type { Connection, SyncedTask } from '@/db/types';
import { getSecret } from '@/lib/secureStore';

export const SOURCE_COLORS = {
  custom: '#e65100',
  jira: '#0052CC',
  azure: '#0078D7',
} as const;

/** Read a possibly-nested field by dot path, e.g. "fields.summary". */
function getPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function asString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64-encode an ASCII string (uses btoa when present, else a portable fallback). */
function base64(input: string): string {
  const g = globalThis as { btoa?: (s: string) => string };
  if (typeof g.btoa === 'function') return g.btoa(input);
  let out = '';
  for (let i = 0; i < input.length; i += 3) {
    const a = input.charCodeAt(i);
    const hasB = i + 1 < input.length;
    const hasC = i + 2 < input.length;
    const b = hasB ? input.charCodeAt(i + 1) : 0;
    const c = hasC ? input.charCodeAt(i + 2) : 0;
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | (b >> 4)];
    out += hasB ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    out += hasC ? B64[c & 63] : '=';
  }
  return out;
}

export interface FetchResult {
  ok: boolean;
  tasks: SyncedTask[];
  error?: string;
}

/** Fetch and map tasks from a Custom API connection. */
export async function fetchCustomTasks(conn: Connection): Promise<FetchResult> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const secret = await getSecret(conn.id);

    if (conn.authMethod === 'bearer' && secret) {
      headers.Authorization = `Bearer ${secret}`;
    } else if (conn.authMethod === 'api_key' && secret) {
      headers[conn.apiKeyHeader || 'X-API-Key'] = secret;
    } else if (conn.authMethod === 'basic' && secret) {
      // secret stored as "user:pass"
      headers.Authorization = `Basic ${base64(secret)}`;
    }

    const res = await fetch(joinUrl(conn.baseUrl, conn.tasksPath), { headers });
    if (!res.ok) {
      return { ok: false, tasks: [], error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    const rawList = conn.resultsPath ? getPath(json, conn.resultsPath) : json;
    if (!Array.isArray(rawList)) {
      return { ok: false, tasks: [], error: 'Response was not a list of tasks. Check the results path.' };
    }

    const now = Date.now();
    const tasks: SyncedTask[] = [];
    for (const item of rawList) {
      const externalId = asString(getPath(item, conn.map.id));
      const title = asString(getPath(item, conn.map.title));
      if (!externalId || !title) continue;
      const assignee = conn.map.assignee ? asString(getPath(item, conn.map.assignee)) : null;
      if (conn.assigneeFilter && assignee !== conn.assigneeFilter) continue;
      tasks.push({
        id: `${conn.id}:${externalId}`,
        connectionId: conn.id,
        source: 'custom',
        externalId,
        title,
        status: conn.map.status ? asString(getPath(item, conn.map.status)) : null,
        assignee,
        color: SOURCE_COLORS.custom,
        fetchedAt: now,
      });
    }
    return { ok: true, tasks };
  } catch (e) {
    return { ok: false, tasks: [], error: e instanceof Error ? e.message : 'Fetch failed' };
  }
}
