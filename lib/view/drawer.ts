import { Branch, GameState, Substation, BranchStatus, UnitStatus, SubstationCategory } from "../types";
import { DrawingConfig } from "../config";
import { getDynamicSubstationRadius, clampViewBounds, getBranchOverloadInfo } from "../utils";


export interface IGridDrawer {
  draw(state: GameState, isPaused: boolean, isFastForward: boolean): void;
  setInitialView(state: GameState): void;
  resizeCanvas(): boolean;
  isCanvasReady(): boolean;
  reparent(container: HTMLDivElement): void;
  destroy(): void;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const TWO_PI = Math.PI * 2;
const PIE_CHART_START_ANGLE = -Math.PI / 2;

// Pre-computed constant strings
const STR_GENERATOR_OUTLINE_WIDTH = String(DrawingConfig.GENERATOR_OUTLINE_WIDTH);
const STR_GENERATOR_OUTLINE_WIDTH_PLUS_2 = String(DrawingConfig.GENERATOR_OUTLINE_WIDTH + 2);
const STR_SUBSTATION_BORDER_WIDTH = String(DrawingConfig.SUBSTATION_BORDER_WIDTH);
const STR_LABEL_OUTLINE_WIDTH = String(DrawingConfig.LABEL_OUTLINE_WIDTH);

// Flow animation: world-unit dash patterns on flow-fg (no non-scaling-stroke).
// The SVG transform scales them to screen automatically — no per-zoom CSS updates.
// Dash cycle = 0.64 world units (0.2 dash + 0.44 gap at reference zoom ≈ 10+22 screen px).
const FLOW_DASH_CYCLE = 0.64;
const FLOW_SPEED_NORMAL = FLOW_DASH_CYCLE / 1067; // ~0.0006 world units/ms
const FLOW_SPEED_FAST = FLOW_DASH_CYCLE / 356;    // ~0.0018 world units/ms

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
  outerRingBg?: SVGElement;
  outerRing?: SVGElement;
  background: SVGElement;   // circle for generators, rect for loads
  piePath: SVGPathElement;
  border: SVGElement;       // circle for generators, rect for loads
  label: SVGTextElement;
  isLoad: boolean;
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
  // Cached sqrt(scaleX / initialScale) — only changes on zoom
  private cachedScaleFactor: number = 1;

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
  private lastWrittenOffset: number = -1;
  private lastHoverBranchKey: string | null = null;
  private lastHoverCircuit: 1 | 2 | null = null;

  // Dirty tracking: skip heavy per-element sync when nothing changed
  private lastSyncV: number = -1;
  private lastSyncHoverBranch: Branch | null = null;
  private lastSyncHoverSub: Substation | null = null;
  private lastSyncLabels: boolean = true;
  private lastSyncAnim: boolean = true;

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

  public reparent(container: HTMLDivElement) {
    container.appendChild(this.svgElement);
    this.container = container;
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

    // Cache inverse scale and branch radius scale factor for this frame
    this.invScaleX = 1 / state.scaleX;
    this.invScaleY = -1 / state.scaleY;
    if (state.scaleX !== this.lastScaleX) {
      this.cachedScaleFactor = Math.sqrt(state.scaleX / state.referenceScale);
    }

    this.ensureBorder(state);
    this.ensureLabelOffsets(state);

    // Full sync needed when game state, zoom, labels, or animation toggle changed.
    // Between game ticks (500ms normal), ~29/30 rAF frames can skip entirely.
    // Pan-only frames also skip (world transform handles translation).
    const needsFullSync =
      state._vSim !== this.lastSyncV ||
      state.scaleX !== this.lastScaleX ||
      state.renderMapLabels !== this.lastSyncLabels ||
      state.animationsEnabled !== this.lastSyncAnim;

    // Hover-only sync: when only hovered element changed, update just those elements
    const hoverBranchChanged = state.hoverBranch !== this.lastSyncHoverBranch;
    const hoverSubChanged = state.hoverSub !== this.lastSyncHoverSub;

    if (needsFullSync) {
      this.syncBranches(state);
      this.syncSubstations(state);
      this.updateHoverLabel(state);
      this.lastSyncV = state._vSim;
      this.lastSyncHoverBranch = state.hoverBranch;
      this.lastSyncHoverSub = state.hoverSub;
      this.lastSyncLabels = state.renderMapLabels;
      this.lastSyncAnim = state.animationsEnabled;
    } else if (hoverBranchChanged || hoverSubChanged) {
      this.syncHoverOnly(state, hoverBranchChanged, hoverSubChanged);
      this.updateHoverLabel(state);
      this.lastSyncHoverBranch = state.hoverBranch;
      this.lastSyncHoverSub = state.hoverSub;
    }
  }

