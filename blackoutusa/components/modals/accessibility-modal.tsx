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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { KeybindSettings } from "@/components/settings/keybind-settings";
import { KeyBindings, defaultKeyBindings } from "@/lib/game/key-bindings";

interface AccessibilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Game-specific settings
  viewMode?: 'visual' | 'tabular';
  onViewModeChange?: (mode: 'visual' | 'tabular') => void;
  animationsEnabled?: boolean;
  onAnimationsEnabledChange?: (enabled: boolean) => void;
  renderCanvasText?: boolean;
  onRenderCanvasTextChange?: (enabled: boolean) => void;
  keyBindings?: KeyBindings;
  onKeyBindingsChange?: (bindings: KeyBindings) => void;
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
}: AccessibilityModalProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accessibility Settings</DialogTitle>
          <DialogDescription>
            Adjust display settings for a better experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
            <Label htmlFor="theme-toggle-modal" className="text-base font-normal">
              Color Theme
            </Label>
            <div className="flex items-center justify-end gap-2">
              <Sun className="h-5 w-5" aria-label="Light mode" />
              <Switch
                id="theme-toggle-modal"
                checked={resolvedTheme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
              <Moon className="h-5 w-5" aria-label="Dark mode" />
            </div>
          </div>
          {viewMode !== undefined && onViewModeChange && (
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
              <Label htmlFor="view-mode-select" className="text-base font-normal">
                Display Mode
              </Label>
              <Select value={viewMode} onValueChange={(value: 'visual' | 'tabular') => onViewModeChange(value)}>
                <SelectTrigger id="view-mode-select" className="w-[180px] justify-self-end">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visual">Visual Map</SelectItem>
                  <SelectItem value="tabular">Tabular Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {animationsEnabled !== undefined && onAnimationsEnabledChange && (
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
              <Label htmlFor="animations-toggle-modal" className="text-base font-normal">
                Enable Animations
              </Label>
              <Switch
                id="animations-toggle-modal"
                checked={animationsEnabled}
                onCheckedChange={onAnimationsEnabledChange}
                className="justify-self-end"
              />
            </div>
          )}
          {renderCanvasText !== undefined && onRenderCanvasTextChange && (
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-4">
              <Label htmlFor="canvas-text-toggle-modal" className="text-base font-normal">
                Show Map Labels
              </Label>
              <Switch
                id="canvas-text-toggle-modal"
                checked={renderCanvasText}
                onCheckedChange={onRenderCanvasTextChange}
                className="justify-self-end"
              />
            </div>
          )}
          {keyBindings && onKeyBindingsChange && (
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Keyboard Shortcuts</h3>
                <Button variant="secondary" onClick={() => onKeyBindingsChange(defaultKeyBindings)}>Reset to Defaults</Button>
              </div>
              <div className="max-h-[240px] overflow-y-auto pr-4">
                <KeybindSettings bindings={keyBindings} onBindingsChange={onKeyBindingsChange} />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}