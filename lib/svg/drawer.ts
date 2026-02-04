import { Branch, GameState, Substation, BranchStatus, UnitStatus, SubstationCategory } from "../types";
import { DrawingConfig, getDynamicSubstationRadius } from "../config";
import { IGridDrawer } from "../interfaces";
import { activeCase } from "@/data/cases";

const SVG_NS = "http://www.w3.org/2000/svg";
const TWO_PI = Math.PI * 2;
const PIE_CHART_START_ANGLE = -Math.PI / 2;

// Pre-computed constant strings
const STR_GENERATOR_OUTLINE_WIDTH = String(DrawingConfig.GENERATOR_OUTLINE_WIDTH);
const STR_GENERATOR_OUTLINE_WIDTH_PLUS_2 = String(DrawingConfig.GENERATOR_OUTLINE_WIDTH + 2);
const STR_SUBSTATION_BORDER_WIDTH = String(DrawingConfig.SUBSTATION_BORDER_WIDTH);
const STR_LABEL_OUTLINE_WIDTH = String(DrawingConfig.LABEL_OUTLINE_WIDTH);

// Flow animation: JS-driven offset with zoom-scaled dash patterns.
// Speed in screen px/ms (constant regardless of zoom).
const FLOW_SPEED_NORMAL = 32 / 1067; // ~0.03 px/ms
const FLOW_SPEED_FAST = 32 / 356;    // ~0.09 px/ms
const FLOW_SCALE_MIN = 0.7;
const FLOW_SCALE_MAX = 2.0;

// Map SubstationCategory enum to short CSS-friendly strings for data-category attribute
const CATEGORY_CSS: Record<string, string> = {
  [SubstationCategory.Nuclear]: "nuclear",
  [SubstationCategory.Thermal]: "thermal",
  [SubstationCategory.GasTurbine]: "thermal",
  [SubstationCategory.GasCombinedCycle]: "thermal",
  [SubstationCategory.CoalFiredSteam]: "thermal",
  [SubstationCategory.Wind]: "wind",
  [SubstationCategory.Solar]: "solar",
  [SubstationCategory.Load]: "load",
};

interface CircuitElements {
  group: SVGGElement;
  baseLine: SVGLineElement;
  flowBg: SVGLineElement;
  flowFg: SVGLineElement;
}

interface BranchElements {
  group: SVGGElement;
  circuit1: CircuitElements;
  circuit2?: CircuitElements;
}

interface SubstationElements {
  group: SVGGElement;
  innerGroup: SVGGElement;
  outerRingBg?: SVGCircleElement;
  outerRing?: SVGCircleElement;
  background: SVGCircleElement;
  piePath: SVGPathElement;
  border: SVGCircleElement;
  label: SVGTextElement;
  // Pie arc path cache
  cachedPieR: number;
  cachedPieFill: number;
  cachedPiePath: string;
  // Label placement (computed once from branch topology + nearby substations)
  labelOffsetX: number;
  labelOffsetY: number;
  labelAnchor: string; // "start" or "end"
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

  // Track previous scale for counter-scale updates
  private lastScaleX: number = 0;

  // Track last container size for resize detection
  private lastWidth: number = 0;
  private lastHeight: number = 0;

  // Track border initialization
  private borderInitialized: boolean = false;

  // Cache for world transform to avoid redundant setAttribute calls
  private lastWorldTransform: string = "";

  // Per-frame cached values
  private invScaleX: number = 1;
  private invScaleY: number = -1;

  // Flow animation state (JS-driven offset)
  private flowOffset: number = 0;
  private hoverFlowOffset: number = 0;
  private lastFrameTime: number = 0;
  private lastFlowScale: number = 1;
  private lastWrittenOffset: number = -1;
  private lastHoverBranchKey: string | null = null;

  // Cached per-substation label offsets (computed once from branch topology)
  private labelOffsets: Map<string, { x: number; y: number }> = new Map();
  private labelOffsetsComputed: boolean = false;

