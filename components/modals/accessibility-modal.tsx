"use client";

import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { KeybindSettings } from "@/components/modals/keybind-settings";
import { ViewConfig } from "@/lib/config";
import { defaultKeyBindings } from "@/lib/key-bindings";
import { AppSettings, FontSize } from "@/lib/hooks/use-app-settings";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

// Reusable setting row component for consistent styling
interface SettingRowProps {
  label: string;
  description?: string;
  htmlFor?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function SettingRow({ label, description, htmlFor, disabled, children }: SettingRowProps) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg transition-colors hover:bg-accent/50",
      disabled && "opacity-60"
    )}>
      <div className="flex-1 min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-medium cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

interface AccessibilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
}

export function AccessibilityModal({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: AccessibilityModalProps) {
  const { theme, setTheme } = useTheme();
  const { viewMode, animationsEnabled, renderMapLabels, keyBindings, zoomSensitivity, fontSize, isHighContrast } = settings;
  const isTabular = viewMode === 'tabular';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="accessibility-modal" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your experience with display and accessibility options.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4 max-h-[65vh] overflow-y-auto -mx-6 px-6">
          {/* Display Section */}
          <section className="space-y-1">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">Display</h3>
              <p className="text-xs text-muted-foreground">Customize colors, contrast, and text size</p>
            </div>
            <div className="space-y-0.5 rounded-lg border bg-card/50 p-1">
              <SettingRow label="Color Theme" description="Light, dark, or match system" htmlFor="theme-select-modal">
                <Select value={theme} onValueChange={(value) => setTheme(value)}>
                  <SelectTrigger id="theme-select-modal" className="w-32">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Font Size" description="Adjust text size across the app" htmlFor="font-size-select-modal">
                <Select value={fontSize} onValueChange={(value: FontSize) => onSettingsChange({ fontSize: value })}>
                  <SelectTrigger id="font-size-select-modal" className="w-32">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">Small</SelectItem>
                    <SelectItem value="base">Default</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                    <SelectItem value="xl">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="High Contrast" description="Increase visual distinction" htmlFor="high-contrast-toggle-modal">
                <Switch
                  id="high-contrast-toggle-modal"
                  checked={isHighContrast}
                  onCheckedChange={(checked) => onSettingsChange({ isHighContrast: checked })}
                />
              </SettingRow>
            </div>
          </section>

          {/* Grid View Section */}
          <section className="space-y-1">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">Grid View</h3>
              <p className="text-xs text-muted-foreground">Configure how the power grid is displayed</p>
            </div>
            <div className="space-y-0.5 rounded-lg border bg-card/50 p-1">
              <SettingRow label="Display Mode" description="Interactive map or data tables" htmlFor="view-mode-select">
                <Select value={viewMode} onValueChange={(value: 'map' | 'tabular') => onSettingsChange({ viewMode: value })}>
                  <SelectTrigger id="view-mode-select" className="w-32">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="map">Map</SelectItem>
                    <SelectItem value="tabular">Tabular</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Animations" description="Animated power flow on lines" htmlFor="animations-toggle-modal" disabled={isTabular}>
                <Switch
                  id="animations-toggle-modal"
                  checked={animationsEnabled}
                  onCheckedChange={(checked) => onSettingsChange({ animationsEnabled: checked })}
                  disabled={isTabular}
                />
              </SettingRow>
              <SettingRow label="Map Labels" description="Show substation names on map" htmlFor="map-labels-toggle-modal" disabled={isTabular}>
                <Switch
                  id="map-labels-toggle-modal"
                  checked={renderMapLabels}
                  onCheckedChange={(checked) => onSettingsChange({ renderMapLabels: checked })}
                  disabled={isTabular}
                />
              </SettingRow>
              <SettingRow label="Zoom Speed" description="Mouse wheel sensitivity" htmlFor="zoom-sensitivity-slider" disabled={isTabular}>
                <div className="flex items-center gap-2 w-32">
                  <Slider
                    id="zoom-sensitivity-slider"
                    min={ViewConfig.ZOOM_SENSITIVITY_MIN}
                    max={ViewConfig.ZOOM_SENSITIVITY_MAX}
                    step={ViewConfig.ZOOM_SENSITIVITY_STEP}
                    value={[zoomSensitivity]}
                    onValueChange={(value) => onSettingsChange({ zoomSensitivity: value[0] })}
                    disabled={isTabular}
                    aria-label="Zoom speed"
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-6 text-right tabular-nums font-mono">
                    {zoomSensitivity.toFixed(1)}
                  </span>
                </div>
              </SettingRow>
            </div>
          </section>

          {/* Keyboard Shortcuts Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Keyboard Shortcuts</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSettingsChange({ keyBindings: defaultKeyBindings })}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1.5" />
                Reset
              </Button>
            </div>
            <KeybindSettings
              bindings={keyBindings}
              onBindingsChange={(bindings) => onSettingsChange({ keyBindings: bindings })}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
