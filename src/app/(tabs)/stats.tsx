import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { EntryRow } from '@/components/EntryRow';
import { useStore } from '@/store/useStore';
import {
  entriesInRange,
  getPeriod,
  groupByCategory,
  groupBySource,
  periodBuckets,
  shiftPeriod,
  sumDuration,
  type PeriodMode,
} from '@/lib/stats';
import { formatDurationShort, formatHMS } from '@/lib/time';
import { exportEntriesCsv } from '@/lib/export';
import { tapFeedback } from '@/lib/haptics';

const WEEKLY_GOAL_HOURS = 40;

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
      <View className="mb-md flex-row items-center justify-between">
        <Text className="font-sans-semibold text-headline-sm text-on-surface">{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export default function StatsScreen() {
  const entries = useStore((s) => s.entries);
  const categories = useStore((s) => s.categories);
  const tasks = useStore((s) => s.tasks);
  const now = Date.now();

  const [mode, setMode] = useState<PeriodMode>('week');
  const [anchor, setAnchor] = useState<number>(now);
  const [exportError, setExportError] = useState<string | null>(null);

  const period = useMemo(() => getPeriod(mode, anchor, now), [mode, anchor, now]);
  const periodEntries = useMemo(
    () => entriesInRange(entries, period.start, period.end),
    [entries, period.start, period.end],
  );
  const totalMs = sumDuration(periodEntries);
  const buckets = useMemo(() => periodBuckets(entries, mode, anchor, now), [entries, mode, anchor, now]);
  const maxBucket = Math.max(1, ...buckets.map((b) => b.totalMs));

  const categoryBuckets = useMemo(() => groupByCategory(periodEntries, categories), [periodEntries, categories]);
  const maxCatMs = Math.max(1, ...categoryBuckets.map((b) => b.totalMs));
  const sourceBuckets = useMemo(() => groupBySource(periodEntries), [periodEntries]);
  const recent = useMemo(
    () => [...periodEntries].sort((a, b) => b.startedAt - a.startedAt).slice(0, 10),
    [periodEntries],
  );

  const goalMs = WEEKLY_GOAL_HOURS * 3_600_000;
  const weekPct = Math.min(100, Math.round((totalMs / goalMs) * 100));
  const activeDays = buckets.filter((b) => b.totalMs > 0).length;
  const avgPerActiveDay = activeDays > 0 && mode === 'month' ? totalMs / activeDays : 0;

  const onExport = async () => {
    tapFeedback();
    setExportError(null);
    const result = await exportEntriesCsv(periodEntries, categories, tasks);
    if (!result.ok) setExportError(result.error ?? 'Export failed');
  };

  const setModeReset = (m: PeriodMode) => {
    tapFeedback();
    setMode(m);
    setAnchor(now); // jump back to current when switching mode
  };

  return (
    <Screen>
      <AppHeader
        title="Dashboard"
        right={
          <Pressable
            onPress={onExport}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Export entries to CSV"
            className="h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low active:bg-surface-container-low">
            <MaterialIcons name="file-download" size={22} color="#142175" />
          </Pressable>
        }
      />
      <ScrollView contentContainerClassName="p-md gap-md">
        {/* Week/Month toggle */}
        <View className="flex-row rounded-xl border border-outline-variant bg-surface-container-lowest p-xs">
          {(['week', 'month'] as const).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setModeReset(m)}
                className={`flex-1 items-center rounded-lg py-sm transition-colors ${
                  active ? 'bg-primary-fixed' : 'hover:bg-surface-container-low'
                }`}>
                <Text
                  className={`font-sans-semibold text-body-sm ${active ? 'text-on-primary-fixed' : 'text-on-surface-variant'}`}>
                  {m === 'week' ? 'Week' : 'Month'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Period navigation + total */}
        <View className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                tapFeedback();
                setAnchor((a) => shiftPeriod(mode, a, -1));
              }}
              accessibilityRole="button"
              accessibilityLabel={`Previous ${mode}`}
              className="h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low active:bg-surface-container-low">
              <MaterialIcons name="chevron-left" size={26} color="#454651" />
            </Pressable>
            <View className="items-center">
              <Text className="font-sans-medium text-label-md uppercase tracking-wider text-on-surface-variant">
                {period.label}
              </Text>
              <Text className="mt-base font-mono text-headline-md text-primary">{formatHMS(totalMs)}</Text>
            </View>
            <Pressable
              onPress={() => {
                tapFeedback();
                if (!period.isCurrent) setAnchor((a) => shiftPeriod(mode, a, 1));
              }}
              disabled={period.isCurrent}
              accessibilityRole="button"
              accessibilityLabel={`Next ${mode}`}
              className={`h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low active:bg-surface-container-low ${
                period.isCurrent ? 'opacity-30' : ''
              }`}>
              <MaterialIcons name="chevron-right" size={26} color="#454651" />
            </Pressable>
          </View>

          {/* Goal (week) or average (month) */}
          {mode === 'week' ? (
            <View className="mt-md">
              <View className="mb-base flex-row justify-between">
                <Text className="font-sans text-body-sm text-on-surface-variant">Goal: {WEEKLY_GOAL_HOURS}h</Text>
                <Text className="font-sans-semibold text-body-sm text-on-surface">{weekPct}%</Text>
              </View>
              <View className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
                <View className="h-full rounded-full bg-secondary" style={{ width: `${weekPct}%` }} />
              </View>
            </View>
          ) : avgPerActiveDay > 0 ? (
            <Text className="mt-md text-center font-sans text-body-sm text-on-surface-variant">
              {formatDurationShort(avgPerActiveDay)} avg on {activeDays} active day{activeDays === 1 ? '' : 's'}
            </Text>
          ) : null}

          {/* Bar chart */}
          <View className="mt-lg h-[140px] flex-row items-end justify-between gap-xs">
            {buckets.map((b, i) => {
              const heightPct = Math.round((b.totalMs / maxBucket) * 100);
              return (
                <View key={i} className="flex-1 items-center gap-xs">
                  <View className="h-[110px] w-full justify-end">
                    <View
                      className={`w-full rounded-t ${b.isCurrent ? 'bg-secondary' : 'bg-primary'}`}
                      style={{ height: `${b.totalMs > 0 ? Math.max(4, heightPct) : 0}%` }}
                    />
                  </View>
                  <Text
                    className={`font-sans-medium text-label-md ${b.isCurrent ? 'text-secondary' : 'text-on-surface-variant'}`}>
                    {b.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* By category */}
        <Card title="By category">
          {categoryBuckets.length === 0 ? (
            <Text className="font-sans text-body-md text-on-surface-variant">No time logged in this period.</Text>
          ) : (
            <View className="gap-sm">
              {categoryBuckets.map((b) => (
                <View key={b.key} className="gap-xs">
                  <View className="flex-row items-center justify-between gap-sm">
                    <View className="flex-1 flex-row items-center gap-xs">
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                      <Text className="flex-1 font-sans-medium text-body-sm text-on-surface" numberOfLines={1}>
                        {b.label}
                      </Text>
                    </View>
                    <Text className="font-mono text-body-sm text-on-surface-variant">
                      {formatDurationShort(b.totalMs)}
                    </Text>
                  </View>
                  <View className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(3, (b.totalMs / maxCatMs) * 100)}%`, backgroundColor: b.color }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* By source */}
        {sourceBuckets.length > 0 ? (
          <Card title="By source">
            <View className="mb-sm h-3 flex-row overflow-hidden rounded-full">
              {sourceBuckets.map((b) => (
                <View key={b.source} style={{ flex: b.totalMs, backgroundColor: b.color }} />
              ))}
            </View>
            <View className="flex-row flex-wrap gap-md">
              {sourceBuckets.map((b) => (
                <View key={b.source} className="flex-row items-center gap-xs">
                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                  <Text className="font-sans text-body-sm text-on-surface-variant">
                    {b.label} · {formatDurationShort(b.totalMs)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {exportError ? <Text className="font-sans-medium text-body-sm text-error">{exportError}</Text> : null}

        {/* Entries in this period */}
        <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <Text className="p-md font-sans-semibold text-headline-sm text-on-surface">Entries</Text>
          {recent.length === 0 ? (
            <Text className="px-md pb-md font-sans text-body-md text-on-surface-variant">
              Nothing logged in this period.
            </Text>
          ) : (
            recent.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                onPress={() => router.push({ pathname: '/entry', params: { id: e.id } })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
