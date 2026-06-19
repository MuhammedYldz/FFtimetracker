import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { EntryRow } from '@/components/EntryRow';
import { useStore } from '@/store/useStore';
import {
  entriesInRange,
  groupByCategory,
  groupBySource,
  sumDuration,
  weeklyDailyTotals,
} from '@/lib/stats';
import { addDays, formatDurationShort, startOfDay, startOfMonth, startOfWeek } from '@/lib/time';

const WEEKLY_GOAL_HOURS = 40;
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
      <Text className="font-sans-medium text-label-md uppercase tracking-wider text-on-surface-variant">
        {label}
      </Text>
      <Text className={`mt-xs font-mono text-headline-sm ${highlight ? 'text-primary' : 'text-on-surface'}`}>
        {value}
      </Text>
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
      <Text className="mb-md font-sans-semibold text-headline-sm text-on-surface">{title}</Text>
      {children}
    </View>
  );
}

export default function StatsScreen() {
  const entries = useStore((s) => s.entries);
  const categories = useStore((s) => s.categories);
  const now = Date.now();

  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const todayEntries = useMemo(
    () => entriesInRange(entries, todayStart, addDays(todayStart, 1)),
    [entries, todayStart],
  );
  const weekEntries = useMemo(
    () => entriesInRange(entries, weekStart, addDays(weekStart, 7)),
    [entries, weekStart],
  );
  const monthEntries = useMemo(
    () => entriesInRange(entries, monthStart, addDays(monthStart, 31)).filter((e) => e.startedAt >= monthStart),
    [entries, monthStart],
  );

  const todayMs = sumDuration(todayEntries);
  const weekMs = sumDuration(weekEntries);
  const monthMs = sumDuration(monthEntries);

  const weekGoalMs = WEEKLY_GOAL_HOURS * 3600000;
  const weekPct = Math.min(100, Math.round((weekMs / weekGoalMs) * 100));

  const weekly = useMemo(() => weeklyDailyTotals(entries, now), [entries, now]);
  const maxDayMs = Math.max(1, ...weekly.map((d) => d.totalMs));

  const categoryBuckets = useMemo(
    () => groupByCategory(weekEntries, categories),
    [weekEntries, categories],
  );
  const maxCatMs = Math.max(1, ...categoryBuckets.map((b) => b.totalMs));

  const sourceBuckets = useMemo(() => groupBySource(weekEntries), [weekEntries]);
  const recent = useMemo(() => entries.slice(0, 8), [entries]);

  return (
    <Screen>
      <AppHeader title="Dashboard" />
      <ScrollView contentContainerClassName="p-md gap-md">
        {/* Totals */}
        <View className="flex-row gap-sm">
          <StatCard label="Today" value={formatDurationShort(todayMs)} highlight />
          <StatCard label="This week" value={formatDurationShort(weekMs)} />
          <StatCard label="This month" value={formatDurationShort(monthMs)} />
        </View>

        {/* Weekly goal + bar chart */}
        <Card title="This week">
          <View className="mb-sm flex-row items-center justify-between">
            <Text className="font-sans text-body-sm text-on-surface-variant">
              Goal: {WEEKLY_GOAL_HOURS}h
            </Text>
            <Text className="font-sans-semibold text-body-sm text-on-surface">{weekPct}%</Text>
          </View>
          <View className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
            <View className="h-full rounded-full bg-secondary" style={{ width: `${weekPct}%` }} />
          </View>

          <View className="mt-lg h-[140px] flex-row items-end justify-between gap-xs">
            {weekly.map((d, i) => {
              const isToday = d.dayEpoch === todayStart;
              const heightPct = Math.round((d.totalMs / maxDayMs) * 100);
              return (
                <View key={d.dayEpoch} className="flex-1 items-center gap-xs">
                  <View className="h-[110px] w-full justify-end">
                    <View
                      className={`w-full rounded-t ${isToday ? 'bg-secondary' : 'bg-primary'}`}
                      style={{ height: `${d.totalMs > 0 ? Math.max(4, heightPct) : 0}%` }}
                    />
                  </View>
                  <Text
                    className={`font-sans-medium text-label-md ${isToday ? 'text-secondary' : 'text-on-surface-variant'}`}>
                    {WEEKDAY_LABELS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* By category */}
        <Card title="By category (this week)">
          {categoryBuckets.length === 0 ? (
            <Text className="font-sans text-body-md text-on-surface-variant">No time logged yet.</Text>
          ) : (
            <View className="gap-sm">
              {categoryBuckets.map((b) => (
                <View key={b.key} className="gap-xs">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-xs">
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                      <Text className="font-sans-medium text-body-sm text-on-surface">{b.label}</Text>
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
          <Card title="By source (this week)">
            <View className="mb-sm h-3 flex-row overflow-hidden rounded-full">
              {sourceBuckets.map((b) => (
                <View
                  key={b.source}
                  style={{ flex: b.totalMs, backgroundColor: b.color }}
                />
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

        {/* Recent entries */}
        <View className="rounded-xl border border-outline-variant bg-surface-container-lowest">
          <Text className="p-md font-sans-semibold text-headline-sm text-on-surface">Recent entries</Text>
          {recent.length === 0 ? (
            <Text className="px-md pb-md font-sans text-body-md text-on-surface-variant">
              Your logged time will appear here.
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
