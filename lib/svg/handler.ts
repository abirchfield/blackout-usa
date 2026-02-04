import { GameState, InteractionHandler, SimulationAction } from "../types";
import { GameAction } from "../key-bindings";
import { ViewConfig, getDynamicSubstationRadius } from "../config";
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
      const deltaX = offsetX - this.state.dragstartX;
      const deltaY = offsetY - this.state.dragstartY;
      this.state.x0 -= deltaX / this.state.scaleX;
      this.state.y0 += deltaY / this.state.scaleY;
      this.state.dragstartX = offsetX;
      this.state.dragstartY = offsetY;
    }

    // Hover detection
    this.state.hoverSub = null;
    this.state.hoverBranch = null;

    const worldX = this.state.x0 + offsetX / this.state.scaleX;
    const worldY = this.state.y0 - offsetY / this.state.scaleY;
    const hoverRadius = getDynamicSubstationRadius(this.state.scaleX, activeCase.mapConfig.initialView.scale, true);
    // Use squared distance to avoid Math.sqrt per substation
    const hoverRadiusSq = (hoverRadius / this.state.scaleX) * (hoverRadius / this.state.scaleX);

    for (const sub of Object.values(this.state.subs)) {
      const dx = worldX - sub.Longitude;
      const dy = worldY - sub.Latitude;
      if (dx * dx + dy * dy < hoverRadiusSq) {
        this.state.hoverSub = sub;
        break;
      }
    }

    if (this.state.hoverSub === null) {
      let mindist = ViewConfig.BRANCH_HOVER_RADIUS;
      for (const branch of Object.values(this.state.branches)) {
        const s1 = branch.sub1;
        const s2 = branch.sub2;
        if (!s1 || !s2 || !branch.dist || branch.dist === 0) continue;

        const dx = s2.Longitude - s1.Longitude;
        const dy = s2.Latitude - s1.Latitude;
        const t = ((worldX - s1.Longitude) * dx + (worldY - s1.Latitude) * dy) / (branch.dist * branch.dist);

        if (t >= 0 && t <= 1) {
          const dist_to_line = Math.abs(
            (s2.Latitude - s1.Latitude) * worldX - (s2.Longitude - s1.Longitude) * worldY
            + s2.Longitude * s1.Latitude - s2.Latitude * s1.Longitude
          ) / branch.dist * this.state.scaleX;

          if (dist_to_line < mindist) {
            this.state.hoverBranch = branch;
            mindist = dist_to_line;
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
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const { offsetX, offsetY } = this.getMouseOffset(e);
    const zoomFactor = Math.pow(1 + this.state.zoomSensitivity, -e.deltaY / 100);
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
      case "PAN_LEFT": this.state.x0 -= panAmount / this.state.scaleX; break;
      case "PAN_RIGHT": this.state.x0 += panAmount / this.state.scaleX; break;
      case "PAN_DOWN": this.state.y0 -= panAmount / this.state.scaleY; break;
      case "PAN_UP": this.state.y0 += panAmount / this.state.scaleY; break;
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
  }

  public centerAndZoomOn(longitude: number, latitude: number, zoomLevel: number = ViewConfig.DETAIL_ZOOM_LEVEL) {
    this.state.scaleX = zoomLevel;
    this.state.scaleY = zoomLevel;
    const rect = this.getRect();
    this.state.x0 = longitude - (rect.width / 2 / this.state.scaleX);
    this.state.y0 = latitude + (rect.height / 2 / this.state.scaleY);
  }

  public zoomIn(x: number, y: number) {
    const simulatedDeltaY = -100;
    const zoomFactor = Math.pow(1 + this.state.zoomSensitivity, -simulatedDeltaY / 100);
    this.zoom(x, y, zoomFactor);
  }

  public zoomOut(x: number, y: number) {
    const simulatedDeltaY = 100;
    const zoomFactor = Math.pow(1 + this.state.zoomSensitivity, -simulatedDeltaY / 100);
    this.zoom(x, y, zoomFactor);
  }
}
