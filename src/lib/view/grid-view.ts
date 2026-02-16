import { Branch, GameState, InteractionHandler, EngineSettings, GameAction } from "../types";
import { ThemeColors, resolveThemeColors } from "./colors";
import { DrawingConfig, ViewConfig } from "./constants";
import { clampViewBounds } from "./view-math";
import { drawBranches, computeBranchGeometry, BranchGeo } from "./draw-branches";
import { drawSubstations, computeSubGeometry, SubGeo } from "./draw-substations";
import { drawBorder, drawHoverLabel, buildBorderPath, computeLabelOffsets, LabelOffset } from "./draw-overlays";
import { InputHandler } from "./handler";

/** Callbacks the view needs from the engine for user-initiated actions. */
export interface ViewCallbacks {
  onTripHottestLine: () => void;
  onShedMinLoad: () => void;
  onShedMaxLoad: () => void;
  onRampAllUp: () => void;
  onTogglePause: () => void;
  onToggleFastForward: () => void;
}

/** Rendering + input layer — shields the engine from Canvas/DOM details. */
export interface IGridView {
  init(state: GameState, callbacks: ViewCallbacks): void;
  draw(isPaused: boolean, isFastForward: boolean): void;
  reparent(container: HTMLDivElement): void;
  applySettings(s: EngineSettings): void;
  performAction(action: GameAction): void;
  set onInteract(handler: InteractionHandler | undefined);
  destroy(): void;
}

export class GridView implements IGridView {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private colors: ThemeColors;
  private handler?: InputHandler;
  private state!: GameState;
  private isViewInitialized = false;
  private interactive: boolean;

  // DPI
  private dpr: number = 1;
  private lastWidth: number = 0;
  private lastHeight: number = 0;

  // Pre-computed static geometry (built once, never changes)
  private branchGeo: Map<string, BranchGeo> | null = null;
  private subGeo: Map<string, SubGeo> | null = null;
  private borderPath: Path2D | null = null;
  private labelOffsets: Map<string, LabelOffset> | null = null;

  // Theme tracking
  private lastTheme: string = "";

  // Flow animation state
  private flowOffset: number = 0;
  private hoverFlowOffset: number = 0;
  private flowScale: number = 1;
  private lastFrameTime: number = 0;
  private lastHoverBranchKey: string | null = null;

  // Dirty tracking
  private lastSyncV: number = -1;
  private lastScaleX: number = 0;
  private lastX0: number = NaN;
  private lastY0: number = NaN;
  private cachedScaleFactor: number = 1;
  private lastSyncHoverBranch: Branch | null = null;
  private lastSyncHoverSub: import("../types").Substation | null = null;
  private lastSyncLabels: boolean = true;
  private lastSyncAnim: boolean = true;
  private lastFlowOffset: number = -1;
  private lastHoverFlowOffset: number = -1;

  constructor(element: HTMLDivElement, interactive = true) {
    this.container = element;
    this.interactive = interactive;

    this.canvas = document.createElement("canvas");
    this.canvas.className = "grid-map";
    this.canvas.style.display = "block";
    this.canvas.style.outline = "none";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.setAttribute("tabindex", "0");
    this.canvas.setAttribute("aria-label", "Interactive Texas electrical grid map");
    this.canvas.setAttribute("role", "application");
    element.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d")!;
    this.colors = resolveThemeColors();
  }

  init(state: GameState, callbacks: ViewCallbacks): void {
    this.state = state;
    if (this.interactive) {
      const handler = new InputHandler(this.canvas, state);
      handler.onResetView = () => { this.isViewInitialized = false; };
      handler.onTripHottestLine = callbacks.onTripHottestLine;
      handler.onShedMinLoad = callbacks.onShedMinLoad;
      handler.onShedMaxLoad = callbacks.onShedMaxLoad;
      handler.onRampAllUp = callbacks.onRampAllUp;
      handler.onTogglePause = callbacks.onTogglePause;
      handler.onToggleFastForward = callbacks.onToggleFastForward;
      this.handler = handler;
    }
  }

