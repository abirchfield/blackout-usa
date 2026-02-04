import { Branch, GameState, Substation, BranchStatus, UnitStatus, SubstationCategory } from "../types";
import { AppColors, DrawingConfig, GenerationTypeConfig, getDynamicSubstationRadius } from "../config";
import { IGridDrawer } from "../interfaces";
import { activeCase } from "@/data/cases";

const SVG_NS = "http://www.w3.org/2000/svg";
const TWO_PI = Math.PI * 2;
const PIE_CHART_START_ANGLE = -Math.PI / 2;

// Pre-computed constant strings to avoid per-frame allocations
const DASH_FLOW_BG = DrawingConfig.POWER_FLOW_DASH_BACKGROUND.join(",");
const DASH_FLOW_FG = DrawingConfig.POWER_FLOW_DASH_FOREGROUND.join(",");
const DASH_DISCONNECTED = DrawingConfig.DISCONNECTED_LINE_DASH.join(",");
const STR_GENERATOR_OUTLINE_WIDTH = String(DrawingConfig.GENERATOR_OUTLINE_WIDTH);
const STR_GENERATOR_OUTLINE_WIDTH_PLUS_2 = String(DrawingConfig.GENERATOR_OUTLINE_WIDTH + 2);
const STR_SUBSTATION_BORDER_WIDTH = String(DrawingConfig.SUBSTATION_BORDER_WIDTH);
const STR_LABEL_OUTLINE_WIDTH = String(DrawingConfig.LABEL_OUTLINE_WIDTH);
const STR_LABEL_OFFSET_X = String(DrawingConfig.LABEL_OFFSET_X);
const STR_LABEL_OFFSET_Y = String(DrawingConfig.LABEL_OFFSET_Y);
const STR_FONT_SIZE_NORMAL = "15";
const STR_FONT_SIZE_HOVER = "20";

interface BranchElements {
  group: SVGGElement;
  // Circuit 1
  baseLine1: SVGLineElement;
  flowBg1: SVGLineElement;
  flowFg1: SVGLineElement;
  // Circuit 2 (only for dual-circuit branches)
  baseLine2?: SVGLineElement;
  flowBg2?: SVGLineElement;
  flowFg2?: SVGLineElement;
}

interface SubstationElements {
  group: SVGGElement;
  innerGroup: SVGGElement;
  // Generator-specific
  outerRingBg?: SVGCircleElement;
  outerRing?: SVGCircleElement;
  // Common
  background: SVGCircleElement;
  piePath: SVGPathElement;
  border: SVGCircleElement;
  label: SVGTextElement;
  // Pie arc path cache
  cachedPieR: number;
  cachedPieFill: number;
  cachedPiePath: string;
}

export class SvgDrawer implements IGridDrawer {
  private container: HTMLDivElement;
  public svgElement: SVGSVGElement;
  private worldGroup: SVGGElement;
  private branchesLayer: SVGGElement;
  private substationsLayer: SVGGElement;
  private hoverLabelLayer: SVGGElement;

  private borderElement: SVGPolylineElement | null = null;
  private branchElements: Map<string, BranchElements> = new Map();
  private substationElements: Map<string, SubstationElements> = new Map();
  private hoverLabelText: SVGTextElement;

  // JS-side attribute cache: avoids DOM reads in getAttribute()
  private attrCache: Map<SVGElement, Map<string, string>> = new Map();
  private textCache: Map<SVGElement, string> = new Map();

  // Theme cache
  private cachedTheme: string | null = null;
  private primaryColor: string = "";
  private secondaryColor: string = "";
  private colorWarning: string = "";
  private colorOverloadCritical: string = "";

  // Animation state
  private hoverAnimCycleState: number = 0;
  private isHoverAnimationActive: boolean = false;

  // Track previous scale for counter-scale updates
  private lastScaleX: number = 0;

  // Track last container size for resize detection
  private lastWidth: number = 0;
  private lastHeight: number = 0;

  // Track border initialization
  private borderInitialized: boolean = false;

  // Cache for world transform to avoid redundant setAttribute calls
  private lastWorldTransform: string = "";
  private lastBgColor: string = "";

  // Per-frame cached values
  private invScaleX: number = 1;
  private invScaleY: number = -1;

