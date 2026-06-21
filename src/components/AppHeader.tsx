import { View, Text } from 'react-native';
import { Logo } from './Logo';

/** Top app bar with the FocusFlow brand lockup and an optional title/right slot. */
export function AppHeader({
  title,
  right,
}: {
  title?: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="h-16 flex-row items-center justify-between border-b border-outline-variant bg-surface px-md">
      <Logo size={30} />
      {title ? (
        <Text className="font-display text-body-md text-on-surface">{title}</Text>
      ) : null}
      <View className="min-w-[40px] items-end">{right}</View>
    </View>
  );
}
