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
 * Normalize any computed CSS color to #rrggbb hex via canvas pixel readback.
 * Immune to browser format variation (rgb, oklch, lab, etc.) because
 * getImageData always returns sRGB per spec.
 */
const toHex: (color: string) => string = (() => {
  let ctx: CanvasRenderingContext2D | null = null;
  return (color: string): string => {
    if (!ctx) {
      const c = document.createElement('canvas');
      c.width = 1; c.height = 1;
      ctx = c.getContext('2d', { willReadFrequently: true })!;
    }
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  };
})();

/**
 * Resolve a CSS custom property to a #rrggbb hex string for Canvas use.
 *
 * Sets the value on a real element's `color` property so the browser resolves
 * var() references, then normalizes the computed result to hex via canvas pixel
 * readback (getComputedStyle may return oklch/lab on modern browsers).
 */
export function resolveColor(el: HTMLElement, cssVar: string): string {
  el.style.color = `var(${cssVar})`;
  return toHex(getComputedStyle(el).color);
}

/**
 * Resolve multiple CSS custom properties to Canvas-compatible color strings.
 * Creates and tears down a temporary DOM element for the batch.
 */
export function resolveColors(cssVars: Record<string, string>): Record<string, string> {
  const el = document.createElement("div");
  el.style.display = "none";
  document.documentElement.appendChild(el);
  const result: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(cssVars)) {
    result[key] = resolveColor(el, cssVar);
  }
  el.remove();
  return result;
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
