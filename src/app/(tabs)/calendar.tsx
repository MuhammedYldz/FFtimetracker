import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { EntryRow } from '@/components/EntryRow';
import { useStore } from '@/store/useStore';
import { entriesOnDay, sumDuration } from '@/lib/stats';
import {
  addMonths,
  formatDurationShort,
  formatHMS,
  formatLongDate,
  formatMonthYear,
  monthGrid,
  startOfDay,
  startOfMonth,
} from '@/lib/time';

const WEEKDAY_HEADERS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export default function CalendarScreen() {
  const entries = useStore((s) => s.entries);
  const now = Date.now();

  const [monthEpoch, setMonthEpoch] = useState(() => startOfMonth(now));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(now));

  const grid = useMemo(() => monthGrid(monthEpoch), [monthEpoch]);
  const displayedMonth = new Date(monthEpoch).getMonth();

  // Per-day totals for the visible grid.
  const dayTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of entries) {
      const d = startOfDay(e.startedAt);
      map.set(d, (map.get(d) ?? 0) + e.durationMs);
    }
    return map;
  }, [entries]);

  const monthTotalMs = useMemo(() => {
    const start = startOfMonth(monthEpoch);
    const end = addMonths(monthEpoch, 1);
    return sumDuration(entries.filter((e) => e.startedAt >= start && e.startedAt < end));
  }, [entries, monthEpoch]);

  const selectedEntries = useMemo(
    () => entriesOnDay(entries, selectedDay).sort((a, b) => a.startedAt - b.startedAt),
    [entries, selectedDay],
  );
  const selectedTotalMs = sumDuration(selectedEntries);

  return (
    <Screen>
      <AppHeader title="Calendar" />
      <ScrollView contentContainerClassName="p-md gap-md">
        {/* Month header */}
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-semibold text-headline-md text-on-surface">
            {formatMonthYear(monthEpoch)}
          </Text>
          <View className="flex-row items-center gap-xs">
            <Pressable
              onPress={() => setMonthEpoch((m) => addMonths(m, -1))}
              className="h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low active:bg-surface-container-low">
              <MaterialIcons name="chevron-left" size={24} color="#454651" />
            </Pressable>
            <Pressable
              onPress={() => {
                setMonthEpoch(startOfMonth(now));
                setSelectedDay(startOfDay(now));
              }}
              className="rounded border border-outline-variant px-sm py-xs transition-colors hover:bg-surface-container-low active:bg-surface-container-low">
              <Text className="font-sans-medium text-body-sm text-on-surface">Today</Text>
            </Pressable>
            <Pressable
              onPress={() => setMonthEpoch((m) => addMonths(m, 1))}
              className="h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low active:bg-surface-container-low">
              <MaterialIcons name="chevron-right" size={24} color="#454651" />
            </Pressable>
          </View>
        </View>
        <Text className="font-sans text-body-sm text-on-surface-variant">
          Total this month: <Text className="font-mono text-on-surface">{formatHMS(monthTotalMs)}</Text>
        </Text>

        {/* Weekday header */}
        <View className="flex-row">
          {WEEKDAY_HEADERS.map((w, i) => (
            <Text
              key={w}
              className={`flex-1 text-center font-sans-semibold text-label-md ${i >= 5 ? 'text-outline' : 'text-on-surface-variant'}`}>
              {w}
            </Text>
          ))}
        </View>

        {/* Day grid (6 weeks) */}
        <View className="flex-row flex-wrap">
          {grid.map((dayEpoch) => {
            const date = new Date(dayEpoch);
            const inMonth = date.getMonth() === displayedMonth;
            const total = dayTotals.get(dayEpoch) ?? 0;
            const isToday = dayEpoch === startOfDay(now);
            const isSelected = dayEpoch === selectedDay;
            return (
              <Pressable
                key={dayEpoch}
                onPress={() => setSelectedDay(dayEpoch)}
                style={{ width: `${100 / 7}%` }}
                className="aspect-square p-base">
                <View
                  className={`flex-1 items-center justify-center rounded-lg ${
                    isSelected ? 'bg-primary' : isToday ? 'bg-primary-fixed' : ''
                  }`}>
                  <Text
                    className={`font-sans-medium text-body-sm ${
                      isSelected
                        ? 'text-on-primary'
                        : inMonth
                          ? 'text-on-surface'
                          : 'text-outline'
                    }`}>
                    {date.getDate()}
                  </Text>
                  {total > 0 ? (
                    <View
                      className={`mt-base h-1 w-5 rounded-full ${isSelected ? 'bg-on-primary' : 'bg-secondary'}`}
                    />
                  ) : (
                    <View className="mt-base h-1 w-5" />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Selected day detail */}
        <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <View className="flex-row items-center justify-between border-b border-outline-variant px-md py-sm">
            <Text className="font-sans-semibold text-body-md text-on-surface">
              {formatLongDate(selectedDay)}
            </Text>
            <View className="flex-row items-center gap-sm">
              {selectedTotalMs > 0 ? (
                <Text className="font-mono text-body-sm text-secondary">
                  {formatDurationShort(selectedTotalMs)}
                </Text>
              ) : null}
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/entry', params: { date: String(selectedDay) } })
                }
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low active:bg-surface-container-low">
                <MaterialIcons name="add" size={22} color="#142175" />
              </Pressable>
            </View>
          </View>

          {selectedEntries.length === 0 ? (
            <View className="items-center gap-xs px-md py-xl">
              <MaterialIcons name="event-busy" size={32} color="#767682" />
              <Text className="font-sans text-body-md text-on-surface-variant">
                No time entries for this day.
              </Text>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/entry', params: { date: String(selectedDay) } })
                }>
                <Text className="font-sans-medium text-body-sm text-primary">Log time manually</Text>
              </Pressable>
            </View>
          ) : (
            selectedEntries.map((e) => (
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
