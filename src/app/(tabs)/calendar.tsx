import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';

export default function CalendarScreen() {
  return (
    <Screen>
      <AppHeader title="Calendar" />
      <View className="flex-1 items-center justify-center gap-sm px-lg">
        <MaterialIcons name="calendar-month" size={40} color="#767682" />
        <Text className="font-sans-semibold text-headline-sm text-on-surface">Calendar</Text>
        <Text className="text-center font-sans text-body-md text-on-surface-variant">
          A month view of your tracked time is coming here.
        </Text>
      </View>
    </Screen>
  );
}
