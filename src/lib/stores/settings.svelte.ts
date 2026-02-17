import { ViewConfig, defaultKeyBindings } from '$lib/view/constants';
import type { KeyBindings } from '$lib/types';

export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface AppSettings {
  viewMode: 'map' | 'tabular';
  animationsEnabled: boolean;
  renderMapLabels: boolean;
  zoomSensitivity: number;
  keyBindings: KeyBindings;
  isHighContrast: boolean;
  fontSize: FontSize;
}

export const FONT_SIZE_MAP: Record<string, string> = {
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
};

const defaultAppSettings: AppSettings = {
  viewMode: 'map',
  animationsEnabled: true,
  renderMapLabels: true,
  zoomSensitivity: ViewConfig.ZOOM_SENSITIVITY_DEFAULT,
  keyBindings: defaultKeyBindings,
  isHighContrast: false,
  fontSize: 'base',
};

const STORAGE_KEY = 'blackout-settings';

function loadSettings(): AppSettings {
  if (typeof localStorage === 'undefined') return { ...defaultAppSettings };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaultAppSettings };
    return { ...defaultAppSettings, ...JSON.parse(stored) };
  } catch {
    return { ...defaultAppSettings };
  }
}

function saveSettings(s: AppSettings) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* ignore quota errors */ }
}

function createSettingsState() {
  let current = $state<AppSettings>(loadSettings());

  function update(patch: Partial<AppSettings>) {
    current = { ...current, ...patch };
    saveSettings(current);
  }

  return {
    get current() { return current; },
    /** Button variant that respects high-contrast mode. */
    get hcVariant(): "outline" | "secondary" {
      return current.isHighContrast ? "outline" : "secondary";
    },
    update,
  };
}

export const settings = createSettingsState();
