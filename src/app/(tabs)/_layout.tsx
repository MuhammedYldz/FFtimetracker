import { useWindowDimensions, type ColorValue } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getColors } from '@/theme/colors';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const c = getColors(colorScheme);
  const { width } = useWindowDimensions();
  const isWide = width >= 900; // desktop -> left sidebar

  const icon =
    (name: IconName) =>
    ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => (
      <MaterialIcons name={name} color={color} size={size} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.onSurfaceVariant,
        tabBarLabelPosition: isWide ? 'beside-icon' : 'below-icon',
        tabBarActiveBackgroundColor: isWide ? c.surfaceContainerLow : undefined,
        tabBarItemStyle: isWide
          ? { borderRadius: 12, marginHorizontal: 12, marginVertical: 2, height: 48, justifyContent: 'flex-start' }
          : undefined,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.outlineVariant,
          borderRightColor: c.outlineVariant,
          ...(isWide ? { width: 232, paddingTop: 16 } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: isWide ? 14 : 11,
        },
        sceneStyle: { backgroundColor: c.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Timer', tabBarIcon: icon('timer') }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: icon('assignment') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: icon('calendar-month') }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: icon('dashboard') }} />
      <Tabs.Screen name="connect" options={{ title: 'Connect', tabBarIcon: icon('hub') }} />
    </Tabs>
  );
}