  public setInitialView(state: GameState) {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    if (width === 0 || height === 0) return;

    const mapWidth = state.xmax - state.xmin;
    const mapHeight = state.ymax - state.ymin;
    // Add padding so the map doesn't fill the viewport edge-to-edge at minimum zoom
    const padding = DrawingConfig.MIN_ZOOM_PADDING;
    const scaleToFitX = (width * padding) / mapWidth;
    const scaleToFitY = (height * padding) / mapHeight;
    const initialScale = Math.min(scaleToFitX, scaleToFitY);

    state.scaleX = initialScale;
    state.scaleY = initialScale;
    state.scaleMin = initialScale;
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

    // Accumulate flow offset in world units when playing (no zoom dependence)
    if (state.animationsEnabled && !isPaused && dt > 0) {
      const speed = isFastForward ? FLOW_SPEED_FAST : FLOW_SPEED_NORMAL;
      this.flowOffset += speed * dt;
      if (this.flowOffset > 640) this.flowOffset -= 640;
    }

    // Only write to DOM when the offset actually changed
    if (this.flowOffset !== this.lastWrittenOffset) {
      this.branchesLayer.style.setProperty("--flow-offset", String(this.flowOffset));
      this.lastWrittenOffset = this.flowOffset;
    }

    // Handle hover-during-pause: animate only the hovered circuit via local override
    const hoverBranchKey = (isPaused && state.hoverBranch) ? state.hoverBranch.Number : null;
    const hoverCircuit = (isPaused && state.hoverBranch) ? state.hoverCircuit : null;
    if (hoverBranchKey !== this.lastHoverBranchKey || hoverCircuit !== this.lastHoverCircuit) {
      // Remove override from previous hovered circuit
      if (this.lastHoverBranchKey) {
        const prevElems = this.branchElements.get(this.lastHoverBranchKey);
        if (prevElems) {
          if (this.lastHoverCircuit !== 2) prevElems.circuit1.group.style.removeProperty("--flow-offset");
          if (this.lastHoverCircuit !== 1) prevElems.circuit2?.group.style.removeProperty("--flow-offset");
        }
      }
      // Sync hover offset to current global offset when starting hover
      if (hoverBranchKey) {
        this.hoverFlowOffset = this.flowOffset;
      }
      this.lastHoverBranchKey = hoverBranchKey;
      this.lastHoverCircuit = hoverCircuit;
    }

    // Accumulate hover offset independently when paused
    if (isPaused && hoverBranchKey && state.animationsEnabled && dt > 0) {
      this.hoverFlowOffset += FLOW_SPEED_NORMAL * dt;
      if (this.hoverFlowOffset > 640) this.hoverFlowOffset -= 640;
      const elems = this.branchElements.get(hoverBranchKey);
      if (elems) {
        const hoverStr = String(this.hoverFlowOffset);
        if (hoverCircuit === 1 || hoverCircuit === null) {
          elems.circuit1.group.style.setProperty("--flow-offset", hoverStr);
        }
        if ((hoverCircuit === 2 || hoverCircuit === null) && elems.circuit2) {
          elems.circuit2.group.style.setProperty("--flow-offset", hoverStr);
        }
      }
    }
  }

  // --- World Transform ---

