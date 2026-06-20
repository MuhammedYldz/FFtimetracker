import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Stores integration secrets (API keys / tokens) in the OS keychain on native
 * (iOS Keychain / Android Keystore). expo-secure-store has no web backend, so
 * the web build falls back to local storage — acceptable for a browser session.
 */

const WEB_PREFIX = 'ff:secret:';

function safeKey(id: string): string {
  // SecureStore keys allow only alphanumerics, ".", "-", "_".
  return `ffsec_${id.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

export async function setSecret(id: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(WEB_PREFIX + id, value);
    return;
  }
  await SecureStore.setItemAsync(safeKey(id), value);
}

export async function getSecret(id: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(WEB_PREFIX + id);
  }
  return SecureStore.getItemAsync(safeKey(id));
}

export async function deleteSecret(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(WEB_PREFIX + id);
    return;
  }
  await SecureStore.deleteItemAsync(safeKey(id));
}
