import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { EntryRow } from '@/components/EntryRow';
import { SyncedTasks } from '@/components/SyncedTasks';
import { useStore, type StartTimerInput } from '@/store/useStore';
import { useNow } from '@/features/timer/useNow';
import { computeElapsed, formatHMS } from '@/lib/time';
import { tapFeedback, successFeedback } from '@/lib/haptics';
import type { Category } from '@/db/types';

export default function TimerScreen() {
  const activeTimer = useStore((s) => s.activeTimer);
  const categories = useStore((s) => s.categories);
  const tasks = useStore((s) => s.tasks);
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
  const visibleTasks = useMemo(() => tasks.filter((t) => !t.archived).slice(0, 12), [tasks]);

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
  // Brighter than the brand base so the ring reads clearly on light AND dark.
  const ringGradient: [string, string] = isActive ? [ringColor, ringColor] : ['#4b57aa', '#06b6a4'];
  const canStartCustom = !!customTitle.trim();
  const heroShadow = Platform.OS === 'web' ? { boxShadow: '0 18px 40px rgba(21,36,115,0.16)' } : {};

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
            accessibilityRole="button"
            accessibilityLabel="Add manual time entry"
            className="h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low active:bg-surface-container-low">
            <MaterialIcons name="add" size={24} color="#142175" />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerClassName="items-center px-lg pb-xl pt-xl"
        keyboardShouldPersistTaps="handled">
        {/* Timer display — gradient ring with an inner surface disc.
            Explicit pixel sizes keep the ring thickness identical on web + native. */}
        <View
          style={[{ width: 256, height: 256, borderRadius: 128, alignItems: 'center', justifyContent: 'center' }, heroShadow as object]}>
          <LinearGradient
            colors={ringGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, width: 256, height: 256, borderRadius: 128 }}
          />
          <View
            style={{ width: 206, height: 206, borderRadius: 103 }}
            className="items-center justify-center bg-surface-container-high">
            <Text className="font-mono text-[44px] leading-[52px] text-on-surface">
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
                className="flex-1 flex-row items-center justify-center gap-xs rounded-lg bg-surface-container-highest py-sm transition-opacity hover:opacity-90 active:opacity-80">
                <MaterialIcons name={isRunning ? 'pause' : 'play-arrow'} size={22} color="#191c1e" />
                <Text className="font-sans-medium text-body-md text-on-surface">
                  {isRunning ? 'Pause' : 'Resume'}
                </Text>
              </Pressable>
              <Pressable
                onPress={onStop}
                className="flex-1 flex-row items-center justify-center gap-xs rounded-lg bg-error py-sm transition-opacity hover:opacity-90 active:opacity-80">
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
              disabled={!canStartCustom}
              className="overflow-hidden rounded-lg transition-opacity hover:opacity-95 active:opacity-90">
              {canStartCustom ? (
                <LinearGradient
                  colors={['#006a61', '#00a896']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 }}>
                  <MaterialIcons name="play-arrow" size={24} color="#ffffff" />
                  <Text className="font-display-bold text-headline-sm text-on-secondary">Start</Text>
                </LinearGradient>
              ) : (
                <View className="flex-row items-center justify-center gap-xs bg-surface-container-highest py-sm">
                  <MaterialIcons name="play-arrow" size={24} color="#767682" />
                  <Text className="font-display-bold text-headline-sm text-on-surface-variant">Start</Text>
                </View>
              )}
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
                  className={`flex-row items-center gap-xs rounded-full border px-sm py-xs transition-colors hover:bg-surface-container-low active:opacity-70 ${
                    isCurrent ? 'border-primary bg-primary-fixed' : 'border-outline-variant bg-surface-container-lowest'
                  }`}>
                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <Text
                    className={`font-sans-medium text-body-sm ${isCurrent ? 'text-on-primary-fixed' : 'text-on-surface'}`}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* User tasks */}
        {visibleTasks.length > 0 ? (
          <View className="mt-xl w-full">
            <Text className="mb-sm font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
              Your tasks
            </Text>
            <View className="flex-row flex-wrap gap-xs">
              {visibleTasks.map((task) => {
                const isCurrent = activeTimer?.taskId === task.id;
                return (
                  <Pressable
                    key={task.id}
                    onPress={() =>
                      start({
                        taskId: task.id,
                        categoryId: task.categoryId,
                        taskTitle: task.title,
                        color: task.color,
                      })
                    }
                    className={`max-w-full flex-row items-center gap-xs rounded-full border px-sm py-xs transition-colors hover:bg-surface-container-low active:opacity-70 ${
                      isCurrent ? 'border-primary bg-primary-fixed' : 'border-outline-variant bg-surface-container-lowest'
                    }`}>
                    <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: task.color }} />
                    <Text
                      className={`font-sans-medium text-body-sm ${isCurrent ? 'text-on-primary-fixed' : 'text-on-surface'}`}
                      numberOfLines={1}>
                      {task.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Integrated tasks (grouped by app, searchable) */}
        <View className="mt-xl w-full">
          <SyncedTasks
            onStart={(task) =>
              start({ categoryId: null, taskTitle: task.title, color: task.color, source: task.source })
            }
          />
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