  private updateWorldTransform(state: GameState) {
    // Use cached dimensions (updated by resizeCanvas() before each draw)
    const width = this.lastWidth;
    const height = this.lastHeight;
    if (width === 0 || height === 0) return;

    const mapWidth = state.xmax - state.xmin;
    const mapHeight = state.ymax - state.ymin;
    const padding = DrawingConfig.MIN_ZOOM_PADDING;
    const scaleToFitX = (width * padding) / mapWidth;
    const scaleToFitY = (height * padding) / mapHeight;
    state.scaleMin = Math.min(scaleToFitX, scaleToFitY);

    // Clamp current scale to [scaleMin, scaleMax] — handles resize making scaleMin larger
    if (state.scaleX < state.scaleMin) {
      state.scaleX = state.scaleMin;
      state.scaleY = state.scaleMin;
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
    clampViewBounds(state, this.lastWidth, this.lastHeight);
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

  // --- Hover-Only Fast Path ---

  /**
   * When only hoverBranch/hoverSub changed (no game tick, no zoom), update
   * just the 2-4 affected elements instead of iterating all ~150.
   */
  private syncHoverOnly(state: GameState, branchChanged: boolean, subChanged: boolean) {
    if (branchChanged) {
      const normalRadius = this.getDynamicBranchRadius(false);
      const hoverRadius = this.getDynamicBranchRadius(true);

      // Un-hover previous branch
      const prev = this.lastSyncHoverBranch;
      if (prev) {
        const elems = this.branchElements.get(prev.Number);
        if (elems) this.updateBranchElements(state, prev, elems, normalRadius, normalRadius, null);
      }
      // Hover new branch
      const next = state.hoverBranch;
      if (next) {
        const elems = this.branchElements.get(next.Number);
        if (elems) this.updateBranchElements(state, next, elems, normalRadius, hoverRadius, state.hoverCircuit);
      }
    }

    if (subChanged) {
      const normalR = getDynamicSubstationRadius(state.scaleX, state.referenceScale, false);
      const hoverR = getDynamicSubstationRadius(state.scaleX, state.referenceScale, true);
      const normalRStr = String(normalR);
      const hoverRStr = String(hoverR);
      const normalOuterR = normalR * DrawingConfig.GENERATOR_OUTER_RADIUS_FACTOR;
      const hoverOuterR = hoverR * DrawingConfig.GENERATOR_OUTER_RADIUS_FACTOR;
      const normalOuterRStr = String(normalOuterR);
      const hoverOuterRStr = String(hoverOuterR);
      const normalOuterRBgStr = String(normalOuterR + 1);
      const hoverOuterRBgStr = String(hoverOuterR + 1);

      // Un-hover previous substation
      const prev = this.lastSyncHoverSub;
      if (prev) {
        const elems = this.substationElements.get(prev.Number);
        if (elems) this.updateSubstationElements(prev, elems, state, false, false, "", normalR, normalRStr, normalOuterRStr, normalOuterRBgStr);
      }
      // Hover new substation
      const next = state.hoverSub;
      if (next) {
        const elems = this.substationElements.get(next.Number);
        if (elems) this.updateSubstationElements(next, elems, state, true, false, "", hoverR, hoverRStr, hoverOuterRStr, hoverOuterRBgStr);
      }
    }
  }

  // --- Branches ---

  private syncBranches(state: GameState) {
    const normalRadius = this.getDynamicBranchRadius(false);
    const hoverRadius = this.getDynamicBranchRadius(true);

    // Update existing + create new (avoids Set/Object.keys allocation)
    let branchCount = 0;
    for (const key in state.branches) {
      branchCount++;
      const branch = state.branches[key];
      if (!branch.sub1 || !branch.sub2) continue;

      let elems = this.branchElements.get(key);
      if (!elems) {
        elems = this.createBranchElements(branch);
        this.branchElements.set(key, elems);
      }

      const isHover = branch === state.hoverBranch;
      this.updateBranchElements(state, branch, elems, normalRadius,
        isHover ? hoverRadius : normalRadius, isHover ? state.hoverCircuit : null);
    }

    // Remove stale elements only if counts diverge
    if (this.branchElements.size > branchCount) {
      for (const [key, elems] of this.branchElements) {
        if (!(key in state.branches)) {
          this.clearCircuitCache(elems.circuit1);
          if (elems.circuit2) this.clearCircuitCache(elems.circuit2);
          elems.group.remove();
          this.branchElements.delete(key);
        }
      }
    }
  }

  private clearCircuitCache(circuit: CircuitElements) {
    this.clearCacheForElement(circuit.baseLine);
    this.clearCacheForElement(circuit.flowFg);
  }

  private createCircuitGroup(): CircuitElements {
    const group = this.createEl("g", { class: "circuit" }) as SVGGElement;
    const baseLine = this.createEl("line", { class: "base" }) as SVGLineElement;
    const flowFg = this.createEl("line", { class: "flow-fg" }) as SVGLineElement;
    group.appendChild(baseLine);
    group.appendChild(flowFg);
    return { group, baseLine, flowFg };
  }

  private createBranchElements(branch: Branch): BranchElements {
    const group = this.createEl("g", { "data-branch-id": branch.Number }) as SVGGElement;

    // Pre-compute half the world-unit line length for dash-pattern centering.
    // Substations are static, so this never changes.
    const dx = branch.sub2!.Longitude - branch.sub1!.Longitude;
    const dy = branch.sub2!.Latitude - branch.sub1!.Latitude;
    const halfLenStr = String(Math.sqrt(dx * dx + dy * dy) / 2);

    const circuit1 = this.createCircuitGroup();
    circuit1.group.style.setProperty("--half-len", halfLenStr);
    group.appendChild(circuit1.group);

    const elems: BranchElements = { group, circuit1 };

    if (branch.Circuits === 2) {
      const circuit2 = this.createCircuitGroup();
      circuit2.group.style.setProperty("--half-len", halfLenStr);
      group.appendChild(circuit2.group);
      elems.circuit2 = circuit2;
    }

    this.branchesLayer.appendChild(group);
    return elems;
  }

  private updateBranchElements(
    state: GameState, branch: Branch, elems: BranchElements,
    normalRadius: number, hoverRadius: number, hoverCircuit: 1 | 2 | null,
  ) {
    const s1 = branch.sub1!;
    const s2 = branch.sub2!;
    const powerFlowsForward = branch.P >= 0;

    // Set overload level on the group (CSS handles color)
    const overloadLevel = this.getOverloadLevel(branch);
    this.setAttr(elems.group, "data-overload", overloadLevel);

    if (branch.Circuits === 2) {
      const r1 = hoverCircuit === 1 ? hoverRadius : normalRadius;
      const r2 = hoverCircuit === 2 ? hoverRadius : normalRadius;
      // Always use normalRadius for positioning so circuits don't shift when hovered
      this.updateCircuit(state, branch, branch.Status1, s1, s2, r1, normalRadius, powerFlowsForward, -1, hoverCircuit === 1, elems.circuit1);
      this.updateCircuit(state, branch, branch.Status2, s1, s2, r2, normalRadius, powerFlowsForward, 1, hoverCircuit === 2, elems.circuit2!);
    } else {
      const isHovered = hoverCircuit !== null;
      this.updateCircuit(state, branch, branch.Status1, s1, s2, hoverRadius, normalRadius, powerFlowsForward, 0, isHovered, elems.circuit1);
      if (elems.circuit2) {
        this.setAttr(elems.circuit2.baseLine, "visibility", "hidden");
      }
    }
  }

  private updateCircuit(
    state: GameState, branch: Branch, status: string,
    s1: Substation, s2: Substation, radius: number, positionRadius: number,
    powerFlowsForward: boolean, offsetMultiplier: number,
    isHovered: boolean, circuit: CircuitElements,
  ) {
    let x1 = s1.Longitude, y1 = s1.Latitude;
    let x2 = s2.Longitude, y2 = s2.Latitude;

    if (offsetMultiplier !== 0) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        // Use positionRadius (always normalRadius) so circuits don't shift when hovered
        const totalOffset = positionRadius * DrawingConfig.SECOND_CIRCUIT_OFFSET_FACTOR / state.scaleX;
        const offset = (totalOffset / 2) * offsetMultiplier;
        const perpX = -dy / dist * offset;
        const perpY = dx / dist * offset;
        x1 += perpX; y1 += perpY;
        x2 += perpX; y2 += perpY;
      }
    }

    // Set coordinates on base line and flow overlay
    const sx1 = String(x1), sy1 = String(y1), sx2 = String(x2), sy2 = String(y2);
    this.setAttr(circuit.baseLine, "x1", sx1);
    this.setAttr(circuit.baseLine, "y1", sy1);
    this.setAttr(circuit.baseLine, "x2", sx2);
    this.setAttr(circuit.baseLine, "y2", sy2);
    this.setAttr(circuit.baseLine, "visibility", "visible");

    this.setAttr(circuit.flowFg, "x1", sx1);
    this.setAttr(circuit.flowFg, "y1", sy1);
    this.setAttr(circuit.flowFg, "x2", sx2);
    this.setAttr(circuit.flowFg, "y2", sy2);

    // Set stroke-width: base line uses non-scaling-stroke (screen px),
    // flow-fg uses world units (no non-scaling-stroke, scaled by SVG transform).
    const radiusStr = String(radius);
    const flowWidthStr = String(radius * DrawingConfig.POWER_FLOW_LINE_WIDTH_FACTOR / state.scaleX);
    this.setAttr(circuit.baseLine, "stroke-width", radiusStr);
    this.setAttr(circuit.flowFg, "stroke-width", flowWidthStr);

    // Set data-status (CSS handles colors, dash patterns, visibility)
    this.setAttr(circuit.group, "data-status", status);

    // Set hover state for CSS color highlight (cached)
    if (isHovered) {
      this.setAttr(circuit.group, "data-hovered", "");
    } else {
      this.removeAttr(circuit.group, "data-hovered");
    }

    // Set animation state: data-animated + direction class (cached)
    if (status === BranchStatus.IN) {
      const hasPowerFlow = Math.abs(branch.P) > DrawingConfig.MIN_POWER_FOR_ANIMATION && state.animationsEnabled;
      if (hasPowerFlow) {
        this.setAttr(circuit.group, "data-animated", "");
        const dirClass = powerFlowsForward ? "flow-forward" : "flow-reverse";
        this.setAttr(circuit.group, "data-flow-dir", dirClass);
      } else {
        this.removeAttr(circuit.group, "data-animated");
      }
    } else {
      this.removeAttr(circuit.group, "data-animated");
    }
  }

