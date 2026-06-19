import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';
import { useAuth, isSupabaseConfigured } from '@/store/useAuth';
import { useSyncStatus } from '@/store/useSyncStatus';
import { syncNow } from '@/sync/sync';
import { formatClock } from '@/lib/time';
import { tapFeedback } from '@/lib/haptics';

function IntegrationCard({
  name,
  description,
  icon,
  color,
}: {
  name: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}) {
  return (
    <View className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
      <View className="flex-row items-center gap-sm">
        <View className="h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: color }}>
          <MaterialIcons name={icon} size={24} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="font-sans-semibold text-body-md text-on-surface">{name}</Text>
          <Text className="font-sans text-body-sm text-on-surface-variant">{description}</Text>
        </View>
        <View className="rounded-full bg-surface-container-high px-sm py-base">
          <Text className="font-sans-medium text-label-md text-on-surface-variant">Soon</Text>
        </View>
      </View>
    </View>
  );
}

export default function ConnectScreen() {
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const { phase, lastSyncedAt, error } = useSyncStatus();

  return (
    <Screen>
      <AppHeader title="Connect" />
      <View className="gap-lg p-md">
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
                  className="flex-1 flex-row items-center justify-center gap-xs rounded-lg bg-primary py-sm active:opacity-80">
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
                  className="flex-row items-center justify-center gap-xs rounded-lg border border-outline-variant px-md py-sm active:opacity-70">
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
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md active:opacity-80">
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

        {/* Integrations (Phase 6) */}
        <View className="gap-sm">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Integrations
          </Text>
          <IntegrationCard
            name="Jira"
            description="Log time against assigned issues."
            icon="integration-instructions"
            color="#0052CC"
          />
          <IntegrationCard
            name="Azure DevOps"
            description="Import work items and push time."
            icon="code"
            color="#0078D7"
          />
          <IntegrationCard
            name="Custom API"
            description="Connect any in-house system."
            icon="api"
            color="#454651"
          />
        </View>
      </View>
    </Screen>
  );
}