  constructor(container: HTMLDivElement) {
    this.container = container;

    this.svgElement = document.createElementNS(SVG_NS, "svg");
    this.svgElement.setAttribute("width", "100%");
    this.svgElement.setAttribute("height", "100%");
    this.svgElement.setAttribute("class", "grid-map");
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

    // Create hover label text element (reused). Static properties handled by CSS.
    this.hoverLabelText = this.createEl("text", {
      "stroke-width": STR_LABEL_OUTLINE_WIDTH,
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
    this.updateAnimationCSS(state, isPaused, isFastForward);
    this.updateWorldTransform(state);

    // Cache inverse scale for this frame
    this.invScaleX = 1 / state.scaleX;
    this.invScaleY = -1 / state.scaleY;

    this.ensureBorder(state);
    this.ensureLabelOffsets(state);
    this.syncBranches(state);
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

  private removeAttr(el: SVGElement, name: string) {
    const elCache = this.attrCache.get(el);
    if (elCache && elCache.has(name)) {
      el.removeAttribute(name);
      elCache.delete(name);
    }
  }

  private setText(el: SVGElement, text: string) {
    if (this.textCache.get(el) !== text) {
      el.textContent = text;
      this.textCache.set(el, text);
    }
  }

  private clearCacheForElement(el: SVGElement) {
    this.attrCache.delete(el);
    this.textCache.delete(el);
  }

  // --- Animation via CSS Custom Properties ---

  private updateAnimationCSS(state: GameState, isPaused: boolean, isFastForward: boolean) {
    const now = performance.now();
    const dt = Math.min(this.lastFrameTime > 0 ? now - this.lastFrameTime : 0, 100);
    this.lastFrameTime = now;

    // Zoom-dependent flow scale: dampened sqrt so dash patterns resize gently with zoom.
    // At reference zoom flowScale=1 (32px cycle). Clamped to keep packets legible at extremes.
    const zoomRatio = state.scaleX / activeCase.mapConfig.initialView.scale;
    const flowScale = Math.max(FLOW_SCALE_MIN, Math.min(FLOW_SCALE_MAX, Math.sqrt(zoomRatio)));

    // When zoom changes, rescale offsets so dashes hold their visual position,
    // then update the dash-pattern CSS custom properties.
    if (flowScale !== this.lastFlowScale) {
      const ratio = flowScale / this.lastFlowScale;
      this.flowOffset *= ratio;
      this.hoverFlowOffset *= ratio;

      const dashBg = `${(12 * flowScale).toFixed(1)} ${(20 * flowScale).toFixed(1)}`;
      const dashFg = `${(10 * flowScale).toFixed(1)} ${(22 * flowScale).toFixed(1)}`;
      this.branchesLayer.style.setProperty("--flow-dash-bg", dashBg);
      this.branchesLayer.style.setProperty("--flow-dash-fg", dashFg);
      this.lastFlowScale = flowScale;
    }

    // Accumulate flow offset when playing
    if (state.animationsEnabled && !isPaused && dt > 0) {
      const speed = isFastForward ? FLOW_SPEED_FAST : FLOW_SPEED_NORMAL;
      this.flowOffset += speed * dt;
      if (this.flowOffset > 10000) this.flowOffset -= 10000;
    }

    // Only write to DOM when the offset actually changed
    if (this.flowOffset !== this.lastWrittenOffset) {
      this.branchesLayer.style.setProperty("--flow-offset", String(this.flowOffset));
      this.lastWrittenOffset = this.flowOffset;
    }

    // Handle hover-during-pause: animate only the hovered branch via local override
    const hoverBranchKey = (isPaused && state.hoverBranch) ? state.hoverBranch.Number : null;
    if (hoverBranchKey !== this.lastHoverBranchKey) {
      // Remove override from previous hovered branch
      if (this.lastHoverBranchKey) {
        const prevElems = this.branchElements.get(this.lastHoverBranchKey);
        if (prevElems) {
          prevElems.circuit1.group.style.removeProperty("--flow-offset");
          prevElems.circuit2?.group.style.removeProperty("--flow-offset");
        }
      }
      // Sync hover offset to current global offset when starting hover
      if (hoverBranchKey) {
        this.hoverFlowOffset = this.flowOffset;
      }
      this.lastHoverBranchKey = hoverBranchKey;
    }

    // Accumulate hover offset independently when paused
    if (isPaused && hoverBranchKey && state.animationsEnabled && dt > 0) {
      this.hoverFlowOffset += FLOW_SPEED_NORMAL * dt;
      if (this.hoverFlowOffset > 10000) this.hoverFlowOffset -= 10000;
      const elems = this.branchElements.get(hoverBranchKey);
      if (elems) {
        const hoverStr = String(this.hoverFlowOffset);
        elems.circuit1.group.style.setProperty("--flow-offset", hoverStr);
        elems.circuit2?.group.style.setProperty("--flow-offset", hoverStr);
      }
    }
  }

  // --- World Transform ---

  private updateWorldTransform(state: GameState) {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    if (width === 0 || height === 0) return;

    const mapWidth = state.xmax - state.xmin;
    const mapHeight = state.ymax - state.ymin;
    const scaleToFitX = width / mapWidth;
    const scaleToFitY = height / mapHeight;
    state.scale_min = Math.min(scaleToFitX, scaleToFitY);

    // Clamp current scale to [scale_min, scale_max] — handles resize making scale_min larger
    if (state.scaleX < state.scale_min) {
      state.scaleX = state.scale_min;
      state.scaleY = state.scale_min;
    }

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
    if (width === 0 || height === 0) return;

    const viewWidth = width / state.scaleX;
    const viewHeight = height / state.scaleY;
    const mapWidth = state.xmax - state.xmin;
    const mapHeight = state.ymax - state.ymin;

    // X axis: x0 is the left edge of the viewport in world coords.
    // The viewport spans [x0, x0 + viewWidth].
    if (viewWidth >= mapWidth) {
      // Viewport wider than map — center the map horizontally
      state.x0 = state.xmin - (viewWidth - mapWidth) / 2;
    } else {
      // Viewport narrower — clamp so map edges aren't exposed
      if (state.x0 < state.xmin) state.x0 = state.xmin;
      if (state.x0 + viewWidth > state.xmax) state.x0 = state.xmax - viewWidth;
    }

    // Y axis: y0 is the top edge in world coords (y increases upward in world space).
    // The viewport spans [y0 - viewHeight, y0].
    if (viewHeight >= mapHeight) {
      // Viewport taller than map — center the map vertically
      state.y0 = state.ymax + (viewHeight - mapHeight) / 2;
    } else {
      // Viewport shorter — clamp so map edges aren't exposed
      if (state.y0 > state.ymax) state.y0 = state.ymax;
      if (state.y0 - viewHeight < state.ymin) state.y0 = state.ymin + viewHeight;
    }
  }

  // --- Border ---

  private ensureBorder(state: GameState) {
    if (this.borderInitialized || !state.borders || state.borders.length === 0) return;

    const points = state.borders.map(([lon, lat]) => `${lon},${lat}`).join(" ");
    this.borderElement = this.createEl("polyline", {
      points,
      "stroke-width": String(DrawingConfig.BORDER_LINE_WIDTH),
    }) as SVGPolylineElement;

    this.worldGroup.insertBefore(this.borderElement, this.branchesLayer);
    this.borderInitialized = true;
  }

  // --- Label Placement ---

  // Threshold for considering a substation "nearby" (in degrees lon/lat).
  // Substations within this distance contribute an occupied angle for label avoidance.
  private static readonly NEARBY_THRESHOLD = 0.8;
  private static readonly NEARBY_THRESHOLD_SQ = SvgDrawer.NEARBY_THRESHOLD * SvgDrawer.NEARBY_THRESHOLD;

  /** Compute per-substation label offsets once from branch topology and nearby substations.
   *  For each substation, collect angles to connected branches AND nearby substations,
   *  find the largest angular gap, and place the label in that gap. */
  private ensureLabelOffsets(state: GameState) {
    if (this.labelOffsetsComputed) return;
    // Wait until branch data is loaded (avoid Object.keys allocation per frame)
    let hasBranches = false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _key in state.branches) { hasBranches = true; break; }
    if (!hasBranches) return;

    const subs = state.subs;
    const subIds = Object.keys(subs);

    // Build occupied angles per substation from branches
    const anglesBySubId = new Map<string, number[]>();
    for (const id of subIds) anglesBySubId.set(id, []);

    for (const key in state.branches) {
      const branch = state.branches[key];
      if (!branch.sub1 || !branch.sub2) continue;

      const dx = branch.sub2.Longitude - branch.sub1.Longitude;
      const dy = -(branch.sub2.Latitude - branch.sub1.Latitude);

      anglesBySubId.get(branch.FromNum)!.push(Math.atan2(dy, dx));
      anglesBySubId.get(branch.ToNum)!.push(Math.atan2(-dy, -dx));
    }

    // Add angles to nearby substations (not just branch-connected ones)
    for (let i = 0; i < subIds.length; i++) {
      const a = subs[subIds[i]];
      const anglesA = anglesBySubId.get(subIds[i])!;
      for (let j = i + 1; j < subIds.length; j++) {
        const b = subs[subIds[j]];
        const dx = b.Longitude - a.Longitude;
        const dLat = b.Latitude - a.Latitude;
        if (dx * dx + dLat * dLat < SvgDrawer.NEARBY_THRESHOLD_SQ) {
          const dy = -dLat; // screen-space y flip
          anglesA.push(Math.atan2(dy, dx));
          anglesBySubId.get(subIds[j])!.push(Math.atan2(-dy, -dx));
        }
      }
    }

    const dist = DrawingConfig.LABEL_DISTANCE;

    for (const subId of subIds) {
      const angles = anglesBySubId.get(subId)!;
      if (angles.length === 0) {
        this.labelOffsets.set(subId, { x: dist, y: 4 });
        continue;
      }

      // Sort angles and find the largest gap
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

      const cosA = Math.cos(bestMidAngle);
      const sinA = Math.sin(bestMidAngle);

      // Offset: push label center along the chosen direction
      // Add vertical baseline correction (+4px) so text is visually centered
      this.labelOffsets.set(subId, {
        x: Math.round(dist * cosA),
        y: Math.round(dist * sinA + 4),
      });
    }

    this.labelOffsetsComputed = true;
  }

  /** Returns "end" for labels pointing left, "start" for right. */
  private static labelAnchor(x: number): string {
    return x < 0 ? "end" : "start";
  }

  // --- Branches ---

  private syncBranches(state: GameState) {
    const stateKeys = new Set(Object.keys(state.branches));

    // Remove branches no longer in state
    for (const [key, elems] of this.branchElements) {
      if (!stateKeys.has(key)) {
        this.clearCircuitCache(elems.circuit1);
        if (elems.circuit2) this.clearCircuitCache(elems.circuit2);
        elems.group.remove();
        this.branchElements.delete(key);
      }
    }

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
      this.updateBranchElements(state, branch, elems, radius);
    }
  }

  private clearCircuitCache(circuit: CircuitElements) {
    this.clearCacheForElement(circuit.baseLine);
    this.clearCacheForElement(circuit.flowBg);
    this.clearCacheForElement(circuit.flowFg);
  }

  private createCircuitGroup(): CircuitElements {
    const group = this.createEl("g", { class: "circuit" }) as SVGGElement;
    const baseLine = this.createEl("line", { class: "base" }) as SVGLineElement;
    const flowBg = this.createEl("line", { class: "flow-bg" }) as SVGLineElement;
    const flowFg = this.createEl("line", { class: "flow-fg" }) as SVGLineElement;
    group.appendChild(baseLine);
    group.appendChild(flowBg);
    group.appendChild(flowFg);
    return { group, baseLine, flowBg, flowFg };
  }

  private createBranchElements(branch: Branch): BranchElements {
    const group = this.createEl("g", { "data-branch-id": branch.Number }) as SVGGElement;

    const circuit1 = this.createCircuitGroup();
    group.appendChild(circuit1.group);

    const elems: BranchElements = { group, circuit1 };

    if (branch.Circuits === 2) {
      const circuit2 = this.createCircuitGroup();
      group.appendChild(circuit2.group);
      elems.circuit2 = circuit2;
    }

    this.branchesLayer.appendChild(group);
    return elems;
  }

  private updateBranchElements(state: GameState, branch: Branch, elems: BranchElements, radius: number) {
    const s1 = branch.sub1!;
    const s2 = branch.sub2!;
    const powerFlowsForward = branch.P >= 0;

    // Set overload level on the group (CSS handles color)
    const overloadLevel = this.getOverloadLevel(branch);
    this.setAttr(elems.group, "data-overload", overloadLevel);

    if (branch.Circuits === 2) {
      this.updateCircuit(state, branch, branch.Status1, s1, s2, radius, powerFlowsForward, -1, elems.circuit1);
      this.updateCircuit(state, branch, branch.Status2, s1, s2, radius, powerFlowsForward, 1, elems.circuit2!);
    } else {
      this.updateCircuit(state, branch, branch.Status1, s1, s2, radius, powerFlowsForward, 0, elems.circuit1);
      if (elems.circuit2) {
        this.setAttr(elems.circuit2.baseLine, "visibility", "hidden");
      }
    }
  }

  private updateCircuit(
    state: GameState, branch: Branch, status: string,
    s1: Substation, s2: Substation, radius: number,
    powerFlowsForward: boolean, offsetMultiplier: number,
    circuit: CircuitElements,
  ) {
    let x1 = s1.Longitude, y1 = s1.Latitude;
    let x2 = s2.Longitude, y2 = s2.Latitude;

    if (offsetMultiplier !== 0) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const totalOffset = radius * DrawingConfig.SECOND_CIRCUIT_OFFSET_FACTOR / state.scaleX;
        const offset = (totalOffset / 2) * offsetMultiplier;
        const perpX = -dy / dist * offset;
        const perpY = dx / dist * offset;
        x1 += perpX; y1 += perpY;
        x2 += perpX; y2 += perpY;
      }
    }

