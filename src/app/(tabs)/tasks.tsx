import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';

export default function TasksScreen() {
  return (
    <Screen>
      <AppHeader title="Tasks" />
      <View className="flex-1 items-center justify-center gap-sm px-lg">
        <MaterialIcons name="assignment" size={40} color="#767682" />
        <Text className="font-sans-semibold text-headline-sm text-on-surface">Tasks</Text>
        <Text className="text-center font-sans text-body-md text-on-surface-variant">
          Your categories and synced tasks will live here.
        </Text>
      </View>
    </Screen>
  );
}
