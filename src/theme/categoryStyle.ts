import type { MaterialIcons } from '@expo/vector-icons';

/** Tag color swatches for categories. */
export const CATEGORY_COLORS = [
  '#006a61', // teal
  '#142175', // indigo
  '#1565c0', // blue
  '#0e009d', // violet
  '#6750a4', // purple
  '#b3261e', // red
  '#e65100', // orange
  '#f9a825', // amber
  '#2e7d32', // green
  '#00838f', // cyan
  '#5d4037', // brown
  '#455a64', // slate
];

/** Curated MaterialIcons names for categories. */
export const CATEGORY_ICONS: (keyof typeof MaterialIcons.glyphMap)[] = [
  'code',
  'fact-check',
  'groups',
  'rate-review',
  'bug-report',
  'description',
  'support-agent',
  'design-services',
  'science',
  'phone',
  'email',
  'event',
  'school',
  'build',
  'lightbulb',
  'work',
];
