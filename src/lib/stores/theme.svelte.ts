export type Theme = 'light' | 'dark' | 'system';

function getInitialTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'dark';
  return (localStorage.getItem('theme') as Theme) || 'dark';
}

function createThemeState() {
  let current = $state<Theme>(getInitialTheme());
  let systemDark = $state(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => { systemDark = e.matches; });
  }

  const resolved = $derived.by(() => {
    if (current !== 'system') return current;
    return systemDark ? 'dark' as const : 'light' as const;
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