  draw(isPaused: boolean, isFastForward: boolean): void {
    this.resizeCanvas();
    if (!this.isViewInitialized && this.isCanvasReady()) {
      this.setInitialView(this.state);
      this.isViewInitialized = true;
    }

    // Theme change detection
    const themeChanged = this.state.theme !== this.lastTheme;
    if (themeChanged) {
      this.colors = resolveThemeColors();
      this.lastTheme = this.state.theme;
    }

    // Compute frame delta time (shared by animation + soft clamp)
    const now = performance.now();
    const dt = Math.min(this.lastFrameTime > 0 ? now - this.lastFrameTime : 0, 100);
    this.lastFrameTime = now;

    // Update flow animation offset
    this.updateFlowAnimation(isPaused, isFastForward, dt);

    // Ensure one-time pre-computations
    this.ensureStaticGeometry();

    // Update scaleMin on resize
    this.updateViewBounds();

    // Dirty tracking: skip redraw when nothing changed
    const state = this.state;
    const needsRedraw =
      themeChanged ||
      state._vSim !== this.lastSyncV ||
      state.scaleX !== this.lastScaleX ||
      state.x0 !== this.lastX0 ||
      state.y0 !== this.lastY0 ||
      state.renderMapLabels !== this.lastSyncLabels ||
      state.animationsEnabled !== this.lastSyncAnim ||
      state.hoverBranch !== this.lastSyncHoverBranch ||
      state.hoverSub !== this.lastSyncHoverSub ||
      this.flowOffset !== this.lastFlowOffset ||
      this.hoverFlowOffset !== this.lastHoverFlowOffset;

    if (!needsRedraw) return;

    // Update scale factor cache
    if (state.scaleX !== this.lastScaleX) {
      this.cachedScaleFactor = Math.sqrt(state.scaleX / state.referenceScale);
    }

    // Update tracking
    this.lastSyncV = state._vSim;
    this.lastScaleX = state.scaleX;
    this.lastX0 = state.x0;
    this.lastY0 = state.y0;
    this.lastSyncHoverBranch = state.hoverBranch;
    this.lastSyncHoverSub = state.hoverSub;
    this.lastSyncLabels = state.renderMapLabels;
    this.lastSyncAnim = state.animationsEnabled;
    this.lastFlowOffset = this.flowOffset;
    this.lastHoverFlowOffset = this.hoverFlowOffset;

    const ctx = this.ctx;
    const dpr = this.dpr;
    const w = this.lastWidth;
    const h = this.lastHeight;

    // Clear and fill background
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = this.colors.background;
    ctx.fillRect(0, 0, w, h);

    // Phase 1: World-space drawing (border + branches)
    ctx.setTransform(
      state.scaleX * dpr, 0,
      0, -state.scaleY * dpr,
      -state.x0 * state.scaleX * dpr,
      state.y0 * state.scaleY * dpr,
    );

    if (this.borderPath) {
      drawBorder(ctx, this.borderPath, state.scaleX, this.colors.foreground);
    }

    if (this.branchGeo) {
      drawBranches(
        ctx, state, this.branchGeo, this.colors,
        this.flowOffset, this.hoverFlowOffset,
        state.animationsEnabled, isPaused,
        this.cachedScaleFactor, state.scaleX, this.flowScale,
      );
    }

    // Phase 2: Screen-space drawing (substations + labels + hover label)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.subGeo) {
      drawSubstations(
        ctx, state, this.subGeo, this.labelOffsets, this.colors,
        this.cachedScaleFactor, state.scaleX, state.x0, state.y0,
      );
    }