  private getDynamicBranchRadius(isHover: boolean): number {
    const baseRadius = isHover ? DrawingConfig.BRANCH_RADIUS_HOVER : DrawingConfig.BRANCH_RADIUS_NORMAL;
    const maxRadius = isHover ? DrawingConfig.BRANCH_RADIUS_HOVER_MAX : DrawingConfig.BRANCH_RADIUS_MAX;
    const radius = baseRadius * this.cachedScaleFactor;
    return Math.max(DrawingConfig.BRANCH_RADIUS_MIN, Math.min(radius, maxRadius));
  }

  private getOverloadLevel(branch: Branch): string {
    const { activeCircuits, overloadRatio } = getBranchOverloadInfo(branch);
    if (activeCircuits === 0) return "normal";
    if (overloadRatio > DrawingConfig.BRANCH_OVERLOAD_CRITICAL_THRESHOLD_DRAW) return "critical";
    if (overloadRatio > DrawingConfig.BRANCH_OVERLOAD_NORMAL_THRESHOLD) return "warning";
    return "normal";
  }

  // --- Substations ---

  private syncSubstations(state: GameState) {
    const scaleChanged = state.scaleX !== this.lastScaleX;

    const normalR = getDynamicSubstationRadius(state.scaleX, state.referenceScale, false);
    const hoverR = getDynamicSubstationRadius(state.scaleX, state.referenceScale, true);
    const normalRStr = String(normalR);
    const hoverRStr = String(hoverR);

    const counterScaleTransform = scaleChanged ? `scale(${this.invScaleX},${this.invScaleY})` : "";

    const normalOuterR = normalR * DrawingConfig.GENERATOR_OUTER_RADIUS_FACTOR;
    const hoverOuterR = hoverR * DrawingConfig.GENERATOR_OUTER_RADIUS_FACTOR;
    const normalOuterRStr = String(normalOuterR);
    const hoverOuterRStr = String(hoverOuterR);
    const normalOuterRBgStr = String(normalOuterR + 1);
    const hoverOuterRBgStr = String(hoverOuterR + 1);

    // Update existing + create new (avoids Set/Object.keys allocation)
    let subCount = 0;
    for (const key in state.subs) {
      subCount++;
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

    // Remove stale elements only if counts diverge
    if (this.substationElements.size > subCount) {
      for (const [key, elems] of this.substationElements) {
        if (!(key in state.subs)) {
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
    }

    this.lastScaleX = state.scaleX;
  }

  private createSubstationElements(sub: Substation): SubstationElements {
    const categoryCss = CATEGORY_CSS[sub.Category] || "load";
    const isLoad = sub.Category === SubstationCategory.Load;
    const group = this.createEl("g", {
      "data-sub-id": sub.Number,
      "data-category": categoryCss,
      transform: `translate(${sub.Longitude},${sub.Latitude})`,
    }) as SVGGElement;

    const innerGroup = this.createEl("g", {
      transform: `scale(${this.invScaleX},${this.invScaleY})`,
    }) as SVGGElement;
    group.appendChild(innerGroup);

    const isGenerator = !isLoad;
    const offset = this.labelOffsets.get(sub.Number) || { x: DrawingConfig.LABEL_OFFSET_X, y: DrawingConfig.LABEL_OFFSET_Y };

    // Loads use rect elements (square shape); generators use circle elements
    const background = isLoad
      ? this.createEl("rect", { class: "sub-bg" })
      : this.createEl("circle", { class: "sub-bg" });
    const border = isLoad
      ? this.createEl("rect", { class: "sub-border", "stroke-width": STR_SUBSTATION_BORDER_WIDTH })
      : this.createEl("circle", { class: "sub-border", "stroke-width": isGenerator ? STR_GENERATOR_OUTLINE_WIDTH : STR_SUBSTATION_BORDER_WIDTH });

    const elems: SubstationElements = {
      group,
      innerGroup,
      background,
      piePath: this.createEl("path", { class: "sub-pie", visibility: "hidden" }) as SVGPathElement,
      border,
      label: this.createEl("text", { "stroke-width": STR_LABEL_OUTLINE_WIDTH }) as SVGTextElement,
      isLoad,
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
    } else {
      // Loads get the same outer ring treatment but with rects (squares)
      elems.outerRingBg = this.createEl("rect", {
        class: "outer-ring-bg",
        "stroke-width": STR_GENERATOR_OUTLINE_WIDTH_PLUS_2,
      });
      elems.outerRing = this.createEl("rect", {
        class: "outer-ring",
        "stroke-width": STR_GENERATOR_OUTLINE_WIDTH,
      });
    }

    innerGroup.appendChild(elems.outerRingBg);
    innerGroup.appendChild(elems.outerRing);

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

    // Hover state (cached via data attribute)
    if (isHover) {
      this.setAttr(elems.group, "data-hovered", "");
    } else {
      this.removeAttr(elems.group, "data-hovered");
    }

    const P = this.getSubstationPower(sub);
    const allTripped = this.isSubstationTripped(sub);

    // Tripped data attribute (cached)
    if (allTripped) {
      this.setAttr(elems.group, "data-tripped", "");
    } else {
      this.removeAttr(elems.group, "data-tripped");
    }

    // Outer ring and shape dimensions
    if (elems.isLoad) {
      // Apply load size factor to create smaller squares for loads
      const loadR = r * DrawingConfig.LOAD_SIZE_FACTOR;

      // Outer ring: slightly larger square for contrast border
      const outerR = loadR * DrawingConfig.GENERATOR_OUTER_RADIUS_FACTOR;
      const outerRBg = outerR + 1;
      const outerSizeStr = String(outerR * 2);
      const outerBgSizeStr = String(outerRBg * 2);
      const negOuterRStr = String(-outerR);
      const negOuterRBgStr = String(-outerRBg);
      this.setAttr(elems.outerRingBg!, "x", negOuterRBgStr);
      this.setAttr(elems.outerRingBg!, "y", negOuterRBgStr);
      this.setAttr(elems.outerRingBg!, "width", outerBgSizeStr);
      this.setAttr(elems.outerRingBg!, "height", outerBgSizeStr);
      this.setAttr(elems.outerRing!, "x", negOuterRStr);
      this.setAttr(elems.outerRing!, "y", negOuterRStr);
      this.setAttr(elems.outerRing!, "width", outerSizeStr);
      this.setAttr(elems.outerRing!, "height", outerSizeStr);

      // Inner square: background and border
      const sizeStr = String(loadR * 2);
      const negRStr = String(-loadR);
      this.setAttr(elems.background, "x", negRStr);
      this.setAttr(elems.background, "y", negRStr);
      this.setAttr(elems.background, "width", sizeStr);
      this.setAttr(elems.background, "height", sizeStr);
      this.setAttr(elems.border, "x", negRStr);
      this.setAttr(elems.border, "y", negRStr);
      this.setAttr(elems.border, "width", sizeStr);
      this.setAttr(elems.border, "height", sizeStr);
    } else {
      // Generator: circles
      this.setAttr(elems.outerRingBg!, "r", outerRBgStr);
      this.setAttr(elems.outerRing!, "r", outerRStr);
      this.setAttr(elems.background, "r", rStr);
      this.setAttr(elems.border, "r", rStr);
    }

    // Pie chart: compute fill ratio based on substation type
    const Pmax = isGenerator ? sub.Pmax : sub.Pmax * state.frLoad;
    const clampedP = Math.max(0, Math.min(P, Pmax));

    if (Pmax > 0 && clampedP > 0 && !allTripped) {
      const fillRatio = clampedP / Pmax;
      // Use scaled radius for loads to match the smaller square
      const pieR = elems.isLoad ? r * DrawingConfig.LOAD_SIZE_FACTOR : r;
      const piePath = this.getCachedPiePath(elems, pieR, fillRatio);
      if (piePath) {
        this.setAttr(elems.piePath, "d", piePath);
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

  private getCachedPiePath(elems: SubstationElements, r: number, fillRatio: number): string {
    if (elems.cachedPieR === r && elems.cachedPieFill === fillRatio) {
      return elems.cachedPiePath;
    }
    const path = elems.isLoad
      ? this.createLoadPiePath(r, fillRatio)
      : this.createPieArcPath(r, fillRatio);
    elems.cachedPieR = r;
    elems.cachedPieFill = fillRatio;
    elems.cachedPiePath = path;
    return path;
  }

  /** Circular pie wedge for generator substations (fills clockwise from 12 o'clock). */
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

  /** Rectangular fill for load substations (fills from bottom to top). */
  private createLoadPiePath(r: number, fillRatio: number): string {
    if (fillRatio < 0.01) return "";

    if (fillRatio >= 0.99) {
      return `M ${-r} ${-r} L ${r} ${-r} L ${r} ${r} L ${-r} ${r} Z`;
    }

    const topY = r - 2 * r * fillRatio;
    return `M ${-r} ${r} L ${-r} ${topY} L ${r} ${topY} L ${r} ${r} Z`;
  }

  private getSubstationPower(sub: Substation): number {
    let p = 0;
    for (let i = 0; i < sub.U.length; i++) p += sub.U[i].P;
    return p;
  }

  private isSubstationTripped(sub: Substation): boolean {
    if (sub.Units === 0) return false;
    for (let i = 0; i < sub.U.length; i++) {
      if (sub.U[i].Status !== UnitStatus.TRIP) return false;
    }
    return true;
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

    const { activeCircuits, overloadRatio } = getBranchOverloadInfo(branch);

    const isAnyTripped = branch.Status1 === BranchStatus.TRIP || (branch.Circuits === 2 && branch.Status2 === BranchStatus.TRIP);
    const areAllDisconnected = activeCircuits === 0 && !isAnyTripped;

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
