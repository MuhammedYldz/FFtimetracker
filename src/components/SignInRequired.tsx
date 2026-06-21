import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { tapFeedback } from '@/lib/haptics';

/** Shown in place of integration setup when the user isn't signed in. */
export function SignInRequired({ message }: { message?: string }) {
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-surface">
      <View className="w-full flex-1 self-center" style={{ maxWidth: 440 }}>
        <View className="h-16 flex-row items-center justify-between border-b border-outline-variant px-md">
          <Pressable onPress={() => router.back()} className="py-xs transition-opacity hover:opacity-90 active:opacity-70">
            <Text className="font-sans-medium text-body-md text-on-surface-variant">Cancel</Text>
          </Pressable>
          <Text className="font-sans-semibold text-body-md text-on-surface">Sign in required</Text>
          <View className="w-12" />
        </View>

        <View className="flex-1 items-center justify-center gap-md px-lg">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-fixed">
            <MaterialIcons name="lock" size={30} color="#142175" />
          </View>
          <Text className="text-center font-sans text-body-md text-on-surface-variant">
            {message ?? 'Sign in to connect integrations so your connection is saved to your account.'}
          </Text>
          <Pressable
            onPress={() => {
              tapFeedback();
              router.replace('/auth');
            }}
            className="flex-row items-center justify-center gap-xs rounded-lg bg-primary px-lg py-sm transition-opacity hover:opacity-90 active:opacity-80">
            <Text className="font-sans-bold text-body-md text-on-primary">Sign in</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
