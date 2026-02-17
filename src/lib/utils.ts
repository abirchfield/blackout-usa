import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Branch, BranchStatus, SubstationCategory, UnitStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Formatting Helpers ---

/** Format power as [value, unit] tuple for structured rendering. */
export function fmtPower(val: number): [string, string] {
  if (val >= 1000) return [(val / 1000).toFixed(2), "GW"];
  return [val.toFixed(0), "MW"];
}

/** Format money as [value, unit] tuple for structured rendering. */
export function fmtMoney(val: number): [string, string] {
  if (val >= 1000000) return [`$${(val / 1000000).toFixed(2)}`, "M"];
  if (val >= 1000) return [`$${(val / 1000).toFixed(0)}`, "k"];
  return [`$${val.toFixed(0)}`, ""];
}

/** Returns the Tailwind background class for a loading bar based on percentage. */
export function getLoadingBarColor(loading: number): string {
  return loading > 100 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-status-in)]';
}

/** Formats elapsed seconds as a clock time string (e.g. "1:00 PM").
 *  Single-digit hours are padded with a figure space (U+2007) for stable width. */
export function formatGameTime(t: number, startHour: number = 13): string {
  const totalSeconds = startHour * 3600 + t;
  const hour24 = Math.floor(totalSeconds / 3600) % 24;
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const h12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hourStr = h12 < 10 ? `\u2007${h12}` : `${h12}`;
  return `${hourStr}:${minute < 10 ? '0' + minute : minute} ${ampm}`;
}

// --- Domain Helpers ---

/** Returns true for generator categories that can be dispatched (thermal-like plants). */
export function isDispatchable(category: SubstationCategory): boolean {
  return category === SubstationCategory.Thermal ||
    category === SubstationCategory.Nuclear ||
    category === SubstationCategory.GasCombinedCycle ||
    category === SubstationCategory.GasTurbine ||
    category === SubstationCategory.CoalFiredSteam;
}

/** Returns true if the unit status means it is not producing power (DIS or TRIP). */
export function isInactive(status: UnitStatus): boolean {
  return status === UnitStatus.DIS || status === UnitStatus.TRIP;
}

// --- Branch Helpers ---

/** Whether a branch is in service. */
export function isBranchActive(br: Branch): boolean {
  return br.Status === BranchStatus.IN;
}

/** Branch loading as a percentage of capacity. */
export function branchLoading(br: Branch): number {
  if (br.Status !== BranchStatus.IN || br.Pmax <= 0) return 0;
  return (Math.abs(br.P) / br.Pmax) * 100;
}

/** Returns the weather-adjusted available capacity for a unit, given wind/sun availability. */
export function availCapacity(pmax: number, category: SubstationCategory, windAvail: number, sunAvail: number): number {
  if (category === SubstationCategory.Wind) return pmax * windAvail;
  if (category === SubstationCategory.Solar) return pmax * sunAvail;
  return pmax;
}

