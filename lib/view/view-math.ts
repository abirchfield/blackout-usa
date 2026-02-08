import { DrawingConfig, ViewConfig } from "./constants";

type ViewBoundsState = { scaleX: number; scaleY: number; xmin: number; xmax: number; ymin: number; ymax: number };

/**
 * Compute the allowed x0/y0 range given current scale and viewport dimensions.
 * The bounds prevent the map from leaving the viewport entirely.
 */
export function computeViewBounds(
  state: ViewBoundsState,
  width: number,
  height: number,
): { x0Min: number; x0Max: number; y0Min: number; y0Max: number } {
  const viewWidth = width / state.scaleX;
  const viewHeight = height / state.scaleY;
  const mapWidth = state.xmax - state.xmin;
  const mapHeight = state.ymax - state.ymin;

  // Horizontal bounds
  let x0Min: number, x0Max: number;
  if (viewWidth >= mapWidth) {
    // Viewport wider than map — map must stay fully visible
    x0Min = state.xmax - viewWidth;
    x0Max = state.xmin;
  } else {
    // Map wider than viewport — viewport stays within map + margin
    const marginX = mapWidth * DrawingConfig.PAN_MARGIN;
    x0Min = state.xmin - marginX;
    x0Max = state.xmax + marginX - viewWidth;
  }

  // Vertical bounds (y0 is top edge in world coords, y-axis inverted)
  let y0Min: number, y0Max: number;
  if (viewHeight >= mapHeight) {
    // Viewport taller than map — map must stay fully visible
    y0Min = state.ymax;
    y0Max = state.ymin + viewHeight;
  } else {
    // Map taller than viewport — viewport stays within map + margin
    const marginY = mapHeight * DrawingConfig.PAN_MARGIN;
    y0Min = state.ymin - marginY + viewHeight;
    y0Max = state.ymax + marginY;
  }

  return { x0Min, x0Max, y0Min, y0Max };
}

/**
 * Hard-clamp view origin (x0, y0) to stay within computed bounds.
 * Used only for deliberate snap actions (centerAndZoomOn).
 */
export function clampViewBounds(
  state: ViewBoundsState & { x0: number; y0: number },
  width: number,
  height: number,
) {
  if (width === 0 || height === 0) return;
  const { x0Min, x0Max, y0Min, y0Max } = computeViewBounds(state, width, height);
  state.x0 = Math.max(x0Min, Math.min(state.x0, x0Max));
  state.y0 = Math.max(y0Min, Math.min(state.y0, y0Max));
}

/**
 * One-sided pan clamp: prevents dragging FURTHER past bounds,
 * but does NOT snap back if already past (e.g. from zooming).
 *
 * prevX0/prevY0 are the values before the pan delta was applied.
 */
export function clampPan(
  state: ViewBoundsState & { x0: number; y0: number },
  prevX0: number,
  prevY0: number,
  width: number,
  height: number,
) {
  if (width === 0 || height === 0) return;
  const { x0Min, x0Max, y0Min, y0Max } = computeViewBounds(state, width, height);

  // Effective bounds: the wider of (hard bounds, previous position).
  // This lets the user pan back toward the map without snapping.
  state.x0 = Math.max(Math.min(prevX0, x0Min), Math.min(state.x0, Math.max(prevX0, x0Max)));
  state.y0 = Math.max(Math.min(prevY0, y0Min), Math.min(state.y0, Math.max(prevY0, y0Max)));
}

/** Dynamic substation radius based on zoom level. Caller provides pre-computed scaleFactor. */
export function getDynamicSubstationRadius(scaleFactor: number, isHover: boolean): number {
  const baseRadius = isHover ? ViewConfig.BASE_SUBSTATION_RADIUS_HOVER : ViewConfig.BASE_SUBSTATION_RADIUS_NORMAL;
  const maxRadius = isHover ? ViewConfig.MAX_SUBSTATION_RADIUS_HOVER : ViewConfig.MAX_SUBSTATION_RADIUS;
  return Math.max(ViewConfig.MIN_SUBSTATION_RADIUS, Math.min(baseRadius * scaleFactor, maxRadius));
}
