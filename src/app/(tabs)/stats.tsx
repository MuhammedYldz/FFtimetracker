import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';

export default function StatsScreen() {
  return (
    <Screen>
      <AppHeader title="Stats" />
      <View className="flex-1 items-center justify-center gap-sm px-lg">
        <MaterialIcons name="dashboard" size={40} color="#767682" />
        <Text className="font-sans-semibold text-headline-sm text-on-surface">Dashboard</Text>
        <Text className="text-center font-sans text-body-md text-on-surface-variant">
          Totals and breakdowns of your tracked time appear here.
        </Text>
      </View>
    </Screen>
  );
}
