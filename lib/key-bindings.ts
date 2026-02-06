export type GameAction =
  | 'PAN_UP'
  | 'PAN_DOWN'
  | 'PAN_LEFT'
  | 'PAN_RIGHT'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'RESET_ZOOM'
  | 'DISCONNECT_MOST_LOADED_LINE'
  | 'DISCONNECT_SMALLEST_LOAD'
  | 'RAMP_ALL_GENERATION_UP'
  | 'TOGGLE_PAUSE'
  | 'TOGGLE_FAST_FORWARD'
  | 'CENTER_VIEW_ON_SELECTION'
  | 'EMERGENCY_LOAD_SHED';

export type KeyBindings = Record<GameAction, string>;

export const defaultKeyBindings: KeyBindings = {
  PAN_UP: 'w',
  PAN_DOWN: 's',
  PAN_LEFT: 'a',
  PAN_RIGHT: 'd',
  ZOOM_IN: '=',
  ZOOM_OUT: '-',
  RESET_ZOOM: 'home',
  DISCONNECT_MOST_LOADED_LINE: 'l',
  DISCONNECT_SMALLEST_LOAD: 'k',
  RAMP_ALL_GENERATION_UP: 'r',
  TOGGLE_PAUSE: ' ',
  TOGGLE_FAST_FORWARD: 'f',
  CENTER_VIEW_ON_SELECTION: 'c',
  EMERGENCY_LOAD_SHED: 'e',
};

export const actionLabels: Record<GameAction, string> = {
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

export const actionDescriptions: Record<GameAction, string> = {
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

// Groups for UI display
export const keyBindingGroups: { title: string; description: string; actions: GameAction[] }[] = [
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

// Keys that are not allowed to be used for keybindings
export const disallowedKeys: string[] = [
  'tab',
  'capslock',
  'shift',
  'control',
  'alt',
  'meta',
  'enter',
  'f1',
  'f2',
  'f3',
  'f4',
  'f5',
  'f6',
  'f7',
  'f8',
  'f9',
  'f10',
  'f11',
  'f12',
];

// To display keys more nicely
export const keyDisplayMap: Record<string, string> = {
  ' ': 'Space',
  'arrowup': '↑',
  'arrowdown': '↓',
  'arrowleft': '←',
  'arrowright': '→',
  'enter': 'Enter',
  'escape': 'Esc',
  'tab': 'Tab',
  'capslock': 'Caps Lock',
  'shift': 'Shift',
  'control': 'Ctrl',
  'alt': 'Alt',
  'meta': 'Cmd/Win',
  'backspace': '⌫',
  'delete': 'Del',
  'insert': 'Ins',
  'home': 'Home',
  'end': 'End',
  'pageup': 'PgUp',
  'pagedown': 'PgDn',
  '`': '`',
  '=': '=',
  '-': '-',
  '.': '.',
  ',': ',',
  '[': '[',
  ']': ']',
  '\\': '\\',
  '/': '/',
  ';': ';',
  "'": "'",
};

export const getDisplayKey = (key: string): string => {
  return keyDisplayMap[key] || key.toUpperCase();
};
