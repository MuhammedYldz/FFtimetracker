import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';

export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'ff:themePref:v1';

interface ThemeState {
  pref: ThemePref;
  init: () => Promise<void>;
  setPref: (pref: ThemePref) => Promise<void>;
}

/** App-wide light/dark/system preference, persisted across launches. */
export const useTheme = create<ThemeState>((set) => ({
  pref: 'system',
  init: async () => {
    const saved = (await AsyncStorage.getItem(KEY)) as ThemePref | null;
    const pref = saved ?? 'system';
    colorScheme.set(pref);
    set({ pref });
  },
  setPref: async (pref) => {
    colorScheme.set(pref);
    set({ pref });
    await AsyncStorage.setItem(KEY, pref);
  },
}));
