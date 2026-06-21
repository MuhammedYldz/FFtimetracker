import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { SOURCE_DISPLAY } from '@/integrations/providers';
import { tapFeedback } from '@/lib/haptics';
import type { SyncedTask } from '@/db/types';

/**
 * Read-only list of tasks pulled from integrations, grouped by connection
 * (titled with the integration's name), searchable by name. Tapping a task
 * starts a timer for it — these tasks aren't editable (name/type come from the
 * source app).
 */
export function SyncedTasks({ onStart }: { onStart: (task: SyncedTask) => void }) {
  const syncedTasks = useStore((s) => s.syncedTasks);
  const connections = useStore((s) => s.connections);
  const activeTimer = useStore((s) => s.activeTimer);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byConn = new Map<string, { name: string; source: string; tasks: SyncedTask[] }>();
    for (const t of syncedTasks) {
      if (q && !t.title.toLowerCase().includes(q)) continue;
      const conn = connections.find((c) => c.id === t.connectionId);
      const name = conn?.name ?? SOURCE_DISPLAY[t.source]?.label ?? 'Integration';
      if (!byConn.has(t.connectionId)) byConn.set(t.connectionId, { name, source: t.source, tasks: [] });
      byConn.get(t.connectionId)!.tasks.push(t);
    }
    return [...byConn.values()];
  }, [syncedTasks, connections, query]);

  if (syncedTasks.length === 0) return null;

  return (
    <View className="w-full gap-md">
      {syncedTasks.length > 6 ? (
        <View className="flex-row items-center gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest px-sm">
          <MaterialIcons name="search" size={18} color="#767682" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search integrated tasks"
            placeholderTextColor="#767682"
            className="flex-1 py-sm font-sans text-body-md text-on-surface"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <MaterialIcons name="close" size={18} color="#767682" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {groups.map((group) => {
        const meta = SOURCE_DISPLAY[group.source as keyof typeof SOURCE_DISPLAY] ?? SOURCE_DISPLAY.custom;
        return (
          <View key={group.name} className="gap-sm">
            <View className="flex-row items-center gap-xs">
              <MaterialIcons name={meta.icon as keyof typeof MaterialIcons.glyphMap} size={14} color={meta.color} />
              <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
                {group.name}
              </Text>
            </View>
            <View className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              {group.tasks.map((task) => {
                const isCurrent =
                  activeTimer?.taskTitle === task.title && activeTimer?.source === task.source;
                return (
                  <Pressable
                    key={task.id}
                    onPress={() => {
                      tapFeedback();
                      onStart(task);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Start timer for ${task.title}`}
                    className={`flex-row items-center gap-sm border-b border-outline-variant px-md py-sm transition-colors hover:bg-surface-container-low active:bg-surface-container-low ${
                      isCurrent ? 'bg-primary-fixed' : ''
                    }`}>
                    <MaterialIcons
                      name={meta.icon as keyof typeof MaterialIcons.glyphMap}
                      size={18}
                      color={meta.color}
                    />
                    <Text
                      className={`flex-1 font-sans-medium text-body-md ${isCurrent ? 'text-on-primary-fixed' : 'text-on-surface'}`}
                      numberOfLines={1}>
                      {task.title}
                    </Text>
                    <MaterialIcons name="play-arrow" size={20} color={meta.color} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
