import { GameState, InteractionHandler, SimulationAction } from "../types";
import { GameAction } from "../key-bindings";
import { ViewConfig, DrawingConfig } from "../config";
import { getDynamicSubstationRadius } from "../utils";
import { IGridHandler } from "../interfaces";
import { activeCase } from "@/data/cases";

const CLICK_DRAG_THRESHOLD_SQ = ViewConfig.CLICK_DRAG_THRESHOLD * ViewConfig.CLICK_DRAG_THRESHOLD;

export class SvgHandler implements IGridHandler {
  private svg: SVGSVGElement;
  private state: GameState;
  public onInteract?: InteractionHandler;
  public onDispatch?: (action: SimulationAction) => void;
  public onTogglePause?: () => void;
  public onToggleFastForward?: () => void;
  public onResetView?: () => void;

  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseLeave: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleWheel: (e: WheelEvent) => void;

  // Cached bounding rect — invalidated on resize/scroll
  private cachedRect: DOMRect | null = null;
  private resizeObserver: ResizeObserver;
  private boundInvalidateRect: () => void;

  // rAF-throttled hover detection
  private pendingMoveEvent: MouseEvent | null = null;
  private moveRafId: number = 0;

  // Cached Object.values arrays for hover iteration
  private subsArray: import("../types").Substation[] = [];
  private branchArray: import("../types").Branch[] = [];
  private lastCachedVersion: number = -1;

  constructor(svg: SVGSVGElement, state: GameState) {
    this.svg = svg;
    this.state = state;

    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);

    this.svg.addEventListener("mousedown", this.boundHandleMouseDown);
    this.svg.addEventListener("mousemove", this.boundHandleMouseMove);
    this.svg.addEventListener("mouseleave", this.boundHandleMouseLeave);
    this.svg.addEventListener("mouseup", this.boundHandleMouseUp);
    this.svg.addEventListener("wheel", this.boundHandleWheel, { passive: false });

