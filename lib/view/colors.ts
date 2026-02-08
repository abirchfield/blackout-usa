import { SubstationCategory } from "../types";

export interface ThemeColors {
  foreground: string;
  background: string;
  genNuclear: string;
  genThermal: string;
  genWind: string;
  genSolar: string;
  genLoad: string;
  powerFlow: string;
  lineHover: string;
  warning: string;
  overloadCritical: string;
  tripped: string;
  outerRingBg: string;
  labelFont: string;
}

export function resolveThemeColors(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    foreground: v("--foreground"),
    background: v("--background"),
    genNuclear: v("--color-gen-nuclear"),
    genThermal: v("--color-gen-thermal"),
    genWind: v("--color-gen-wind"),
    genSolar: v("--color-gen-solar"),
    genLoad: v("--color-gen-load"),
    powerFlow: v("--color-power-flow"),
    lineHover: v("--color-line-hover"),
    warning: v("--color-warning"),
    overloadCritical: v("--color-overload-critical"),
    tripped: v("--color-tripped"),
    outerRingBg: v("--foreground"),
    labelFont: v("--font-sans") || "'Jura', sans-serif",
  };
}

const CATEGORY_COLOR_KEY: Record<string, keyof ThemeColors> = {
  [SubstationCategory.Nuclear]: "genNuclear",
  [SubstationCategory.Thermal]: "genThermal",
  [SubstationCategory.GasTurbine]: "genThermal",
  [SubstationCategory.GasCombinedCycle]: "genThermal",
  [SubstationCategory.CoalFiredSteam]: "genThermal",
  [SubstationCategory.Wind]: "genWind",
  [SubstationCategory.Solar]: "genSolar",
  [SubstationCategory.Load]: "genLoad",
};

/** Returns the ThemeColors field name for a category. Pre-compute into SubGeo to avoid per-frame lookup. */
export function getCategoryColorKey(category: SubstationCategory): keyof ThemeColors {
  return (CATEGORY_COLOR_KEY[category] || "genLoad") as keyof ThemeColors;
}
