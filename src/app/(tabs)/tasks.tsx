import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { useStore } from '@/store/useStore';
import { tapFeedback } from '@/lib/haptics';
import { formatDurationShort } from '@/lib/time';
import type { Category, Task } from '@/db/types';

type Segment = 'tasks' | 'types';

function SegmentToggle({ value, onChange }: { value: Segment; onChange: (s: Segment) => void }) {
  const opts: { value: Segment; label: string }[] = [
    { value: 'tasks', label: 'Tasks' },
    { value: 'types', label: 'Types' },
  ];
  return (
    <View className="mb-md flex-row rounded-xl border border-outline-variant bg-surface-container-lowest p-xs">
      {opts.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tapFeedback();
              onChange(o.value);
            }}
            className={`flex-1 items-center rounded-lg py-sm transition-colors ${
              active ? 'bg-primary-fixed' : 'hover:bg-surface-container-low'
            }`}>
            <Text
              className={`font-sans-semibold text-body-sm ${active ? 'text-on-primary-fixed' : 'text-on-surface-variant'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TaskRow({ task, totalMs }: { task: Task; totalMs: number }) {
  const startTimer = useStore((s) => s.startTimer);
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        router.push({ pathname: '/task', params: { id: task.id } });
      }}
      className="flex-row items-center justify-between border-b border-outline-variant px-md py-sm transition-colors hover:bg-surface-container-low active:bg-surface-container-low">
      <View className="flex-1 flex-row items-center gap-sm">
        <View className="h-3 w-3 rounded-full" style={{ backgroundColor: task.color }} />
        <View className="flex-1">
          <Text className="font-sans-medium text-body-md text-on-surface" numberOfLines={1}>
            {task.title}
          </Text>
          {totalMs > 0 ? (
            <Text className="font-mono text-label-md text-on-surface-variant">
              {formatDurationShort(totalMs)} tracked
            </Text>
          ) : null}
        </View>
      </View>
      <Pressable
        onPress={() => {
          tapFeedback();
          startTimer({ taskId: task.id, categoryId: task.categoryId, taskTitle: task.title, color: task.color });
          router.navigate('/');
        }}
        hitSlop={8}
        className="ml-sm h-9 w-9 items-center justify-center rounded-full bg-secondary-container transition-opacity hover:opacity-90 active:opacity-70">
        <MaterialIcons name="play-arrow" size={22} color="#00504a" />
      </Pressable>
    </Pressable>
  );
}

function CategoryRow({ category }: { category: Category }) {
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        router.push({ pathname: '/category', params: { id: category.id } });
      }}
      className="flex-row items-center justify-between border-b border-outline-variant px-md py-sm transition-colors hover:bg-surface-container-low active:bg-surface-container-low">
      <View className="flex-row items-center gap-sm">
        <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: category.color }}>
          <MaterialIcons name={category.icon as keyof typeof MaterialIcons.glyphMap} size={20} color="#ffffff" />
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

function EmptyState({ icon, text }: { icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
  return (
    <View className="items-center gap-sm py-xl">
      <MaterialIcons name={icon} size={36} color="#767682" />
      <Text className="text-center font-sans text-body-md text-on-surface-variant">{text}</Text>
    </View>
  );
}

export default function TasksScreen() {
  const [segment, setSegment] = useState<Segment>('tasks');
  const tasks = useStore((s) => s.tasks);
  const entries = useStore((s) => s.entries);
  const categories = useStore((s) => s.categories);

  const taskTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) if (e.taskId) map.set(e.taskId, (map.get(e.taskId) ?? 0) + e.durationMs);
    return map;
  }, [entries]);

  const activeTasks = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);
  const activeCats = useMemo(
    () => categories.filter((c) => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );
  const archivedCats = useMemo(
    () => categories.filter((c) => c.archived).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const addRoute = segment === 'tasks' ? '/task' : '/category';

  return (
    <Screen>
      <AppHeader
        title="Tasks"
        right={
          <Pressable
            onPress={() => {
              tapFeedback();
              router.push(addRoute);
            }}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low active:bg-surface-container-low">
            <MaterialIcons name="add" size={24} color="#142175" />
          </Pressable>
        }
      />
      <ScrollView contentContainerClassName="p-md">
        <SegmentToggle value={segment} onChange={setSegment} />

        {segment === 'tasks' ? (
          <View>
            {activeTasks.length === 0 ? (
              <EmptyState icon="assignment" text="No tasks yet. Create one to track time against your real work." />
            ) : (
              <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
                {activeTasks.map((t) => (
                  <TaskRow key={t.id} task={t} totalMs={taskTotals.get(t.id) ?? 0} />
                ))}
              </View>
            )}
            <Pressable
              onPress={() => {
                tapFeedback();
                router.push('/task');
              }}
              className="mt-sm flex-row items-center justify-center gap-xs rounded-lg border border-dashed border-outline py-sm transition-colors hover:bg-surface-container-low active:opacity-70">
              <MaterialIcons name="add" size={20} color="#142175" />
              <Text className="font-sans-medium text-body-md text-primary">New task</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-lg">
            <View>
              <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
                {activeCats.map((c) => (
                  <CategoryRow key={c.id} category={c} />
                ))}
              </View>
              <Pressable
                onPress={() => {
                  tapFeedback();
                  router.push('/category');
                }}
                className="mt-sm flex-row items-center justify-center gap-xs rounded-lg border border-dashed border-outline py-sm transition-colors hover:bg-surface-container-low active:opacity-70">
                <MaterialIcons name="add" size={20} color="#142175" />
                <Text className="font-sans-medium text-body-md text-primary">New type</Text>
              </Pressable>
            </View>
            {archivedCats.length > 0 ? (
              <View>
                <Text className="mb-sm font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
                  Archived
                </Text>
                <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest opacity-70">
                  {archivedCats.map((c) => (
                    <CategoryRow key={c.id} category={c} />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
