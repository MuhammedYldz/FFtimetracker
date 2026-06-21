import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/useStore';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/theme/categoryStyle';
import { successFeedback, tapFeedback } from '@/lib/haptics';

export default function CategoryScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const categories = useStore((s) => s.categories);
  const entries = useStore((s) => s.entries);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const setArchived = useStore((s) => s.setCategoryArchived);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const editing = useMemo(
    () => (params.id ? categories.find((c) => c.id === params.id) ?? null : null),
    [params.id, categories],
  );

  const [name, setName] = useState(editing?.name ?? '');
  const [color, setColor] = useState(editing?.color ?? CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState<keyof typeof MaterialIcons.glyphMap>(
    (editing?.icon as keyof typeof MaterialIcons.glyphMap) ?? CATEGORY_ICONS[0],
  );
  const [error, setError] = useState<string | null>(null);

  const usageCount = editing ? entries.filter((e) => e.categoryId === editing.id).length : 0;

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the category a name.');
      return;
    }
    successFeedback();
    if (editing) {
      await updateCategory(editing.id, { name: trimmed, color, icon });
    } else {
      await addCategory({ name: trimmed, color, icon });
    }
    router.back();
  };

  const onToggleArchive = async () => {
    if (!editing) return;
    tapFeedback();
    await setArchived(editing.id, !editing.archived);
    router.back();
  };

  const onDelete = () => {
    if (!editing) return;
    const doDelete = async () => {
      await deleteCategory(editing.id);
      router.back();
    };
    const msg =
      usageCount > 0
        ? `${usageCount} past ${usageCount === 1 ? 'entry uses' : 'entries use'} this category. They'll keep their saved label. Delete anyway?`
        : 'This cannot be undone.';
    if (Platform.OS === 'web') {
      doDelete();
    } else {
      Alert.alert('Delete category?', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-surface">
      <View className="w-full flex-1 self-center" style={{ maxWidth: 640 }}>
      <View className="h-16 flex-row items-center justify-between border-b border-outline-variant px-md">
        <Pressable onPress={() => router.back()} className="py-xs transition-opacity hover:opacity-90 active:opacity-70">
          <Text className="font-sans-medium text-body-md text-on-surface-variant">Cancel</Text>
        </Pressable>
        <Text className="font-sans-semibold text-body-md text-on-surface">
          {editing ? 'Edit Category' : 'New Category'}
        </Text>
        <Pressable onPress={onSave} className="py-xs transition-opacity hover:opacity-90 active:opacity-70">
          <Text className="font-sans-bold text-body-md text-primary">Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="p-lg gap-lg" keyboardShouldPersistTaps="handled">
        {/* Preview */}
        <View className="items-center gap-sm py-sm">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: color }}>
            <MaterialIcons name={icon} size={30} color="#ffffff" />
          </View>
          <Text className="font-sans-semibold text-body-md text-on-surface">
            {name.trim() || 'Category name'}
          </Text>
        </View>

        {/* Name */}
        <View className="gap-xs">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            placeholder="e.g. Research"
            placeholderTextColor="#767682"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-sm font-sans text-body-md text-on-surface"
          />
        </View>

        {/* Color */}
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
                }}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: c }}>
                {color === c ? <MaterialIcons name="check" size={20} color="#ffffff" /> : null}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Icon */}
        <View className="gap-xs">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Icon
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {CATEGORY_ICONS.map((ic) => {
              const sel = icon === ic;
              return (
                <Pressable
                  key={ic}
                  onPress={() => {
                    tapFeedback();
                    setIcon(ic);
                  }}
                  className={`h-10 w-10 items-center justify-center rounded-lg border ${
                    sel ? 'border-primary bg-primary-fixed' : 'border-outline-variant bg-surface-container-lowest'
                  }`}>
                  <MaterialIcons name={ic} size={22} color={sel ? '#142175' : '#454651'} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? <Text className="font-sans-medium text-body-sm text-error">{error}</Text> : null}

        {/* Edit-only actions */}
        {editing ? (
          <View className="gap-sm border-t border-outline-variant pt-lg">
            <Pressable
              onPress={onToggleArchive}
              className="flex-row items-center justify-center gap-xs rounded-lg border border-outline-variant py-sm transition-opacity hover:opacity-90 active:opacity-70">
              <MaterialIcons
                name={editing.archived ? 'unarchive' : 'archive'}
                size={20}
                color="#454651"
              />
              <Text className="font-sans-medium text-body-md text-on-surface">
                {editing.archived ? 'Unarchive' : 'Archive'}
              </Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              className="flex-row items-center justify-center gap-xs rounded-lg border border-error py-sm transition-opacity hover:opacity-90 active:opacity-70">
              <MaterialIcons name="delete-outline" size={20} color="#ba1a1a" />
              <Text className="font-sans-medium text-body-md text-error">Delete category</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}
