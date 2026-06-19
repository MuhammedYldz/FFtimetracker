import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { TimeEntry } from '@/db/types';
import { formatClock, formatHMS } from '@/lib/time';

const SOURCE_ICON: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  local: 'schedule',
  jira: 'sync',
  azure: 'sync',
  custom: 'api',
};

/** A single time-entry row: color dot, title, time range, duration. Tappable to edit. */
export function EntryRow({ entry, onPress }: { entry: TimeEntry; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-outline-variant px-md py-sm active:bg-surface-container-low">
      <View className="flex-1 flex-row items-center gap-sm">
        <View className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
        <View className="flex-1">
          <Text className="font-sans-medium text-body-md text-on-surface" numberOfLines={1}>
            {entry.taskTitle}
          </Text>
          <View className="flex-row items-center gap-xs">
            {entry.source !== 'local' ? (
              <MaterialIcons name={SOURCE_ICON[entry.source] ?? 'schedule'} size={12} color="#767682" />
            ) : null}
            <Text className="font-mono text-body-sm text-on-surface-variant">
              {formatClock(entry.startedAt)} – {formatClock(entry.endedAt)}
            </Text>
          </View>
        </View>
      </View>
      <Text className="ml-sm font-mono text-body-md text-on-surface">{formatHMS(entry.durationMs)}</Text>
    </Pressable>
  );
}
