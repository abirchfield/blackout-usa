import { writable } from 'svelte/store';
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

function createSettingsStore() {
  const { subscribe, update, set } = writable<AppSettings>({ ...defaultAppSettings });

  function updateSettings(patch: Partial<AppSettings>) {
    update(prev => ({ ...prev, ...patch }));
  }

  return {
    subscribe,
    set,
    update: updateSettings,
  };
}

export const settings = createSettingsStore();
