import { View, Text } from 'react-native';
import { Logo } from './Logo';

/** Top app bar: brand lockup on the left, page title + actions on the right. */
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
      <View className="flex-row items-center gap-md">
        {title ? (
          <Text className="font-display text-body-md text-on-surface">{title}</Text>
        ) : null}
        {right ? <View className="items-end">{right}</View> : null}
      </View>
    </View>
  );
}
