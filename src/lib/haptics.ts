import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Light tap feedback; no-op on web. */
export function tapFeedback() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Success feedback (e.g. on stop/save); no-op on web. */
export function successFeedback() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
