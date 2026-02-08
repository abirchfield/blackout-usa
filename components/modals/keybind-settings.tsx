'use client';

import { KeyBindings, GameAction } from '@/lib/types';
import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

const actionLabels: Record<GameAction, string> = {
  PAN_UP: 'Pan Up',
  PAN_DOWN: 'Pan Down',
  PAN_LEFT: 'Pan Left',
  PAN_RIGHT: 'Pan Right',
  ZOOM_IN: 'Zoom In',
  ZOOM_OUT: 'Zoom Out',
  RESET_ZOOM: 'Reset View',
  DISCONNECT_MOST_LOADED_LINE: 'Trip Overloaded Line',
  DISCONNECT_SMALLEST_LOAD: 'Shed Smallest Load',
  RAMP_ALL_GENERATION_UP: 'Ramp Up Generation',
  TOGGLE_PAUSE: 'Pause / Play',
  TOGGLE_FAST_FORWARD: 'Fast Forward',
  CENTER_VIEW_ON_SELECTION: 'Center on Selection',
  EMERGENCY_LOAD_SHED: 'Emergency Load Shed',
};

const actionDescriptions: Record<GameAction, string> = {
  PAN_UP: 'Move the map view upward',
  PAN_DOWN: 'Move the map view downward',
  PAN_LEFT: 'Move the map view left',
  PAN_RIGHT: 'Move the map view right',
  ZOOM_IN: 'Zoom in on the map',
  ZOOM_OUT: 'Zoom out from the map',
  RESET_ZOOM: 'Reset to default zoom and position',
  DISCONNECT_MOST_LOADED_LINE: 'Disconnect the most heavily loaded transmission line',
  DISCONNECT_SMALLEST_LOAD: 'Shed the smallest active load to reduce demand',
  RAMP_ALL_GENERATION_UP: 'Increase output on all active generators',
  TOGGLE_PAUSE: 'Pause or resume the simulation',
  TOGGLE_FAST_FORWARD: 'Toggle 10x simulation speed',
  CENTER_VIEW_ON_SELECTION: 'Center the map on the selected element',
  EMERGENCY_LOAD_SHED: 'Disconnect the largest load substation',
};

const keyBindingGroups: { title: string; description: string; actions: GameAction[] }[] = [
  {
    title: 'Time Control',
    description: 'Control simulation playback',
    actions: ['TOGGLE_PAUSE', 'TOGGLE_FAST_FORWARD'],
  },
  {
    title: 'Map Navigation',
    description: 'Pan and zoom the grid map',
    actions: ['PAN_UP', 'PAN_DOWN', 'PAN_LEFT', 'PAN_RIGHT', 'ZOOM_IN', 'ZOOM_OUT', 'RESET_ZOOM'],
  },
  {
    title: 'Emergency Operations',
    description: 'Quick actions for grid emergencies',
    actions: [
      'EMERGENCY_LOAD_SHED',
      'DISCONNECT_MOST_LOADED_LINE',
      'DISCONNECT_SMALLEST_LOAD',
      'RAMP_ALL_GENERATION_UP',
    ],
  },
];

const disallowedKeys: string[] = [
  'tab', 'capslock', 'shift', 'control', 'alt', 'meta', 'enter',
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
];

const keyDisplayMap: Record<string, string> = {
  ' ': 'Space',
  'arrowup': '\u2191', 'arrowdown': '\u2193', 'arrowleft': '\u2190', 'arrowright': '\u2192',
  'enter': 'Enter', 'escape': 'Esc', 'tab': 'Tab', 'capslock': 'Caps Lock',
  'shift': 'Shift', 'control': 'Ctrl', 'alt': 'Alt', 'meta': 'Cmd/Win',
  'backspace': '\u232B', 'delete': 'Del', 'insert': 'Ins',
  'home': 'Home', 'end': 'End', 'pageup': 'PgUp', 'pagedown': 'PgDn',
  '`': '`', '=': '=', '-': '-', '.': '.', ',': ',',
  '[': '[', ']': ']', '\\': '\\', '/': '/', ';': ';', "'": "'",
};

function getDisplayKey(key: string): string {
  return keyDisplayMap[key] || key.toUpperCase();
}

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
