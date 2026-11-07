export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'atlas_theme';

/**
 * Resolves the initial theme:
 * 1. Saved preference in localStorage
 * 2. System preference via window.matchMedia
 * 3. Default to 'dark'
 */
export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch {
    // Ignore storage errors in sandboxed environments
  }
  return 'dark';
}

/**
 * Applies the theme to the DOM documentElement and syncs localStorage + meta tags.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.setAttribute('data-theme', theme);

  // Update theme-color meta tag for browser chrome and mobile UI
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', theme === 'dark' ? '#090C10' : '#F8FAFC');

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage write failure
  }

  // Dispatch custom event for reactive listeners across components
  window.dispatchEvent(new CustomEvent('atlas_theme_changed', { detail: { theme } }));
}

/**
 * Toggles current theme between light and dark.
 */
export function toggleTheme(): Theme {
  const current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

