import { useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getColors } from '@/theme/colors';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export default function TabsLayout() {
  const scheme = useColorScheme();
  const c = getColors(scheme);

  const icon = (name: IconName) =>
    ({ color, size }: { color: string; size: number }) => (
      <MaterialIcons name={name} color={color} size={size} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.outlineVariant,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
        },
        sceneStyle: { backgroundColor: c.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Timer', tabBarIcon: icon('timer') }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: 'Tasks', tabBarIcon: icon('assignment') }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: icon('calendar-month') }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Stats', tabBarIcon: icon('dashboard') }}
      />
      <Tabs.Screen
        name="connect"
        options={{ title: 'Connect', tabBarIcon: icon('hub') }}
      />
    </Tabs>
  );
}
