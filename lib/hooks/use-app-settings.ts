/** Manages app-wide settings (high contrast, font size, view mode, keybindings).
 *  Syncs contrast class and font size to the document root. */
import { useState, useEffect, useCallback } from 'react';
import { ViewConfig } from '../config';
import { defaultKeyBindings, KeyBindings } from '../key-bindings';

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

const FONT_SIZE_MAP: Record<string, string> = {
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

export function useAppSettings(overrides?: Partial<AppSettings>) {
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...defaultAppSettings, ...overrides }));

  // Sync high-contrast class to document root
  useEffect(() => {
    const root = document.documentElement;
    if (settings.isHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [settings.isHighContrast]);

  // Sync font size to document root
  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[settings.fontSize] || '16px';
  }, [settings.fontSize]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  return { settings, updateSettings };
}
