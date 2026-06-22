import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from 'react-native';

/**
 * A ScrollView that lifts its content above the on-screen keyboard so focused
 * inputs are never hidden. Drop-in replacement for ScrollView in form screens.
 */
export function KeyboardAwareScroll(props: ScrollViewProps) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" {...props} />
    </KeyboardAvoidingView>
  );
}