  constructor(container: HTMLDivElement) {
    this.container = container;

    this.svgElement = document.createElementNS(SVG_NS, "svg");
    this.svgElement.setAttribute("width", "100%");
    this.svgElement.setAttribute("height", "100%");
    this.svgElement.style.display = "block";
    this.svgElement.style.outline = "none";
    this.svgElement.setAttribute("tabindex", "0");
    this.svgElement.setAttribute("aria-label", "Interactive Texas electrical grid map");
    this.svgElement.setAttribute("role", "application");
    container.appendChild(this.svgElement);

    this.worldGroup = this.createEl("g", { id: "world-transform" }) as SVGGElement;
    this.svgElement.appendChild(this.worldGroup);

    // Create layers in draw order
    this.branchesLayer = this.createEl("g", { id: "branches-layer" }) as SVGGElement;
    this.substationsLayer = this.createEl("g", { id: "substations-layer" }) as SVGGElement;
    this.hoverLabelLayer = this.createEl("g", { id: "hover-label-layer" }) as SVGGElement;

    this.worldGroup.appendChild(this.branchesLayer);
    this.worldGroup.appendChild(this.substationsLayer);
    this.worldGroup.appendChild(this.hoverLabelLayer);

    // Create hover label text element (reused)
    this.hoverLabelText = this.createEl("text", {
      "font-family": "'Share Tech', monospace",
      "font-size": "20",
      "paint-order": "stroke",
      "stroke-linejoin": "round",
      "stroke-width": STR_LABEL_OUTLINE_WIDTH,
      "pointer-events": "none",
    }) as SVGTextElement;
    this.hoverLabelLayer.appendChild(this.hoverLabelText);
  }

  public destroy() {
    this.container.removeChild(this.svgElement);
    this.branchElements.clear();
    this.substationElements.clear();
    this.attrCache.clear();
    this.textCache.clear();
  }

  public draw(state: GameState, isPaused: boolean, isFastForward: boolean) {
    this.setThemeColors(state);
    this.updateAnimation(state, isPaused, isFastForward);
    this.updateBackground();
    this.updateWorldTransform(state);

    // Cache inverse scale for this frame (used by substations and hover label)
    this.invScaleX = 1 / state.scaleX;
    this.invScaleY = -1 / state.scaleY;

    this.ensureBorder(state);
    this.syncBranches(state, isPaused);
    this.syncSubstations(state);
    this.updateHoverLabel(state);
  }

  public setInitialView(state: GameState) {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    if (width === 0 || height === 0) return;

    const mapWidth = state.xmax - state.xmin;
    const mapHeight = state.ymax - state.ymin;
    const scaleToFitX = width / mapWidth;
    const scaleToFitY = height / mapHeight;
    const initialScale = Math.min(scaleToFitX, scaleToFitY);

    state.scaleX = initialScale;
    state.scaleY = initialScale;
    state.scale_min = initialScale;
    state.x0 = state.xmin - (width / initialScale - mapWidth) / 2;
    state.y0 = state.ymax + (height / initialScale - mapHeight) / 2;
  }

  public resizeCanvas(): boolean {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    if (width !== this.lastWidth || height !== this.lastHeight) {
      this.lastWidth = width;
      this.lastHeight = height;
      return true;
    }
    return false;
  }

  public isCanvasReady(): boolean {
    return this.container.offsetWidth > 0 && this.container.offsetHeight > 0;
  }

  // --- Private Helpers ---

