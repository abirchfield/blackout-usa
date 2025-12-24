import { GameState, InteractionHandler } from "../types";
import { GameAction } from "../key-bindings";

export class GameHandler {
  private canvas: HTMLCanvasElement;
  private state: GameState;
  private drawCallback: () => void;
  public onInteract?: InteractionHandler;

  // Store bound event handlers to ensure they can be removed correctly.
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseLeave: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleWheel: (e: WheelEvent) => void;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

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
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);

    // Add event listeners using the bound handlers
    this.canvas.addEventListener("mousedown", this.boundHandleMouseDown);
    this.canvas.addEventListener("mousemove", this.boundHandleMouseMove);
    this.canvas.addEventListener("mouseleave", this.boundHandleMouseLeave);
    this.canvas.addEventListener("mouseup", this.boundHandleMouseUp);
    this.canvas.addEventListener("wheel", this.boundHandleWheel, { passive: false });
    this.canvas.addEventListener("keydown", this.boundHandleKeyDown);
  }

  public destroy() {
    // Remove all event listeners using the same bound function references
    // to prevent memory leaks and "zombie" listeners.
    this.canvas.removeEventListener("mousedown", this.boundHandleMouseDown);
    this.canvas.removeEventListener("mousemove", this.boundHandleMouseMove);
    this.canvas.removeEventListener("mouseleave", this.boundHandleMouseLeave);
    this.canvas.removeEventListener("mouseup", this.boundHandleMouseUp);
    this.canvas.removeEventListener("wheel", this.boundHandleWheel);
    this.canvas.removeEventListener("keydown", this.boundHandleKeyDown);
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

    for (const key in this.state.subs) {
      const sub = this.state.subs[key];
      const dist_to_sub = Math.sqrt(Math.pow(worldX - sub.Longitude, 2) + Math.pow(worldY - sub.Latitude, 2)) * this.state.scaleX;
      if (dist_to_sub < 15) {
        this.state.hoverSub = sub;
        break;
      }
    }

    if (this.state.hoverSub === null) {
      let mindist = 30;
      for (const key in this.state.branches) {
        const branch = this.state.branches[key];
        const s1 = branch.sub1;
        const s2 = branch.sub2;
        if (!s1 || !s2 || !branch.dist) continue;

        const dist_to_line = Math.abs(
            (s2.Latitude - s1.Latitude) * worldX - (s2.Longitude - s1.Longitude) * worldY 
            + s2.Longitude * s1.Latitude - s2.Latitude * s1.Longitude
        ) / branch.dist * this.state.scaleX;
        
        if (dist_to_line < mindist && worldX > Math.min(s1.Longitude, s2.Longitude) && worldX < Math.max(s1.Longitude, s2.Longitude) && worldY > Math.min(s1.Latitude, s2.Latitude) && worldY < Math.max(s1.Latitude, s2.Latitude)) {
            this.state.hoverBranch = branch;
            mindist = dist_to_line;
        }
      }
    }
  }

  private handleMouseUp(e: MouseEvent) {
    this.state.inDrag = false;
    const dragdist = Math.sqrt(
      Math.pow(e.offsetX - this.state.dragorigX, 2) + Math.pow(e.offsetY - this.state.dragorigY, 2)
    );

    // If it was a click (not a drag)
    if (dragdist < 10) {
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
    if (e.deltaY < 0) {
      this.zoomIn(e.offsetX, e.offsetY, Math.abs(e.deltaY / 3));
    } else if (e.deltaY > 0) {
      this.zoomOut(e.offsetX, e.offsetY, Math.abs(e.deltaY / 3));
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    // Find the action corresponding to the pressed key
    const action = (Object.keys(this.state.keyBindings) as GameAction[]).find(
      (act) => this.state.keyBindings[act] === key
    );

    if (!action) return; // No action bound to this key

    let handled = true;

    switch (action) {
      case "ZOOM_IN": this.zoomIn(this.canvas.offsetWidth / 2, this.canvas.offsetHeight / 2, 1); break;
      case "ZOOM_OUT": this.zoomOut(this.canvas.offsetWidth / 2, this.canvas.offsetHeight / 2, 1); break;
      case "PAN_LEFT": this.state.x0 -= 50 / this.state.scaleX; break;
      case "PAN_RIGHT": this.state.x0 += 50 / this.state.scaleX; break;
      case "PAN_DOWN": this.state.y0 -= 50 / this.state.scaleY; break;
      case "PAN_UP": this.state.y0 += 50 / this.state.scaleY; break;
      case "TOGGLE_DEBUG_BOUNDS":
        this.state.debug_draw_map_bounds = !this.state.debug_draw_map_bounds;
        console.log(`[DEBUG] Map bounds drawing ${this.state.debug_draw_map_bounds ? 'ENABLED' : 'DISABLED'}`);
        break;
      case "DISCONNECT_MOST_LOADED_LINE":
        console.log("[ACTION] Disconnect most loaded line (not implemented)");
        break;
      case "DISCONNECT_SMALLEST_LOAD":
        console.log("[ACTION] Disconnect smallest load (not implemented)");
        break;
      case "RAMP_ALL_GENERATION_UP":
        console.log("[ACTION] Ramp all generation up (not implemented)");
        break;
      case "TOGGLE_PAUSE":
        console.log("[ACTION] Toggle Pause (not implemented via handler - use UI buttons)");
        break;
      case "TOGGLE_FAST_FORWARD":
        console.log("[ACTION] Toggle Fast Forward (not implemented via handler - use UI buttons)");
        break;
      case "CYCLE_ELEMENT_FORWARD":
        console.log("[ACTION] Cycle Element Forward (not implemented)");
        break;
      case "CYCLE_ELEMENT_BACKWARD":
        console.log("[ACTION] Cycle Element Backward (not implemented)");
        break;
      case "OPEN_DETAILS":
        console.log("[ACTION] Open Details for Cycled Element (not implemented)");
        break;
      case "CENTER_VIEW_ON_SELECTION":
        console.log("[ACTION] Center View on Selection (not implemented)");
        break;
      case "CYCLE_SIDEBAR_TABS":
        console.log("[ACTION] Cycle Sidebar Tabs (not implemented)");
        break;
      case "EMERGENCY_LOAD_SHED":
        console.log("[ACTION] Emergency Load Shed (not implemented)");
        break;
      default: handled = false;
    }

    if (handled) {
      e.preventDefault();
    }
  }

  public zoomIn(x: number, y: number, factor: number) {
    if (factor < 0 || factor > 1) factor = 1;
    const this_scale = 1 + this.state.scale_adjust * factor;
    if (this.state.scaleX * this_scale <= this.state.scale_max) {
      this.state.scaleX *= this_scale;
      this.state.scaleY *= this_scale;
      this.state.x0 += x / this.state.scaleX * (this_scale - 1);
      this.state.y0 -= y / this.state.scaleY * (this_scale - 1);
    }
  }

  public zoomOut(x: number, y: number, factor: number) {
    if (factor < 0 || factor > 1) factor = 1;
    const this_scale = 1 + this.state.scale_adjust * factor;
    if (this.state.scaleX / this_scale >= this.state.scale_min) {
      this.state.scaleX /= this_scale;
      this.state.scaleY /= this_scale;
      this.state.x0 += x / this.state.scaleX * (1 / this_scale - 1);
      this.state.y0 -= y / this.state.scaleY * (1 / this_scale - 1);
    }
  }
}