    // Invalidate cached rect on resize or scroll
    this.boundInvalidateRect = () => { this.cachedRect = null; };
    this.resizeObserver = new ResizeObserver(this.boundInvalidateRect);
    this.resizeObserver.observe(this.svg);
    window.addEventListener("scroll", this.boundInvalidateRect, { passive: true });
  }

  public destroy() {
    this.svg.removeEventListener("mousedown", this.boundHandleMouseDown);
    this.svg.removeEventListener("mousemove", this.boundHandleMouseMove);
    this.svg.removeEventListener("mouseleave", this.boundHandleMouseLeave);
    this.svg.removeEventListener("mouseup", this.boundHandleMouseUp);
    this.svg.removeEventListener("wheel", this.boundHandleWheel);
    this.resizeObserver.disconnect();
    window.removeEventListener("scroll", this.boundInvalidateRect);
    if (this.moveRafId) {
      cancelAnimationFrame(this.moveRafId);
      this.moveRafId = 0;
    }
  }

  private getRect(): DOMRect {
    if (!this.cachedRect) {
      this.cachedRect = this.svg.getBoundingClientRect();
    }
    return this.cachedRect;
  }

  private getMouseOffset(e: MouseEvent): { offsetX: number; offsetY: number } {
    const rect = this.getRect();
    return {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
  }

  private handleMouseDown(e: MouseEvent) {
    const { offsetX, offsetY } = this.getMouseOffset(e);
    this.state.inDrag = true;
    this.state.dragstartX = offsetX;
    this.state.dragstartY = offsetY;
    this.state.dragorigX = offsetX;
    this.state.dragorigY = offsetY;
  }

  private handleMouseMove(e: MouseEvent) {
    const { offsetX, offsetY } = this.getMouseOffset(e);

    if (this.state.inDrag) {
      // Panning — runs immediately, no hover detection needed
      const deltaX = offsetX - this.state.dragstartX;
      const deltaY = offsetY - this.state.dragstartY;
      this.state.x0 -= deltaX / this.state.scaleX;
      this.state.y0 += deltaY / this.state.scaleY;
      this.clampToBounds();
      this.state.dragstartX = offsetX;
      this.state.dragstartY = offsetY;
      return;
    }

    // Throttle hover detection to next animation frame
    this.pendingMoveEvent = e;
    if (!this.moveRafId) {
      this.moveRafId = requestAnimationFrame(() => {
        this.moveRafId = 0;
        if (this.pendingMoveEvent) {
          this.processHover(this.pendingMoveEvent);
          this.pendingMoveEvent = null;
        }
      });
    }
  }

  private ensureCachedArrays() {
    if (this.state._v !== this.lastCachedVersion) {
      this.subsArray = Object.values(this.state.subs);
      this.branchArray = Object.values(this.state.branches);
      this.lastCachedVersion = this.state._v;
    }
  }

  private processHover(e: MouseEvent) {
    const { offsetX, offsetY } = this.getMouseOffset(e);

    this.state.hoverSub = null;
    this.state.hoverBranch = null;
    this.state.hoverCircuit = null;

    const worldX = this.state.x0 + offsetX / this.state.scaleX;
    const worldY = this.state.y0 - offsetY / this.state.scaleY;
    const hoverRadius = getDynamicSubstationRadius(this.state.scaleX, activeCase.mapConfig.initialView.scale, true);
    const hoverRadiusSq = (hoverRadius / this.state.scaleX) * (hoverRadius / this.state.scaleX);

    this.ensureCachedArrays();

    for (const sub of this.subsArray) {
      const dx = worldX - sub.Longitude;
      const dy = worldY - sub.Latitude;
      if (dx * dx + dy * dy < hoverRadiusSq) {
        this.state.hoverSub = sub;
        break;
      }
    }

    if (this.state.hoverSub === null) {
      let mindist = ViewConfig.BRANCH_HOVER_RADIUS;

      // Compute loop-invariant offset values once
      const scaleFactor = Math.sqrt(this.state.scaleX / activeCase.mapConfig.initialView.scale);
      const normalRadius = Math.max(DrawingConfig.BRANCH_RADIUS_MIN,
        Math.min(DrawingConfig.BRANCH_RADIUS_NORMAL * scaleFactor, DrawingConfig.BRANCH_RADIUS_MAX));
      const halfOffPx = normalRadius * DrawingConfig.SECOND_CIRCUIT_OFFSET_FACTOR / 2;

      for (const branch of this.branchArray) {
        const s1 = branch.sub1;
        const s2 = branch.sub2;
        if (!s1 || !s2 || !branch.dist || branch.dist === 0) continue;

        const dx = s2.Longitude - s1.Longitude;
        const dy = s2.Latitude - s1.Latitude;
        const t = ((worldX - s1.Longitude) * dx + (worldY - s1.Latitude) * dy) / (branch.dist * branch.dist);

        if (t >= 0 && t <= 1) {
          const raw = dy * (worldX - s1.Longitude) - dx * (worldY - s1.Latitude);
          const signedPerpPx = -raw / branch.dist * this.state.scaleX;

          if (branch.Circuits === 2) {
            const distC1 = Math.abs(signedPerpPx + halfOffPx);
            const distC2 = Math.abs(signedPerpPx - halfOffPx);
            const closerDist = Math.min(distC1, distC2);
            if (closerDist < mindist) {
              this.state.hoverBranch = branch;
              this.state.hoverCircuit = distC1 <= distC2 ? 1 : 2;
              mindist = closerDist;
            }
          } else {
            const dist_to_line = Math.abs(signedPerpPx);
            if (dist_to_line < mindist) {
              this.state.hoverBranch = branch;
              this.state.hoverCircuit = 1;
              mindist = dist_to_line;
            }
          }
        }
      }
    }
  }

  private handleMouseUp(e: MouseEvent) {
    const { offsetX, offsetY } = this.getMouseOffset(e);
    this.state.inDrag = false;
    const dx = offsetX - this.state.dragorigX;
    const dy = offsetY - this.state.dragorigY;

    if (dx * dx + dy * dy < CLICK_DRAG_THRESHOLD_SQ) {
      if (this.state.hoverSub && this.onInteract) {
        this.onInteract("sub", this.state.hoverSub);
      } else if (this.state.hoverBranch && this.onInteract) {
        this.onInteract("branch", this.state.hoverBranch);
      }
    }
  }

  private handleMouseLeave() {
    this.state.inDrag = false;
    this.state.hoverBranch = null;
    this.state.hoverSub = null;
    this.pendingMoveEvent = null;
    if (this.moveRafId) {
      cancelAnimationFrame(this.moveRafId);
      this.moveRafId = 0;
    }
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const { offsetX, offsetY } = this.getMouseOffset(e);
    // Use exp for a smooth, symmetric zoom curve.
    // At default sensitivity (1.0), one mouse wheel notch (deltaY≈100) zooms ~26%.
    // Trackpad gestures send smaller deltas and zoom proportionally.
    const zoomFactor = Math.exp(-e.deltaY * 0.003 * this.state.zoomSensitivity);
    this.zoom(offsetX, offsetY, zoomFactor);
  }

  public performAction(action: GameAction) {
    const panAmount = ViewConfig.KEYBOARD_PAN_AMOUNT;
    const rect = this.getRect();
    const x = rect.width / 2;
    const y = rect.height / 2;
    switch (action) {
      case "ZOOM_IN": this.zoomIn(x, y); break;
      case "ZOOM_OUT": this.zoomOut(x, y); break;
      case "PAN_LEFT": this.state.x0 -= panAmount / this.state.scaleX; this.clampToBounds(); break;
      case "PAN_RIGHT": this.state.x0 += panAmount / this.state.scaleX; this.clampToBounds(); break;
      case "PAN_DOWN": this.state.y0 -= panAmount / this.state.scaleY; this.clampToBounds(); break;
      case "PAN_UP": this.state.y0 += panAmount / this.state.scaleY; this.clampToBounds(); break;
      case "TOGGLE_DEBUG_BOUNDS":
        this.state.debug_draw_map_bounds = !this.state.debug_draw_map_bounds;
        break;
      case "RESET_ZOOM": this.onResetView?.(); break;
      case "TOGGLE_PAUSE": this.onTogglePause?.(); break;
      case "TOGGLE_FAST_FORWARD": this.onToggleFastForward?.(); break;
      case "DISCONNECT_MOST_LOADED_LINE": this.onDispatch?.({ type: "DISCONNECT_MOST_LOADED_LINE" }); break;
      case "DISCONNECT_SMALLEST_LOAD": this.onDispatch?.({ type: "DISCONNECT_SMALLEST_LOAD" }); break;
      case "RAMP_ALL_GENERATION_UP": this.onDispatch?.({ type: "RAMP_ALL_GENERATION" }); break;
      case "EMERGENCY_LOAD_SHED": this.onDispatch?.({ type: "EMERGENCY_LOAD_SHED" }); break;
    }
  }

  private zoom(x: number, y: number, zoomFactor: number) {
    const oldScale = this.state.scaleX;
    let newScale = oldScale * zoomFactor;
    newScale = Math.max(this.state.scale_min, Math.min(newScale, this.state.scale_max));

    if (newScale === oldScale) return;

    const actualFactor = newScale / oldScale;
    this.state.scaleX = newScale;
    this.state.scaleY = newScale;

    this.state.x0 += x / oldScale * (1 - 1 / actualFactor);
    this.state.y0 -= y / oldScale * (1 - 1 / actualFactor);
    this.clampToBounds();
  }

  public centerAndZoomOn(longitude: number, latitude: number, zoomLevel: number = ViewConfig.DETAIL_ZOOM_LEVEL) {
    this.state.scaleX = zoomLevel;
    this.state.scaleY = zoomLevel;
    const rect = this.getRect();
    this.state.x0 = longitude - (rect.width / 2 / this.state.scaleX);
    this.state.y0 = latitude + (rect.height / 2 / this.state.scaleY);
    this.clampToBounds();
  }

  /**
   * Clamp x0/y0 so the map stays within the viewport bounds.
   * Mirrors the logic in SvgDrawer.applyViewBounds but runs immediately
   * after user input so there's no frame-lag snap-back.
   */
  private clampToBounds() {
    const rect = this.getRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return;

    const state = this.state;
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

  public zoomIn(x: number, y: number) {
    // Keyboard zoom: ~35% per press (matches one mouse wheel notch at default sensitivity)
    const zoomFactor = Math.exp(0.3 * this.state.zoomSensitivity);
    this.zoom(x, y, zoomFactor);
  }

  public zoomOut(x: number, y: number) {
    const zoomFactor = Math.exp(-0.3 * this.state.zoomSensitivity);
    this.zoom(x, y, zoomFactor);
  }
}