    drawHoverLabel(ctx, state, state.scaleX, state.x0, state.y0, this.colors);
  }

  applySettings(s: EngineSettings): void {
    if (s.theme !== undefined) this.state.theme = s.theme;
    if (s.animationsEnabled !== undefined) this.state.animationsEnabled = s.animationsEnabled;
    if (s.renderMapLabels !== undefined) this.state.renderMapLabels = s.renderMapLabels;
    if (s.zoomSensitivity !== undefined) this.state.zoomSensitivity = s.zoomSensitivity;
    if (s.keyBindings !== undefined) this.state.keyBindings = s.keyBindings;
  }

  reparent(container: HTMLDivElement): void {
    container.appendChild(this.canvas);
    this.container = container;
    this.lastWidth = 0;
    this.lastHeight = 0;
    this.isViewInitialized = false;
  }

  performAction(action: GameAction): void {
    this.handler?.performAction(action);
  }

  set onInteract(h: InteractionHandler | undefined) {
    if (this.handler) this.handler.onInteract = h;
  }

  destroy(): void {
    this.handler?.destroy();
    this.canvas.remove();
    this.handler = undefined;
    this.branchGeo = null;
    this.subGeo = null;
    this.borderPath = null;
    this.labelOffsets = null;
  }

  // --- Private helpers ---

  private resizeCanvas(): boolean {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    const dpr = window.devicePixelRatio || 1;

    if (width !== this.lastWidth || height !== this.lastHeight || dpr !== this.dpr) {
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.dpr = dpr;
      this.lastWidth = width;
      this.lastHeight = height;
      return true;
    }
    return false;
  }

  private isCanvasReady(): boolean {
    return this.container.offsetWidth > 0 && this.container.offsetHeight > 0;
  }

  private setInitialView(state: GameState) {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    if (width === 0 || height === 0) return;

    const mapWidth = state.xmax - state.xmin;
    const mapHeight = state.ymax - state.ymin;
    const padding = DrawingConfig.MIN_ZOOM_PADDING;
    const scaleToFitX = (width * padding) / mapWidth;
    const scaleToFitY = (height * padding) / mapHeight;
    const initialScale = Math.min(scaleToFitX, scaleToFitY);

    state.scaleX = initialScale;
    state.scaleY = initialScale;
    state.scaleMin = initialScale;
    state.referenceScale = initialScale;
    if (state.scaleMax === 0) state.scaleMax = initialScale * ViewConfig.DEFAULT_MAX_ZOOM_RATIO;
    this.flowScale = Math.max(mapWidth, mapHeight) / DrawingConfig.FLOW_REFERENCE_EXTENT;
    state.x0 = state.xmin - (width / initialScale - mapWidth) / 2;
    state.y0 = state.ymax + (height / initialScale - mapHeight) / 2;
  }

  private ensureStaticGeometry() {
    const state = this.state;
    if (!this.borderPath && state.borders && state.borders.length > 0) {
      this.borderPath = buildBorderPath(state.borders);
    }
    if (!this.branchGeo) {
      const hasBranches = Object.keys(state.branches).length > 0;
      if (hasBranches) {
        this.branchGeo = computeBranchGeometry(state.branches);
        this.subGeo = computeSubGeometry(state.subs);
        this.labelOffsets = computeLabelOffsets(state.subs, state.branches);
      }
    }
  }

  private updateViewBounds() {
    const state = this.state;
    const width = this.lastWidth;
    const height = this.lastHeight;
    if (width === 0 || height === 0) return;

    const mapWidth = state.xmax - state.xmin;
    const mapHeight = state.ymax - state.ymin;
    const padding = DrawingConfig.MIN_ZOOM_PADDING;
    const scaleToFitX = (width * padding) / mapWidth;
    const scaleToFitY = (height * padding) / mapHeight;
    state.scaleMin = Math.min(scaleToFitX, scaleToFitY);

    if (state.scaleX < state.scaleMin) {
      state.scaleX = state.scaleMin;
      state.scaleY = state.scaleMin;
      // Forced scale change (viewport shrunk) — clamp origin so map stays visible
      clampViewBounds(state, width, height);
    }
  }

  private updateFlowAnimation(isPaused: boolean, isFastForward: boolean, dt: number) {
    const state = this.state;

    const fs = this.flowScale;
    const wrap = DrawingConfig.FLOW_OFFSET_WRAP * fs;

    if (state.animationsEnabled && !isPaused && dt > 0) {
      const speed = (isFastForward ? DrawingConfig.FLOW_SPEED_FAST : DrawingConfig.FLOW_SPEED_NORMAL) * fs;
      this.flowOffset += speed * dt;
      if (this.flowOffset > wrap) this.flowOffset -= wrap;
    }

    const hoverBranchKey = (isPaused && state.hoverBranch) ? state.hoverBranch.Number : null;
    if (hoverBranchKey !== this.lastHoverBranchKey) {
      if (hoverBranchKey) {
        this.hoverFlowOffset = this.flowOffset;
      }
      this.lastHoverBranchKey = hoverBranchKey;
    }

    if (isPaused && hoverBranchKey && state.animationsEnabled && dt > 0) {
      this.hoverFlowOffset += DrawingConfig.FLOW_SPEED_NORMAL * fs * dt;
      if (this.hoverFlowOffset > wrap) this.hoverFlowOffset -= wrap;
    }
  }
}