  private createEl(tag: string, attrs?: Record<string, string>): SVGElement {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        el.setAttribute(k, v);
      }
    }
    return el;
  }

  /** Only calls setAttribute when the value has actually changed,
   *  using a JS-side cache to avoid DOM reads via getAttribute(). */
  private setAttr(el: SVGElement, name: string, value: string) {
    let elCache = this.attrCache.get(el);
    if (!elCache) {
      elCache = new Map();
      this.attrCache.set(el, elCache);
    }
    if (elCache.get(name) !== value) {
      el.setAttribute(name, value);
      elCache.set(name, value);
    }
  }

  /** Only calls removeAttribute when the attribute is in the cache. */
  private removeAttr(el: SVGElement, name: string) {
    const elCache = this.attrCache.get(el);
    if (elCache && elCache.has(name)) {
      el.removeAttribute(name);
      elCache.delete(name);
    }
  }

  /** Only updates textContent when the value has changed, using JS-side cache. */
  private setText(el: SVGElement, text: string) {
    if (this.textCache.get(el) !== text) {
      el.textContent = text;
      this.textCache.set(el, text);
    }
  }

  /** Remove all cache entries for an element and its children. */
  private clearCacheForElement(el: SVGElement) {
    this.attrCache.delete(el);
    this.textCache.delete(el);
  }

  private setThemeColors(state: GameState) {
    if (state.theme === this.cachedTheme) return;
    this.cachedTheme = state.theme;

    const bodyStyles = window.getComputedStyle(document.body);
    // Read from CSS variables to ensure opaque colors. The computed
    // body backgroundColor can be transparent ("rgba(0,0,0,0)") when no
    // explicit background-color is set, which causes SVG compositing
    // artifacts (flashing) during branch animation repaints.
    this.primaryColor = bodyStyles.getPropertyValue("--foreground").trim() || bodyStyles.color;
    this.secondaryColor = bodyStyles.getPropertyValue("--background").trim() || bodyStyles.backgroundColor;
    this.colorWarning = bodyStyles.getPropertyValue("--color-warning").trim();
    this.colorOverloadCritical = bodyStyles.getPropertyValue("--color-overload-critical").trim();
  }

  private updateAnimation(state: GameState, isPaused: boolean, isFastForward: boolean) {
    if (!state.animationsEnabled) return;

    if (!isPaused) {
      const speedFactor = isFastForward ? DrawingConfig.ANIMATION_SPEED_FACTOR * 3 : DrawingConfig.ANIMATION_SPEED_FACTOR;
      state.anim_cycle_state = (state.anim_cycle_state + speedFactor) % DrawingConfig.POWER_FLOW_PATTERN_LENGTH;
      this.isHoverAnimationActive = false;
    } else {
      if (state.hoverBranch) {
        if (!this.isHoverAnimationActive) {
          this.hoverAnimCycleState = state.anim_cycle_state;
          this.isHoverAnimationActive = true;
        }
        this.hoverAnimCycleState = (this.hoverAnimCycleState + DrawingConfig.ANIMATION_SPEED_FACTOR) % DrawingConfig.POWER_FLOW_PATTERN_LENGTH;
      } else {
        this.isHoverAnimationActive = false;
      }
    }
  }

  private updateBackground() {
    if (this.lastBgColor !== this.secondaryColor) {
      this.svgElement.style.backgroundColor = this.secondaryColor;
      this.lastBgColor = this.secondaryColor;
    }
  }

  private updateWorldTransform(state: GameState) {
    // Update zoom limits
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    const mapWidth = state.xmax - state.xmin;
    const mapHeight = state.ymax - state.ymin;
    const scaleToFitX = width / mapWidth;
    const scaleToFitY = height / mapHeight;
    state.scale_min = Math.min(scaleToFitX, scaleToFitY);

    // Apply view bounds BEFORE setting the matrix (matches canvas ordering)
    this.applyViewBounds(state);

    const a = state.scaleX;
    const d = -state.scaleY;
    const e = -state.scaleX * state.x0;
    const f = state.scaleY * state.y0;

    const transform = `matrix(${a},0,0,${d},${e},${f})`;
    if (transform !== this.lastWorldTransform) {
      this.worldGroup.setAttribute("transform", transform);
      this.lastWorldTransform = transform;
    }
  }

  private applyViewBounds(state: GameState) {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    const viewWidth = width / state.scaleX;
    const viewHeight = height / state.scaleY;
    const mapWidth = state.xmax - state.xmin;
    const mapHeight = state.ymax - state.ymin;

    if (viewWidth > mapWidth) {
      const minX0 = state.xmax - viewWidth;
      const maxX0 = state.xmin;
      if (state.x0 < minX0) state.x0 = minX0;
      if (state.x0 > maxX0) state.x0 = maxX0;
    } else {
      const minX0 = state.xmin;
      const maxX0 = state.xmax - viewWidth;
      if (state.x0 < minX0) state.x0 = minX0;
      if (state.x0 > maxX0) state.x0 = maxX0;
    }

    if (viewHeight > mapHeight) {
      const minY0 = state.ymax;
      const maxY0 = state.ymin + viewHeight;
      if (state.y0 < minY0) state.y0 = minY0;
      if (state.y0 > maxY0) state.y0 = maxY0;
    } else {
      const minY0 = state.ymin + viewHeight;
      const maxY0 = state.ymax;
      if (state.y0 > maxY0) state.y0 = maxY0;
      if (state.y0 < minY0) state.y0 = minY0;
    }
  }

  // --- Border ---

  private ensureBorder(state: GameState) {
    if (this.borderInitialized || !state.borders || state.borders.length === 0) return;

    const points = state.borders.map(([lon, lat]) => `${lon},${lat}`).join(" ");
    this.borderElement = this.createEl("polyline", {
      points,
      fill: "none",
      stroke: this.primaryColor,
      "stroke-width": String(DrawingConfig.BORDER_LINE_WIDTH),
      "vector-effect": "non-scaling-stroke",
      "pointer-events": "none",
    }) as SVGPolylineElement;

    this.worldGroup.insertBefore(this.borderElement, this.branchesLayer);
    this.borderInitialized = true;
  }

  // --- Branches ---

  private syncBranches(state: GameState, isPaused: boolean) {
    const stateKeys = new Set(Object.keys(state.branches));

    // Remove branches no longer in state
    for (const [key, elems] of this.branchElements) {
      if (!stateKeys.has(key)) {
        // Clear cache for all child elements
        this.clearCacheForElement(elems.baseLine1);
        this.clearCacheForElement(elems.flowBg1);
        this.clearCacheForElement(elems.flowFg1);
        if (elems.baseLine2) {
          this.clearCacheForElement(elems.baseLine2);
          this.clearCacheForElement(elems.flowBg2!);
          this.clearCacheForElement(elems.flowFg2!);
        }
        elems.group.remove();
        this.branchElements.delete(key);
      }
    }

    // Pre-compute radii for this frame (only 2 possible values: normal and hover)
    const normalRadius = this.getDynamicBranchRadius(state, false);
    const hoverRadius = this.getDynamicBranchRadius(state, true);

    for (const key of stateKeys) {
      const branch = state.branches[key];
      if (!branch.sub1 || !branch.sub2) continue;

      let elems = this.branchElements.get(key);
      if (!elems) {
        elems = this.createBranchElements(branch);
        this.branchElements.set(key, elems);
      }

      const isHover = branch === state.hoverBranch;
      const radius = isHover ? hoverRadius : normalRadius;
      this.updateBranchElements(state, branch, elems, isPaused, radius);
    }

    // Update border color on theme change
    if (this.borderElement) {
      this.setAttr(this.borderElement, "stroke", this.primaryColor);
    }
  }

  private createBranchElements(branch: Branch): BranchElements {
    const group = this.createEl("g", { "data-branch-id": branch.Number }) as SVGGElement;

    const lineAttrs = {
      "vector-effect": "non-scaling-stroke" as string,
      "pointer-events": "none" as string,
    };

    const baseLine1 = this.createEl("line", lineAttrs) as SVGLineElement;
    const flowBg1 = this.createEl("line", { ...lineAttrs, visibility: "hidden" }) as SVGLineElement;
    const flowFg1 = this.createEl("line", { ...lineAttrs, visibility: "hidden" }) as SVGLineElement;
    group.appendChild(baseLine1);
    group.appendChild(flowBg1);
    group.appendChild(flowFg1);

    const elems: BranchElements = { group, baseLine1, flowBg1, flowFg1 };

    if (branch.Circuits === 2) {
      const baseLine2 = this.createEl("line", lineAttrs) as SVGLineElement;
      const flowBg2 = this.createEl("line", { ...lineAttrs, visibility: "hidden" }) as SVGLineElement;
      const flowFg2 = this.createEl("line", { ...lineAttrs, visibility: "hidden" }) as SVGLineElement;
      group.appendChild(baseLine2);
      group.appendChild(flowBg2);
      group.appendChild(flowFg2);
      elems.baseLine2 = baseLine2;
      elems.flowBg2 = flowBg2;
      elems.flowFg2 = flowFg2;
    }

    this.branchesLayer.appendChild(group);
    return elems;
  }

  private updateBranchElements(state: GameState, branch: Branch, elems: BranchElements, isPaused: boolean, radius: number) {
    const s1 = branch.sub1!;
    const s2 = branch.sub2!;
    const isHover = branch === state.hoverBranch;
    const powerFlowsForward = branch.P >= 0;

    if (branch.Circuits === 2) {
      this.updateCircuitLine(state, branch, branch.Status1, s1, s2, radius, powerFlowsForward, -1, isHover, isPaused,
        elems.baseLine1, elems.flowBg1, elems.flowFg1);
      this.updateCircuitLine(state, branch, branch.Status2, s1, s2, radius, powerFlowsForward, 1, isHover, isPaused,
        elems.baseLine2!, elems.flowBg2!, elems.flowFg2!);
    } else {
      this.updateCircuitLine(state, branch, branch.Status1, s1, s2, radius, powerFlowsForward, 0, isHover, isPaused,
        elems.baseLine1, elems.flowBg1, elems.flowFg1);
      if (elems.baseLine2) {
        this.setAttr(elems.baseLine2, "visibility", "hidden");
        this.setAttr(elems.flowBg2!, "visibility", "hidden");
        this.setAttr(elems.flowFg2!, "visibility", "hidden");
      }
    }
  }

  private updateCircuitLine(
    state: GameState, branch: Branch, status: string,
    s1: Substation, s2: Substation, radius: number,
    powerFlowsForward: boolean, offsetMultiplier: number,
    isHover: boolean, isPaused: boolean,
    baseLine: SVGLineElement, flowBg: SVGLineElement, flowFg: SVGLineElement
  ) {
    let x1 = s1.Longitude, y1 = s1.Latitude;
    let x2 = s2.Longitude, y2 = s2.Latitude;

    if (offsetMultiplier !== 0) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const offsetFactor = DrawingConfig.SECOND_CIRCUIT_OFFSET_FACTOR;
        const totalOffset = radius * offsetFactor / state.scaleX;
        const offset = (totalOffset / 2) * offsetMultiplier;
        const perpX = -dy / dist * offset;
        const perpY = dx / dist * offset;
        x1 += perpX; y1 += perpY;
        x2 += perpX; y2 += perpY;
      }
    }

    const sx1 = String(x1), sy1 = String(y1), sx2 = String(x2), sy2 = String(y2);
    this.setAttr(baseLine, "x1", sx1);
    this.setAttr(baseLine, "y1", sy1);
    this.setAttr(baseLine, "x2", sx2);
    this.setAttr(baseLine, "y2", sy2);
    this.setAttr(baseLine, "visibility", "visible");

    this.setAttr(flowBg, "x1", sx1);
    this.setAttr(flowBg, "y1", sy1);
    this.setAttr(flowBg, "x2", sx2);
    this.setAttr(flowBg, "y2", sy2);
    this.setAttr(flowFg, "x1", sx1);
    this.setAttr(flowFg, "y1", sy1);
    this.setAttr(flowFg, "x2", sx2);
    this.setAttr(flowFg, "y2", sy2);

    const radiusStr = String(radius);

    switch (status) {
      case BranchStatus.IN: {
        const baseColor = this.getBranchOverloadColor(branch);
        this.setAttr(baseLine, "stroke", baseColor);
        this.setAttr(baseLine, "stroke-width", radiusStr);
        this.removeAttr(baseLine, "stroke-dasharray");
        this.removeAttr(baseLine, "stroke-dashoffset");

        const hasPowerFlow = Math.abs(branch.P) > DrawingConfig.MIN_POWER_FOR_ANIMATION;
        if (hasPowerFlow && state.animationsEnabled) {
          const useHoverAnimation = isPaused && isHover;
          const lineWidth = String(radius * DrawingConfig.POWER_FLOW_LINE_WIDTH_FACTOR);

          let baseOffset: number;
          if (useHoverAnimation) {
            baseOffset = this.hoverAnimCycleState;
          } else {
            baseOffset = state.anim_cycle_state;
          }
          const finalOffset = powerFlowsForward ? baseOffset : DrawingConfig.POWER_FLOW_PATTERN_LENGTH - baseOffset;

          this.setAttr(flowBg, "visibility", "visible");
          this.setAttr(flowBg, "stroke", this.secondaryColor);
          this.setAttr(flowBg, "stroke-width", lineWidth);
          this.setAttr(flowBg, "stroke-dasharray", DASH_FLOW_BG);
          // dashoffset changes every frame for animation
          this.setAttr(flowBg, "stroke-dashoffset", String(finalOffset + 1));

          this.setAttr(flowFg, "visibility", "visible");
          this.setAttr(flowFg, "stroke", AppColors.POWER_FLOW);
          this.setAttr(flowFg, "stroke-width", lineWidth);
          this.setAttr(flowFg, "stroke-dasharray", DASH_FLOW_FG);
          this.setAttr(flowFg, "stroke-dashoffset", String(finalOffset));
        } else {
          this.setAttr(flowBg, "visibility", "hidden");
          this.setAttr(flowFg, "visibility", "hidden");
        }
        break;
      }
      case BranchStatus.DIS: {
        this.setAttr(baseLine, "stroke", this.primaryColor);
        this.setAttr(baseLine, "stroke-width", radiusStr);
        this.removeAttr(baseLine, "stroke-dasharray");
        this.removeAttr(baseLine, "stroke-dashoffset");

        this.setAttr(flowBg, "visibility", "visible");
        this.setAttr(flowBg, "stroke", this.secondaryColor);
        this.setAttr(flowBg, "stroke-width", String(radius * DrawingConfig.POWER_FLOW_LINE_WIDTH_FACTOR));
        this.setAttr(flowBg, "stroke-dasharray", DASH_DISCONNECTED);
        this.removeAttr(flowBg, "stroke-dashoffset");
        this.setAttr(flowFg, "visibility", "hidden");
        break;
      }
      case BranchStatus.TRIP: {
        this.setAttr(baseLine, "stroke", AppColors.TRIPPED);
        this.setAttr(baseLine, "stroke-width", radiusStr);
        this.setAttr(baseLine, "stroke-dasharray", DASH_DISCONNECTED);
        this.removeAttr(baseLine, "stroke-dashoffset");
        this.setAttr(flowBg, "visibility", "hidden");
        this.setAttr(flowFg, "visibility", "hidden");
        break;
      }
    }
  }

  private getDynamicBranchRadius(state: GameState, isHover: boolean): number {
    const baseRadius = isHover ? DrawingConfig.BRANCH_RADIUS_HOVER : DrawingConfig.BRANCH_RADIUS_NORMAL;
    const maxRadius = isHover ? DrawingConfig.BRANCH_RADIUS_HOVER_MAX : DrawingConfig.BRANCH_RADIUS_MAX;
    const scaleFactor = Math.sqrt(state.scaleX / activeCase.mapConfig.initialView.scale);
    const radius = baseRadius * scaleFactor;
    return Math.max(DrawingConfig.BRANCH_RADIUS_MIN, Math.min(radius, maxRadius));
  }

  private getBranchOverloadColor(branch: Branch): string {
    let activeCircuits: number;
    if (branch.Circuits === 1) {
      activeCircuits = branch.Status1 === BranchStatus.IN ? 1 : 0;
    } else {
      activeCircuits = (branch.Status1 === BranchStatus.IN ? 1 : 0) + (branch.Status2 === BranchStatus.IN ? 1 : 0);
    }
    if (activeCircuits === 0) return this.primaryColor;
    const overloadRatio = Math.abs(branch.P) / (activeCircuits * branch.Pmax);
    if (overloadRatio > DrawingConfig.BRANCH_OVERLOAD_CRITICAL_THRESHOLD_DRAW) return this.colorOverloadCritical;
    if (overloadRatio > DrawingConfig.BRANCH_OVERLOAD_NORMAL_THRESHOLD) return this.colorWarning;
    return this.primaryColor;
  }

  // --- Substations ---

  private syncSubstations(state: GameState) {
    const stateKeys = new Set(Object.keys(state.subs));
    const scaleChanged = state.scaleX !== this.lastScaleX;

    // Remove substations no longer in state
    for (const [key, elems] of this.substationElements) {
      if (!stateKeys.has(key)) {
        this.clearCacheForElement(elems.background);
        this.clearCacheForElement(elems.piePath);
        this.clearCacheForElement(elems.border);
        this.clearCacheForElement(elems.label);
        this.clearCacheForElement(elems.innerGroup);
        if (elems.outerRingBg) this.clearCacheForElement(elems.outerRingBg);
        if (elems.outerRing) this.clearCacheForElement(elems.outerRing);
        elems.group.remove();
        this.substationElements.delete(key);
      }
    }

    // Pre-compute substation radii (only 2 possible values: normal and hover)
    const normalR = getDynamicSubstationRadius(state.scaleX, activeCase.mapConfig.initialView.scale, false);
    const hoverR = getDynamicSubstationRadius(state.scaleX, activeCase.mapConfig.initialView.scale, true);
    const normalRStr = String(normalR);
    const hoverRStr = String(hoverR);

    // Pre-compute counter-scale transform string (only changes on zoom)
    const counterScaleTransform = scaleChanged ? `scale(${this.invScaleX},${this.invScaleY})` : "";

    // Pre-compute outer ring values for generators
    const normalOuterR = normalR * DrawingConfig.GENERATOR_OUTER_RADIUS_FACTOR;
    const hoverOuterR = hoverR * DrawingConfig.GENERATOR_OUTER_RADIUS_FACTOR;
    const normalOuterRStr = String(normalOuterR);
    const hoverOuterRStr = String(hoverOuterR);
    const normalOuterRBgStr = String(normalOuterR + 1);
    const hoverOuterRBgStr = String(hoverOuterR + 1);

    for (const key of stateKeys) {
      const sub = state.subs[key];
      let elems = this.substationElements.get(key);
      if (!elems) {
        elems = this.createSubstationElements(sub);
        this.substationElements.set(key, elems);
      }

      const isHover = sub === state.hoverSub;
      const r = isHover ? hoverR : normalR;
      const rStr = isHover ? hoverRStr : normalRStr;
      const outerRStr = isHover ? hoverOuterRStr : normalOuterRStr;
      const outerRBgStr = isHover ? hoverOuterRBgStr : normalOuterRBgStr;

      this.updateSubstationElements(sub, elems, state, isHover, scaleChanged, counterScaleTransform, r, rStr, outerRStr, outerRBgStr);
    }

    this.lastScaleX = state.scaleX;
  }

  private createSubstationElements(sub: Substation): SubstationElements {
    const group = this.createEl("g", {
      "data-sub-id": sub.Number,
      transform: `translate(${sub.Longitude},${sub.Latitude})`,
    }) as SVGGElement;

    const innerGroup = this.createEl("g", {
      transform: `scale(${this.invScaleX},${this.invScaleY})`,
    }) as SVGGElement;
    group.appendChild(innerGroup);

    const isGenerator = sub.Category !== SubstationCategory.Load;
    const elems: SubstationElements = {
      group,
      innerGroup,
      background: this.createEl("circle", { fill: this.secondaryColor }) as SVGCircleElement,
      piePath: this.createEl("path", { visibility: "hidden" }) as SVGPathElement,
      border: this.createEl("circle", { fill: "none" }) as SVGCircleElement,
      label: this.createEl("text", {
        "font-family": "'Share Tech', monospace",
        "paint-order": "stroke",
        "stroke-linejoin": "round",
        "stroke-width": STR_LABEL_OUTLINE_WIDTH,
        "pointer-events": "none",
      }) as SVGTextElement,
      cachedPieR: -1,
      cachedPieFill: -1,
      cachedPiePath: "",
    };

    if (isGenerator) {
      elems.outerRingBg = this.createEl("circle", {
        fill: "none",
        stroke: "#FFFFFF",
        "stroke-width": STR_GENERATOR_OUTLINE_WIDTH_PLUS_2,
      }) as SVGCircleElement;
      elems.outerRing = this.createEl("circle", {
        "stroke-width": STR_GENERATOR_OUTLINE_WIDTH,
      }) as SVGCircleElement;

      innerGroup.appendChild(elems.outerRingBg);
      innerGroup.appendChild(elems.outerRing);
    }

    innerGroup.appendChild(elems.background);
    innerGroup.appendChild(elems.piePath);
    innerGroup.appendChild(elems.border);
    innerGroup.appendChild(elems.label);

    this.substationsLayer.appendChild(group);
    return elems;
  }

  private updateSubstationElements(
    sub: Substation, elems: SubstationElements, state: GameState,
    isHover: boolean, scaleChanged: boolean, counterScaleTransform: string,
    r: number, rStr: string, outerRStr: string, outerRBgStr: string,
  ) {
    const isGenerator = sub.Category !== SubstationCategory.Load;

    // Update counter-scale when zoom changes
    if (scaleChanged) {
      this.setAttr(elems.innerGroup, "transform", counterScaleTransform);
    }

    const P = this.getSubstationPower(sub);
    const allTripped = this.isSubstationTripped(sub);

    if (isGenerator) {
      const genColor = this.getGeneratorColor(sub.Category);
      const displayColor = allTripped ? AppColors.TRIPPED : genColor;

      // Outer ring
      this.setAttr(elems.outerRingBg!, "r", outerRBgStr);
      this.setAttr(elems.outerRing!, "r", outerRStr);
      this.setAttr(elems.outerRing!, "fill", displayColor);
      this.setAttr(elems.outerRing!, "stroke", displayColor);

      // Background
      this.setAttr(elems.background, "r", rStr);
      this.setAttr(elems.background, "fill", this.secondaryColor);

      // Pie chart
      const clampedP = Math.max(0, Math.min(P, sub.Pmax));
      if (sub.Pmax > 0 && clampedP > 0 && !allTripped) {
        const fillRatio = clampedP / sub.Pmax;
        const arcPath = this.getCachedPieArcPath(elems, r, fillRatio);
        if (arcPath) {
          this.setAttr(elems.piePath, "d", arcPath);
          this.setAttr(elems.piePath, "fill", displayColor);
          this.setAttr(elems.piePath, "visibility", "visible");
        } else {
          this.setAttr(elems.piePath, "visibility", "hidden");
        }
      } else {
        this.setAttr(elems.piePath, "visibility", "hidden");
      }

      // Border
      this.setAttr(elems.border, "r", rStr);
      this.setAttr(elems.border, "stroke", displayColor);
      this.setAttr(elems.border, "stroke-width", STR_GENERATOR_OUTLINE_WIDTH);
    } else {
      // Load substation
      const displayColor = allTripped ? AppColors.TRIPPED : this.primaryColor;
      const Pmax = sub.Pmax * state.fr_load;

      this.setAttr(elems.background, "r", rStr);
      this.setAttr(elems.background, "fill", this.secondaryColor);

      if (Pmax > 0 && P > 0 && !allTripped) {
        const fillRatio = Math.max(0, Math.min(1, P / Pmax));
        const arcPath = this.getCachedPieArcPath(elems, r, fillRatio);
        if (arcPath) {
          this.setAttr(elems.piePath, "d", arcPath);
          this.setAttr(elems.piePath, "fill", this.primaryColor);
          this.setAttr(elems.piePath, "visibility", "visible");
        } else {
          this.setAttr(elems.piePath, "visibility", "hidden");
        }
      } else {
        this.setAttr(elems.piePath, "visibility", "hidden");
      }

      this.setAttr(elems.border, "r", rStr);
      this.setAttr(elems.border, "stroke", displayColor);
      this.setAttr(elems.border, "stroke-width", STR_SUBSTATION_BORDER_WIDTH);
    }

    // Label
    if (state.renderCanvasText) {
      this.setAttr(elems.label, "font-size", isHover ? STR_FONT_SIZE_HOVER : STR_FONT_SIZE_NORMAL);
      this.setAttr(elems.label, "x", STR_LABEL_OFFSET_X);
      this.setAttr(elems.label, "y", STR_LABEL_OFFSET_Y);
      this.setAttr(elems.label, "fill", this.primaryColor);
      this.setAttr(elems.label, "stroke", this.secondaryColor);
      this.setText(elems.label, sub.Name);
      this.setAttr(elems.label, "visibility", "visible");
    } else {
      this.setAttr(elems.label, "visibility", "hidden");
    }
  }

  /** Returns cached arc path if r and fillRatio haven't changed. */
  private getCachedPieArcPath(elems: SubstationElements, r: number, fillRatio: number): string {
    if (elems.cachedPieR === r && elems.cachedPieFill === fillRatio) {
      return elems.cachedPiePath;
    }
    const path = this.createPieArcPath(r, fillRatio);
    elems.cachedPieR = r;
    elems.cachedPieFill = fillRatio;
    elems.cachedPiePath = path;
    return path;
  }

  private createPieArcPath(r: number, fillRatio: number): string {
    if (fillRatio < 0.01) {
      return "";
    }

    if (fillRatio >= 0.99) {
      return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;
    }

    const angle = TWO_PI * fillRatio;
    const startY = -r;
    const endAngle = PIE_CHART_START_ANGLE + angle;
    const endX = Math.round(r * Math.cos(endAngle) * 100) / 100;
    const endY = Math.round(r * Math.sin(endAngle) * 100) / 100;
    const largeArc = fillRatio > 0.5 ? 1 : 0;

    return `M 0 0 L 0 ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`;
  }

  private getGeneratorColor(category: string): string {
    const config = GenerationTypeConfig[category as SubstationCategory];
    return config?.color || GenerationTypeConfig[SubstationCategory.Thermal].color;
  }

  private getSubstationPower(sub: Substation): number {
    return sub.U.reduce((acc, unit) => acc + unit.P, 0);
  }

  private isSubstationTripped(sub: Substation): boolean {
    if (sub.Units === 0) return false;
    return sub.U.every((unit) => unit.Status === UnitStatus.TRIP);
  }

  // --- Hover Label ---

  private updateHoverLabel(state: GameState) {
    if (!state.hoverBranch) {
      this.setAttr(this.hoverLabelText, "visibility", "hidden");
      return;
    }

    const branch = state.hoverBranch;
    if (!branch.sub1 || !branch.sub2) {
      this.setAttr(this.hoverLabelText, "visibility", "hidden");
      return;
    }

    const lat = 0.5 * (branch.sub1.Latitude + branch.sub2.Latitude);
    const lon = 0.5 * (branch.sub1.Longitude + branch.sub2.Longitude);

    // Use cached inverse scale values
    this.setAttr(
      this.hoverLabelText, "transform",
      `translate(${lon},${lat}) scale(${this.invScaleX},${this.invScaleY})`
    );
    this.setAttr(this.hoverLabelText, "x", STR_LABEL_OFFSET_X);
    this.setAttr(this.hoverLabelText, "y", STR_LABEL_OFFSET_Y);

    let text = `${Math.abs(branch.P).toFixed(0)} MW`;
    let color = this.primaryColor;

    // Inline active circuit count (avoids separate function call)
    let activeCircuits: number;
    if (branch.Circuits === 1) {
      activeCircuits = branch.Status1 === BranchStatus.IN ? 1 : 0;
    } else {
      activeCircuits = (branch.Status1 === BranchStatus.IN ? 1 : 0) + (branch.Status2 === BranchStatus.IN ? 1 : 0);
    }

    const isAnyTripped = branch.Status1 === BranchStatus.TRIP || (branch.Circuits === 2 && branch.Status2 === BranchStatus.TRIP);
    const areAllDisconnected = activeCircuits === 0 && !isAnyTripped;

    const capacity = activeCircuits * branch.Pmax;
    const overloadRatio = capacity > 0 ? Math.abs(branch.P) / capacity : Infinity;
    const isCriticallyOverloaded = overloadRatio > DrawingConfig.BRANCH_OVERLOAD_CRITICAL_THRESHOLD_LABEL;
    const isOverloaded = overloadRatio > DrawingConfig.BRANCH_OVERLOAD_NORMAL_THRESHOLD;

    if (isAnyTripped) {
      text = "Tripped";
      color = AppColors.TRIPPED;
    } else if (areAllDisconnected) {
      text = "Out of Service";
    } else if (isCriticallyOverloaded) {
      color = this.colorOverloadCritical;
      text += " (Critically Overloaded)";
    } else if (isOverloaded) {
      color = this.colorWarning;
      text += " (Overloaded)";
    }

    this.setText(this.hoverLabelText, text);
    this.setAttr(this.hoverLabelText, "fill", color);
    this.setAttr(this.hoverLabelText, "stroke", this.secondaryColor);
    this.setAttr(this.hoverLabelText, "visibility", "visible");
  }
}
