import { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Full-height screen container with safe-area padding and app background.
 * Content is centered in a max-width column so wide desktop screens use
 * whitespace gracefully instead of stretching edge-to-edge.
 */
export function Screen({
  children,
  className = '',
  maxWidth = 880,
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: number;
}) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className={`flex-1 w-full self-center ${className}`} style={{ maxWidth }}>
        {children}
      </View>
    </SafeAreaView>
  );
}
