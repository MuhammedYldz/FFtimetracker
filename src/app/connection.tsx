import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useAuth, isSupabaseConfigured } from '@/store/useAuth';
import { SignInRequired } from '@/components/SignInRequired';
import { newId } from '@/lib/id';
import { setSecret, deleteSecret } from '@/lib/secureStore';
import { fetchCustomTasks } from '@/integrations/customApi';
import { successFeedback } from '@/lib/haptics';
import type { AuthMethod, Connection } from '@/db/types';

const AUTH_OPTIONS: { value: AuthMethod; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'bearer', label: 'Bearer token' },
  { value: 'api_key', label: 'API key' },
  { value: 'basic', label: 'Basic' },
];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences';
  secureTextEntry?: boolean;
}) {
  return (
    <View className="gap-xs">
      <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#767682"
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
        className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-sm font-sans text-body-md text-on-surface"
      />
    </View>
  );
}

export default function ConnectionScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const user = useAuth((s) => s.user);
  const connections = useStore((s) => s.connections);
  const addConnection = useStore((s) => s.addConnection);
  const updateConnection = useStore((s) => s.updateConnection);
  const deleteConnection = useStore((s) => s.deleteConnection);
  const setSyncedTasksForConnection = useStore((s) => s.setSyncedTasksForConnection);

  const editing = useMemo(
    () => (params.id ? connections.find((c) => c.id === params.id) ?? null : null),
    [params.id, connections],
  );
  const generatedId = useMemo(() => newId(), []);
  const connId = editing?.id ?? generatedId;

  const [name, setName] = useState(editing?.name ?? 'My API');
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? '');
  const [tasksPath, setTasksPath] = useState(editing?.tasksPath ?? '/tasks');
  const [resultsPath, setResultsPath] = useState(editing?.resultsPath ?? '');
  const [authMethod, setAuthMethod] = useState<AuthMethod>(editing?.authMethod ?? 'none');
  const [apiKeyHeader, setApiKeyHeader] = useState(editing?.apiKeyHeader ?? 'X-API-Key');
  const [secret, setSecretValue] = useState('');
  const [mapId, setMapId] = useState(editing?.map.id ?? 'id');
  const [mapTitle, setMapTitle] = useState(editing?.map.title ?? 'title');
  const [mapStatus, setMapStatus] = useState(editing?.map.status ?? 'status');
  const [mapAssignee, setMapAssignee] = useState(editing?.map.assignee ?? '');
  const [assigneeFilter, setAssigneeFilter] = useState(editing?.assigneeFilter ?? '');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const buildConnection = (): Connection => ({
    id: connId,
    type: 'custom',
    name: name.trim() || 'My API',
    baseUrl: baseUrl.trim(),
    authMethod,
    apiKeyHeader: authMethod === 'api_key' ? apiKeyHeader.trim() || 'X-API-Key' : null,
    tasksPath: tasksPath.trim() || '/',
    resultsPath: resultsPath.trim() || null,
    map: {
      id: mapId.trim() || 'id',
      title: mapTitle.trim() || 'title',
      status: mapStatus.trim() || null,
      assignee: mapAssignee.trim() || null,
    },
    assigneeFilter: assigneeFilter.trim() || null,
    extra: editing?.extra ?? null,
    createdAt: editing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });

  const persistSecret = async () => {
    if (authMethod === 'none') {
      await deleteSecret(connId);
    } else if (secret) {
      await setSecret(connId, secret);
    }
  };

  const onTest = async () => {
    setError(null);
    setInfo(null);
    if (!baseUrl.trim()) {
      setError('Enter the base URL first.');
      return;
    }
    setBusy(true);
    await persistSecret();
    const conn = buildConnection();
    const result = await fetchCustomTasks(conn);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Could not fetch tasks.');
    } else {
      setInfo(`Success — found ${result.tasks.length} task${result.tasks.length === 1 ? '' : 's'}.`);
    }
  };

  const onSave = async () => {
    setError(null);
    if (!baseUrl.trim()) {
      setError('Enter the base URL.');
      return;
    }
    setBusy(true);
    await persistSecret();
    const conn = buildConnection();
    if (editing) await updateConnection(conn.id, conn);
    else await addConnection(conn);
    // Pull tasks now so they appear in the picker immediately.
    const result = await fetchCustomTasks(conn);
    if (result.ok) await setSyncedTasksForConnection(conn.id, result.tasks);
    setBusy(false);
    successFeedback();
    router.back();
  };

  const onDelete = () => {
    if (!editing) return;
    const doDelete = async () => {
      await deleteSecret(editing.id);
      await deleteConnection(editing.id);
      router.back();
    };
    if (Platform.OS === 'web') doDelete();
    else
      Alert.alert('Remove connection?', 'Synced tasks from it will be removed.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
  };

  if (isSupabaseConfigured && !user) return <SignInRequired />;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-surface">
      <View className="w-full flex-1 self-center" style={{ maxWidth: 640 }}>
      <View className="h-16 flex-row items-center justify-between border-b border-outline-variant px-md">
        <Pressable onPress={() => router.back()} className="py-xs transition-opacity hover:opacity-90 active:opacity-70">
          <Text className="font-sans-medium text-body-md text-on-surface-variant">Cancel</Text>
        </Pressable>
        <Text className="font-sans-semibold text-body-md text-on-surface">
          {editing ? 'Edit Custom API' : 'Custom API'}
        </Text>
        <Pressable onPress={onSave} disabled={busy} className="py-xs transition-opacity hover:opacity-90 active:opacity-70">
          <Text className="font-sans-bold text-body-md text-primary">Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="p-lg gap-md" keyboardShouldPersistTaps="handled">
        <Field label="Name" value={name} onChangeText={setName} placeholder="My company API" autoCapitalize="sentences" />
        <Field label="Base URL" value={baseUrl} onChangeText={setBaseUrl} placeholder="https://api.example.com" />
        <Field label="Fetch tasks path" value={tasksPath} onChangeText={setTasksPath} placeholder="/tasks" />
        <Field
          label="Results path (optional)"
          value={resultsPath}
          onChangeText={setResultsPath}
          placeholder="e.g. data  (leave blank if the response is a plain array)"
        />

        {/* Auth */}
        <View className="gap-xs">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Authentication
          </Text>
          <View className="flex-row flex-wrap gap-xs">
            {AUTH_OPTIONS.map((o) => {
              const sel = authMethod === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => setAuthMethod(o.value)}
                  className={`rounded-full border px-sm py-xs transition-opacity hover:opacity-90 active:opacity-70 ${
                    sel ? 'border-primary bg-primary-fixed' : 'border-outline-variant bg-surface-container-lowest'
                  }`}>
                  <Text className="font-sans-medium text-body-sm text-on-surface">{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {authMethod === 'api_key' ? (
          <Field label="Header name" value={apiKeyHeader} onChangeText={setApiKeyHeader} placeholder="X-API-Key" />
        ) : null}
        {authMethod !== 'none' ? (
          <Field
            label={authMethod === 'basic' ? 'Secret (user:password)' : 'Secret'}
            value={secret}
            onChangeText={setSecretValue}
            placeholder={editing ? '•••••• (leave blank to keep)' : 'token or key'}
            secureTextEntry
          />
        ) : null}

        {/* Field mapping */}
        <View className="gap-sm border-t border-outline-variant pt-md">
          <Text className="font-sans-semibold text-body-md text-on-surface">Field mapping</Text>
          <Text className="font-sans text-body-sm text-on-surface-variant">
            Which JSON fields map to each task property. Dot paths allowed (e.g. fields.summary).
          </Text>
          <Field label="Task ID field" value={mapId} onChangeText={setMapId} placeholder="id" />
          <Field label="Title field" value={mapTitle} onChangeText={setMapTitle} placeholder="title" />
          <Field label="Status field (optional)" value={mapStatus} onChangeText={setMapStatus} placeholder="status" />
          <Field label="Assignee field (optional)" value={mapAssignee} onChangeText={setMapAssignee} placeholder="assignee" />
          <Field
            label="Only show assignee (optional)"
            value={assigneeFilter}
            onChangeText={setAssigneeFilter}
            placeholder="e.g. your username — leave blank for all"
          />
        </View>

        {error ? <Text className="font-sans-medium text-body-sm text-error">{error}</Text> : null}
        {info ? <Text className="font-sans-medium text-body-sm text-secondary">{info}</Text> : null}

        <Pressable
          onPress={onTest}
          disabled={busy}
          className="flex-row items-center justify-center gap-xs rounded-lg border border-primary py-sm transition-opacity hover:opacity-90 active:opacity-70">
          {busy ? <ActivityIndicator color="#142175" size="small" /> : null}
          <Text className="font-sans-medium text-body-md text-primary">Test connection</Text>
        </Pressable>

        {editing ? (
          <Pressable
            onPress={onDelete}
            className="flex-row items-center justify-center gap-xs rounded-lg border border-error py-sm transition-opacity hover:opacity-90 active:opacity-70">
            <Text className="font-sans-medium text-body-md text-error">Remove connection</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}
