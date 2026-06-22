import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/useStore';
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll';
import { useAuth, isSupabaseConfigured } from '@/store/useAuth';
import { SignInRequired } from '@/components/SignInRequired';
import { PROVIDERS, fetchTasksForConnection, type ProviderType } from '@/integrations/providers';
import { setSecret, deleteSecret } from '@/lib/secureStore';
import { newId } from '@/lib/id';
import { successFeedback, tapFeedback } from '@/lib/haptics';
import type { Connection } from '@/db/types';

const GITHUB_FILTERS = ['assigned', 'created', 'mentioned', 'all'];

export default function ProviderScreen() {
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const type = (params.type as ProviderType) ?? 'todoist';
  const meta = PROVIDERS[type] ?? PROVIDERS.todoist;

  const user = useAuth((s) => s.user);
  const connections = useStore((s) => s.connections);
  const addConnection = useStore((s) => s.addConnection);
  const updateConnection = useStore((s) => s.updateConnection);
  const deleteConnection = useStore((s) => s.deleteConnection);
  const setSyncedTasks = useStore((s) => s.setSyncedTasksForConnection);

  const editing = useMemo(
    () => (params.id ? connections.find((c) => c.id === params.id) ?? null : null),
    [params.id, connections],
  );

  const [token, setToken] = useState('');
  const [databaseId, setDatabaseId] = useState(editing?.extra?.databaseId ?? '');
  const [filter, setFilter] = useState(editing?.extra?.filter ?? 'assigned');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connId = editing?.id ?? newId();

  const onSave = async () => {
    setError(null);
    if (!editing && !token.trim()) {
      setError(`Enter your ${meta.tokenLabel}.`);
      return;
    }
    if (type === 'notion' && !databaseId.trim()) {
      setError('Enter your Notion database ID.');
      return;
    }
    setBusy(true);
    const extra: Record<string, string> = {};
    if (type === 'notion') extra.databaseId = databaseId.trim();
    if (type === 'github') extra.filter = filter;

    const conn: Connection = {
      id: connId,
      type,
      name: meta.label,
      baseUrl: '',
      authMethod: 'bearer',
      apiKeyHeader: null,
      tasksPath: '',
      resultsPath: null,
      map: { id: 'id', title: 'title', status: null, assignee: null },
      assigneeFilter: null,
      extra,
      createdAt: editing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    // Validate the token by fetching FIRST. The token must be in secure
    // storage for the fetch; if validation fails we roll it back so nothing
    // is half-saved (and retrying can't create a duplicate connection).
    if (token.trim()) await setSecret(connId, token.trim());
    const result = await fetchTasksForConnection(conn);
    if (!result.ok) {
      if (token.trim() && !editing) await deleteSecret(connId);
      setBusy(false);
      setError(result.error ?? 'Could not reach the service. Check your token and try again.');
      return;
    }

    // Validated — now persist the connection and its tasks.
    if (editing) await updateConnection(connId, conn);
    else await addConnection(conn);
    await setSyncedTasks(connId, result.tasks);
    setBusy(false);
    successFeedback();
    router.back();
  };

  const onDelete = () => {
    if (!editing) return;
    const doDelete = async () => {
      await deleteConnection(editing.id);
      await deleteSecret(editing.id);
      router.back();
    };
    if (Platform.OS === 'web') doDelete();
    else
      Alert.alert('Disconnect?', `Remove the ${meta.label} connection?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: doDelete },
      ]);
  };

  if (isSupabaseConfigured && !user) return <SignInRequired />;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-surface">
      <View className="w-full flex-1 self-center" style={{ maxWidth: 560 }}>
        <View className="h-16 flex-row items-center justify-between border-b border-outline-variant px-md">
          <Pressable onPress={() => router.back()} className="py-xs transition-opacity hover:opacity-90 active:opacity-70">
            <Text className="font-sans-medium text-body-md text-on-surface-variant">Cancel</Text>
          </Pressable>
          <Text className="font-sans-semibold text-body-md text-on-surface">
            {editing ? `Edit ${meta.label}` : `Connect ${meta.label}`}
          </Text>
          <Pressable onPress={onSave} disabled={busy} className="py-xs transition-opacity hover:opacity-90 active:opacity-70">
            {busy ? (
              <ActivityIndicator size="small" color="#142175" />
            ) : (
              <Text className="font-sans-bold text-body-md text-primary">Save</Text>
            )}
          </Pressable>
        </View>

        <KeyboardAwareScroll contentContainerClassName="p-lg gap-lg">
          <View className="flex-row items-center gap-sm">
            <View className="h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: meta.color }}>
              <MaterialIcons name={meta.icon as keyof typeof MaterialIcons.glyphMap} size={26} color="#ffffff" />
            </View>
            <Text className="flex-1 font-sans text-body-sm text-on-surface-variant">{meta.help}</Text>
          </View>

          <View className="gap-xs">
            <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
              {meta.tokenLabel}
            </Text>
            <TextInput
              value={token}
              onChangeText={setToken}
              placeholder={editing ? 'Leave blank to keep current token' : 'Paste your token'}
              placeholderTextColor="#767682"
              autoCapitalize="none"
              secureTextEntry
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-sm font-sans text-body-md text-on-surface"
            />
            <Text className="font-sans text-label-md text-on-surface-variant">{meta.tokenHint}</Text>
          </View>

          {type === 'notion' ? (
            <View className="gap-xs">
              <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
                Database ID
              </Text>
              <TextInput
                value={databaseId}
                onChangeText={setDatabaseId}
                placeholder="32-char id from the database URL"
                placeholderTextColor="#767682"
                autoCapitalize="none"
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-sm font-sans text-body-md text-on-surface"
              />
            </View>
          ) : null}

          {type === 'github' ? (
            <View className="gap-xs">
              <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
                Which issues
              </Text>
              <View className="flex-row flex-wrap gap-xs">
                {GITHUB_FILTERS.map((f) => {
                  const sel = filter === f;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => {
                        tapFeedback();
                        setFilter(f);
                      }}
                      className={`rounded-full border px-sm py-xs transition-colors hover:bg-surface-container-low active:opacity-70 ${
                        sel ? 'border-primary bg-primary-fixed' : 'border-outline-variant bg-surface-container-lowest'
                      }`}>
                      <Text className={`font-sans-medium text-body-sm ${sel ? 'text-on-primary-fixed' : 'text-on-surface'}`}>
                        {f}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {Platform.OS === 'web' && type !== 'github' ? (
            <Text className="font-sans text-label-md text-on-surface-variant">
              Note: {meta.label} may block browser requests. If it fails here, it works in the mobile app.
            </Text>
          ) : null}

          {error ? <Text className="font-sans-medium text-body-sm text-error">{error}</Text> : null}

          {editing ? (
            <Pressable
              onPress={onDelete}
              className="mt-sm flex-row items-center justify-center gap-xs rounded-lg border border-error py-sm transition-opacity hover:opacity-90 active:opacity-70">
              <MaterialIcons name="link-off" size={20} color="#ba1a1a" />
              <Text className="font-sans-medium text-body-md text-error">Disconnect</Text>
            </Pressable>
          ) : null}
        </KeyboardAwareScroll>
      </View>
    </SafeAreaView>
  );
}
