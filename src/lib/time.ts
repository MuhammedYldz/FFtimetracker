/** Elapsed worked ms for a timer given its accumulated time and running state. */
export function computeElapsed(
  accumulatedMs: number,
  segmentStartedAt: number,
  isRunning: boolean,
  now: number,
): number {
  return accumulatedMs + (isRunning ? Math.max(0, now - segmentStartedAt) : 0);
}

/** Format ms as H:MM:SS (e.g. 1:05:09). */
export function formatHMS(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}`;
}

/** Format ms as a compact human duration (e.g. 1h 05m, 12m, 0m). */
export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

/** Format an epoch ms as HH:MM (24h). */
export function formatClock(epochMs: number): string {
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
