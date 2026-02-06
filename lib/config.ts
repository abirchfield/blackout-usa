// View and Map Constants
export const ViewConfig = {
  ZOOM_LIMIT_MAX: 500,
  DETAIL_ZOOM_LEVEL: 200,
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
};

// Drawing and Style Constants for SVG Renderer
export const DrawingConfig = {
  // Animation
  MIN_POWER_FOR_ANIMATION: 10,

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
  POWER_FLOW_LINE_WIDTH_FACTOR: 2.0,

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
};
