import { Branch, GameState, Substation } from "./types";

const COLOR_TRIPPED = "Red";
const COLOR_OVERLOAD_CRITICAL = "Orange";
const COLOR_OVERLOAD_NORMAL = "Yellow";
const COLOR_POWER_FLOW = "Lime";

export class GameDrawer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  /**
   * Main drawing method, orchestrates the drawing of all game elements.
   */
  public draw(state: GameState) {
    this.resizeCanvas();

    const { width, height } = this.canvas;

    const primaryColor = state.theme === 'light' ? 'black' : 'white';
    const secondaryColor = state.theme === 'light' ? 'white' : 'black';

    // Update animation state for power flow dots
    state.anim_cycle_state = (state.anim_cycle_state + 1) % 16;

    // Clear canvas
    this.ctx.fillStyle = secondaryColor;
    this.ctx.fillRect(0, 0, width, height);
    
    this.applyViewBounds(state);

    this.drawBorders(state, primaryColor);
    this.drawAllBranches(state, primaryColor, secondaryColor);
    this.drawAllSubstations(state, primaryColor, secondaryColor);
    this.drawHoverLabel(state, primaryColor, secondaryColor);
  }

  // --- Private Helper Methods ---

  private resizeCanvas() {
    if (this.canvas.width !== this.canvas.offsetWidth || this.canvas.height !== this.canvas.offsetHeight) {
      this.canvas.width = this.canvas.offsetWidth;
      this.canvas.height = this.canvas.offsetHeight;
    }
  }

  private applyViewBounds(state: GameState) {
    const { width, height } = this.canvas;
    if (state.x0 < state.xmin) state.x0 = state.xmin;
    if (state.x0 + width / state.scaleX > state.xmax) state.x0 = state.xmax - width / state.scaleX;
    if (state.y0 - height / state.scaleY < state.ymin) state.y0 = state.ymin + height / state.scaleY;
    if (state.y0 > state.ymax) state.y0 = state.ymax;
  }

  private getScreenPos(lon: number, lat: number, state: GameState): { x: number; y: number } {
    return {
        x: (-state.x0 + lon) * state.scaleX,
        y: (state.y0 - lat) * state.scaleY,
    };
  }

  private drawBorders(state: GameState, primaryColor: string) {
    if (!state.borders || state.borders.length === 0) return;

    this.ctx.strokeStyle = primaryColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    const startPos = this.getScreenPos(state.borders[0][0], state.borders[0][1], state);
    this.ctx.moveTo(startPos.x, startPos.y);

    for (let i = 1; i < state.borders.length; i++) {
        const pos = this.getScreenPos(state.borders[i][0], state.borders[i][1], state);
        this.ctx.lineTo(pos.x, pos.y);
    }
    this.ctx.stroke();
  }

  private drawAllBranches(state: GameState, primaryColor: string, secondaryColor: string) {
    for (const key in state.branches) {
      const branch = state.branches[key];
      if (!branch.sub1 || !branch.sub2) continue;

      const radius = (branch === state.hoverBranch) ? 4.0 : 2.0;

      // Swap substations based on power flow direction for animation
      const [s1, s2] = branch.P < 0 ? [branch.sub2, branch.sub1] : [branch.sub1, branch.sub2];

      this.drawBranchCircuit(branch, branch.Status1, s1, s2, radius, state, primaryColor, secondaryColor);

      if (branch.Circuits === 2) {
        this.drawBranchCircuit(branch, branch.Status2, s1, s2, radius, state, primaryColor, secondaryColor, true);
      }
    }
    this.ctx.setLineDash([]); // Reset line dash after drawing all branches
  }

  private drawBranchCircuit(branch: Branch, status: string, s1: Substation, s2: Substation, radius: number, state: GameState, primaryColor: string, secondaryColor: string, isSecondCircuit = false) {
    const p1 = this.getScreenPos(s1.Longitude, s1.Latitude, state);
    const p2 = this.getScreenPos(s2.Longitude, s2.Latitude, state);

    this.ctx.beginPath();

    if (isSecondCircuit) {
        const offset = 5;
        const circuit_offX = (s2.Latitude - s1.Latitude) / (branch.dist || 1) * offset;
        const circuit_offY = (s2.Longitude - s1.Longitude) / (branch.dist || 1) * offset;
        
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p1.x + circuit_offX, p1.y + circuit_offY);
        this.ctx.lineTo(p2.x + circuit_offX, p2.y + circuit_offY);
        this.ctx.lineTo(p2.x, p2.y);
    } else {
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
    }

    switch (status) {
        case "IN":
            if (Math.abs(branch.P) > branch.Circuits * branch.Pmax * 1.2) this.ctx.strokeStyle = COLOR_OVERLOAD_CRITICAL;
            else if (Math.abs(branch.P) > branch.Circuits * branch.Pmax) this.ctx.strokeStyle = COLOR_OVERLOAD_NORMAL;
            else this.ctx.strokeStyle = primaryColor;

            this.ctx.lineWidth = radius;
            this.ctx.setLineDash([]);
            this.ctx.stroke();

            if (Math.abs(branch.P) > 10) {
                this.drawAnimatedPowerFlow(radius, state, secondaryColor);
            }
            break;
        case "DIS":
            this.ctx.strokeStyle = primaryColor;
            this.ctx.lineWidth = radius;
            this.ctx.setLineDash([]);
            this.ctx.stroke();
            this.ctx.strokeStyle = secondaryColor;
            this.ctx.lineWidth = radius * 1.5;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            break;
        case "TRIP":
            this.ctx.strokeStyle = COLOR_TRIPPED;
            this.ctx.lineWidth = radius;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            break;
    }
  }

  private drawAnimatedPowerFlow(radius: number, state: GameState, secondaryColor: string) {
    // Background dash to create a gap for the colored dot
    this.ctx.strokeStyle = secondaryColor;
    this.ctx.lineWidth = radius * 1.5;
    this.ctx.setLineDash([6, 26]);
    this.ctx.lineDashOffset = 2 * state.anim_cycle_state + 1;
    this.ctx.stroke();
    
    // Foreground colored dot
    this.ctx.strokeStyle = COLOR_POWER_FLOW;
    this.ctx.lineWidth = radius * 1.5;
    this.ctx.setLineDash([4, 28]);
    this.ctx.lineDashOffset = 2 * state.anim_cycle_state;
    this.ctx.stroke();
  }

  private drawAllSubstations(state: GameState, primaryColor: string, secondaryColor: string) {
    for (const key in state.subs) {
      const sub = state.subs[key];
      const { x: cx, y: cy } = this.getScreenPos(sub.Longitude, sub.Latitude, state);
      const radius = (sub === state.hoverSub) ? 13 : 10;

      if (sub.Category === "Load") {
        this.drawLoadSubstation(sub, state, cx, cy, radius, primaryColor, secondaryColor);
      } else {
        this.drawGeneratorSubstation(sub, cx, cy, radius, primaryColor, secondaryColor);
      }

      this.ctx.font = sub === state.hoverSub ? "20px Arial" : "15px Arial";
      this.ctx.strokeStyle = secondaryColor;
      this.ctx.lineWidth = 3;
      this.ctx.fillStyle = primaryColor;
      this.ctx.strokeText(sub.Name, cx + 15, cy + 5);
      this.ctx.fillText(sub.Name, cx + 15, cy + 5);
    }
  }

  private getGeneratorColor(category: string): string {
    switch (category) {
        case "Wind": return "Green";
        case "Solar PV": return "Yellow";
        case "Nuclear Steam": return "Magenta";
        default: return "Gray";
    }
  }

  private drawLoadSubstation(sub: Substation, state: GameState, cx: number, cy: number, r: number, primaryColor: string, secondaryColor: string) {
    const P = sub.U.reduce((acc, unit) => acc + unit.P, 0);
    const Pmax = sub.Pmax * state.fr_load;
    
    const allTripped = sub.U.every((unit) => unit.Status === "TRIP");
    this.ctx.strokeStyle = allTripped ? COLOR_TRIPPED : primaryColor;
    this.ctx.lineWidth = 3;
    
    this.ctx.fillStyle = secondaryColor;
    this.ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    
    if (Pmax > 0) {
        this.ctx.fillStyle = primaryColor;
        const fillRatio = Math.max(0, P / Pmax);
        const fillHeight = 2 * r * fillRatio;
        this.ctx.fillRect(cx - r, cy + r - fillHeight, 2 * r, fillHeight);
    }

    this.ctx.strokeRect(cx - r, cy - r, 2 * r, 2 * r);
  }

  private drawGeneratorSubstation(sub: Substation, cx: number, cy: number, r: number, primaryColor: string, secondaryColor: string) {
    const P = sub.U.reduce((acc, unit) => acc + unit.P, 0);
    const clampedP = Math.max(0, Math.min(P, sub.Pmax));

    const genColor = this.getGeneratorColor(sub.Category);
    const allTripped = sub.U.every((unit) => unit.Status === "TRIP");

    const displayColor = allTripped ? COLOR_TRIPPED : genColor;
    const borderColor = allTripped ? COLOR_TRIPPED : primaryColor;

    this.ctx.fillStyle = displayColor;
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * 1.2, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = secondaryColor;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    this.ctx.fill();

    if (sub.Pmax > 0 && clampedP > 0 && !allTripped) {
        this.ctx.fillStyle = displayColor;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (2 * Math.PI * clampedP / sub.Pmax);
        this.ctx.arc(cx, cy, r, startAngle, endAngle, false);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  private drawHoverLabel(state: GameState, primaryColor: string, secondaryColor: string) {
    if (!state.hoverBranch) return;

    const branch = state.hoverBranch;
    if (!branch.sub1 || !branch.sub2) return;

    const Lat = 0.5 * (branch.sub1.Latitude + branch.sub2.Latitude);
    const Lon = 0.5 * (branch.sub1.Longitude + branch.sub2.Longitude);
    const pos = this.getScreenPos(Lon, Lat, state);
    const cx = pos.x + 15;
    const cy = pos.y + 5;

    this.ctx.font = "20px Arial";
    this.ctx.strokeStyle = secondaryColor;
    this.ctx.lineWidth = 3;

    let text = `${Math.abs(branch.P).toFixed(0)} MW`;
    let color = primaryColor;

    if (branch.Status1 === "TRIP" || branch.Status2 === "TRIP") {
      text = "TRIPPED - cannot reclose";
      color = COLOR_TRIPPED;
    } else if (branch.Status1 === "DIS" && (branch.Circuits === 1 || branch.Status2 === "DIS")) {
      text = "Line out of service";
    } else if (Math.abs(branch.P) > branch.Circuits * branch.Pmax * 1.5) {
      color = COLOR_OVERLOAD_CRITICAL;
      text += " (CRITICALLY OVERLOADED)";
    } else if (Math.abs(branch.P) > branch.Circuits * branch.Pmax) {
      color = COLOR_OVERLOAD_NORMAL;
      text += " (overloaded)";
    }
    
    this.ctx.fillStyle = color;
    this.ctx.strokeText(text, cx, cy);
    this.ctx.fillText(text, cx, cy);
  }
}