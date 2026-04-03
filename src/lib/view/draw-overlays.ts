import { Branch, BranchStatus, Substation } from "../types";
import { DrawingConfig } from "./constants";
import type { DrawContext } from "./draw-branches";

const TWO_PI = Math.PI * 2;
const NEARBY_THRESHOLD_SQ = DrawingConfig.NEARBY_SUBSTATION_THRESHOLD ** 2;
const dashNone: number[] = [];

export interface LabelOffset {
  x: number;
  y: number;
  anchor: "start" | "end";
}

/** Compute per-substation label offsets from branch topology and nearby substations.
 *  For each substation, collects angles to connected branches AND nearby substations,
 *  finds the largest angular gap, and places the label in that gap. */
export function computeLabelOffsets(
  subs: Record<string, Substation>,
  branches: Record<string, Branch>,
): Map<string, LabelOffset> {
  const subIds = Object.keys(subs);
  const result = new Map<string, LabelOffset>();

  // Build occupied angles per substation from branches
  const anglesBySubId = new Map<string, number[]>();
  for (const id of subIds) anglesBySubId.set(id, []);

  for (const key in branches) {
    const branch = branches[key];
    if (!branch.sub1 || !branch.sub2) continue;
    const dx = branch.sub2.Longitude - branch.sub1.Longitude;
    const dy = -(branch.sub2.Latitude - branch.sub1.Latitude);
    anglesBySubId.get(branch.FromNum)!.push(Math.atan2(dy, dx));
    anglesBySubId.get(branch.ToNum)!.push(Math.atan2(-dy, -dx));
  }

  // Add angles to nearby substations
  for (let i = 0; i < subIds.length; i++) {
    const a = subs[subIds[i]];
    const anglesA = anglesBySubId.get(subIds[i])!;
    for (let j = i + 1; j < subIds.length; j++) {
      const b = subs[subIds[j]];
      const dx = b.Longitude - a.Longitude;
      const dLat = b.Latitude - a.Latitude;
      if (dx * dx + dLat * dLat < NEARBY_THRESHOLD_SQ) {
        const dy = -dLat;
        anglesA.push(Math.atan2(dy, dx));
        anglesBySubId.get(subIds[j])!.push(Math.atan2(-dy, -dx));
      }
    }
  }

  const dist = DrawingConfig.LABEL_DISTANCE;

  for (const subId of subIds) {
    const angles = anglesBySubId.get(subId)!;
    if (angles.length === 0) {
      result.set(subId, { x: dist, y: 4, anchor: "start" });
      continue;
    }

    angles.sort((a, b) => a - b);

    let bestGap = 0;
    let bestMidAngle = 0;
    for (let i = 0; i < angles.length; i++) {
      const next = (i + 1) % angles.length;
      const gap = next === 0
        ? (angles[0] + TWO_PI) - angles[angles.length - 1]
        : angles[next] - angles[i];
      if (gap > bestGap) {
        bestGap = gap;
        bestMidAngle = angles[i] + gap / 2;
      }
    }

    const x = Math.round(dist * Math.cos(bestMidAngle));
    const y = Math.round(dist * Math.sin(bestMidAngle) + 4);
    result.set(subId, { x, y, anchor: x < 0 ? "end" : "start" });
  }

  return result;
}

/** Build a Path2D for the border polyline (cached, called once). */
export function buildBorderPath(borders: number[][]): Path2D {
  const path = new Path2D();
  if (borders.length === 0) return path;
  path.moveTo(borders[0][0], borders[0][1]);
  for (let i = 1; i < borders.length; i++) {
    path.lineTo(borders[i][0], borders[i][1]);
  }
  path.closePath();
  return path;
}

/** Draw the border polyline. Must be called with the world transform active. */
export function drawBorder(
  ctx: CanvasRenderingContext2D,
  borderPath: Path2D,
  scaleX: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = DrawingConfig.BORDER_LINE_WIDTH / scaleX;
  ctx.setLineDash(dashNone);
  ctx.stroke(borderPath);
}

// World-to-screen helpers (scaleX === scaleY always)
function toScreenX(lon: number, x0: number, scaleX: number): number {
  return (lon - x0) * scaleX;
}
function toScreenY(lat: number, y0: number, scaleX: number): number {
  return (y0 - lat) * scaleX;
}

/** Draw the hover label for a hovered branch at its midpoint. */
export function drawHoverLabel(dc: DrawContext) {
  const { ctx, state, colors, scaleX } = dc;
  const { x0, y0 } = state;
  if (!state.hoverBranch) return;
  const branch = state.hoverBranch;
  if (!branch.sub1 || !branch.sub2) return;

  // Compute text and color
  let text = `${Math.abs(branch.P).toFixed(0)} MW`;
  let fillColor = colors.foreground;

  const isIn = branch.Status === BranchStatus.IN;
  const overloadRatio = isIn && branch.Pmax > 0 ? Math.abs(branch.P) / branch.Pmax : 0;

  if (branch.Status === BranchStatus.TRIP) {
    text = "Tripped";
    fillColor = colors.tripped;
  } else if (branch.Status === BranchStatus.DIS) {
    text = "Out of Service";
  } else if (overloadRatio > DrawingConfig.BRANCH_OVERLOAD_CRITICAL_THRESHOLD_LABEL) {
    fillColor = colors.overloadCritical;
    text += " Critical Overload";
  } else if (overloadRatio > DrawingConfig.BRANCH_OVERLOAD_NORMAL_THRESHOLD) {
    fillColor = colors.warning;
    text += " Overloaded";
  }

  // Position at branch midpoint in screen space
  const midLon = (branch.sub1.Longitude + branch.sub2.Longitude) / 2;
  const midLat = (branch.sub1.Latitude + branch.sub2.Latitude) / 2;
  const sx = toScreenX(midLon, x0, scaleX) + DrawingConfig.LABEL_OFFSET_X;
  const sy = toScreenY(midLat, y0, scaleX) + DrawingConfig.LABEL_OFFSET_Y;

  ctx.font = `${DrawingConfig.BRANCH_LABEL_FONT_SIZE}px ${colors.labelFont}, monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  ctx.lineWidth = DrawingConfig.LABEL_OUTLINE_WIDTH;
  ctx.strokeStyle = colors.background;
  ctx.strokeText(text, sx, sy);

  ctx.fillStyle = fillColor;
  ctx.fillText(text, sx, sy);
}
