import type { Category } from './types';

/** Built-in work categories so a new user can track time with zero setup. */
export const DEFAULT_CATEGORIES: Omit<Category, 'createdAt'>[] = [
  { id: 'cat-development', name: 'Development', color: '#006a61', icon: 'code', isDefault: true, archived: false, source: 'local', externalId: null, sortOrder: 0 },
  { id: 'cat-testing', name: 'Testing', color: '#6750a4', icon: 'fact-check', isDefault: true, archived: false, source: 'local', externalId: null, sortOrder: 1 },
  { id: 'cat-meeting', name: 'Meeting', color: '#b3261e', icon: 'groups', isDefault: true, archived: false, source: 'local', externalId: null, sortOrder: 2 },
  { id: 'cat-code-review', name: 'Code Review', color: '#1565c0', icon: 'rate-review', isDefault: true, archived: false, source: 'local', externalId: null, sortOrder: 3 },
  { id: 'cat-bug-fixing', name: 'Bug Fixing', color: '#e65100', icon: 'bug-report', isDefault: true, archived: false, source: 'local', externalId: null, sortOrder: 4 },
  { id: 'cat-documentation', name: 'Documentation', color: '#5d4037', icon: 'description', isDefault: true, archived: false, source: 'local', externalId: null, sortOrder: 5 },
  { id: 'cat-support', name: 'Support', color: '#2e7d32', icon: 'support-agent', isDefault: true, archived: false, source: 'local', externalId: null, sortOrder: 6 },
];
