import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { successFeedback } from '@/lib/haptics';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const signIn = useAuth((s) => s.signIn);
  const signUp = useAuth((s) => s.signUp);
  const sendPasswordReset = useAuth((s) => s.sendPasswordReset);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    const e = email.trim();
    if (!e || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    if (mode === 'signin') {
      const { error } = await signIn(e, password);
      setBusy(false);
      if (error) return setError(error);
      successFeedback();
      router.back();
    } else {
      const { error, needsConfirmation } = await signUp(e, password);
      setBusy(false);
      if (error) return setError(error);
      if (needsConfirmation) {
        setInfo('Check your email to confirm your account, then sign in.');
        setMode('signin');
      } else {
        successFeedback();
        router.back();
      }
    }
  };

  const forgotPassword = async () => {
    setError(null);
    setInfo(null);
    const e = email.trim();
    if (!e) {
      setError('Enter your email above first, then tap reset.');
      return;
    }
    setBusy(true);
    const { error } = await sendPasswordReset(e);
    setBusy(false);
    if (error) return setError(error);
    setInfo('If an account exists for that email, a reset link is on its way.');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-surface">
      <View className="w-full flex-1 self-center" style={{ maxWidth: 440 }}>
      <View className="h-16 flex-row items-center justify-between border-b border-outline-variant px-md">
        <Pressable onPress={() => router.back()} className="py-xs transition-opacity hover:opacity-90 active:opacity-70">
          <Text className="font-sans-medium text-body-md text-on-surface-variant">Cancel</Text>
        </Pressable>
        <Text className="font-sans-semibold text-body-md text-on-surface">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </Text>
        <View className="w-12" />
      </View>

      <View className="gap-lg p-lg">
        <View className="items-center gap-xs py-sm">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-fixed">
            <MaterialIcons name="cloud-sync" size={30} color="#142175" />
          </View>
          <Text className="text-center font-sans text-body-md text-on-surface-variant">
            Back up your time and sync across devices. Your data stays private to you.
          </Text>
        </View>

        <View className="gap-xs">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
            placeholderTextColor="#767682"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-sm font-sans text-body-md text-on-surface"
          />
        </View>

        <View className="gap-xs">
          <Text className="font-sans-semibold text-label-md uppercase tracking-wider text-on-surface-variant">
            Password
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

        {error ? <Text className="font-sans-medium text-body-sm text-error">{error}</Text> : null}
        {info ? <Text className="font-sans-medium text-body-sm text-secondary">{info}</Text> : null}

        <Pressable
          onPress={submit}
          disabled={busy}
          className="flex-row items-center justify-center gap-xs rounded-lg bg-primary py-sm transition-opacity hover:opacity-90 active:opacity-80">
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="font-sans-bold text-body-md text-on-primary">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            setError(null);
            setInfo(null);
          }}
          className="items-center py-xs transition-opacity hover:opacity-90 active:opacity-70">
          <Text className="font-sans-medium text-body-sm text-primary">
            {mode === 'signin'
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>

        {mode === 'signin' ? (
          <Pressable
            onPress={forgotPassword}
            disabled={busy}
            className="items-center py-xs transition-opacity hover:opacity-90 active:opacity-70">
            <Text className="font-sans text-body-sm text-on-surface-variant">Forgot password?</Text>
          </Pressable>
        ) : null}
      </View>
      </View>
    </SafeAreaView>
  );
}
