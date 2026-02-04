'use client';

import { KeyBindings, GameAction, actionLabels, keyBindingGroups, getDisplayKey, disallowedKeys } from '@/lib/key-bindings';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useCallback } from 'react';
import { Kbd } from '@/components/ui/kbd';

interface KeybindSettingsProps {
  bindings: KeyBindings;
  onBindingsChange: (newBindings: KeyBindings) => void;
}

export function KeybindSettings({ bindings, onBindingsChange }: KeybindSettingsProps) {
  const [editingAction, setEditingAction] = useState<GameAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSetBinding = useCallback((newKey: string) => {
    if (!editingAction) return;

    if (disallowedKeys.includes(newKey)) {
      setErrorMessage(`The "${getDisplayKey(newKey)}" key is reserved and cannot be used.`);
      setEditingAction(null);
      return;
    }

    const conflictAction = Object.entries(bindings).find(([action, key]) => key === newKey && action !== editingAction);
    if (conflictAction) {
      setErrorMessage(`Key "${getDisplayKey(newKey)}" is already bound to "${actionLabels[conflictAction[0] as GameAction]}".`);
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

      const key = e.key.toLowerCase();

      if (key === 'escape') {
        setEditingAction(null);
        return;
      }

      handleSetBinding(key);
    };

    if (editingAction) {
      setErrorMessage(null);
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [editingAction, handleSetBinding]);

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2" role="alert">
          {errorMessage}
        </div>
      )}
      {keyBindingGroups.map((group) => (
        <div key={group.title}>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">{group.title}</h4>
          <div className="space-y-1">
            {group.actions.map((action) => (
              <div key={action} className="flex items-center justify-between rounded-md p-2 -ml-2 hover:bg-accent">
                <Label htmlFor={`keybind-${action}`} className="text-sm font-normal">{actionLabels[action]}</Label>
                <Button id={`keybind-${action}`} variant="ghost" onClick={() => { setEditingAction(action); setErrorMessage(null); }} className="h-auto p-0 font-sans">
                  {editingAction === action ? (
                    <span className="italic text-muted-foreground w-32 text-center">Press a key...</span>
                  ) : (
                    <Kbd className="w-32 justify-center bg-background border-input">
                      {getDisplayKey(bindings[action])}
                    </Kbd>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
