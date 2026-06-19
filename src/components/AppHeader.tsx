import { View, Text } from 'react-native';

/** Top app bar with the FocusFlow wordmark and an optional title/right slot. */
export function AppHeader({
  title,
  right,
}: {
  title?: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="h-16 flex-row items-center justify-between border-b border-outline-variant bg-surface px-md">
      <Text className="font-sans-bold text-headline-sm text-primary">FocusFlow</Text>
      {title ? (
        <Text className="font-sans-semibold text-body-md text-on-surface">{title}</Text>
      ) : null}
      <View className="min-w-[40px] items-end">{right}</View>
    </View>
  );
}
