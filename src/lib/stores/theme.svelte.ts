export type Theme = 'light' | 'dark' | 'system';

function getInitialTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'dark';
  return (localStorage.getItem('theme') as Theme) || 'dark';
}

function createThemeState() {
  let current = $state<Theme>(getInitialTheme());

  const resolved = $derived.by(() => {
    if (current !== 'system') return current;
    if (typeof window === 'undefined') return 'dark' as const;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' as const : 'light' as const;
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

export const theme = createThemeState();
