import { GameState, Substation, UnitStatus } from "../types";
import { ThemeColors, getCategoryColorKey } from "./colors";
import { DrawingConfig } from "./constants";
import { LabelOffset } from "./draw-overlays";
import type { DrawContext } from "./draw-branches";
import { getDynamicSubstationRadius } from "./view-math";

const TWO_PI = Math.PI * 2;
const PIE_START = -Math.PI / 2; // 12 o'clock

/** Pre-computed static properties per substation. Built once. */
export interface SubGeo {
  lon: number;
  lat: number;
  isLoad: boolean;
  pmax: number;
  colorKey: keyof ThemeColors; // pre-resolved from category → ThemeColors field name
}

/** Build static geometry for all substations. Call once when subs first appear. */
export function computeSubGeometry(subs: Record<string, Substation>): Map<string, SubGeo> {
  const result = new Map<string, SubGeo>();
  for (const key in subs) {
    const sub = subs[key];
    result.set(key, {
      lon: sub.Longitude,
      lat: sub.Latitude,
      isLoad: sub.Category === "Load",
      pmax: sub.Pmax,
      colorKey: getCategoryColorKey(sub.Category),
    });
  }
  return result;
}

// Cached config values
const OUTER_FACTOR = DrawingConfig.GENERATOR_OUTER_RADIUS_FACTOR;
const LOAD_FACTOR = DrawingConfig.LOAD_SIZE_FACTOR;
const LABEL_OUTLINE_W = DrawingConfig.LABEL_OUTLINE_WIDTH;
const computeSubRadius = getDynamicSubstationRadius;

/**
 * Draw all substations + labels in screen space. ctx should have identity transform.
 *
 * Batched design — accumulates geometry into per-layer, per-color Path2D objects
 * and flushes each batch with a single ctx.fill(), reducing ~128 fill calls to ~16.
 *
 *   Pass 1: Batch all substation shapes by layer (halo → ring → bg → fill).
 *   Pass 2: All labels — uniform text style set once.
 *
 * Hovered substation is drawn separately last for correct z-order.
 */
export function drawSubstations(
  dc: DrawContext,
  geoMap: Map<string, SubGeo>,
  labelOffsets: Map<string, LabelOffset> | null,
) {
  const { ctx, state, colors, scaleFactor, scaleX } = dc;
  const { x0, y0 } = state;
  const normalR = computeSubRadius(scaleFactor, false);
  const hoverR = computeSubRadius(scaleFactor, true);
  const hoverSub = state.hoverSub;

  // ─── Pass 1: Batch substation shapes by type, then by layer + color ───
  // Two separate batch sets: generators first (behind), then loads (in front).
  // This prevents layer interleaving when substations overlap.
  const genHalo = new Path2D();
  const genBg = new Path2D();
  const genRings = new Map<string, Path2D>();
  const genFills = new Map<string, Path2D>();

  const loadHalo = new Path2D();
  const loadBg = new Path2D();
  const loadRings = new Map<string, Path2D>();
  const loadFills = new Map<string, Path2D>();

  let hoverKey: string | null = null;

  for (const key in state.subs) {
    const sub = state.subs[key];
    const geo = geoMap.get(key);
    if (!geo) continue;

    // Skip hovered sub — draw it last for z-order
    if (sub === hoverSub) { hoverKey = key; continue; }

    const sx = (geo.lon - x0) * scaleX;
    const sy = (y0 - geo.lat) * scaleX;

    const catColor = colors[geo.colorKey] as string;
    const allTripped = isSubstationTripped(sub);
    const activeColor = allTripped ? colors.tripped : catColor;
    const P = getSubstationPower(sub);

    if (geo.isLoad) {
      batchLoadSubstation(loadHalo, loadBg, loadRings, loadFills,
        activeColor, catColor, allTripped, P, geo.pmax * state.loadLevel, sx, sy, normalR);
    } else {
      batchGeneratorSubstation(genHalo, genBg, genRings, genFills,
        activeColor, catColor, allTripped, P, geo.pmax, sx, sy, normalR);
    }
  }

  // Flush generators (behind), then loads (in front)
  flushBatches(ctx, colors, genHalo, genRings, genBg, genFills);
  flushBatches(ctx, colors, loadHalo, loadRings, loadBg, loadFills);

  // Draw hovered substation last (on top, different radius, at most 4 fills)
  if (hoverKey && hoverSub) {
    const geo = geoMap.get(hoverKey)!;
    const sx = (geo.lon - x0) * scaleX;
    const sy = (y0 - geo.lat) * scaleX;
    const catColor = colors[geo.colorKey] as string;
    const allTripped = isSubstationTripped(hoverSub);
    const activeColor = allTripped ? colors.tripped : catColor;
    const P = getSubstationPower(hoverSub);
    if (geo.isLoad) {
      drawLoadSubstation(ctx, colors, activeColor, catColor, allTripped, P, geo.pmax * state.loadLevel, sx, sy, hoverR);
    } else {
      drawGeneratorSubstation(ctx, colors, activeColor, catColor, allTripped, P, geo.pmax, sx, sy, hoverR);
    }
  }

  // ─── Pass 2: Labels ───
  if (!state.renderMapLabels || labelOffsets === null) return;

  const fontNormal = `${DrawingConfig.LABEL_FONT_SIZE_NORMAL}px ${colors.labelFont}, monospace`;
  const fontHover = `${DrawingConfig.LABEL_FONT_SIZE_HOVER}px ${colors.labelFont}, monospace`;

  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = LABEL_OUTLINE_W;
  ctx.strokeStyle = colors.background;
  ctx.fillStyle = colors.foreground;
  ctx.font = fontNormal;
  let currentFont = fontNormal;

  for (const key in state.subs) {
    const sub = state.subs[key];
    const geo = geoMap.get(key);
    if (!geo) continue;
    const offset = labelOffsets.get(key);
    if (!offset) continue;

    const isHover = sub === hoverSub;
    const font = isHover ? fontHover : fontNormal;
    if (font !== currentFont) { ctx.font = font; currentFont = font; }

    ctx.textAlign = offset.anchor === "end" ? "right" : "left";

    const sx = (geo.lon - x0) * scaleX;
    const sy = (y0 - geo.lat) * scaleX;
    ctx.strokeText(sub.Name, sx + offset.x, sy + offset.y);
    ctx.fillText(sub.Name, sx + offset.x, sy + offset.y);
  }
}

