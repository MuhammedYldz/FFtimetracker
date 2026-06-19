import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/useStore';
import {
  addDays,
  clockToEpoch,
  formatClock,
  formatDateLabel,
  startOfDay,
} from '@/lib/time';
import { successFeedback, tapFeedback } from '@/lib/haptics';
import type { Category } from '@/db/types';

type Mode = 'duration' | 'startend';

export default function EntryScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string; categoryId?: string }>();
  const categories = useStore((s) => s.categories);
  const entries = useStore((s) => s.entries);
  const addEntry = useStore((s) => s.addEntry);
  const updateEntry = useStore((s) => s.updateEntry);
  const deleteEntry = useStore((s) => s.deleteEntry);

  const editing = useMemo(
    () => (params.id ? entries.find((e) => e.id === params.id) ?? null : null),
    [params.id, entries],
  );

  const initialDay = editing
    ? startOfDay(editing.startedAt)
    : params.date
      ? startOfDay(Number(params.date))
      : startOfDay(Date.now());

  const [day, setDay] = useState<number>(initialDay);
  const [mode, setMode] = useState<Mode>(editing ? 'startend' : 'duration');
  const [hours, setHours] = useState(
    editing ? String(Math.floor(editing.durationMs / 3600000)) : '0',
  );
  const [minutes, setMinutes] = useState(
    editing ? String(Math.round((editing.durationMs % 3600000) / 60000)) : '30',
  );
  const [startStr, setStartStr] = useState(editing ? formatClock(editing.startedAt) : '09:00');
  const [endStr, setEndStr] = useState(editing ? formatClock(editing.endedAt) : '10:00');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    editing ? editing.categoryId : (params.categoryId ?? null),
  );
  const [customTitle, setCustomTitle] = useState(
    editing && !editing.categoryId ? editing.taskTitle : '',
  );
  const [note, setNote] = useState(editing?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );
  const selectedCategory = visibleCategories.find((c) => c.id === selectedCategoryId) ?? null;

  const resolveTask = (): { categoryId: string | null; taskTitle: string; color: string } | null => {
    if (selectedCategory) {
      return {
        categoryId: selectedCategory.id,
        taskTitle: selectedCategory.name,
        color: selectedCategory.color,
      };
    }
    const title = customTitle.trim();
    if (title) return { categoryId: null, taskTitle: title, color: '#142175' };
    return null;
  };

  const resolveTimes = (): { startedAt: number; endedAt: number; durationMs: number } | null => {
    if (mode === 'duration') {
      const h = Number(hours) || 0;
      const m = Number(minutes) || 0;
      const durationMs = (h * 60 + m) * 60000;
      if (durationMs <= 0) return null;
      const startedAt = startOfDay(day) + 9 * 3600000; // anchor at 09:00
      return { startedAt, endedAt: startedAt + durationMs, durationMs };
    }
    const startedAt = clockToEpoch(day, startStr);
    const endedAt = clockToEpoch(day, endStr);
    if (startedAt == null || endedAt == null) return null;
    if (endedAt <= startedAt) return null;
    return { startedAt, endedAt, durationMs: endedAt - startedAt };
  };

  const onSave = async () => {
    const task = resolveTask();
    if (!task) {
      setError('Pick a category or type what you worked on.');
      return;
    }
    const times = resolveTimes();
    if (!times) {
      setError(
        mode === 'duration'
          ? 'Enter a duration greater than zero.'
          : 'End time must be valid and after the start time.',
      );
      return;
    }
    successFeedback();
    if (editing) {
      await updateEntry(editing.id, { ...task, ...times, note: note.trim() || null });
    } else {
      await addEntry({ ...task, ...times, note: note.trim() || null, source: 'local' });
    }
    router.back();
  };

  const onDelete = () => {
    if (!editing) return;
    const doDelete = async () => {
      await deleteEntry(editing.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      doDelete();
    } else {
      Alert.alert('Delete entry?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-surface">
      {/* Header */}
      <View className="h-16 flex-row items-center justify-between border-b border-outline-variant px-md">
        <Pressable onPress={() => router.back()} className="py-xs active:opacity-70">
          <Text className="font-sans-medium text-body-md text-on-surface-variant">Cancel</Text>
        </Pressable>
        <Text className="font-sans-semibold text-body-md text-on-surface">
          {editing ? 'Edit Entry' : 'Add Manual Entry'}
        </Text>
        <Pressable onPress={onSave} className="py-xs active:opacity-70">
          <Text className="font-sans-bold text-body-md text-primary">Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="p-lg gap-lg" keyboardShouldPersistTaps="handled">
        {/* Date */}
        <View className="gap-xs">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Date
          </Text>
          <View className="flex-row items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-xs">
            <Pressable
              onPress={() => setDay((d) => addDays(d, -1))}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-container-low">
              <MaterialIcons name="chevron-left" size={24} color="#454651" />
            </Pressable>
            <Text className="font-sans-semibold text-body-md text-on-surface">
              {formatDateLabel(day)}
            </Text>
            <Pressable
              onPress={() => setDay((d) => addDays(d, 1))}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-container-low">
              <MaterialIcons name="chevron-right" size={24} color="#454651" />
            </Pressable>
          </View>
        </View>

        {/* Time mode toggle */}
        <View className="gap-xs">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
              {mode === 'duration' ? 'Duration' : 'Start & End'}
            </Text>
            <Pressable
              onPress={() => {
                tapFeedback();
                setMode((m) => (m === 'duration' ? 'startend' : 'duration'));
                setError(null);
              }}
              className="active:opacity-70">
              <Text className="font-sans-medium text-label-md text-primary">
                {mode === 'duration' ? 'Switch to start/end time' : 'Switch to duration'}
              </Text>
            </Pressable>
          </View>

          {mode === 'duration' ? (
            <View className="flex-row items-center gap-sm">
              <View className="flex-1 flex-row items-center rounded-lg border border-outline-variant bg-surface-container-lowest px-sm">
                <TextInput
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="number-pad"
                  className="flex-1 py-sm text-center font-mono text-headline-sm text-on-surface"
                />
                <Text className="font-sans-medium text-label-md text-on-surface-variant">h</Text>
              </View>
              <Text className="font-sans-semibold text-headline-sm text-on-surface-variant">:</Text>
              <View className="flex-1 flex-row items-center rounded-lg border border-outline-variant bg-surface-container-lowest px-sm">
                <TextInput
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="number-pad"
                  className="flex-1 py-sm text-center font-mono text-headline-sm text-on-surface"
                />
                <Text className="font-sans-medium text-label-md text-on-surface-variant">m</Text>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center gap-sm">
              <View className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-sm">
                <TextInput
                  value={startStr}
                  onChangeText={setStartStr}
                  placeholder="09:00"
                  placeholderTextColor="#767682"
                  className="py-sm text-center font-mono text-headline-sm text-on-surface"
                />
              </View>
              <Text className="font-sans-semibold text-headline-sm text-on-surface-variant">–</Text>
              <View className="flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-sm">
                <TextInput
                  value={endStr}
                  onChangeText={setEndStr}
                  placeholder="10:00"
                  placeholderTextColor="#767682"
                  className="py-sm text-center font-mono text-headline-sm text-on-surface"
                />
              </View>
            </View>
          )}
        </View>

        {/* Task selection */}
        <View className="gap-sm border-t border-outline-variant pt-lg">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Task
          </Text>
          <View className="flex-row flex-wrap gap-xs">
            {visibleCategories.map((cat: Category) => {
              const sel = selectedCategoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    tapFeedback();
                    setSelectedCategoryId(sel ? null : cat.id);
                    setError(null);
                  }}
                  className={`flex-row items-center gap-xs rounded-full border px-sm py-xs active:opacity-70 ${
                    sel ? 'border-primary bg-primary-fixed' : 'border-outline-variant bg-surface-container-lowest'
                  }`}>
                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <Text className="font-sans-medium text-body-sm text-on-surface">{cat.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row items-center gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest px-sm">
            <MaterialIcons name="edit" size={18} color="#767682" />
            <TextInput
              value={customTitle}
              onChangeText={(t) => {
                setCustomTitle(t);
                if (t.trim()) setSelectedCategoryId(null);
                setError(null);
              }}
              placeholder="…or a custom task"
              placeholderTextColor="#767682"
              className="flex-1 py-sm font-sans text-body-md text-on-surface"
            />
          </View>
        </View>

        {/* Notes */}
        <View className="gap-xs">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Notes (optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What did you work on?"
            placeholderTextColor="#767682"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="min-h-[80px] rounded-lg border border-outline-variant bg-surface-container-lowest p-sm font-sans text-body-md text-on-surface"
          />
        </View>

        {error ? (
          <Text className="font-sans-medium text-body-sm text-error">{error}</Text>
        ) : null}

        {editing ? (
          <Pressable
            onPress={onDelete}
            className="mt-sm flex-row items-center justify-center gap-xs rounded-lg border border-error py-sm active:opacity-70">
            <MaterialIcons name="delete-outline" size={20} color="#ba1a1a" />
            <Text className="font-sans-medium text-body-md text-error">Delete entry</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
