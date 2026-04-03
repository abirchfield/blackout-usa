import { MediaQuery } from 'svelte/reactivity';

export type Theme = 'light' | 'dark' | 'system';

function getInitialTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system';
  return (localStorage.getItem('theme') as Theme) || 'system';
}

const prefDark = typeof window !== 'undefined'
  ? new MediaQuery('(prefers-color-scheme: dark)')
  : null;

function createThemeState() {
  let current = $state<Theme>(getInitialTheme());

  const resolved = $derived.by(() => {
    if (current !== 'system') return current;
    const isDark = prefDark?.current ?? true;
    return isDark ? 'dark' as const : 'light' as const;
  });

  return {
    get current() { return current; },
    set current(value: Theme) {
      current = value;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', value);
      }
    },
    get resolved() { return resolved; },
  };
}

/** Singleton theme state with system preference detection and localStorage persistence. */
export const theme = createThemeState();