// ─── Batch flush (halo → ring → bg → fill) ───

function flushBatches(
  ctx: CanvasRenderingContext2D, colors: ThemeColors,
  halo: Path2D, rings: Map<string, Path2D>, bg: Path2D, fills: Map<string, Path2D>,
) {
  ctx.fillStyle = colors.outerRingBg;
  ctx.fill(halo);
  for (const [color, path] of rings) { ctx.fillStyle = color; ctx.fill(path); }
  ctx.fillStyle = colors.background;
  ctx.fill(bg);
  for (const [color, path] of fills) { ctx.fillStyle = color; ctx.fill(path); }
}

// ─── Batch geometry accumulators (no draw calls — append to Path2D objects) ───

function getOrCreate(map: Map<string, Path2D>, key: string): Path2D {
  let p = map.get(key);
  if (!p) { p = new Path2D(); map.set(key, p); }
  return p;
}

function batchGeneratorSubstation(
  haloBatch: Path2D, bgBatch: Path2D,
  ringBatches: Map<string, Path2D>, fillBatches: Map<string, Path2D>,
  activeColor: string, catColor: string, allTripped: boolean,
  P: number, pmax: number, sx: number, sy: number, r: number,
) {
  const outerR = r * OUTER_FACTOR;

  // Halo
  haloBatch.moveTo(sx + outerR + 2, sy);
  haloBatch.arc(sx, sy, outerR + 2, 0, TWO_PI);

  // Ring (grouped by activeColor)
  const ringPath = getOrCreate(ringBatches, activeColor);
  ringPath.moveTo(sx + outerR, sy);
  ringPath.arc(sx, sy, outerR, 0, TWO_PI);

  // Background (+0.5 overlap to eliminate anti-aliasing fringe)
  bgBatch.moveTo(sx + r + 1, sy);
  bgBatch.arc(sx, sy, r + 1, 0, TWO_PI);

  // Pie wedge (grouped by catColor)
  if (!allTripped && pmax > 0 && P > 0) {
    const fillRatio = Math.min(P / pmax, 1);
    if (fillRatio >= 0.01) {
      const fillPath = getOrCreate(fillBatches, catColor);
      if (fillRatio >= 0.99) {
        fillPath.moveTo(sx + r, sy);
        fillPath.arc(sx, sy, r, 0, TWO_PI);
      } else {
        fillPath.moveTo(sx, sy);
        fillPath.arc(sx, sy, r, PIE_START, PIE_START + TWO_PI * fillRatio);
        fillPath.closePath();
      }
    }
  }
}

