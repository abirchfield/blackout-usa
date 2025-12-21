import { GameState } from "./types";

export class GameDrawer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public draw(state: GameState) {
    // Resize canvas to match display size (Fixes "nothing drawn" issue)
    if (this.canvas.width !== this.canvas.offsetWidth || this.canvas.height !== this.canvas.offsetHeight) {
      this.canvas.width = this.canvas.offsetWidth;
      this.canvas.height = this.canvas.offsetHeight;
    }

    state.anim_cycle_state = (state.anim_cycle_state + 1) % 16;
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    
    // Bounds Check
    if (state.x0 < state.xmin) state.x0 = state.xmin;
    if (state.x0 + width / state.scaleX > state.xmax) 
        state.x0 = state.xmax - width / state.scaleX;
    if (state.y0 - height / state.scaleY < state.ymin) 
        state.y0 = state.ymin + height / state.scaleY;
    if (state.y0 > state.ymax) state.y0 = state.ymax;

    // 1. Draw Borders
    if (state.borders && state.borders.length > 0) {
      this.ctx.strokeStyle = "White";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo((-state.x0 + state.borders[0][0]) * state.scaleX, (state.y0 - state.borders[0][1]) * state.scaleY);
      for (let i = 1; i < state.borders.length; i++) {
        this.ctx.lineTo((-state.x0 + state.borders[i][0]) * state.scaleX, (state.y0 - state.borders[i][1]) * state.scaleY);
      }
      this.ctx.stroke();
    }

    // 2. Draw Branches
    for (const key in state.branches) {
      const branch = state.branches[key];
      if (!branch.sub1 || !branch.sub2) continue;

      let r = 2.0;
      if (branch === state.hoverBranch) r = 4.0;

      let s1 = branch.sub1;
      let s2 = branch.sub2;
      
      // Swap based on flow direction for animation
      if (branch.P < 0) {
        s2 = branch.sub1;
        s1 = branch.sub2;
      }

      this.ctx.beginPath();
      this.ctx.moveTo((-state.x0 + s1.Longitude) * state.scaleX, (state.y0 - s1.Latitude) * state.scaleY);
      this.ctx.lineTo((-state.x0 + s2.Longitude) * state.scaleX, (state.y0 - s2.Latitude) * state.scaleY);

      if (branch.Status1 === "IN") {
        if (Math.abs(branch.P) > branch.Circuits * branch.Pmax * 1.2) this.ctx.strokeStyle = "Orange";
        else if (Math.abs(branch.P) > branch.Circuits * branch.Pmax) this.ctx.strokeStyle = "Yellow";
        else this.ctx.strokeStyle = "White";

        this.ctx.lineWidth = r;
        this.ctx.setLineDash([]);
        this.ctx.stroke();

        // Animated dots
        if (Math.abs(branch.P) > 10) {
          this.ctx.strokeStyle = "Black";
          this.ctx.lineWidth = r * 1.5;
          this.ctx.setLineDash([6, 26]);
          this.ctx.lineDashOffset = 2 * state.anim_cycle_state + 1;
          this.ctx.stroke();
          
          this.ctx.strokeStyle = "Lime";
          this.ctx.lineWidth = r * 1.5;
          this.ctx.setLineDash([4, 28]);
          this.ctx.lineDashOffset = 2 * state.anim_cycle_state;
          this.ctx.stroke();
        }
      } else {
        // Disconnected or Tripped
        this.ctx.strokeStyle = branch.Status1 === "TRIP" ? "Red" : "White";
        this.ctx.lineWidth = r;
        this.ctx.setLineDash([5, 5]); // Dashed for disconnected
        this.ctx.stroke();
      }

      // Draw second circuit if it exists
      if (branch.Circuits === 2) {
        this.ctx.beginPath();
        const circuit_offX = (s2.Latitude - s1.Latitude) / (branch.dist || 1) * 5;
        const circuit_offY = (s2.Longitude - s1.Longitude) / (branch.dist || 1) * 5;
        this.ctx.moveTo((-state.x0 + s1.Longitude) * state.scaleX + circuit_offX, (state.y0 - s1.Latitude) * state.scaleY + circuit_offY);
        this.ctx.lineTo((-state.x0 + s2.Longitude) * state.scaleX + circuit_offX, (state.y0 - s2.Latitude) * state.scaleY + circuit_offY);

        if (branch.Status2 === "IN") {
            // Recalculate color for second circuit
            if (Math.abs(branch.P) > branch.Circuits * branch.Pmax * 1.2) this.ctx.strokeStyle = "Orange";
            else if (Math.abs(branch.P) > branch.Circuits * branch.Pmax) this.ctx.strokeStyle = "Yellow";
            else this.ctx.strokeStyle = "White";

            this.ctx.lineWidth = r;
            this.ctx.setLineDash([]);
            this.ctx.stroke();
            
            // Animated dots for circuit 2
            if (Math.abs(branch.P) > 10) {
              this.ctx.strokeStyle = "Black";
              this.ctx.lineWidth = r * 1.5;
              this.ctx.setLineDash([6, 26]);
              this.ctx.lineDashOffset = 2 * state.anim_cycle_state + 1;
              this.ctx.stroke();
              
              this.ctx.strokeStyle = "Lime";
              this.ctx.lineWidth = r * 1.5;
              this.ctx.setLineDash([4, 28]);
              this.ctx.lineDashOffset = 2 * state.anim_cycle_state;
              this.ctx.stroke();
            }
        } else {
            this.ctx.strokeStyle = branch.Status2 === "TRIP" ? "Red" : "White";
            this.ctx.lineWidth = r;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
        }
      }

      this.ctx.setLineDash([]); // Reset
    }

