import { BranchStatus, GameState } from "../types";
import { ThemeColors } from "./colors";
import { DrawingConfig } from "./constants";

const TWO_PI = Math.PI * 2;

/** Pre-computed static geometry for a branch. Built once since substations never move. */
export interface BranchGeo {
  x1: number; y1: number;
  x2: number; y2: number;
  dx: number; dy: number;
  len: number;
  invLen: number;
  perpX: number; perpY: number;
  offset: -1 | 0 | 1; // -1/+1 for parallel siblings, 0 for single
}

/** Build static geometry for all branches. Call once when branches first appear. */
export function computeBranchGeometry(branches: Record<string, import("../types").Branch>): Map<string, BranchGeo> {
  const result = new Map<string, BranchGeo>();
  for (const key in branches) {
    const branch = branches[key];
    const s1 = branch.sub1;
    const s2 = branch.sub2;
    if (!s1 || !s2) continue;

    const x1 = s1.Longitude, y1 = s1.Latitude;
    const x2 = s2.Longitude, y2 = s2.Latitude;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const invDist = dist > 0 ? 1 / dist : 0;

    // For parallel siblings, offset in opposite perpendicular directions
    let offset: -1 | 0 | 1 = 0;
    if (branch.sibling) {
      offset = branch.Number < branch.sibling ? -1 : 1;
    }

    result.set(key, {
      x1, y1, x2, y2, dx, dy,
      len: dist, invLen: invDist,
      perpX: -dy * invDist,
      perpY: dx * invDist,
      offset,
    });
  }
  return result;
}

// Pre-allocated reusable dash arrays (mutated once per frame, never reallocated)
const dashTrip = [0, 0];
const dashCritical = [0, 0];
const dashNone: number[] = [];

const NORMAL_THRESHOLD = DrawingConfig.BRANCH_OVERLOAD_NORMAL_THRESHOLD;
const CRIT_THRESHOLD = DrawingConfig.BRANCH_OVERLOAD_CRITICAL_THRESHOLD_DRAW;
const MIN_FLOW_FRACTION = DrawingConfig.MIN_FLOW_FRACTION_FOR_ANIMATION;
const OFFSET_FACTOR = DrawingConfig.SECOND_CIRCUIT_OFFSET_FACTOR;
const CIRCLE_SPACING = DrawingConfig.FLOW_CIRCLE_SPACING;
const CIRCLE_RADIUS_FACTOR = DrawingConfig.FLOW_CIRCLE_RADIUS_FACTOR;

/**
 * Draw all branches. Must be called with the world transform active on ctx.
 *
 * All branches are batched by style into Path2D objects — one stroke per style.
 * Hovered branch (at most 1) is drawn separately last for correct z-order/width.
 * Flow circles are batched into a single fill call.
 */