function batchLoadSubstation(
  haloBatch: Path2D, bgBatch: Path2D,
  ringBatches: Map<string, Path2D>, fillBatches: Map<string, Path2D>,
  activeColor: string, catColor: string, allTripped: boolean,
  P: number, effectivePmax: number, sx: number, sy: number, r: number,
) {
  const loadR = r * LOAD_FACTOR;
  const outerR = loadR * OUTER_FACTOR;

  // Halo rect
  haloBatch.rect(sx - outerR - 2, sy - outerR - 2, (outerR + 2) * 2, (outerR + 2) * 2);

  // Ring rect (grouped by activeColor)
  const ringPath = getOrCreate(ringBatches, activeColor);
  ringPath.rect(sx - outerR, sy - outerR, outerR * 2, outerR * 2);

  // Background rect (+0.5 overlap to eliminate anti-aliasing fringe)
  bgBatch.rect(sx - loadR - 0.5, sy - loadR - 0.5, loadR * 2 + 1, loadR * 2 + 1);

  // Fill bar (grouped by catColor)
  if (!allTripped && effectivePmax > 0 && P > 0) {
    const fillRatio = Math.min(P / effectivePmax, 1);
    if (fillRatio >= 0.01) {
      const fillPath = getOrCreate(fillBatches, catColor);
      const height = loadR * 2 * fillRatio;
      fillPath.rect(sx - loadR, sy + loadR - height, loadR * 2, height);
    }
  }
}

// ─── Immediate-draw helpers (used only for hovered substation) ───

function drawGeneratorSubstation(
  ctx: CanvasRenderingContext2D,
  colors: ThemeColors,
  activeColor: string,
  catColor: string,
  allTripped: boolean,
  P: number,
  pmax: number,
  sx: number, sy: number,
  r: number,
) {
  const outerR = r * OUTER_FACTOR;

  // White halo (concentric fill at larger radius)
  ctx.beginPath();
  ctx.arc(sx, sy, outerR + 2, 0, TWO_PI);
  ctx.fillStyle = colors.outerRingBg;
  ctx.fill();

  // Colored outer ring (fill)
  ctx.beginPath();
  ctx.arc(sx, sy, outerR, 0, TWO_PI);
  ctx.fillStyle = activeColor;
  ctx.fill();

  // Background circle (creates inner boundary of the ring)
  // +0.5 overlap into the colored ring to eliminate anti-aliasing fringe
  ctx.beginPath();
  ctx.arc(sx, sy, r + 1, 0, TWO_PI);
  ctx.fillStyle = colors.background;
  ctx.fill();

  // Pie chart wedge
  if (!allTripped && pmax > 0 && P > 0) {
    const fillRatio = Math.min(P / pmax, 1);
    if (fillRatio >= 0.01) {
      ctx.fillStyle = catColor;
      ctx.beginPath();
      if (fillRatio >= 0.99) {
        ctx.arc(sx, sy, r, 0, TWO_PI);
      } else {
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, r, PIE_START, PIE_START + TWO_PI * fillRatio);
        ctx.closePath();
      }
      ctx.fill();
    }
  }
}

function drawLoadSubstation(
  ctx: CanvasRenderingContext2D,
  colors: ThemeColors,
  activeColor: string,
  catColor: string,
  allTripped: boolean,
  P: number,
  effectivePmax: number,
  sx: number, sy: number,
  r: number,
) {
  const loadR = r * LOAD_FACTOR;
  const outerR = loadR * OUTER_FACTOR;

  // White halo (slightly larger rectangle)
  ctx.fillStyle = colors.outerRingBg;
  ctx.fillRect(sx - outerR - 2, sy - outerR - 2, (outerR + 2) * 2, (outerR + 2) * 2);

  // Colored outer ring (filled square)
  ctx.fillStyle = activeColor;
  ctx.fillRect(sx - outerR, sy - outerR, outerR * 2, outerR * 2);

  // Background square (creates inner boundary of the ring)
  // +0.5 overlap into the colored ring to eliminate anti-aliasing fringe
  ctx.fillStyle = colors.background;
  ctx.fillRect(sx - loadR - 0.5, sy - loadR - 0.5, loadR * 2 + 1, loadR * 2 + 1);

  // Fill bar (bottom-to-top rectangle)
  if (!allTripped && effectivePmax > 0 && P > 0) {
    const fillRatio = Math.min(P / effectivePmax, 1);
    if (fillRatio >= 0.01) {
      ctx.fillStyle = catColor;
      const height = loadR * 2 * fillRatio;
      ctx.fillRect(sx - loadR, sy + loadR - height, loadR * 2, height);
    }
  }
}

// ─── Data helpers ───

function getSubstationPower(sub: Substation): number {
  let p = 0;
  for (let i = 0; i < sub.U.length; i++) p += sub.U[i].P;
  return p;
}

function isSubstationTripped(sub: Substation): boolean {
  if (sub.U.length === 0) return false;
  for (let i = 0; i < sub.U.length; i++) {
    if (sub.U[i].Status !== UnitStatus.TRIP) return false;
  }
  return true;
}
