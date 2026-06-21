import type { Connection, Source, SyncedTask } from '@/db/types';
import { getSecret } from '@/lib/secureStore';
import { fetchCustomTasks, type FetchResult } from './customApi';

export type ProviderType = 'todoist' | 'github' | 'notion';

export const PROVIDERS: Record<
  ProviderType,
  { label: string; color: string; icon: string; tokenLabel: string; tokenHint: string; help: string }
> = {
  todoist: {
    label: 'Todoist',
    color: '#e44332',
    icon: 'check-circle',
    tokenLabel: 'API token',
    tokenHint: 'Todoist → Settings → Integrations → Developer → API token',
    help: 'Pulls your active Todoist tasks.',
  },
  github: {
    label: 'GitHub',
    color: '#24292e',
    icon: 'code',
    tokenLabel: 'Personal access token',
    tokenHint: 'GitHub → Settings → Developer settings → Personal access tokens',
    help: 'Pulls open issues assigned to you across your repos.',
  },
  notion: {
    label: 'Notion',
    color: '#111111',
    icon: 'description',
    tokenLabel: 'Integration token',
    tokenHint: 'notion.so/my-integrations → New integration → copy the secret',
    help: 'Pulls items from a Notion database. Share the database with your integration first.',
  },
};

/** Display metadata for every entry/task source (icon name is a MaterialIcons glyph). */
export const SOURCE_DISPLAY: Record<Source, { label: string; color: string; icon: string }> = {
  local: { label: 'Manual', color: '#006a61', icon: 'schedule' },
  todoist: { label: 'Todoist', color: '#e44332', icon: 'check-circle' },
  github: { label: 'GitHub', color: '#24292e', icon: 'code' },
  notion: { label: 'Notion', color: '#111111', icon: 'description' },
  custom: { label: 'Custom', color: '#454651', icon: 'api' },
  jira: { label: 'Jira', color: '#0052cc', icon: 'integration-instructions' },
  azure: { label: 'Azure', color: '#0078d7', icon: 'code' },
};

const truncate = (s: string, n = 120) => (s.length > n ? s.slice(0, n) : s);

async function fetchTodoist(conn: Connection, token: string): Promise<FetchResult> {
  const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false, tasks: [], error: `Todoist HTTP ${res.status}` };
  const list = (await res.json()) as { id: string; content: string }[];
  const now = Date.now();
  const tasks: SyncedTask[] = list
    .filter((t) => t.id && t.content)
    .map((t) => ({
      id: `${conn.id}:${t.id}`,
      connectionId: conn.id,
      source: 'todoist' as Source,
      externalId: String(t.id),
      title: truncate(t.content),
      status: null,
      assignee: null,
      color: PROVIDERS.todoist.color,
      fetchedAt: now,
    }));
  return { ok: true, tasks };
}

async function fetchGitHub(conn: Connection, token: string): Promise<FetchResult> {
  const filter = conn.extra?.filter || 'assigned';
  const res = await fetch(`https://api.github.com/issues?filter=${filter}&state=open&per_page=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) return { ok: false, tasks: [], error: `GitHub HTTP ${res.status}` };
  const list = (await res.json()) as {
    id: number;
    title: string;
    number: number;
    repository?: { full_name?: string };
  }[];
  const now = Date.now();
  const tasks: SyncedTask[] = list
    .filter((i) => i.id && i.title)
    .map((i) => ({
      id: `${conn.id}:${i.id}`,
      connectionId: conn.id,
      source: 'github' as Source,
      externalId: String(i.id),
      title: truncate(`#${i.number} ${i.title}`),
      status: i.repository?.full_name ?? null,
      assignee: null,
      color: PROVIDERS.github.color,
      fetchedAt: now,
    }));
  return { ok: true, tasks };
}

/** Find a Notion page's title text from its properties (the title-typed property). */
function notionTitle(props: Record<string, unknown>): string | null {
  for (const key of Object.keys(props)) {
    const p = props[key] as { type?: string; title?: { plain_text?: string }[] };
    if (p?.type === 'title' && Array.isArray(p.title)) {
      const text = p.title.map((t) => t.plain_text ?? '').join('').trim();
      if (text) return text;
    }
  }
  return null;
}

async function fetchNotion(conn: Connection, token: string): Promise<FetchResult> {
  const dbId = conn.extra?.databaseId;
  if (!dbId) return { ok: false, tasks: [], error: 'Add your Notion database ID.' };
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 50 }),
  });
  if (!res.ok) return { ok: false, tasks: [], error: `Notion HTTP ${res.status}` };
  const json = (await res.json()) as { results?: { id: string; properties: Record<string, unknown> }[] };
  const now = Date.now();
  const tasks: SyncedTask[] = [];
  for (const page of json.results ?? []) {
    const title = notionTitle(page.properties);
    if (!title) continue;
    tasks.push({
      id: `${conn.id}:${page.id}`,
      connectionId: conn.id,
      source: 'notion',
      externalId: page.id,
      title: truncate(title),
      status: null,
      assignee: null,
      color: PROVIDERS.notion.color,
      fetchedAt: now,
    });
  }
  return { ok: true, tasks };
}

/** Fetch tasks for any connection, routing to the right provider. */
export async function fetchTasksForConnection(conn: Connection): Promise<FetchResult> {
  if (conn.type === 'custom') return fetchCustomTasks(conn);
  const token = await getSecret(conn.id);
  if (!token) return { ok: false, tasks: [], error: 'Reconnect — token is missing.' };
  try {
    if (conn.type === 'todoist') return await fetchTodoist(conn, token);
    if (conn.type === 'github') return await fetchGitHub(conn, token);
    if (conn.type === 'notion') return await fetchNotion(conn, token);
    return { ok: false, tasks: [], error: 'Unknown provider' };
  } catch (e) {
    // Browsers may block Todoist/Notion via CORS; the mobile app is unaffected.
    return { ok: false, tasks: [], error: e instanceof Error ? e.message : 'Fetch failed' };
  }
}
