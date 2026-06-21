import { Platform } from 'react-native';

/**
 * URL that Supabase confirmation / password-reset emails redirect back to.
 * Production sets EXPO_PUBLIC_APP_URL (the GitHub Pages app URL, incl. base
 * path). Locally we fall back to the current web origin. Native links route
 * through the web app, which completes confirmation and recovery.
 */
export function getRedirectUrl(): string {
  const configured = process.env.EXPO_PUBLIC_APP_URL;
  if (configured) return configured;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin + '/';
  }
  return 'focusflow://';
}
