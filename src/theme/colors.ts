// Hex mirrors of the Material 3 tokens in global.css, for use in places that
// can't take NativeWind classes (navigation chrome, status bar, charts).

export const lightColors = {
  background: '#f7f9fb',
  surface: '#f7f9fb',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f4f6',
  surfaceContainer: '#eceef0',
  surfaceContainerHigh: '#e6e8ea',
  surfaceVariant: '#e0e3e5',
  onSurface: '#191c1e',
  onSurfaceVariant: '#454651',
  primary: '#142175',
  onPrimary: '#ffffff',
  secondary: '#006a61',
  tertiary: '#0e009d',
  error: '#ba1a1a',
  outline: '#767682',
  outlineVariant: '#c6c5d3',
};

export const darkColors: typeof lightColors = {
  background: '#111418',
  surface: '#111418',
  surfaceContainerLowest: '#0c0f12',
  surfaceContainerLow: '#191c20',
  surfaceContainer: '#1d2024',
  surfaceContainerHigh: '#272a2e',
  surfaceVariant: '#454651',
  onSurface: '#e2e2e9',
  onSurfaceVariant: '#c6c5d3',
  primary: '#bcc3ff',
  onPrimary: '#000d60',
  secondary: '#6bd8cb',
  tertiary: '#c0c1ff',
  error: '#ffb4ab',
  outline: '#90909c',
  outlineVariant: '#454651',
};

export type AppColors = typeof lightColors;

export function getColors(scheme: string | null | undefined): AppColors {
  return scheme === 'dark' ? darkColors : lightColors;
}
