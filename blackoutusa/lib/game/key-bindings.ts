export type GameAction =
  | 'PAN_UP'
  | 'PAN_DOWN'
  | 'PAN_LEFT'
  | 'PAN_RIGHT'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'TOGGLE_DEBUG_BOUNDS'
  | 'DISCONNECT_MOST_LOADED_LINE'
  | 'DISCONNECT_SMALLEST_LOAD'
  | 'RAMP_ALL_GENERATION_UP'
  | 'TOGGLE_PAUSE'
  | 'TOGGLE_FAST_FORWARD'
  | 'CYCLE_ELEMENT_FORWARD'
  | 'CYCLE_ELEMENT_BACKWARD'
  | 'OPEN_DETAILS'
  | 'CENTER_VIEW_ON_SELECTION'
  | 'CYCLE_SIDEBAR_TABS'
  | 'EMERGENCY_LOAD_SHED';

export type KeyBindings = Record<GameAction, string>;

export const defaultKeyBindings: KeyBindings = {
  PAN_UP: 'w',
  PAN_DOWN: 's',
  PAN_LEFT: 'a',
  PAN_RIGHT: 'd',
  ZOOM_IN: 'pageup',
  ZOOM_OUT: 'pagedown',
  TOGGLE_DEBUG_BOUNDS: 'b',
  DISCONNECT_MOST_LOADED_LINE: 'l',
  DISCONNECT_SMALLEST_LOAD: 'k',
  RAMP_ALL_GENERATION_UP: 'r',
  TOGGLE_PAUSE: ' ',
  TOGGLE_FAST_FORWARD: 'f',
  CYCLE_ELEMENT_FORWARD: 'tab',
  CYCLE_ELEMENT_BACKWARD: '`',
  OPEN_DETAILS: 'enter',
  CENTER_VIEW_ON_SELECTION: 'c',
  CYCLE_SIDEBAR_TABS: 't',
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
  DISCONNECT_MOST_LOADED_LINE: 'Disconnect Most Loaded Line',
  DISCONNECT_SMALLEST_LOAD: 'Disconnect Smallest Load',
  RAMP_ALL_GENERATION_UP: 'Ramp All Generation Up',
  TOGGLE_PAUSE: 'Pause / Resume Time',
  TOGGLE_FAST_FORWARD: 'Toggle Fast Forward',
  CYCLE_ELEMENT_FORWARD: 'Cycle to Next Element',
  CYCLE_ELEMENT_BACKWARD: 'Cycle to Previous Element',
  OPEN_DETAILS: 'Open Details for Cycled Element',
  CENTER_VIEW_ON_SELECTION: 'Center View on Selection',
  CYCLE_SIDEBAR_TABS: 'Cycle Sidebar Tabs',
  EMERGENCY_LOAD_SHED: 'Emergency Load Shed',
};

export const keyBindingGroups: { title: string; actions: GameAction[] }[] = [
  {
    title: 'Grid Canvas Navigation',
    actions: ['PAN_UP', 'PAN_DOWN', 'PAN_LEFT', 'PAN_RIGHT', 'ZOOM_IN', 'ZOOM_OUT', 'TOGGLE_DEBUG_BOUNDS'],
  },
  {
    title: 'Time Control',
    actions: ['TOGGLE_PAUSE', 'TOGGLE_FAST_FORWARD'],
  },
  {
    title: 'Keyboard Element Selection',
    actions: ['CYCLE_ELEMENT_FORWARD', 'CYCLE_ELEMENT_BACKWARD', 'OPEN_DETAILS', 'CENTER_VIEW_ON_SELECTION'],
  },
  {
    title: 'UI Navigation',
    actions: ['CYCLE_SIDEBAR_TABS'],
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