    // Set coordinates on all 3 lines (geometry only)
    const sx1 = String(x1), sy1 = String(y1), sx2 = String(x2), sy2 = String(y2);
    this.setAttr(circuit.baseLine, "x1", sx1);
    this.setAttr(circuit.baseLine, "y1", sy1);
    this.setAttr(circuit.baseLine, "x2", sx2);
    this.setAttr(circuit.baseLine, "y2", sy2);
    this.setAttr(circuit.baseLine, "visibility", "visible");

    this.setAttr(circuit.flowBg, "x1", sx1);
    this.setAttr(circuit.flowBg, "y1", sy1);
    this.setAttr(circuit.flowBg, "x2", sx2);
    this.setAttr(circuit.flowBg, "y2", sy2);
    this.setAttr(circuit.flowFg, "x1", sx1);
    this.setAttr(circuit.flowFg, "y1", sy1);
    this.setAttr(circuit.flowFg, "x2", sx2);
    this.setAttr(circuit.flowFg, "y2", sy2);

    // Set stroke-width (geometry, depends on zoom)
    const radiusStr = String(radius);
    const flowWidthStr = String(radius * DrawingConfig.POWER_FLOW_LINE_WIDTH_FACTOR);
    this.setAttr(circuit.baseLine, "stroke-width", radiusStr);
    this.setAttr(circuit.flowBg, "stroke-width", flowWidthStr);
    this.setAttr(circuit.flowFg, "stroke-width", flowWidthStr);

