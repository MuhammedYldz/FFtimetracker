import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { EntryRow } from '@/components/EntryRow';
import { useStore, type StartTimerInput } from '@/store/useStore';
import { useNow } from '@/features/timer/useNow';
import { computeElapsed, formatHMS } from '@/lib/time';
import { tapFeedback, successFeedback } from '@/lib/haptics';
import type { Category } from '@/db/types';

export default function TimerScreen() {
  const activeTimer = useStore((s) => s.activeTimer);
  const categories = useStore((s) => s.categories);
  const entries = useStore((s) => s.entries);
  const startTimer = useStore((s) => s.startTimer);
  const pauseTimer = useStore((s) => s.pauseTimer);
  const resumeTimer = useStore((s) => s.resumeTimer);
  const stopTimer = useStore((s) => s.stopTimer);

  const recentEntries = useMemo(() => entries.slice(0, 5), [entries]);

  const [customTitle, setCustomTitle] = useState('');

  const isActive = !!activeTimer;
  const isRunning = !!activeTimer?.isRunning;
  const now = useNow(isRunning);

  const elapsedMs = activeTimer
    ? computeElapsed(activeTimer.accumulatedMs, activeTimer.segmentStartedAt, activeTimer.isRunning, now)
    : 0;

  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const start = (input: StartTimerInput) => {
    tapFeedback();
    startTimer(input);
    setCustomTitle('');
  };

  const startCategory = (cat: Category) =>
    start({ categoryId: cat.id, taskTitle: cat.name, color: cat.color, source: cat.source });

  const startCustom = () => {
    const title = customTitle.trim();
    if (!title) return;
    start({ categoryId: null, taskTitle: title, color: '#142175', source: 'local' });
  };

  const onStop = async () => {
    successFeedback();
    await stopTimer();
  };

  const ringColor = activeTimer?.color ?? '#006a61';

  return (
    <Screen>
      <AppHeader
        right={
          <Pressable
            onPress={() => {
              tapFeedback();
              router.push('/entry');
            }}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-container-low">
            <MaterialIcons name="add" size={24} color="#142175" />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerClassName="items-center px-lg pb-xl pt-lg"
        keyboardShouldPersistTaps="handled">
        {/* Timer display */}
        <View
          className="h-64 w-64 items-center justify-center rounded-full border-4 bg-surface-container-lowest"
          style={{ borderColor: isActive ? ringColor : '#e0e3e5' }}>
          <Text className="font-mono text-[40px] leading-[48px] text-on-surface">
            {formatHMS(elapsedMs)}
          </Text>
          {isActive ? (
            <Text className="mt-xs px-md text-center font-sans-medium text-body-sm text-on-surface-variant" numberOfLines={1}>
              {activeTimer!.taskTitle}
            </Text>
          ) : (
            <Text className="mt-xs font-sans text-body-sm text-on-surface-variant">
              Ready when you are
            </Text>
          )}
        </View>

        {/* Active controls */}
        {isActive ? (
          <View className="mt-xl w-full max-w-sm gap-md">
            <View className="flex-row gap-md">
              <Pressable
                onPress={() => {
                  tapFeedback();
                  isRunning ? pauseTimer() : resumeTimer();
                }}
                className="flex-1 flex-row items-center justify-center gap-xs rounded-lg bg-surface-container-highest py-sm active:opacity-80">
                <MaterialIcons name={isRunning ? 'pause' : 'play-arrow'} size={22} color="#191c1e" />
                <Text className="font-sans-medium text-body-md text-on-surface">
                  {isRunning ? 'Pause' : 'Resume'}
                </Text>
              </Pressable>
              <Pressable
                onPress={onStop}
                className="flex-1 flex-row items-center justify-center gap-xs rounded-lg bg-error py-sm active:opacity-80">
                <MaterialIcons name="stop" size={22} color="#ffffff" />
                <Text className="font-sans-medium text-body-md text-on-error">Stop</Text>
              </Pressable>
            </View>
            <Text className="text-center font-sans text-body-sm text-on-surface-variant">
              Pick another task below to switch — your current time is saved automatically.
            </Text>
          </View>
        ) : (
          /* Idle: custom task input + Start */
          <View className="mt-xl w-full max-w-sm gap-sm">
            <View className="flex-row items-center gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest px-sm">
              <MaterialIcons name="edit" size={18} color="#767682" />
              <TextInput
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder="What are you working on?"
                placeholderTextColor="#767682"
                returnKeyType="go"
                onSubmitEditing={startCustom}
                className="flex-1 py-sm font-sans text-body-md text-on-surface"
              />
            </View>
            <Pressable
              onPress={startCustom}
              disabled={!customTitle.trim()}
              className={`flex-row items-center justify-center gap-xs rounded-lg py-sm active:opacity-80 ${
                customTitle.trim() ? 'bg-secondary' : 'bg-surface-container-highest'
              }`}>
              <MaterialIcons
                name="play-arrow"
                size={24}
                color={customTitle.trim() ? '#ffffff' : '#767682'}
              />
              <Text
                className={`font-sans-bold text-headline-sm ${
                  customTitle.trim() ? 'text-on-secondary' : 'text-on-surface-variant'
                }`}>
                Start
              </Text>
            </Pressable>
          </View>
        )}

        {/* Category quick-start */}
        <View className="mt-xl w-full">
          <Text className="mb-sm font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            {isActive ? 'Switch to' : 'Quick start'}
          </Text>
          <View className="flex-row flex-wrap gap-xs">
            {visibleCategories.map((cat) => {
              const isCurrent = activeTimer?.categoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => startCategory(cat)}
                  className={`flex-row items-center gap-xs rounded-full border px-sm py-xs active:opacity-70 ${
                    isCurrent ? 'border-primary bg-primary-fixed' : 'border-outline-variant bg-surface-container-lowest'
                  }`}>
                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <Text className="font-sans-medium text-body-sm text-on-surface">{cat.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Recent entries */}
        {recentEntries.length > 0 ? (
          <View className="mt-xl w-full">
            <Text className="mb-sm font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
              Recent
            </Text>
            <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              {recentEntries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onPress={() => router.push({ pathname: '/entry', params: { id: entry.id } })}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
