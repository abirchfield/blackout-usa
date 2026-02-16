import { writable, derived } from 'svelte/store';

export type Theme = 'light' | 'dark' | 'system';

function getInitialTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'dark';
  return (localStorage.getItem('theme') as Theme) || 'dark';
}

function createThemeStore() {
  const { subscribe, set: rawSet, update } = writable<Theme>(getInitialTheme());

  function set(value: Theme) {
    rawSet(value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', value);
    }
  }

  function toggle() {
    update(current => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', next);
      }
      return next;
    });
  }

  return { subscribe, set, toggle };
}

export const theme = createThemeStore();

/** Resolved theme that accounts for 'system' preference. */
export const resolvedTheme = derived(theme, ($theme) => {
  if ($theme !== 'system') return $theme;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
});
