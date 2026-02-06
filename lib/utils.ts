import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { SubstationCategory, UnitStatus, ResultDetails, Branch, BranchStatus, Substation } from "./types";
import { ViewConfig, DrawingConfig } from "./config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Formatting Helpers ---

export const fmtPowerAuto = (val: number) => {
  if (val >= 1000) {
    return `${(val / 1000).toFixed(2)} GW`;
  }
  return `${val.toFixed(0)} MW`;
};

export const fmtMoneyAuto = (val: number) => {
  if (val >= 1000000) {
    return `$${(val / 1000000).toFixed(2)}M`;
  }
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(0)}k`;
  }
  return `$${val.toFixed(0)}`;
};

/** Returns "outline" in high-contrast mode, otherwise the base variant. */
export function hcVariant(isHighContrast: boolean, base: "secondary" | "ghost" = "secondary"): "outline" | "secondary" | "ghost" {
  return isHighContrast ? "outline" : base;
}

/** Returns the Tailwind background class for a loading bar based on percentage. */
export function getLoadingBarColor(loading: number): string {
  return loading > 100 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-status-in)]';
}

/** Formats a game tick value as a clock time string (e.g. "1:00 PM"). */
export function formatGameTime(t: number): string {
  const h = Math.floor(t / 60) + 1;
  const m = t - (h - 1) * 60;
  return `${h}:${m < 10 ? "0" + m : m} PM`;
}

// --- Domain Helpers ---

/** Returns per-unit Pmax and Pmin for a substation. */
export function getUnitLimits(sub: Substation): { pmax: number; pmin: number } {
  return { pmax: sub.Pmax / sub.Units, pmin: sub.Pmin / sub.Units };
}

/** Returns true for generator categories that can be dispatched (thermal-like plants). */
export function isDispatchableCategory(category: SubstationCategory): boolean {
  return category === SubstationCategory.Thermal ||
    category === SubstationCategory.Nuclear ||
    category === SubstationCategory.GasCombinedCycle ||
    category === SubstationCategory.GasTurbine ||
    category === SubstationCategory.CoalFiredSteam;
}

/** Returns true if the unit status means it is not producing power (DIS or TRIP). */
export function isUnitInactive(status: UnitStatus): boolean {
  return status === UnitStatus.DIS || status === UnitStatus.TRIP;
}

/** Returns true for weather-dependent (variable renewable) generator categories. */
export function isVariableRenewable(category: SubstationCategory): boolean {
  return category === SubstationCategory.Wind || category === SubstationCategory.Solar;
}

/** Returns the weather-adjusted available capacity for a unit, given the substation's weather fraction. */
export function getAvailableCapacity(pmax: number, category: SubstationCategory, frWind: number, frSolar: number): number {
  if (category === SubstationCategory.Wind) return pmax * frWind;
  if (category === SubstationCategory.Solar) return pmax * frSolar;
  return pmax;
}

/** Shared radius calculation used by both SVG drawer and event handler. */
export function getDynamicSubstationRadius(scaleX: number, referenceScale: number, isHover: boolean): number {
  const baseRadius = isHover ? ViewConfig.BASE_SUBSTATION_RADIUS_HOVER : ViewConfig.BASE_SUBSTATION_RADIUS_NORMAL;
  const maxRadius = isHover ? ViewConfig.MAX_SUBSTATION_RADIUS_HOVER : ViewConfig.MAX_SUBSTATION_RADIUS;
  const scaleFactor = Math.sqrt(scaleX / referenceScale);
  const radius = baseRadius * scaleFactor;
  return Math.max(ViewConfig.MIN_SUBSTATION_RADIUS, Math.min(radius, maxRadius));
}

/** Clamp view origin (x0, y0) so the map stays within viewport bounds with margin. */
export function clampViewBounds(
  state: { x0: number; y0: number; scaleX: number; scaleY: number; xmin: number; xmax: number; ymin: number; ymax: number },
  width: number,
  height: number,
) {
  if (width === 0 || height === 0) return;

  const viewWidth = width / state.scaleX;
  const viewHeight = height / state.scaleY;
  const mapWidth = state.xmax - state.xmin;
  const mapHeight = state.ymax - state.ymin;
  const marginX = mapWidth * DrawingConfig.PAN_MARGIN;
  const marginY = mapHeight * DrawingConfig.PAN_MARGIN;

  const xmin = state.xmin - marginX;
  const xmax = state.xmax + marginX;
  const ymin = state.ymin - marginY;
  const ymax = state.ymax + marginY;
  const totalW = xmax - xmin;
  const totalH = ymax - ymin;

  if (viewWidth >= totalW) {
    state.x0 = xmin - (viewWidth - totalW) / 2;
  } else {
    if (state.x0 < xmin) state.x0 = xmin;
    if (state.x0 + viewWidth > xmax) state.x0 = xmax - viewWidth;
  }

  if (viewHeight >= totalH) {
    state.y0 = ymax + (viewHeight - totalH) / 2;
  } else {
    if (state.y0 > ymax) state.y0 = ymax;
    if (state.y0 - viewHeight < ymin) state.y0 = ymin + viewHeight;
  }
}

/** Compute branch overload info: active circuit count, total capacity, and overload ratio. */
export function getBranchOverloadInfo(branch: Branch): { activeCircuits: number; capacity: number; overloadRatio: number } {
  let activeCircuits: number;
  if (branch.Circuits === 1) {
    activeCircuits = branch.Status1 === BranchStatus.IN ? 1 : 0;
  } else {
    activeCircuits = (branch.Status1 === BranchStatus.IN ? 1 : 0) + (branch.Status2 === BranchStatus.IN ? 1 : 0);
  }
  const capacity = activeCircuits * branch.Pmax;
  const overloadRatio = capacity > 0 ? Math.abs(branch.P) / capacity : Infinity;
  return { activeCircuits, capacity, overloadRatio };
}

/** Evaluates scenario results based on cost thresholds. */
export function evaluateResults(totalCost: number, record: number, good: number, okay: number): ResultDetails {
  const costM = (totalCost / 1000000);
  if (costM < record) {
    return {
      performance: 'record',
      costM: costM.toFixed(2),
      message: `Amazing!! This is better than the prior record, $${record.toFixed(2)}M.<br/>Super job managing the grid today and keeping costs low`
    };
  } else if (costM < good) {
    return {
      performance: 'good',
      costM: costM.toFixed(2),
      message: `Great job! The record for this scenario is $${record.toFixed(2)}M.<br/>Super job managing the grid today and keeping costs low`
    };
  } else if (costM < okay) {
    return {
      performance: 'okay',
      costM: costM.toFixed(2),
      message: `Not too bad. We would hope to keep the cost under $${good.toFixed(2)}M for this scenario.<br/>Feel free to give it another try`
    };
  } else {
    return {
      performance: 'bad',
      costM: costM.toFixed(2),
      message: `That's too high! We would hope to keep the cost under $${good.toFixed(2)}M for this scenario.<br/>Feel free to give it another try`
    };
  }
}