    // 3. Draw Substations
    for (const key in state.subs) {
      const sub = state.subs[key];
      let P = 0;
      for (let iu = 0; iu < sub.Units; ++iu) P += sub.U[iu].P;
      P = Math.min(P, 0.99 * sub.Pmax);
      P = Math.max(P, 0);

      let r = 10;
      if (sub === state.hoverSub) r = 13;

      const cx = (-state.x0 + sub.Longitude) * state.scaleX;
      const cy = (state.y0 - sub.Latitude) * state.scaleY;

      if (sub.Category === "Load") {
        const Pmax = sub.Pmax * state.fr_load;
        this.ctx.strokeStyle = "White";
        this.ctx.lineWidth = 3;
        this.ctx.fillStyle = "Black";
        
        // Check for trip
        let alltrip = true;
        for (let iu = 0; iu < sub.Units; ++iu) if (sub.U[iu].Status !== "TRIP") alltrip = false;
        if (alltrip) this.ctx.strokeStyle = "Red";

        this.ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        
        // Fill based on load
        this.ctx.fillStyle = "White";
        if (Pmax > 0) {
            this.ctx.fillRect(cx - r, cy - r - 2 * r * (P - Pmax) / Pmax, 2 * r, 2 * r * P / Pmax);
        }
        this.ctx.strokeRect(cx - r, cy - r, 2 * r, 2 * r);
      } else {
        // Generators
        if (sub.Category === "Wind") this.ctx.fillStyle = "Green";
        else if (sub.Category === "Solar PV") this.ctx.fillStyle = "Yellow";
        else if (sub.Category === "Nuclear Steam") this.ctx.fillStyle = "Magenta";
        else this.ctx.fillStyle = "Gray";

        this.ctx.strokeStyle = "White";
        let alltrip = true;
        for (let iu = 0; iu < sub.Units; ++iu) if (sub.U[iu].Status !== "TRIP") alltrip = false;
        if (alltrip) {
            this.ctx.strokeStyle = "Red";
            this.ctx.fillStyle = "Red";
        }

        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r * 1.2, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // Pie chart fill for output
        this.ctx.fillStyle = "Black";
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 0.001 + 6.28 * P / sub.Pmax, true);
        this.ctx.lineTo(cx, cy);
        this.ctx.fill();
      }

      // Labels
      this.ctx.font = sub === state.hoverSub ? "20px Arial" : "15px Arial";
      this.ctx.strokeStyle = "Black";
      this.ctx.lineWidth = 3;
      this.ctx.fillStyle = "White";
      this.ctx.strokeText(sub.Name, cx + 15, cy + 5);
      this.ctx.fillText(sub.Name, cx + 15, cy + 5);
    }
  }
}