import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { useStore } from '@/store/useStore';
import { tapFeedback } from '@/lib/haptics';
import type { Category } from '@/db/types';

function CategoryRow({ category }: { category: Category }) {
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        router.push({ pathname: '/category', params: { id: category.id } });
      }}
      className="flex-row items-center justify-between border-b border-outline-variant px-md py-sm transition-colors hover:bg-surface-container-low active:bg-surface-container-low">
      <View className="flex-row items-center gap-sm">
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: category.color }}>
          <MaterialIcons
            name={category.icon as keyof typeof MaterialIcons.glyphMap}
            size={20}
            color="#ffffff"
          />
        </View>
        <View>
          <Text className="font-sans-medium text-body-md text-on-surface">{category.name}</Text>
          {category.isDefault ? (
            <Text className="font-sans text-label-md text-on-surface-variant">Built-in</Text>
          ) : null}
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#767682" />
    </Pressable>
  );
}

export default function TasksScreen() {
  const categories = useStore((s) => s.categories);

  const active = useMemo(
    () => categories.filter((c) => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );
  const archived = useMemo(
    () => categories.filter((c) => c.archived).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  return (
    <Screen>
      <AppHeader
        title="Tasks"
        right={
          <Pressable
            onPress={() => {
              tapFeedback();
              router.push('/category');
            }}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-container-low">
            <MaterialIcons name="add" size={24} color="#142175" />
          </Pressable>
        }
      />
      <ScrollView contentContainerClassName="p-md gap-lg">
        <View>
          <Text className="mb-sm font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Categories
          </Text>
          <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            {active.map((c) => (
              <CategoryRow key={c.id} category={c} />
            ))}
          </View>
          <Pressable
            onPress={() => {
              tapFeedback();
              router.push('/category');
            }}
            className="mt-sm flex-row items-center justify-center gap-xs rounded-lg border border-dashed border-outline py-sm active:opacity-70">
            <MaterialIcons name="add" size={20} color="#142175" />
            <Text className="font-sans-medium text-body-md text-primary">New category</Text>
          </Pressable>
        </View>

        {archived.length > 0 ? (
          <View>
            <Text className="mb-sm font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
              Archived
            </Text>
            <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest opacity-70">
              {archived.map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
