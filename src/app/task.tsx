import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/useStore';
import { CATEGORY_COLORS } from '@/theme/categoryStyle';
import { successFeedback, tapFeedback } from '@/lib/haptics';

export default function TaskScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const tasks = useStore((s) => s.tasks);
  const categories = useStore((s) => s.categories);
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const setArchived = useStore((s) => s.setTaskArchived);
  const deleteTask = useStore((s) => s.deleteTask);

  const editing = useMemo(
    () => (params.id ? tasks.find((t) => t.id === params.id) ?? null : null),
    [params.id, tasks],
  );

  const [title, setTitle] = useState(editing?.title ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [color, setColor] = useState(editing?.color ?? CATEGORY_COLORS[0]);
  const [colorTouched, setColorTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleCategories = useMemo(
    () => categories.filter((c) => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const pickCategory = (id: string | null, catColor?: string) => {
    tapFeedback();
    setCategoryId(id);
    // Inherit the type's color unless the user picked one explicitly.
    if (id && catColor && !colorTouched) setColor(catColor);
    setError(null);
  };

  const onSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Give the task a name.');
      return;
    }
    successFeedback();
    if (editing) {
      await updateTask(editing.id, { title: trimmed, note: note.trim() || null, categoryId, color });
    } else {
      await addTask({ title: trimmed, note: note.trim() || null, categoryId, color });
    }
    router.back();
  };

  const onDelete = () => {
    if (!editing) return;
    const doDelete = async () => {
      await deleteTask(editing.id);
      router.back();
    };
    if (Platform.OS === 'web') doDelete();
    else
      Alert.alert('Delete task?', 'Past time entries keep their saved label.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-surface">
      <View className="w-full flex-1 self-center" style={{ maxWidth: 640 }}>
        <View className="h-16 flex-row items-center justify-between border-b border-outline-variant px-md">
          <Pressable onPress={() => router.back()} className="py-xs transition-opacity hover:opacity-90 active:opacity-70">
            <Text className="font-sans-medium text-body-md text-on-surface-variant">Cancel</Text>
          </Pressable>
          <Text className="font-sans-semibold text-body-md text-on-surface">
            {editing ? 'Edit Task' : 'New Task'}
          </Text>
          <Pressable onPress={onSave} className="py-xs transition-opacity hover:opacity-90 active:opacity-70">
            <Text className="font-sans-bold text-body-md text-primary">Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="p-lg gap-lg" keyboardShouldPersistTaps="handled">
          <View className="gap-xs">
            <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
              Task name
            </Text>
            <TextInput
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                setError(null);
              }}
              placeholder="e.g. Acme website redesign"
              placeholderTextColor="#767682"
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-sm font-sans text-body-md text-on-surface"
            />
          </View>

          <View className="gap-xs">
            <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
              Note (optional)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="A short description"
              placeholderTextColor="#767682"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              className="min-h-[64px] rounded-lg border border-outline-variant bg-surface-container-lowest p-sm font-sans text-body-md text-on-surface"
            />
          </View>

          <View className="gap-xs">
            <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
              Type (optional)
            </Text>
            <View className="flex-row flex-wrap gap-xs">
              {visibleCategories.map((cat) => {
                const sel = categoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => pickCategory(sel ? null : cat.id, cat.color)}
                    className={`flex-row items-center gap-xs rounded-full border px-sm py-xs transition-colors hover:bg-surface-container-low active:opacity-70 ${
                      sel ? 'border-primary bg-primary-fixed' : 'border-outline-variant bg-surface-container-lowest'
                    }`}>
                    <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <Text
                      className={`font-sans-medium text-body-sm ${sel ? 'text-on-primary-fixed' : 'text-on-surface'}`}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-xs">
            <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
              Color
            </Text>
            <View className="flex-row flex-wrap gap-sm">
              {CATEGORY_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    tapFeedback();
                    setColor(c);
                    setColorTouched(true);
                  }}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: c }}>
                  {color === c ? <MaterialIcons name="check" size={20} color="#ffffff" /> : null}
                </Pressable>
              ))}
            </View>
          </View>

          {error ? <Text className="font-sans-medium text-body-sm text-error">{error}</Text> : null}

          {editing ? (
            <View className="gap-sm border-t border-outline-variant pt-lg">
              <Pressable
                onPress={async () => {
                  tapFeedback();
                  await setArchived(editing.id, !editing.archived);
                  router.back();
                }}
                className="flex-row items-center justify-center gap-xs rounded-lg border border-outline-variant py-sm transition-opacity hover:opacity-90 active:opacity-70">
                <MaterialIcons name={editing.archived ? 'unarchive' : 'archive'} size={20} color="#454651" />
                <Text className="font-sans-medium text-body-md text-on-surface">
                  {editing.archived ? 'Unarchive' : 'Archive'}
                </Text>
              </Pressable>
              <Pressable
                onPress={onDelete}
                className="flex-row items-center justify-center gap-xs rounded-lg border border-error py-sm transition-opacity hover:opacity-90 active:opacity-70">
                <MaterialIcons name="delete-outline" size={20} color="#ba1a1a" />
                <Text className="font-sans-medium text-body-md text-error">Delete task</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
