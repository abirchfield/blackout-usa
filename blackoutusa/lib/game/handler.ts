import { GameState, InteractionHandler } from "./types";

export class GameHandler {
  private canvas: HTMLCanvasElement;
  private state: GameState;
  private drawCallback: () => void;
  public onInteract?: InteractionHandler;

  constructor(canvas: HTMLCanvasElement, state: GameState, drawCallback: () => void) {
    this.canvas = canvas;
    this.state = state;
    this.drawCallback = drawCallback;

    // Bind Input Events
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this), { passive: false });
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
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
      this.drawCallback();
    }

    // Hover detection logic
    this.state.hoverSub = null;
    this.state.hoverBranch = null;
    const x = this.state.x0 + e.offsetX / this.state.scaleX;
    const y = this.state.y0 - e.offsetY / this.state.scaleY;

    for (const key in this.state.subs) {
      const sub = this.state.subs[key];
      const dist_to_sub = Math.sqrt(Math.pow(x - sub.Longitude, 2) + Math.pow(y - sub.Latitude, 2)) * this.state.scaleX;
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
            (s2.Latitude - s1.Latitude) * x - (s2.Longitude - s1.Longitude) * y 
            + s2.Longitude * s1.Latitude - s2.Latitude * s1.Longitude
        ) / branch.dist * this.state.scaleX;
        
        if (dist_to_line < mindist && x > Math.min(s1.Longitude, s2.Longitude) && x < Math.max(s1.Longitude, s2.Longitude) && y > Math.min(s1.Latitude, s2.Latitude) && y < Math.max(s1.Latitude, s2.Latitude)) {
            this.state.hoverBranch = branch;
            mindist = dist_to_line;
        }
      }
    }
  }

  private handleMouseUp(e: MouseEvent) {
    this.state.inDrag = false;
    const dragdist = Math.sqrt(
      Math.pow(e.offsetX - this.state.dragorigX, 2) + 
      Math.pow(e.offsetY - this.state.dragorigY, 2)
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

  private handleMouseLeave(e: MouseEvent) {
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
    this.drawCallback();
  }

  private handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case "PageUp": this.zoomIn(this.canvas.width / 2, this.canvas.height / 2, 1); break;
      case "PageDown": this.zoomOut(this.canvas.width / 2, this.canvas.height / 2, 1); break;
      case "ArrowLeft": this.state.x0 -= 50 / this.state.scaleX; break;
      case "ArrowRight": this.state.x0 += 50 / this.state.scaleX; break;
      case "ArrowDown": this.state.y0 -= 50 / this.state.scaleY; break;
      case "ArrowUp": this.state.y0 += 50 / this.state.scaleY; break;
    }
    this.drawCallback();
  }

  public zoomIn(x: number, y: number, factor: number) {
    if (factor < 0 || factor > 1) factor = 1;
    const this_scale = 1 + this.state.scale_adjust * factor;
    if (this.state.scaleX * this_scale < this.state.scale_max) {
      this.state.scaleX *= this_scale;
      this.state.scaleY *= this_scale;
      this.state.x0 += x / this.state.scaleX * (this_scale - 1);
      this.state.y0 -= y / this.state.scaleY * (this_scale - 1);
    }
  }

  public zoomOut(x: number, y: number, factor: number) {
    if (factor < 0 || factor > 1) factor = 1;
    const this_scale = 1 + this.state.scale_adjust * factor;
    if (this.state.scaleX / this_scale > this.state.scale_min) {
      this.state.scaleX /= this_scale;
      this.state.scaleY /= this_scale;
      this.state.x0 += x / this.state.scaleX * (1 / this_scale - 1);
      this.state.y0 -= y / this.state.scaleY * (1 / this_scale - 1);
    }
  }
}