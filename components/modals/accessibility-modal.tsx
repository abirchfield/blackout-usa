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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { KeybindSettings } from "@/components/modals/keybind-settings";
import { ViewConfig } from "@/lib/config";
import { defaultKeyBindings } from "@/lib/key-bindings";
import { AppSettings, FontSize } from "@/lib/types";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accessibility Settings</DialogTitle>
          <DialogDescription>
            Adjust display settings for a better experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4 max-h-[65vh] overflow-y-auto pr-4 -mr-4">
          {/* General Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">General</h3>
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
              <Label htmlFor="theme-select-modal" className="text-base font-normal">
                Color Theme
              </Label>
              <Select value={theme} onValueChange={(value) => setTheme(value)}>
                <SelectTrigger id="theme-select-modal" className="w-[180px] justify-self-end">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
              <Label htmlFor="font-size-select-modal" className="text-base font-normal">
                Font Size
              </Label>
              <Select value={fontSize} onValueChange={(value: FontSize) => onSettingsChange({ fontSize: value })}>
                <SelectTrigger id="font-size-select-modal" className="w-[180px] justify-self-end">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="base">Default</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                  <SelectItem value="xl">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
              <Label htmlFor="high-contrast-toggle-modal" className="text-base font-normal">
                High Contrast Mode
              </Label>
              <Switch
                id="high-contrast-toggle-modal"
                checked={isHighContrast}
                onCheckedChange={(checked) => onSettingsChange({ isHighContrast: checked })}
                className="justify-self-end"
              />
            </div>
          </div>

          {/* Electric Grid Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Electric Grid</h3>
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
              <Label htmlFor="view-mode-select" className="text-base font-normal">
                Display Mode
              </Label>
              <Select value={viewMode} onValueChange={(value: 'map' | 'tabular') => onSettingsChange({ viewMode: value })}>
                <SelectTrigger id="view-mode-select" className="w-[180px] justify-self-end">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="map">Map</SelectItem>
                  <SelectItem value="tabular">Tabular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
              <Label htmlFor="animations-toggle-modal" className="text-base font-normal" aria-disabled={isTabular}>
                Enable Animations
              </Label>
              <Switch
                id="animations-toggle-modal"
                checked={animationsEnabled}
                onCheckedChange={(checked) => onSettingsChange({ animationsEnabled: checked })}
                disabled={isTabular}
                className="justify-self-end"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
              <Label htmlFor="map-labels-toggle-modal" className="text-base font-normal" aria-disabled={isTabular}>
                Show Map Labels
              </Label>
              <Switch
                id="map-labels-toggle-modal"
                checked={renderMapLabels}
                onCheckedChange={(checked) => onSettingsChange({ renderMapLabels: checked })}
                disabled={isTabular}
                className="justify-self-end"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
              <Label htmlFor="zoom-sensitivity-slider" className="text-base font-normal" aria-disabled={isTabular}>
                Zoom Sensitivity
              </Label>
              <div className="flex items-center gap-2 w-[180px] justify-self-end">
                <Slider
                  id="zoom-sensitivity-slider"
                  min={ViewConfig.ZOOM_SENSITIVITY_MIN}
                  max={ViewConfig.ZOOM_SENSITIVITY_MAX}
                  step={ViewConfig.ZOOM_SENSITIVITY_STEP}
                  value={[zoomSensitivity]}
                  onValueChange={(value) => onSettingsChange({ zoomSensitivity: value[0] })}
                  disabled={isTabular}
                  aria-label="Zoom speed"
                />
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Section */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Keyboard Shortcuts</h3>
              <Button variant="secondary" onClick={() => onSettingsChange({ keyBindings: defaultKeyBindings })}>Reset to Defaults</Button>
            </div>
            <KeybindSettings bindings={keyBindings} onBindingsChange={(bindings) => onSettingsChange({ keyBindings: bindings })} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
