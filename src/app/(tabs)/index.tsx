import { View, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';

export default function TimerScreen() {
  return (
    <Screen>
      <AppHeader />
      <View className="flex-1 items-center justify-center gap-md px-lg">
        <View className="h-64 w-64 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest">
          <Text className="font-mono text-timer text-on-surface">0:00:00</Text>
        </View>
        <View className="w-full max-w-sm rounded-lg bg-secondary py-sm">
          <Text className="text-center font-sans-bold text-headline-sm text-on-secondary">
            Start
          </Text>
        </View>
      </View>
    </Screen>
  );
}
