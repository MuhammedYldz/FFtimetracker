import { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Full-height screen container with safe-area padding and app background. */
export function Screen({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className={`flex-1 ${className}`}>{children}</View>
    </SafeAreaView>
  );
}
