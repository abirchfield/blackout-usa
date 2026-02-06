'use client';

import { KeyBindings, GameAction, actionLabels, actionDescriptions, keyBindingGroups, getDisplayKey, disallowedKeys } from '@/lib/key-bindings';
import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface KeybindSettingsProps {
  bindings: KeyBindings;
  onBindingsChange: (newBindings: KeyBindings) => void;
}

interface KeybindRowProps {
  action: GameAction;
  currentKey: string;
  isEditing: boolean;
  error: string | null;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

function KeybindRow({ action, currentKey, isEditing, error, onStartEdit, onCancelEdit }: KeybindRowProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Focus the button when entering edit mode
  useEffect(() => {
    if (isEditing && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="group">
      <div
        className={cn(
          "flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg transition-colors",
          isEditing ? "bg-accent" : "hover:bg-accent/50"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{actionLabels[action]}</div>
          <div className="text-xs text-muted-foreground truncate">{actionDescriptions[action]}</div>
        </div>
        <button
          ref={buttonRef}
          type="button"
          onClick={isEditing ? onCancelEdit : onStartEdit}
          onKeyDown={(e) => {
            // Allow Escape to cancel editing
            if (isEditing && e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              onCancelEdit();
            }
          }}
          className={cn(
            "relative flex items-center justify-center min-w-[5rem] h-9 px-3 rounded-md text-sm font-mono transition-all",
            "border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isEditing
              ? "border-primary bg-primary/10 text-primary animate-pulse"
              : error
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
          )}
          aria-label={isEditing ? `Press a key to bind to ${actionLabels[action]}. Press Escape to cancel.` : `Change keybinding for ${actionLabels[action]}. Currently set to ${getDisplayKey(currentKey)}`}
          aria-pressed={isEditing}
        >
          {isEditing ? (
            <span className="text-xs">Press key...</span>
          ) : (
            <span>{getDisplayKey(currentKey)}</span>
          )}
        </button>
      </div>
      {error && (
        <div className="text-xs text-destructive px-3 pb-1 animate-in fade-in slide-in-from-top-1" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export function KeybindSettings({ bindings, onBindingsChange }: KeybindSettingsProps) {
  const [editingAction, setEditingAction] = useState<GameAction | null>(null);
  const [errors, setErrors] = useState<Partial<Record<GameAction, string>>>({});

  const clearError = useCallback((action: GameAction) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[action];
      return next;
    });
  }, []);

  const setError = useCallback((action: GameAction, message: string) => {
    setErrors(prev => ({ ...prev, [action]: message }));
    // Auto-clear error after 3 seconds
    setTimeout(() => clearError(action), 3000);
  }, [clearError]);

  const handleSetBinding = useCallback((newKey: string) => {
    if (!editingAction) return;

    // Check for disallowed keys
    if (disallowedKeys.includes(newKey)) {
      setError(editingAction, `"${getDisplayKey(newKey)}" is reserved`);
      setEditingAction(null);
      return;
    }

    // Check for conflicts with other bindings
    const conflictEntry = Object.entries(bindings).find(
      ([action, key]) => key === newKey && action !== editingAction
    );
    if (conflictEntry) {
      setError(editingAction, `Already used by "${actionLabels[conflictEntry[0] as GameAction]}"`);
      setEditingAction(null);
      return;
    }

    // Apply the new binding
    clearError(editingAction);
    const newBindings = { ...bindings, [editingAction]: newKey };
    onBindingsChange(newBindings);
    setEditingAction(null);
  }, [editingAction, bindings, onBindingsChange, setError, clearError]);

  // Global keydown handler for capturing new bindings
  useEffect(() => {
    if (!editingAction) return;

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

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [editingAction, handleSetBinding]);

  const startEdit = useCallback((action: GameAction) => {
    clearError(action);
    setEditingAction(action);
  }, [clearError]);

  const cancelEdit = useCallback(() => {
    setEditingAction(null);
  }, []);

  return (
    <div className="space-y-6">
      {keyBindingGroups.map((group) => (
        <div key={group.title} className="space-y-1">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
            <p className="text-xs text-muted-foreground">{group.description}</p>
          </div>
          <div className="space-y-0.5 rounded-lg border bg-card/50 p-1">
            {group.actions.map((action) => (
              <KeybindRow
                key={action}
                action={action}
                currentKey={bindings[action]}
                isEditing={editingAction === action}
                error={errors[action] || null}
                onStartEdit={() => startEdit(action)}
                onCancelEdit={cancelEdit}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
