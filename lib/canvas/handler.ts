import { GameState, InteractionHandler, SimulationAction } from "../types";
import { GameAction } from "../key-bindings";
import { ViewConfig } from "../config";

export class GameHandler {
  private canvas: HTMLCanvasElement;
  private state: GameState;
  private drawCallback: () => void;
  public onInteract?: InteractionHandler;
  public onDispatch?: (action: SimulationAction) => void;
  public onTogglePause?: () => void;
  public onToggleFastForward?: () => void;
  public onResetView?: () => void;

  // Store bound event handlers to ensure they can be removed correctly.
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseLeave: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleWheel: (e: WheelEvent) => void;

  constructor(canvas: HTMLCanvasElement, state: GameState, drawCallback: () => void) {
    this.canvas = canvas;
    this.state = state;
    this.drawCallback = drawCallback;

    // Bind 'this' to all event handlers and store them
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);

    // Add event listeners using the bound handlers
    this.canvas.addEventListener("mousedown", this.boundHandleMouseDown);
    this.canvas.addEventListener("mousemove", this.boundHandleMouseMove);
    this.canvas.addEventListener("mouseleave", this.boundHandleMouseLeave);
    this.canvas.addEventListener("mouseup", this.boundHandleMouseUp);
    this.canvas.addEventListener("wheel", this.boundHandleWheel, { passive: false });
  }

  public destroy() {
    // Remove all event listeners using the same bound function references
    // to prevent memory leaks and "zombie" listeners.
    this.canvas.removeEventListener("mousedown", this.boundHandleMouseDown);
    this.canvas.removeEventListener("mousemove", this.boundHandleMouseMove);
    this.canvas.removeEventListener("mouseleave", this.boundHandleMouseLeave);
    this.canvas.removeEventListener("mouseup", this.boundHandleMouseUp);
    this.canvas.removeEventListener("wheel", this.boundHandleWheel);
  }

  private getDynamicSubstationRadius(isHover: boolean): number {
    const baseRadius = isHover ? ViewConfig.BASE_SUBSTATION_RADIUS_HOVER : ViewConfig.BASE_SUBSTATION_RADIUS_NORMAL;
    const maxRadius = isHover ? ViewConfig.MAX_SUBSTATION_RADIUS_HOVER : ViewConfig.MAX_SUBSTATION_RADIUS;
    
    // Scale radius based on zoom, relative to a reference scale.
    // ViewConfig.INITIAL_SCALE is a good baseline where the baseRadius should apply.
    const scaleFactor = Math.sqrt(this.state.scaleX / ViewConfig.INITIAL_SCALE);
    
    const radius = baseRadius * scaleFactor;
    
    return Math.max(ViewConfig.MIN_SUBSTATION_RADIUS, Math.min(radius, maxRadius));
  }

  private handleMouseDown(e: MouseEvent) {
    this.state.inDrag = true;
    this.state.dragstartX = e.offsetX;
    this.state.dragstartY = e.offsetY;
    this.state.dragorigX = e.offsetX;
    this.state.dragorigY = e.offsetY;
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.state.inDrag) {
      const deltaX = e.offsetX - this.state.dragstartX;
      const deltaY = e.offsetY - this.state.dragstartY;
      this.state.x0 -= deltaX / this.state.scaleX;
      this.state.y0 += deltaY / this.state.scaleY;
      this.state.dragstartX = e.offsetX;
      this.state.dragstartY = e.offsetY;
    }

    // Hover detection logic
    this.state.hoverSub = null;
    this.state.hoverBranch = null;
    // Convert mouse CSS coordinates to world coordinates for hover detection
    const worldX = this.state.x0 + e.offsetX / this.state.scaleX;
    const worldY = this.state.y0 - e.offsetY / this.state.scaleY;

    const hoverRadius = this.getDynamicSubstationRadius(true);

    for (const key in this.state.subs) {
      const sub = this.state.subs[key];
      const dist_to_sub = Math.sqrt(Math.pow(worldX - sub.Longitude, 2) + Math.pow(worldY - sub.Latitude, 2)) * this.state.scaleX;
      if (dist_to_sub < hoverRadius) {
        this.state.hoverSub = sub;
        break;
      }
    }

    if (this.state.hoverSub === null) {
      let mindist = ViewConfig.BRANCH_HOVER_RADIUS;
      for (const key in this.state.branches) {
        const branch = this.state.branches[key];
        const s1 = branch.sub1;
        const s2 = branch.sub2;
        if (!s1 || !s2 || !branch.dist || branch.dist === 0) continue;

        const dx = s2.Longitude - s1.Longitude;
        const dy = s2.Latitude - s1.Latitude;

        // 't' is the normalized projection of the mouse point onto the line segment.
        // t=0 corresponds to s1, t=1 to s2.
        // If t is between 0 and 1, the closest point on the infinite line is within the segment.
        const t = ((worldX - s1.Longitude) * dx + (worldY - s1.Latitude) * dy) / (branch.dist * branch.dist);

        if (t >= 0 && t <= 1) {
          // The mouse's projection is on the segment, so calculate perpendicular distance to the line.
          const dist_to_line = Math.abs(
              (s2.Latitude - s1.Latitude) * worldX - (s2.Longitude - s1.Longitude) * worldY 
              + s2.Longitude * s1.Latitude - s2.Latitude * s1.Longitude
          ) / branch.dist * this.state.scaleX;
          
          if (dist_to_line < mindist) {
              this.state.hoverBranch = branch;
              mindist = dist_to_line;
          }
        }
        // If t is outside [0, 1], the closest point is one of the substations.
        // That case is already handled by the substation hover logic, so we don't need to
        // calculate distance to endpoints here. This keeps branch hover separate from sub hover.
      }
    }
  }

  private handleMouseUp(e: MouseEvent) {
    this.state.inDrag = false;
    const dragdist = Math.sqrt(
      Math.pow(e.offsetX - this.state.dragorigX, 2) + Math.pow(e.offsetY - this.state.dragorigY, 2)
    );

    // If it was a click (not a drag)
    if (dragdist < ViewConfig.CLICK_DRAG_THRESHOLD) {
      if (this.state.hoverSub && this.onInteract) {
        this.onInteract('sub', this.state.hoverSub);
      } else if (this.state.hoverBranch && this.onInteract) {
        this.onInteract('branch', this.state.hoverBranch);
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
    const x = e.offsetX;
    const y = e.offsetY;

    const zoomFactor = Math.pow(1 + this.state.zoomSensitivity, -e.deltaY / 100);
    this.zoom(x, y, zoomFactor);
  }

  public performAction(action: GameAction) {
    const panAmount = ViewConfig.KEYBOARD_PAN_AMOUNT;
    const x = this.canvas.offsetWidth / 2;
    const y = this.canvas.offsetHeight / 2;
    switch (action) {
      case "ZOOM_IN": this.zoomIn(x, y); break;
      case "ZOOM_OUT": this.zoomOut(x, y); break;
      case "PAN_LEFT": this.state.x0 -= panAmount / this.state.scaleX; break;
      case "PAN_RIGHT": this.state.x0 += panAmount / this.state.scaleX; break;
      case "PAN_DOWN": this.state.y0 -= panAmount / this.state.scaleY; break;
      case "PAN_UP": this.state.y0 += panAmount / this.state.scaleY; break;
      case "TOGGLE_DEBUG_BOUNDS":
        this.state.debug_draw_map_bounds = !this.state.debug_draw_map_bounds;
        console.log(`[DEBUG] Map bounds drawing ${this.state.debug_draw_map_bounds ? 'ENABLED' : 'DISABLED'}`);
        break;
      case "RESET_ZOOM": this.onResetView?.(); break;
      case "TOGGLE_PAUSE": this.onTogglePause?.(); break;
      case "TOGGLE_FAST_FORWARD": this.onToggleFastForward?.(); break;
      case "DISCONNECT_MOST_LOADED_LINE": this.onDispatch?.({ type: 'DISCONNECT_MOST_LOADED_LINE' }); break;
      case "DISCONNECT_SMALLEST_LOAD": this.onDispatch?.({ type: 'DISCONNECT_SMALLEST_LOAD' }); break;
      case "RAMP_ALL_GENERATION_UP": this.onDispatch?.({ type: 'RAMP_ALL_GENERATION' }); break;
      case "EMERGENCY_LOAD_SHED": this.onDispatch?.({ type: 'EMERGENCY_LOAD_SHED' }); break;
    }
  }

  private zoom(x: number, y: number, zoomFactor: number) {
    const oldScale = this.state.scaleX;
    let newScale = oldScale * zoomFactor;

    // Clamp the new scale to the min/max zoom limits.
    newScale = Math.max(this.state.scale_min, Math.min(newScale, this.state.scale_max));

    // If scale hasn't changed (due to clamping), do nothing.
    if (newScale === oldScale) {
      return;
    }

    // The actual scale multiplier after clamping.
    const actualFactor = newScale / oldScale;

    this.state.scaleX = newScale;
    this.state.scaleY = newScale;

    // Adjust the view origin (x0, y0) to zoom towards the mouse cursor.
    // This keeps the point under the cursor stationary.
    this.state.x0 += x / oldScale * (1 - 1 / actualFactor);
    this.state.y0 -= y / oldScale * (1 - 1 / actualFactor);
  }

  public centerAndZoomOn(longitude: number, latitude: number, zoomLevel: number = ViewConfig.DETAIL_ZOOM_LEVEL) {
    // Set the zoom level first
    this.state.scaleX = zoomLevel;
    this.state.scaleY = zoomLevel;
    // Then calculate the new origin to center the point
    this.state.x0 = longitude - (this.canvas.offsetWidth / 2 / this.state.scaleX);
    this.state.y0 = latitude + (this.canvas.offsetHeight / 2 / this.state.scaleY);
  }

  public zoomIn(x: number, y: number) {
    // Simulate a "zoom in" wheel event with a standard "tick" value.
    const simulatedDeltaY = -100;
    const zoomFactor = Math.pow(1 + this.state.zoomSensitivity, -simulatedDeltaY / 100);
    this.zoom(x, y, zoomFactor);
  }

  public zoomOut(x: number, y: number) {
    // Simulate a "zoom out" wheel event with a standard "tick" value.
    const simulatedDeltaY = 100;
    const zoomFactor = Math.pow(1 + this.state.zoomSensitivity, -simulatedDeltaY / 100);
    this.zoom(x, y, zoomFactor);
  }
}