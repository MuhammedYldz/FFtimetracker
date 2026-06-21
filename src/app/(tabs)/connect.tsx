import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { useAuth, isSupabaseConfigured } from '@/store/useAuth';
import { useStore } from '@/store/useStore';
import { useSyncStatus } from '@/store/useSyncStatus';
import { useTheme, type ThemePref } from '@/store/useTheme';
import { syncNow } from '@/sync/sync';
import { fetchTasksForConnection } from '@/integrations/providers';
import { formatClock } from '@/lib/time';
import { tapFeedback } from '@/lib/haptics';
import type { Connection } from '@/db/types';

const CONNECTOR_META: Record<
  Connection['type'],
  { label: string; description: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; editPath: string }
> = {
  todoist: { label: 'Todoist', description: 'Pull your active tasks.', icon: 'check-circle', color: '#e44332', editPath: '/provider' },
  github: { label: 'GitHub', description: 'Pull issues assigned to you.', icon: 'code', color: '#24292e', editPath: '/provider' },
  notion: { label: 'Notion', description: 'Pull items from a database.', icon: 'description', color: '#111111', editPath: '/provider' },
  custom: { label: 'Custom API', description: 'Connect any in-house system.', icon: 'api', color: '#454651', editPath: '/connection' },
  jira: { label: 'Jira', description: 'Jira issues.', icon: 'integration-instructions', color: '#0052CC', editPath: '/connection' },
  azure: { label: 'Azure DevOps', description: 'Azure work items.', icon: 'code', color: '#0078D7', editPath: '/connection' },
};

function editRoute(conn: Connection) {
  const meta = CONNECTOR_META[conn.type];
  return meta.editPath === '/provider'
    ? { pathname: '/provider' as const, params: { type: conn.type, id: conn.id } }
    : { pathname: '/connection' as const, params: { id: conn.id } };
}

function ConnectionRow({ conn }: { conn: Connection }) {
  const setSyncedTasksForConnection = useStore((s) => s.setSyncedTasksForConnection);
  const taskCount = useStore((s) => s.syncedTasks.filter((t) => t.connectionId === conn.id).length);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = CONNECTOR_META[conn.type];

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    const result = await fetchTasksForConnection(conn);
    if (result.ok) await setSyncedTasksForConnection(conn.id, result.tasks);
    else setError(result.error ?? 'Refresh failed');
    setRefreshing(false);
  };

  return (
    <View className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md gap-sm">
      <View className="flex-row items-center gap-sm">
        <View className="h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: meta.color }}>
          <MaterialIcons name={meta.icon} size={24} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="font-sans-semibold text-body-md text-on-surface">{conn.name}</Text>
          <Text className={`font-sans text-body-sm ${error ? 'text-error' : 'text-on-surface-variant'}`} numberOfLines={1}>
            {error ? error : `${taskCount} task${taskCount === 1 ? '' : 's'} synced`}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-sm">
        <Pressable
          onPress={refresh}
          disabled={refreshing}
          className="flex-1 flex-row items-center justify-center gap-xs rounded-lg bg-primary py-sm transition-opacity hover:opacity-90 active:opacity-80">
          {refreshing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <MaterialIcons name="sync" size={18} color="#ffffff" />
          )}
          <Text className="font-sans-medium text-body-sm text-on-primary">Refresh</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(editRoute(conn))}
          className="flex-row items-center justify-center rounded-lg border border-outline-variant px-md py-sm transition-opacity hover:opacity-90 active:opacity-70">
          <Text className="font-sans-medium text-body-sm text-on-surface">Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ConnectCard({ type, onConnect }: { type: Connection['type']; onConnect: () => void }) {
  const meta = CONNECTOR_META[type];
  return (
    <Pressable
      onPress={onConnect}
      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md transition-colors hover:bg-surface-container-low active:opacity-80">
      <View className="flex-row items-center gap-sm">
        <View className="h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: meta.color }}>
          <MaterialIcons name={meta.icon} size={24} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="font-sans-semibold text-body-md text-on-surface">{meta.label}</Text>
          <Text className="font-sans text-body-sm text-on-surface-variant">{meta.description}</Text>
        </View>
        <View className="flex-row items-center gap-base rounded-full bg-primary-fixed px-sm py-base">
          <MaterialIcons name="add" size={14} color="#152473" />
          <Text className="font-sans-medium text-label-md text-on-primary-fixed">Connect</Text>
        </View>
      </View>
    </Pressable>
  );
}

const THEME_OPTIONS: { value: ThemePref; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'system', label: 'System', icon: 'brightness-auto' },
  { value: 'light', label: 'Light', icon: 'light-mode' },
  { value: 'dark', label: 'Dark', icon: 'dark-mode' },
];

