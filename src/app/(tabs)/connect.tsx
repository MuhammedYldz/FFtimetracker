import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { AppHeader } from '@/components/AppHeader';

export default function ConnectScreen() {
  return (
    <Screen>
      <AppHeader title="Connect" />
      <View className="flex-1 items-center justify-center gap-sm px-lg">
        <MaterialIcons name="hub" size={40} color="#767682" />
        <Text className="font-sans-semibold text-headline-sm text-on-surface">Connect</Text>
        <Text className="text-center font-sans text-body-md text-on-surface-variant">
          Jira, Azure DevOps and Custom API integrations will be set up here.
        </Text>
      </View>
    </Screen>
  );
}
