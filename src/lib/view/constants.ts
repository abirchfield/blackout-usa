import type { KeyBindings } from "../types";

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

// View and Map Constants
export const ViewConfig = {
  DEFAULT_MAX_ZOOM_RATIO: 10,  // scaleMax = initialScale * ratio when not specified per-case
  DETAIL_ZOOM_RATIO: 4,       // detail zoom = referenceScale * ratio
  // Dynamic Substation Radius Parameters
  BASE_SUBSTATION_RADIUS_NORMAL: 10,
  BASE_SUBSTATION_RADIUS_HOVER: 13,
  MIN_SUBSTATION_RADIUS: 5,
  MAX_SUBSTATION_RADIUS: 20,
  MAX_SUBSTATION_RADIUS_HOVER: 25,
  // Interaction thresholds
  BRANCH_HOVER_RADIUS: 8, // pixels
  CLICK_DRAG_THRESHOLD: 10, // pixels
  KEYBOARD_PAN_AMOUNT: 20, // pixels
  // Zoom Sensitivity
  ZOOM_SENSITIVITY_DEFAULT: 1.0,
  ZOOM_SENSITIVITY_MIN: 0.1,
  ZOOM_SENSITIVITY_MAX: 2.0,
  ZOOM_SENSITIVITY_STEP: 0.1,
  // Responsive
  MOBILE_BREAKPOINT_PX: 768,              // must match Tailwind's `md:` breakpoint
};

// Drawing and Style Constants
export const DrawingConfig = {
  // Animation
  MIN_FLOW_FRACTION_FOR_ANIMATION: 0.02,

  // Drawing Styles
  BORDER_LINE_WIDTH: 2,

  // Load substation size factor (relative to generator radius)
  LOAD_SIZE_FACTOR: 0.75,
  BRANCH_RADIUS_NORMAL: 3.0,
  BRANCH_RADIUS_HOVER: 4.5,
  BRANCH_RADIUS_MIN: 1.5,
  BRANCH_RADIUS_MAX: 6.0,
  BRANCH_RADIUS_HOVER_MAX: 7.0,
  SUBSTATION_BORDER_WIDTH: 3,
  GENERATOR_OUTLINE_WIDTH: 2,
  GENERATOR_OUTER_RADIUS_FACTOR: 1.2,
  SECOND_CIRCUIT_OFFSET_FACTOR: 3.0,

  // Flow Animation (circle packets along branches)
  // Spacing and speed are in world units, tuned for FLOW_REFERENCE_EXTENT.
  // At runtime they are scaled by (mapExtent / FLOW_REFERENCE_EXTENT).
  FLOW_REFERENCE_EXTENT: 14,          // degrees (Texas map width)
  FLOW_CIRCLE_SPACING: 0.4,           // world units between circle centers
  FLOW_CIRCLE_RADIUS_FACTOR: 1.3,     // radius relative to branch line width
  FLOW_SPEED_NORMAL: 0.0006,          // world units per millisecond
  FLOW_SPEED_FAST: 0.0018,            // world units per millisecond
  FLOW_OFFSET_WRAP: 400,              // offset wraps here to prevent overflow

  // Overload Thresholds (for drawing)
  BRANCH_OVERLOAD_NORMAL_THRESHOLD: 1.0,
  BRANCH_OVERLOAD_CRITICAL_THRESHOLD_DRAW: 1.2,
  BRANCH_OVERLOAD_CRITICAL_THRESHOLD_LABEL: 1.5,

  // Zoom padding: fraction of viewport used for map at minimum zoom (0.9 = 10% margin)
  MIN_ZOOM_PADDING: 0.9,

  // Pan margin: fraction of the map dimensions the user can pan past the map edges
  PAN_MARGIN: 0.25,

  // Labels
  LABEL_DISTANCE: 15,
  LABEL_OFFSET_X: 15,
  LABEL_OFFSET_Y: 5,
  LABEL_OUTLINE_WIDTH: 3,

  // Canvas Typography (px)
  LABEL_FONT_SIZE_NORMAL: 15,             // substation name labels
  LABEL_FONT_SIZE_HOVER: 20,              // hovered substation name
  BRANCH_LABEL_FONT_SIZE: 20,             // branch hover label (overlays)

  // Label placement
  NEARBY_SUBSTATION_THRESHOLD: 0.8,       // degrees; substations within this distance repel labels
};

// Forecast Chart Rendering Constants
export const ChartConfig = {
  // Layout
  COMPACT_HEIGHT_THRESHOLD: 50,           // px; below this, use compact padding
  PAD_LEFT: 6,
  PAD_RIGHT: 14,
  PAD_TOP: 14,
  PAD_TOP_COMPACT: 12,
  PAD_BOTTOM: 14,
  PAD_BOTTOM_COMPACT: 12,

  // Font
  FONT_PREFIX: "bold 9px",                // prepended to resolved font family

  // Grid
  GRID_DASH: [3, 4] as readonly number[],
  GRID_LINE_WIDTH: 0.5,
  GRID_FRACTIONS: [0.25, 0.5, 0.75] as readonly number[],

  // Curves
  CURVE_LINE_WIDTH: 1.5,

  // Now indicator
  NOW_GLOW_WIDTH: 4,
  NOW_CORE_WIDTH: 1,
  NOW_TRIANGLE_HALF_W: 3,
  NOW_TRIANGLE_TOP_OFFSET: 1,            // y above chartTop
  NOW_TRIANGLE_DEPTH: 4,                 // y below chartTop

  // Tick marks
  TICK_MARK_LENGTH: 3,

  // Legend
  LEGEND_Y: 2,
  LEGEND_DOT_SIZE: 5,
  LEGEND_DOT_Y_OFFSET: 2,
  LEGEND_LABEL_GAP: 3,
  LEGEND_ITEM_GAP: 10,

  // Alpha hex suffixes (appended to resolved color strings)
  ALPHA_GRID: "18",
  ALPHA_BASELINE: "25",
  ALPHA_SOLAR_GRAD_TOP: "30",
  ALPHA_SOLAR_GRAD_BOT: "08",
  ALPHA_WIND_GRAD_TOP: "35",
  ALPHA_WIND_GRAD_BOT: "08",
  ALPHA_NOW_GLOW: "15",
  ALPHA_NOW_CORE: "90",
  ALPHA_TICK_MARK: "50",
  ALPHA_NOW_FILL: "CC",
};
