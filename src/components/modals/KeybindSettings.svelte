<script lang="ts">
  import { cn } from '$lib/utils';
  import type { KeyBindings, GameAction } from '$lib/types';

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

  interface Props {
    bindings: KeyBindings;
    onBindingsChange: (newBindings: KeyBindings) => void;
  }

  let { bindings, onBindingsChange }: Props = $props();

  let editingAction = $state<GameAction | null>(null);
  let errors = $state<Partial<Record<GameAction, string>>>({});

  function clearError(action: GameAction) {
    errors = { ...errors };
    delete errors[action];
  }

  function setError(action: GameAction, message: string) {
    errors = { ...errors, [action]: message };
    setTimeout(() => clearError(action), 3000);
  }

  function handleSetBinding(newKey: string) {
    if (!editingAction) return;

    if (disallowedKeys.includes(newKey)) {
      setError(editingAction, `"${getDisplayKey(newKey)}" is reserved`);
      editingAction = null;
      return;
    }

    const conflictEntry = Object.entries(bindings).find(
      ([action, key]) => key === newKey && action !== editingAction
    );
    if (conflictEntry) {
      setError(editingAction, `Already used by "${actionLabels[conflictEntry[0] as GameAction]}"`);
      editingAction = null;
      return;
    }

    clearError(editingAction);
    const newBindings = { ...bindings, [editingAction]: newKey };
    onBindingsChange(newBindings);
    editingAction = null;
  }

  // Global keydown handler for capturing new bindings
  $effect(() => {
    if (!editingAction) return;

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      const key = e.key.toLowerCase();
      if (key === 'escape') {
        editingAction = null;
        return;
      }
      handleSetBinding(key);
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  });

  function startEdit(action: GameAction) {
    clearError(action);
    editingAction = action;
  }

  function cancelEdit() {
    editingAction = null;
  }
</script>

<div class="space-y-6">
  {#each keyBindingGroups as group}
    <div class="space-y-1">
      <div class="mb-3">
        <h4 class="text-sm font-semibold text-foreground">{group.title}</h4>
        <p class="text-xs text-muted-foreground">{group.description}</p>
      </div>
      <div class="space-y-0.5 rounded-lg border bg-card/50 p-1">
        {#each group.actions as action}
          {@const isEditing = editingAction === action}
          {@const error = errors[action] || null}
          <div class="group">
            <div class={cn(
              "flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg transition-colors",
              isEditing ? "bg-accent" : "hover:bg-accent/50"
            )}>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium">{actionLabels[action]}</div>
                <div class="text-xs text-muted-foreground truncate">{actionDescriptions[action]}</div>
              </div>
              <button
                type="button"
                onclick={isEditing ? cancelEdit : () => startEdit(action)}
                onkeydown={(e) => {
                  if (isEditing && e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    cancelEdit();
                  }
                }}
                class={cn(
                  "relative flex items-center justify-center min-w-[5rem] h-9 px-3 rounded-md text-sm font-mono transition-all",
                  "border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isEditing
                    ? "border-primary bg-primary/10 text-primary animate-pulse"
                    : error
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                )}
                aria-label={isEditing
                  ? `Press a key to bind to ${actionLabels[action]}. Press Escape to cancel.`
                  : `Change keybinding for ${actionLabels[action]}. Currently set to ${getDisplayKey(bindings[action])}`}
                aria-pressed={isEditing}
              >
                {#if isEditing}
                  <span class="text-xs">Press key...</span>
                {:else}
                  <span>{getDisplayKey(bindings[action])}</span>
                {/if}
              </button>
            </div>
            {#if error}
              <div class="text-xs text-destructive px-3 pb-1 animate-in fade-in slide-in-from-top-1" role="alert">
                {error}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