    // Set data-status (CSS handles colors, dash patterns, visibility)
    this.setAttr(circuit.group, "data-status", status);

    // Set animation state: data-animated + direction class
    if (status === BranchStatus.IN) {
      const hasPowerFlow = Math.abs(branch.P) > DrawingConfig.MIN_POWER_FOR_ANIMATION && state.animationsEnabled;
      if (hasPowerFlow) {
        circuit.group.setAttribute("data-animated", "");
        const dirClass = powerFlowsForward ? "flow-forward" : "flow-reverse";
        const oppositeClass = powerFlowsForward ? "flow-reverse" : "flow-forward";
        // Toggle direction classes efficiently
        if (!circuit.group.classList.contains(dirClass)) {
          circuit.group.classList.add(dirClass);
          circuit.group.classList.remove(oppositeClass);
        }
      } else {
        circuit.group.removeAttribute("data-animated");
      }
    } else {
      circuit.group.removeAttribute("data-animated");
    }
  }

  private getDynamicBranchRadius(state: GameState, isHover: boolean): number {
    const baseRadius = isHover ? DrawingConfig.BRANCH_RADIUS_HOVER : DrawingConfig.BRANCH_RADIUS_NORMAL;
    const maxRadius = isHover ? DrawingConfig.BRANCH_RADIUS_HOVER_MAX : DrawingConfig.BRANCH_RADIUS_MAX;
    const scaleFactor = Math.sqrt(state.scaleX / activeCase.mapConfig.initialView.scale);
    const radius = baseRadius * scaleFactor;
    return Math.max(DrawingConfig.BRANCH_RADIUS_MIN, Math.min(radius, maxRadius));
  }

  private getOverloadLevel(branch: Branch): string {
    let activeCircuits: number;
    if (branch.Circuits === 1) {
      activeCircuits = branch.Status1 === BranchStatus.IN ? 1 : 0;
    } else {
      activeCircuits = (branch.Status1 === BranchStatus.IN ? 1 : 0) + (branch.Status2 === BranchStatus.IN ? 1 : 0);
    }
    if (activeCircuits === 0) return "normal";
    const overloadRatio = Math.abs(branch.P) / (activeCircuits * branch.Pmax);
    if (overloadRatio > DrawingConfig.BRANCH_OVERLOAD_CRITICAL_THRESHOLD_DRAW) return "critical";
    if (overloadRatio > DrawingConfig.BRANCH_OVERLOAD_NORMAL_THRESHOLD) return "warning";
    return "normal";
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

    const normalR = getDynamicSubstationRadius(state.scaleX, activeCase.mapConfig.initialView.scale, false);
    const hoverR = getDynamicSubstationRadius(state.scaleX, activeCase.mapConfig.initialView.scale, true);
    const normalRStr = String(normalR);
    const hoverRStr = String(hoverR);

    const counterScaleTransform = scaleChanged ? `scale(${this.invScaleX},${this.invScaleY})` : "";

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
    const categoryCss = CATEGORY_CSS[sub.Category] || "load";
    const group = this.createEl("g", {
      "data-sub-id": sub.Number,
      "data-category": categoryCss,
      transform: `translate(${sub.Longitude},${sub.Latitude})`,
    }) as SVGGElement;

    const innerGroup = this.createEl("g", {
      transform: `scale(${this.invScaleX},${this.invScaleY})`,
    }) as SVGGElement;
    group.appendChild(innerGroup);

    const isGenerator = sub.Category !== SubstationCategory.Load;
    const offset = this.labelOffsets.get(sub.Number) || { x: DrawingConfig.LABEL_OFFSET_X, y: DrawingConfig.LABEL_OFFSET_Y };
    const elems: SubstationElements = {
      group,
      innerGroup,
      background: this.createEl("circle", { class: "sub-bg" }) as SVGCircleElement,
      piePath: this.createEl("path", { class: "sub-pie", visibility: "hidden" }) as SVGPathElement,
      border: this.createEl("circle", { class: "sub-border", "stroke-width": isGenerator ? STR_GENERATOR_OUTLINE_WIDTH : STR_SUBSTATION_BORDER_WIDTH }) as SVGCircleElement,
      label: this.createEl("text", { "stroke-width": STR_LABEL_OUTLINE_WIDTH }) as SVGTextElement,
      cachedPieR: -1,
      cachedPieFill: -1,
      cachedPiePath: "",
      labelOffsetX: offset.x,
      labelOffsetY: offset.y,
      labelAnchor: SvgDrawer.labelAnchor(offset.x),
    };

    if (isGenerator) {
      elems.outerRingBg = this.createEl("circle", {
        class: "outer-ring-bg",
        "stroke-width": STR_GENERATOR_OUTLINE_WIDTH_PLUS_2,
      }) as SVGCircleElement;
      elems.outerRing = this.createEl("circle", {
        class: "outer-ring",
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

    // Hover class toggle
    elems.group.classList.toggle("hovered", isHover);

    const P = this.getSubstationPower(sub);
    const allTripped = this.isSubstationTripped(sub);

    // Tripped data attribute (CSS handles color overrides)
    if (allTripped) {
      elems.group.setAttribute("data-tripped", "");
    } else {
      elems.group.removeAttribute("data-tripped");
    }

    // Outer ring radii (generators only)
    if (isGenerator) {
      this.setAttr(elems.outerRingBg!, "r", outerRBgStr);
      this.setAttr(elems.outerRing!, "r", outerRStr);
    }

    // Background and border radii
    this.setAttr(elems.background, "r", rStr);
    this.setAttr(elems.border, "r", rStr);

    // Pie chart: compute fill ratio based on substation type
    const Pmax = isGenerator ? sub.Pmax : sub.Pmax * state.fr_load;
    const clampedP = Math.max(0, Math.min(P, Pmax));

    if (Pmax > 0 && clampedP > 0 && !allTripped) {
      const fillRatio = clampedP / Pmax;
      const arcPath = this.getCachedPieArcPath(elems, r, fillRatio);
      if (arcPath) {
        this.setAttr(elems.piePath, "d", arcPath);
        this.setAttr(elems.piePath, "visibility", "visible");
      } else {
        this.setAttr(elems.piePath, "visibility", "hidden");
      }
    } else {
      this.setAttr(elems.piePath, "visibility", "hidden");
    }

    // Label (positioned per-substation to avoid branch overlap)
    if (state.renderMapLabels) {
      this.setAttr(elems.label, "x", String(elems.labelOffsetX));
      this.setAttr(elems.label, "y", String(elems.labelOffsetY));
      this.setAttr(elems.label, "text-anchor", elems.labelAnchor);
      this.setText(elems.label, sub.Name);
      this.setAttr(elems.label, "visibility", "visible");
    } else {
      this.setAttr(elems.label, "visibility", "hidden");
    }
  }

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
    if (fillRatio < 0.01) return "";

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

    this.setAttr(
      this.hoverLabelText, "transform",
      `translate(${lon},${lat}) scale(${this.invScaleX},${this.invScaleY})`
    );
    this.setAttr(this.hoverLabelText, "x", String(DrawingConfig.LABEL_OFFSET_X));
    this.setAttr(this.hoverLabelText, "y", String(DrawingConfig.LABEL_OFFSET_Y));

    let text = `${Math.abs(branch.P).toFixed(0)} MW`;
    let labelStatus = "normal";

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
      labelStatus = "tripped";
    } else if (areAllDisconnected) {
      text = "Out of Service";
    } else if (isCriticallyOverloaded) {
      labelStatus = "critical";
      text += " (Critically Overloaded)";
    } else if (isOverloaded) {
      labelStatus = "warning";
      text += " (Overloaded)";
    }

    this.setText(this.hoverLabelText, text);
    this.setAttr(this.hoverLabelText, "data-label-status", labelStatus);
    this.setAttr(this.hoverLabelText, "visibility", "visible");
  }
}
