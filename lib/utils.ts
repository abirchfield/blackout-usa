import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { SubstationCategory, UnitStatus, ResultDetails } from "./types";
import { ViewConfig } from "./config";

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

// --- Domain Helpers ---

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