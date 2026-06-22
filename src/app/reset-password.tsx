import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll';
import { successFeedback } from '@/lib/haptics';

export default function ResetPasswordScreen() {
  const updatePassword = useAuth((s) => s.updatePassword);
  const clearRecovery = useAuth((s) => s.clearRecovery);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) return setError(error);
    successFeedback();
    router.back();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-surface">
      <View className="w-full flex-1 self-center" style={{ maxWidth: 440 }}>
        <View className="h-16 flex-row items-center justify-between border-b border-outline-variant px-md">
          <Pressable
            onPress={() => {
              clearRecovery();
              router.back();
            }}
            className="py-xs transition-opacity hover:opacity-90 active:opacity-70">
            <Text className="font-sans-medium text-body-md text-on-surface-variant">Cancel</Text>
          </Pressable>
          <Text className="font-sans-semibold text-body-md text-on-surface">New password</Text>
          <View className="w-12" />
        </View>

        <KeyboardAwareScroll contentContainerClassName="gap-lg p-lg">
          <View className="items-center gap-xs py-sm">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-fixed">
              <MaterialIcons name="lock-reset" size={30} color="#142175" />
            </View>
            <Text className="text-center font-sans text-body-md text-on-surface-variant">
              Choose a new password for your account.
            </Text>
          </View>

          <View className="gap-xs">
            <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
              New password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 6 characters"
              placeholderTextColor="#767682"
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-sm font-sans text-body-md text-on-surface"
            />
          </View>

          <View className="gap-xs">
            <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
              Confirm password
            </Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="Re-enter password"
              placeholderTextColor="#767682"
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-sm font-sans text-body-md text-on-surface"
            />
          </View>

          {error ? <Text className="font-sans-medium text-body-sm text-error">{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={busy}
            className="flex-row items-center justify-center gap-xs rounded-lg bg-primary py-sm transition-opacity hover:opacity-90 active:opacity-80">
            {busy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-sans-bold text-body-md text-on-primary">Update password</Text>
            )}
          </Pressable>
        </KeyboardAwareScroll>
      </View>
    </SafeAreaView>
  );
}
