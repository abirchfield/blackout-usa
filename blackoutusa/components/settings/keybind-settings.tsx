'use client';

import { KeyBindings, GameAction, actionLabels, keyBindingGroups } from '@/lib/game/key-bindings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useCallback } from 'react';

interface KeybindSettingsProps {
  bindings: KeyBindings;
  onBindingsChange: (newBindings: KeyBindings) => void;
}

// To display keys more nicely
const keyDisplayMap: Record<string, string> = {
  ' ': 'Space',
  'pageup': 'Page Up',
  'pagedown': 'Page Down',
};

export function KeybindSettings({ bindings, onBindingsChange }: KeybindSettingsProps) {
  const [editingAction, setEditingAction] = useState<GameAction | null>(null);

  const handleSetBinding = useCallback((newKey: string) => {
    if (!editingAction) return;

    // Check for conflicts
    const conflictAction = Object.entries(bindings).find(([action, key]) => key === newKey && action !== editingAction);
    if (conflictAction) {
      alert(`Key "${newKey}" is already bound to "${actionLabels[conflictAction[0] as GameAction]}". Please choose a different key.`);
    } else {
      const newBindings = { ...bindings, [editingAction]: newKey };
      onBindingsChange(newBindings);
    }
    setEditingAction(null);
  }, [editingAction, bindings, onBindingsChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleSetBinding(e.key.toLowerCase());
    };

    if (editingAction) {
      document.addEventListener('keydown', handleKeyDown, true); // Use capture to prevent other handlers
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [editingAction, handleSetBinding]);

  const getDisplayKey = (key: string) => {
    return keyDisplayMap[key] || key.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {keyBindingGroups.map((group) => (
        <div key={group.title}>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">{group.title}</h4>
          <div className="space-y-1">
            {group.actions.map((action) => (
              <div key={action} className="flex items-center justify-between rounded-md p-2 -ml-2 hover:bg-accent">
                <Label htmlFor={`keybind-${action}`} className="text-sm font-normal">{actionLabels[action]}</Label>
                <Button id={`keybind-${action}`} variant="ghost" onClick={() => setEditingAction(action)} className="h-8 w-28 font-mono text-center text-muted-foreground">
                  {editingAction === action ? '...' : getDisplayKey(bindings[action])}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}