export function drawBranches(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  geoMap: Map<string, BranchGeo>,
  colors: ThemeColors,
  flowOffset: number,
  hoverFlowOffset: number,
  animEnabled: boolean,
  isPaused: boolean,
  scaleFactor: number,
  scaleX: number,
  flowScale: number,
) {
  const invScale = 1 / scaleX;
  const normalR = getDynamicBranchRadius(scaleFactor, false);
  const normalW = normalR * invScale;
  const hoverW = getDynamicBranchRadius(scaleFactor, true) * invScale;
  const halfOff = normalR * OFFSET_FACTOR / 2 * invScale;

  // Update reusable dash arrays for this frame's scale
  const d5 = 5 * invScale;
  dashTrip[0] = d5; dashTrip[1] = d5;
  dashCritical[0] = 8 * invScale; dashCritical[1] = 4 * invScale;

  const { branches } = state;
  const hoverBranch = state.hoverBranch;

  // Batch Path2Ds by style
  const batch = new Path2D();         // default IN: foreground, solid
  const batchWarning = new Path2D();  // overloaded: warning, solid
  const batchCritical = new Path2D(); // critically overloaded: dashed
  const batchTripped = new Path2D();  // tripped: dashed
  const batchDis = new Path2D();      // disconnected: foreground, dashed

  // Hover branch stored separately (unique line width, at most 1)
  let hx1 = 0, hy1 = 0, hx2 = 0, hy2 = 0;
  let hoverColor = "";
  let hoverDash = dashNone;
  let hasHover = false;

  for (const key in branches) {
    const br = branches[key];
    const geo = geoMap.get(key);
    if (!geo) continue;

    const isHov = br === hoverBranch;
    const isIn = br.Status === BranchStatus.IN;
    const ratio = isIn && br.Pmax > 0 ? Math.abs(br.P) / br.Pmax : 0;

    // Compute line endpoints (offset for parallel siblings)
    let lx1 = geo.x1, ly1 = geo.y1, lx2 = geo.x2, ly2 = geo.y2;
    if (geo.offset !== 0) {
      const off = geo.offset * halfOff;
      lx1 += geo.perpX * off; ly1 += geo.perpY * off;
      lx2 += geo.perpX * off; ly2 += geo.perpY * off;
    }

    if (isHov) {
      hx1 = lx1; hy1 = ly1; hx2 = lx2; hy2 = ly2;
      hasHover = true;
      // Overload style takes priority over hover highlight
      if (br.Status === BranchStatus.TRIP) {
        hoverColor = colors.tripped; hoverDash = dashTrip;
      } else if (isIn && ratio > CRIT_THRESHOLD) {
        hoverColor = colors.overloadCritical; hoverDash = dashCritical;
      } else if (isIn && ratio > NORMAL_THRESHOLD) {
        hoverColor = colors.warning; hoverDash = dashNone;
      } else {
        hoverColor = colors.lineHover; hoverDash = dashNone;
      }
    } else if (br.Status === BranchStatus.TRIP) {
      batchTripped.moveTo(lx1, ly1); batchTripped.lineTo(lx2, ly2);
    } else if (br.Status === BranchStatus.DIS) {
      batchDis.moveTo(lx1, ly1); batchDis.lineTo(lx2, ly2);
    } else if (isIn && ratio > CRIT_THRESHOLD) {
      batchCritical.moveTo(lx1, ly1); batchCritical.lineTo(lx2, ly2);
    } else if (isIn && ratio > NORMAL_THRESHOLD) {
      batchWarning.moveTo(lx1, ly1); batchWarning.lineTo(lx2, ly2);
    } else {
      batch.moveTo(lx1, ly1); batch.lineTo(lx2, ly2);
    }
  }

  // Stroke all batches (back → front: default → exceptions → hover)
  ctx.lineWidth = normalW;

  ctx.strokeStyle = colors.foreground;
  ctx.setLineDash(dashNone);
  ctx.stroke(batch);

  ctx.strokeStyle = colors.warning;
  ctx.stroke(batchWarning);

  ctx.strokeStyle = colors.overloadCritical;
  ctx.setLineDash(dashCritical);
  ctx.stroke(batchCritical);

  ctx.strokeStyle = colors.tripped;
  ctx.setLineDash(dashTrip);
  ctx.stroke(batchTripped);

  ctx.strokeStyle = colors.foreground;
  ctx.stroke(batchDis); // dashTrip still active

  if (hasHover) {
    ctx.beginPath();
    ctx.moveTo(hx1, hy1);
    ctx.lineTo(hx2, hy2);
    ctx.strokeStyle = hoverColor;
    ctx.lineWidth = hoverW;
    ctx.setLineDash(hoverDash);
    ctx.stroke();
  }

  ctx.setLineDash(dashNone);

  // ─── Flow circles (batched into single fill) ───
  if (!animEnabled) return;

  const circleR = normalR * CIRCLE_RADIUS_FACTOR * invScale;
  const circleRHover = getDynamicBranchRadius(scaleFactor, true) * CIRCLE_RADIUS_FACTOR * invScale;

  ctx.fillStyle = colors.powerFlow;
  ctx.beginPath();

  for (const key in branches) {
    const br = branches[key];
    if (br.Status !== BranchStatus.IN || Math.abs(br.P) < br.Pmax * MIN_FLOW_FRACTION) continue;

    const geo = geoMap.get(key);
    if (!geo || geo.len === 0) continue;

    const isHov = br === hoverBranch;
    const spacing = CIRCLE_SPACING * flowScale;
    const offset = (isPaused && isHov) ? hoverFlowOffset : flowOffset;
    const rawStart = br.P >= 0 ? offset : -offset;
    const start = ((rawStart % spacing) + spacing) % spacing;

    let lx1 = geo.x1, ly1 = geo.y1;
    if (geo.offset !== 0) {
      const off = geo.offset * halfOff;
      lx1 += geo.perpX * off; ly1 += geo.perpY * off;
    }

    const r = isHov ? circleRHover : circleR;
    addCircles(ctx, lx1, ly1, geo.dx, geo.dy, geo.invLen, geo.len, start, r, spacing);
  }

  ctx.fill();
}

function addCircles(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  dx: number, dy: number,
  invLen: number, len: number,
  start: number, r: number,
  spacing: number,
) {
  for (let pos = start; pos < len; pos += spacing) {
    const t = pos * invLen;
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    ctx.moveTo(cx + r, cy);
    ctx.arc(cx, cy, r, 0, TWO_PI);
  }
}


function getDynamicBranchRadius(scaleFactor: number, isHover: boolean): number {
  const baseRadius = isHover ? DrawingConfig.BRANCH_RADIUS_HOVER : DrawingConfig.BRANCH_RADIUS_NORMAL;
  const maxRadius = isHover ? DrawingConfig.BRANCH_RADIUS_HOVER_MAX : DrawingConfig.BRANCH_RADIUS_MAX;
  return Math.max(DrawingConfig.BRANCH_RADIUS_MIN, Math.min(baseRadius * scaleFactor, maxRadius));
}
