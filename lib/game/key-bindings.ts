export type GameAction =
  | 'PAN_UP'
  | 'PAN_DOWN'
  | 'PAN_LEFT'
  | 'PAN_RIGHT'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'TOGGLE_DEBUG_BOUNDS'
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
  TOGGLE_DEBUG_BOUNDS: 'b',
  RESET_ZOOM: 'home',
  DISCONNECT_MOST_LOADED_LINE: 'l',
  DISCONNECT_SMALLEST_LOAD: 'k',
  RAMP_ALL_GENERATION_UP: 'r',
  TOGGLE_PAUSE: 'p',
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
  TOGGLE_DEBUG_BOUNDS: 'Toggle Debug Bounds',
  RESET_ZOOM: 'Reset Zoom',
  DISCONNECT_MOST_LOADED_LINE: 'Disconnect Most Loaded Line',
  DISCONNECT_SMALLEST_LOAD: 'Disconnect Smallest Load',
  RAMP_ALL_GENERATION_UP: 'Ramp All Generation Up',
  TOGGLE_PAUSE: 'Pause / Resume Time',
  TOGGLE_FAST_FORWARD: 'Toggle Fast Forward',
  CENTER_VIEW_ON_SELECTION: 'Center View on Selection',
  EMERGENCY_LOAD_SHED: 'Emergency Load Shed',
};

export const keyBindingGroups: { title: string; actions: GameAction[] }[] = [
  {
    title: 'Grid Canvas Navigation',
    actions: ['PAN_UP', 'PAN_DOWN', 'PAN_LEFT', 'PAN_RIGHT', 'ZOOM_IN', 'ZOOM_OUT', 'RESET_ZOOM', 'TOGGLE_DEBUG_BOUNDS'],
  },
  {
    title: 'Time Control',
    actions: ['TOGGLE_PAUSE', 'TOGGLE_FAST_FORWARD'],
  },
  {
    title: 'Keyboard Element Selection',
    actions: ['CENTER_VIEW_ON_SELECTION'],
  },
  {
    title: 'Grid Operation & Control',
    actions: [
      'DISCONNECT_MOST_LOADED_LINE',
      'DISCONNECT_SMALLEST_LOAD',
      'RAMP_ALL_GENERATION_UP',
      'EMERGENCY_LOAD_SHED',
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
  'backspace': 'Backspace',
  'delete': 'Del',
  'insert': 'Ins',
  'home': 'Home',
  'end': 'End',
  'pageup': 'Page Up',
  'pagedown': 'Page Down',
  '`': '`',
  '=': '+',
  '-': '-',
  '.': '.',
  ',': ',',
};

export const getDisplayKey = (key: string) => {
  return keyDisplayMap[key] || key.toUpperCase();
};