export default function ConnectScreen() {
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const { phase, lastSyncedAt, error } = useSyncStatus();
  const connections = useStore((s) => s.connections);
  const themePref = useTheme((s) => s.pref);
  const setThemePref = useTheme((s) => s.setPref);

  const connByType = (t: Connection['type']) => connections.filter((c) => c.type === t);

  return (
    <Screen>
      <AppHeader title="Connect" />
      <ScrollView contentContainerClassName="gap-lg p-md">
        {/* Account & sync */}
        <View className="gap-sm">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Account & backup
          </Text>

          {!isSupabaseConfigured ? (
            <View className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
              <Text className="font-sans text-body-md text-on-surface-variant">
                Cloud sync isn’t configured in this build.
              </Text>
            </View>
          ) : user ? (
            <View className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md gap-md">
              <View className="flex-row items-center gap-sm">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-fixed">
                  <MaterialIcons name="person" size={24} color="#142175" />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-body-md text-on-surface" numberOfLines={1}>
                    {user.email}
                  </Text>
                  <View className="flex-row items-center gap-xs">
                    <View
                      className={`h-2 w-2 rounded-full ${
                        phase === 'error' ? 'bg-error' : phase === 'syncing' ? 'bg-outline' : 'bg-secondary'
                      }`}
                    />
                    <Text className="font-sans text-body-sm text-on-surface-variant">
                      {phase === 'syncing'
                        ? 'Syncing…'
                        : phase === 'error'
                          ? error ?? 'Sync error'
                          : lastSyncedAt
                            ? `Synced at ${formatClock(lastSyncedAt)}`
                            : 'Backed up'}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row gap-sm">
                <Pressable
                  onPress={() => {
                    tapFeedback();
                    syncNow();
                  }}
                  disabled={phase === 'syncing'}
                  className="flex-1 flex-row items-center justify-center gap-xs rounded-lg bg-primary py-sm transition-opacity hover:opacity-90 active:opacity-80">
                  {phase === 'syncing' ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <MaterialIcons name="sync" size={20} color="#ffffff" />
                  )}
                  <Text className="font-sans-medium text-body-md text-on-primary">Sync now</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    tapFeedback();
                    signOut();
                  }}
                  className="flex-row items-center justify-center gap-xs rounded-lg border border-outline-variant px-md py-sm transition-opacity hover:opacity-90 active:opacity-70">
                  <Text className="font-sans-medium text-body-md text-on-surface">Sign out</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                tapFeedback();
                router.push('/auth');
              }}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md transition-opacity hover:opacity-90 active:opacity-80">
              <View className="flex-row items-center gap-sm">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-fixed">
                  <MaterialIcons name="cloud-sync" size={24} color="#142175" />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-body-md text-on-surface">
                    Sign in to back up & sync
                  </Text>
                  <Text className="font-sans text-body-sm text-on-surface-variant">
                    Optional. Your time tracks fine without an account.
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#767682" />
              </View>
            </Pressable>
          )}
        </View>

        {/* Appearance */}
        <View className="gap-sm">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Appearance
          </Text>
          <View className="flex-row gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-xs">
            {THEME_OPTIONS.map((opt) => {
              const active = themePref === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    tapFeedback();
                    setThemePref(opt.value);
                  }}
                  className={`flex-1 flex-row items-center justify-center gap-xs rounded-lg py-sm transition-colors ${
                    active ? 'bg-primary-fixed' : 'hover:bg-surface-container-low'
                  }`}>
                  <MaterialIcons
                    name={opt.icon}
                    size={18}
                    color={active ? '#152473' : '#767682'}
                  />
                  <Text
                    className={`font-sans-medium text-body-sm ${active ? 'text-on-primary-fixed' : 'text-on-surface-variant'}`}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Integrations */}
        <View className="gap-sm">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Integrations
          </Text>

          {(['todoist', 'github', 'notion'] as const).map((type) => {
            const conns = connByType(type);
            if (conns.length > 0) {
              return conns.map((c) => <ConnectionRow key={c.id} conn={c} />);
            }
            return (
              <ConnectCard
                key={type}
                type={type}
                onConnect={() => {
                  tapFeedback();
                  router.push({ pathname: '/provider', params: { type } });
                }}
              />
            );
          })}

          {/* Custom API */}
          {connByType('custom').map((c) => (
            <ConnectionRow key={c.id} conn={c} />
          ))}
          <ConnectCard
            type="custom"
            onConnect={() => {
              tapFeedback();
              router.push('/connection');
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
