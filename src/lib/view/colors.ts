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

/**
 * Resolve a CSS custom property to a Canvas-compatible color string.
 *
 * getPropertyValue("--foo") returns raw token values (e.g. "oklch(0.985 0 0)")
 * which Canvas 2D cannot parse as strokeStyle/fillStyle. By setting the value
 * on a real element's `color` property and reading it back, the browser resolves
 * it to an rgb()/rgba() string that Canvas always accepts.
 */
function resolveColor(el: HTMLElement, cssVar: string): string {
  el.style.color = `var(${cssVar})`;
  return getComputedStyle(el).color;
}

/** Read CSS custom properties from the document root into a ThemeColors object. */
export function resolveThemeColors(): ThemeColors {
  const el = document.createElement("div");
  el.style.display = "none";
  document.documentElement.appendChild(el);

  const v = (cssVar: string) => resolveColor(el, cssVar);
  const cs = getComputedStyle(document.documentElement);

  const result: ThemeColors = {
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
    outerRingBg: v("--foreground"), // intentionally same as foreground — halo ring matches text color
    labelFont: cs.getPropertyValue("--font-sans").trim() || "'Jura', sans-serif",
  };

  el.remove();
  return result;
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
