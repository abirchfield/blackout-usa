import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '../types';
import { defaultAppSettings, FONT_SIZE_MAP } from '../config';

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
