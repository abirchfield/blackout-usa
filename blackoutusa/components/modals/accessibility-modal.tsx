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
import { Label } from "@/components/ui/label";
import { Sun, Moon } from "lucide-react";

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
        <div className="grid gap-6 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-toggle-modal" className="text-base">
              Color Theme
            </Label>
            <div className="flex items-center gap-2">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="view-mode-modal" className="text-base">
                Display Mode
              </Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="view-mode-modal" className="text-sm font-medium text-muted-foreground">
                  Tabular
                </Label>
                <Switch
                  id="view-mode-modal"
                  checked={viewMode === 'visual'}
                  onCheckedChange={(checked) => onViewModeChange(checked ? 'visual' : 'tabular')}
                />
                <Label htmlFor="view-mode-modal" className="text-sm font-medium text-muted-foreground">
                  Visual
                </Label>
              </div>
            </div>
          )}
          {animationsEnabled !== undefined && onAnimationsEnabledChange && (
            <div className="flex items-center justify-between">
              <Label htmlFor="animations-toggle-modal" className="text-base">
                Enable Animations
              </Label>
              <Switch
                id="animations-toggle-modal"
                checked={animationsEnabled}
                onCheckedChange={onAnimationsEnabledChange}
              />
            </div>
          )}
          {renderCanvasText !== undefined && onRenderCanvasTextChange && (
            <div className="flex items-center justify-between">
              <Label htmlFor="canvas-text-toggle-modal" className="text-base">
                Show Map Labels
              </Label>
              <Switch
                id="canvas-text-toggle-modal"
                checked={renderCanvasText}
                onCheckedChange={onRenderCanvasTextChange}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}