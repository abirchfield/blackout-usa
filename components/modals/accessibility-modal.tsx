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
import { KeyBindings, defaultKeyBindings } from "@/lib/key-bindings";

interface AccessibilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Game-specific settings
  viewMode?: 'canvas' | 'svg' | 'tabular';
  onViewModeChange?: (mode: 'canvas' | 'svg' | 'tabular') => void;
  animationsEnabled?: boolean;
  onAnimationsEnabledChange?: (enabled: boolean) => void;
  renderCanvasText?: boolean;
  onRenderCanvasTextChange?: (enabled: boolean) => void;
  keyBindings?: KeyBindings;
  onKeyBindingsChange?: (bindings: KeyBindings) => void;
  showDetailsInSidebar?: boolean;
  onShowDetailsInSidebarChange?: (enabled: boolean) => void;
  zoomSensitivity?: number;
  onZoomSensitivityChange?: (value: number) => void;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  onFontSizeChange?: (size: 'sm' | 'base' | 'lg' | 'xl') => void;
  isHighContrast?: boolean;
  onIsHighContrastChange?: (enabled: boolean) => void;
}

export function AccessibilityModal({
  open,
  onOpenChange,
  viewMode,
  onViewModeChange,
  animationsEnabled,
  onAnimationsEnabledChange,
  renderCanvasText,
  onRenderCanvasTextChange,
  keyBindings,
  onKeyBindingsChange,
  showDetailsInSidebar,
  onShowDetailsInSidebarChange,
  zoomSensitivity,
  onZoomSensitivityChange,
  fontSize,
  onFontSizeChange,
  isHighContrast,
  onIsHighContrastChange,
}: AccessibilityModalProps) {
  const { theme, setTheme } = useTheme();

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
            {fontSize !== undefined && onFontSizeChange && (
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
                <Label htmlFor="font-size-select-modal" className="text-base font-normal">
                  Font Size
                </Label>
                <Select value={fontSize} onValueChange={(value: 'sm' | 'base' | 'lg' | 'xl') => onFontSizeChange(value)}>
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
            )}
              {isHighContrast !== undefined && onIsHighContrastChange && (
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
                <Label htmlFor="high-contrast-toggle-modal" className="text-base font-normal">
                  High Contrast Mode
                </Label>
                <Switch
                  id="high-contrast-toggle-modal"
                  checked={isHighContrast}
                  onCheckedChange={onIsHighContrastChange}
                  className="justify-self-end"
                />
              </div>
              )}
          </div>

          {/* Electric Grid Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Electric Grid</h3>
            {viewMode !== undefined && onViewModeChange && (
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
                <Label htmlFor="view-mode-select" className="text-base font-normal">
                  Display Mode
                </Label>
                <Select value={viewMode} onValueChange={(value: 'canvas' | 'svg' | 'tabular') => onViewModeChange(value)}>
                  <SelectTrigger id="view-mode-select" className="w-[180px] justify-self-end">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="canvas">Canvas</SelectItem>
                    <SelectItem value="svg">SVG</SelectItem>
                    <SelectItem value="tabular">Tabular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {animationsEnabled !== undefined && onAnimationsEnabledChange && (
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
                <Label htmlFor="animations-toggle-modal" className="text-base font-normal" aria-disabled={viewMode === 'tabular'}>
                  Enable Animations
                </Label>
                <Switch
                  id="animations-toggle-modal"
                  checked={animationsEnabled}
                  onCheckedChange={onAnimationsEnabledChange}
                  disabled={viewMode === 'tabular'}
                  className="justify-self-end"
                />
              </div>
            )}
            {renderCanvasText !== undefined && onRenderCanvasTextChange && (
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
                <Label htmlFor="canvas-text-toggle-modal" className="text-base font-normal" aria-disabled={viewMode === 'tabular'}>
                  Show Map Labels
                </Label>
                <Switch
                  id="canvas-text-toggle-modal"
                  checked={renderCanvasText}
                  onCheckedChange={onRenderCanvasTextChange}
                  disabled={viewMode === 'tabular'}
                  className="justify-self-end"
                />
              </div>
            )}
            {zoomSensitivity !== undefined && onZoomSensitivityChange && (
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
                <Label htmlFor="zoom-sensitivity-slider" className="text-base font-normal" aria-disabled={viewMode === 'tabular'}>
                  Zoom Sensitivity
                </Label>
                <div className="flex items-center gap-2 w-[180px] justify-self-end">
                  <Slider
                    id="zoom-sensitivity-slider"
                    min={ViewConfig.ZOOM_SENSITIVITY_MIN}
                    max={ViewConfig.ZOOM_SENSITIVITY_MAX}
                    step={ViewConfig.ZOOM_SENSITIVITY_STEP}
                    value={[zoomSensitivity]}
                    onValueChange={(value) => onZoomSensitivityChange(value[0])}
                    disabled={viewMode === 'tabular'}
                    aria-label="Zoom speed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Layout Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Layout</h3>
            {showDetailsInSidebar !== undefined && onShowDetailsInSidebarChange && (
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
                <Label htmlFor="sidebar-details-toggle-modal" className="text-base font-normal">
                  Show Substations in Sidebar
                </Label>
                <Switch
                  id="sidebar-details-toggle-modal"
                  checked={showDetailsInSidebar}
                  onCheckedChange={onShowDetailsInSidebarChange}
                  className="justify-self-end"
                />
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Section */}
          {keyBindings && onKeyBindingsChange && (
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Keyboard Shortcuts</h3>
                <Button variant="secondary" onClick={() => onKeyBindingsChange(defaultKeyBindings)}>Reset to Defaults</Button>
              </div>
              <KeybindSettings bindings={keyBindings} onBindingsChange={onKeyBindingsChange} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}