import { Branch, GameState, Substation, BranchStatus, UnitStatus, SubstationCategory } from "../types";
import { AppColors, GenerationTypeConfig } from "../config";

// --- Constants ---

// --- Animation ---
// The total length of the dash pattern for power flow. This is the modulus for the animation cycle.
// It MUST match the sum of the values in POWER_FLOW_DASH_... arrays (e.g., 4 + 28 = 32).
const POWER_FLOW_PATTERN_LENGTH = 32;
const MIN_POWER_FOR_ANIMATION = 10;
// Controls how many pixels the animation moves per frame. Can be a decimal.
// Slower < 1 < Faster.
const ANIMATION_SPEED_FACTOR = 0.5;

// --- Drawing Styles ---
const BORDER_LINE_WIDTH = 2;
const BRANCH_RADIUS_NORMAL = 2.0;
const BRANCH_RADIUS_HOVER = 4.0;
const SUBSTATION_RADIUS_NORMAL = 10;
const SUBSTATION_RADIUS_HOVER = 13;
const SUBSTATION_BORDER_WIDTH = 3;
const GENERATOR_OUTLINE_WIDTH = 1;
const GENERATOR_OUTER_RADIUS_FACTOR = 1.2;
const SECOND_CIRCUIT_OFFSET = 5;
const POWER_FLOW_LINE_WIDTH_FACTOR = 1.5;

// --- Line Dashes ---
const DISCONNECTED_LINE_DASH = [5, 5];
// The background dash creates the "gap" for the moving dot. Sum must be POWER_FLOW_PATTERN_LENGTH.
const POWER_FLOW_DASH_BACKGROUND = [6, 26];
// The foreground dash IS the moving dot. Sum must be POWER_FLOW_PATTERN_LENGTH.
const POWER_FLOW_DASH_FOREGROUND = [4, 28];

// --- Math ---
const TWO_PI = Math.PI * 2;
const PIE_CHART_START_ANGLE = -Math.PI / 2; // Start at 12 o'clock

// --- Overload Thresholds ---
const BRANCH_OVERLOAD_NORMAL_THRESHOLD = 1.0;
const BRANCH_OVERLOAD_CRITICAL_THRESHOLD_DRAW = 1.2;
const BRANCH_OVERLOAD_CRITICAL_THRESHOLD_LABEL = 1.5;

// --- Fonts & Labels ---
const FONT_NORMAL = "15px Arial";
const FONT_HOVER = "20px Arial";
const LABEL_OFFSET_X = 15;
const LABEL_OFFSET_Y = 5;
const LABEL_OUTLINE_WIDTH = 3;
const LABEL_FADE_END_MULTIPLIER = 2.0; // Labels are fully visible at 2x minimum zoom.

export class GameDrawer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  // Per-frame state
  private state!: GameState;
  private primaryColor!: string;
  private secondaryColor!: string;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public destroy() {
    // Currently, GameDrawer doesn't add any event listeners, so this method is
    // primarily for symmetry with GameHandler and for future-proofing.
    // If any resources were to be cleaned up (e.g., removing listeners,
    // stopping observers), this would be the place to do it.
  }

  /**
   * Main drawing method, orchestrates the drawing of all game elements.
   */
  public draw(state: GameState, isPaused: boolean, isFastForward: boolean) {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.save();
    // Scale the context to match the device's pixel ratio. This ensures sharp rendering on high-DPI screens.
    this.ctx.scale(dpr, dpr);

    this.setupFrame(state, isPaused, isFastForward);

    // Clear canvas
    this.ctx.fillStyle = this.secondaryColor;
    // Use the logical (CSS) size for clearing, as the context is now scaled.
    // This will correctly clear the entire high-resolution backing store.
    this.ctx.fillRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);
    
    this.updateZoomLimits(state); // Ensure zoom limits are updated on every draw/resize
    this.applyViewBounds();

    this.drawBorders();
    this.drawAllBranches();
    this.drawAllSubstations();
    this.drawHoverLabel();

    if (this.state.debug_draw_map_bounds) {
      this.drawDebugMapBounds();
    }

    this.ctx.restore();
  }

  // --- Private Canvas & View Helpers ---

  private setupFrame(state: GameState, isPaused: boolean, isFastForward: boolean) {
    this.state = state;
    this.setThemeColors();
    // Update animation state for power flow dots
    if (!isPaused && this.state.animationsEnabled) {
      const speedFactor = isFastForward ? ANIMATION_SPEED_FACTOR * 3 : ANIMATION_SPEED_FACTOR;
      this.state.anim_cycle_state = (this.state.anim_cycle_state + speedFactor) % POWER_FLOW_PATTERN_LENGTH;
    }
  }

  private setThemeColors() {
    // Dynamically get the resolved theme colors from the document's computed styles.
    // This ensures the canvas background perfectly matches the page background.
    const bodyStyles = window.getComputedStyle(document.body);
    this.primaryColor = bodyStyles.color;
    this.secondaryColor = bodyStyles.backgroundColor;
  }

  public resizeCanvas(): boolean {
    const dpr = window.devicePixelRatio || 1;
    const { offsetWidth, offsetHeight } = this.canvas;

    // Round the values to the nearest integer. This is crucial for preventing
    // floating-point comparison issues with non-integer devicePixelRatios (e.g., 1.5),
    // which would otherwise cause a resize on every frame, resetting the view.
    const displayWidth = Math.round(offsetWidth * dpr);
    const displayHeight = Math.round(offsetHeight * dpr);

    // Check if the canvas drawing buffer size needs to be updated.
    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      // Set the drawing buffer size to match the device's pixel density for high-res rendering.
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      return true;
    }
    return false;
  }

  public setInitialView(state: GameState) {
    // Use logical (CSS) dimensions for view calculations, not the backing store size.
    const { offsetWidth: width, offsetHeight: height } = this.canvas;
    if (width === 0 || height === 0) return; // Avoid division by zero if canvas isn't ready

    const mapWidth = state.xmax - state.xmin;
    const mapHeight = state.ymax - state.ymin;

    // Calculate scale to fit the entire map within the canvas
    const scaleToFitX = width / mapWidth;
    const scaleToFitY = height / mapHeight;

    // Use the smaller scale to ensure the entire map is visible
    const initialScale = Math.min(scaleToFitX, scaleToFitY);

    // Set the initial scale and minimum zoom limit
    state.scaleX = initialScale;
    state.scaleY = initialScale;
    state.scale_min = initialScale; // The minimum zoom is now dynamic

    // Calculate x0 and y0 to center the map
    state.x0 = state.xmin - (width / initialScale - mapWidth) / 2;
    state.y0 = state.ymax + (height / initialScale - mapHeight) / 2;
  }

  public isCanvasReady(): boolean {
    return this.canvas.width > 0;
  }

  private applyViewBounds() {
    // Use logical (CSS) dimensions for view calculations.
    const { offsetWidth: width, offsetHeight: height } = this.canvas;
    const viewWidth = width / this.state.scaleX;
    const viewHeight = height / this.state.scaleY;
    const mapWidth = this.state.xmax - this.state.xmin;
    const mapHeight = this.state.ymax - this.state.ymin;

    // Horizontal bounds
    if (viewWidth > mapWidth) {
      // Zoomed out: Keep map inside view.
      const minX0 = this.state.xmax - viewWidth;
      const maxX0 = this.state.xmin;
      if (this.state.x0 < minX0) this.state.x0 = minX0;
      if (this.state.x0 > maxX0) this.state.x0 = maxX0;
    } else {
      // Zoomed in: Keep view inside map.
      const minX0 = this.state.xmin;
      const maxX0 = this.state.xmax - viewWidth;
      if (this.state.x0 < minX0) this.state.x0 = minX0;
      if (this.state.x0 > maxX0) this.state.x0 = maxX0;
    }

    // Vertical bounds
    if (viewHeight > mapHeight) {
      // Zoomed out: Keep map inside view.
      const minY0 = this.state.ymax;
      const maxY0 = this.state.ymin + viewHeight;
      if (this.state.y0 < minY0) this.state.y0 = minY0;
      if (this.state.y0 > maxY0) this.state.y0 = maxY0;
    } else {
      // Zoomed in: Keep view inside map.
      const minY0 = this.state.ymin + viewHeight;
      const maxY0 = this.state.ymax;
      if (this.state.y0 > maxY0) this.state.y0 = maxY0;
      if (this.state.y0 < minY0) this.state.y0 = minY0;
    }
  }

  // Updates the dynamic minimum zoom limit based on current canvas size
  public updateZoomLimits(state: GameState) {
    // Use logical (CSS) dimensions for view calculations.
    const { offsetWidth: width, offsetHeight: height } = this.canvas;
    const mapWidth = state.xmax - state.xmin;
    const mapHeight = state.ymax - state.ymin;

    const scaleToFitX = width / mapWidth;
    const scaleToFitY = height / mapHeight;
    state.scale_min = Math.min(scaleToFitX, scaleToFitY);
  }

  private getScreenPos(lon: number, lat: number): { x: number; y: number } {
    return {
        x: (-this.state.x0 + lon) * this.state.scaleX,
        y: (this.state.y0 - lat) * this.state.scaleY,
    };
  }

  private drawDebugMapBounds() {
    const topLeft = this.getScreenPos(this.state.xmin, this.state.ymax);
    const bottomRight = this.getScreenPos(this.state.xmax, this.state.ymin);

    this.ctx.strokeStyle = AppColors.DEBUG;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 5]);
    this.ctx.strokeRect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
    );
    this.ctx.setLineDash([]); // Reset for other drawing functions
  }

  // --- Private Generic Drawing Helpers ---

  private strokePath(options: { style: string | CanvasGradient | CanvasPattern, width: number, dash?: readonly number[], dashOffset?: number }) {
    this.ctx.strokeStyle = options.style;
    this.ctx.lineWidth = options.width;
    this.ctx.setLineDash(options.dash ?? []);
    if (options.dashOffset !== undefined) {
        this.ctx.lineDashOffset = options.dashOffset;
    }
    this.ctx.stroke();
  }

  private drawCircle(cx: number, cy: number, radius: number, options: { fill?: string, stroke?: string, lineWidth?: number }) {
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, TWO_PI);
    if (options.fill) {
        this.ctx.fillStyle = options.fill;
        this.ctx.fill();
    }
    if (options.stroke) {
        this.ctx.strokeStyle = options.stroke;
        this.ctx.lineWidth = options.lineWidth ?? 1;
        this.ctx.stroke();
    }
  }

  private drawPieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.arc(cx, cy, radius, startAngle, endAngle, false);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawOutlinedText(text: string, x: number, y: number, font: string, fillStyle: string, outlineStyle: string) {
    this.ctx.font = font;
    this.ctx.strokeStyle = outlineStyle;
    this.ctx.lineWidth = LABEL_OUTLINE_WIDTH;
    this.ctx.fillStyle = fillStyle;

    this.ctx.strokeText(text, x, y);
    this.ctx.fillText(text, x, y);
  }

  // --- Private Main Drawing Methods ---

  private drawBorders() {
    if (!this.state.borders || this.state.borders.length === 0) return;

    this.ctx.strokeStyle = this.primaryColor;
    this.ctx.lineWidth = BORDER_LINE_WIDTH;
    this.ctx.beginPath();
    
    const startPos = this.getScreenPos(this.state.borders[0][0], this.state.borders[0][1]);
    this.ctx.moveTo(startPos.x, startPos.y);

    for (let i = 1; i < this.state.borders.length; i++) {
        const pos = this.getScreenPos(this.state.borders[i][0], this.state.borders[i][1]);
        this.ctx.lineTo(pos.x, pos.y);
    }
    this.ctx.stroke();
  }

  private drawAllBranches() {
    for (const key in this.state.branches) {
      const branch = this.state.branches[key];
      if (!branch.sub1 || !branch.sub2) continue;

      const radius = (branch === this.state.hoverBranch) ? BRANCH_RADIUS_HOVER : BRANCH_RADIUS_NORMAL;

      // Swap substations based on power flow direction for animation
      const [s1, s2] = branch.P < 0 ? [branch.sub2, branch.sub1] : [branch.sub1, branch.sub2];
      this.drawBranchCircuit(branch, branch.Status1, s1, s2, radius);

      if (branch.Circuits === 2) {
        this.drawBranchCircuit(branch, branch.Status2, s1, s2, radius, true);
      }
    }
    this.ctx.setLineDash([]); // Reset line dash after drawing all branches
  }

  private drawBranchCircuit(branch: Branch, status: string, s1: Substation, s2: Substation, radius: number, isSecondCircuit = false) {
    const p1 = this.getScreenPos(s1.Longitude, s1.Latitude);
    const p2 = this.getScreenPos(s2.Longitude, s2.Latitude);

    this.ctx.beginPath();

    if (isSecondCircuit) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            // Calculate a perpendicular vector in screen space
            const offsetX = -dy / dist * SECOND_CIRCUIT_OFFSET;
            const offsetY = dx / dist * SECOND_CIRCUIT_OFFSET;

            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p1.x + offsetX, p1.y + offsetY);
            this.ctx.lineTo(p2.x + offsetX, p2.y + offsetY);
            this.ctx.lineTo(p2.x, p2.y);
        } else {
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
        }
    } else {
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
    }

    switch (status) {
        case BranchStatus.IN:
            this.strokePath({ style: this.getBranchOverloadColor(branch), width: radius });
            if (Math.abs(branch.P) > MIN_POWER_FOR_ANIMATION) {
                if (this.state.animationsEnabled) {
                    this.drawAnimatedPowerFlow(radius);
                } else {
                    // Draw a static line to indicate power flow when animations are off
                    this.strokePath({ style: AppColors.POWER_FLOW, width: radius * POWER_FLOW_LINE_WIDTH_FACTOR });
                }
            }
            break;
        case BranchStatus.DIS:
            // Draw solid line then dashed on top for disconnected appearance
            this.strokePath({ style: this.primaryColor, width: radius });
            this.strokePath({ style: this.secondaryColor, width: radius * POWER_FLOW_LINE_WIDTH_FACTOR, dash: DISCONNECTED_LINE_DASH });
            break;
        case BranchStatus.TRIP:
            this.strokePath({ style: AppColors.TRIPPED, width: radius, dash: DISCONNECTED_LINE_DASH });
            break;
    }
  }

  private drawAnimatedPowerFlow(radius: number) {
    const baseOffset = this.state.anim_cycle_state;
    const lineWidth = radius * POWER_FLOW_LINE_WIDTH_FACTOR;

    // Background dash to create a gap for the colored dot
    this.strokePath({ style: this.secondaryColor, width: lineWidth, dash: POWER_FLOW_DASH_BACKGROUND, dashOffset: baseOffset + 1 });
    
    // Foreground colored dot
    this.strokePath({ style: AppColors.POWER_FLOW, width: lineWidth, dash: POWER_FLOW_DASH_FOREGROUND, dashOffset: baseOffset });
  }

  private drawAllSubstations() {
    // Calculate label opacity based on zoom level. Labels fade in as the user zooms in
    // from the minimum zoom level.
    const zoomForFadeStart = this.state.scale_min;
    const zoomForFadeEnd = this.state.scale_min * LABEL_FADE_END_MULTIPLIER;
    let labelOpacity = (this.state.scaleX - zoomForFadeStart) / (zoomForFadeEnd - zoomForFadeStart);
    labelOpacity = Math.max(0, Math.min(1, labelOpacity)); // Clamp between 0 and 1

    for (const key in this.state.subs) {
      const sub = this.state.subs[key];
      const { x: cx, y: cy } = this.getScreenPos(sub.Longitude, sub.Latitude);
      const radius = (sub === this.state.hoverSub) ? SUBSTATION_RADIUS_HOVER : SUBSTATION_RADIUS_NORMAL;

      if (sub.Category === SubstationCategory.Load) {
        this.drawLoadSubstation(sub, cx, cy, radius);
      } else {
        this.drawGeneratorSubstation(sub, cx, cy, radius);
      }

      if (this.state.renderCanvasText && labelOpacity > 0) {
        this.ctx.save();
        this.ctx.globalAlpha = labelOpacity;
        const font = sub === this.state.hoverSub ? FONT_HOVER : FONT_NORMAL;
        this.drawOutlinedText(sub.Name, cx + LABEL_OFFSET_X, cy + LABEL_OFFSET_Y, font, this.primaryColor, this.secondaryColor);
        this.ctx.restore();
      }
    }
  }

  private drawLoadSubstation(sub: Substation, cx: number, cy: number, r: number) {
    const P = this.getSubstationPower(sub);
    const Pmax = sub.Pmax * this.state.fr_load;
    
    const allTripped = this.isSubstationTripped(sub);
    const displayColor = allTripped ? AppColors.TRIPPED : this.primaryColor;
    
    // Background
    this.drawCircle(cx, cy, r, { fill: this.secondaryColor });
    
    // Draw pie chart slice for load level
    if (Pmax > 0 && P > 0 && !allTripped) {
        const fillRatio = Math.max(0, Math.min(1, P / Pmax)); // Clamp ratio
        const endAngle = PIE_CHART_START_ANGLE + (TWO_PI * fillRatio);
        this.drawPieSlice(cx, cy, r, PIE_CHART_START_ANGLE, endAngle, this.primaryColor);
    }

    // Border
    this.drawCircle(cx, cy, r, { stroke: displayColor, lineWidth: SUBSTATION_BORDER_WIDTH });
  }

  private drawGeneratorSubstation(sub: Substation, cx: number, cy: number, r: number) {
    const P = this.getSubstationPower(sub);
    const clampedP = Math.max(0, Math.min(P, sub.Pmax));

    const genColor = this.getGeneratorColor(sub.Category);
    const allTripped = this.isSubstationTripped(sub);

    const displayColor = allTripped ? AppColors.TRIPPED : genColor;
    const borderColor = displayColor;
    
    // Draw outer colored circle with border
    this.drawCircle(cx, cy, r * GENERATOR_OUTER_RADIUS_FACTOR, {
        fill: displayColor,
        stroke: borderColor,
        lineWidth: GENERATOR_OUTLINE_WIDTH
    });

    // Draw inner background circle
    this.drawCircle(cx, cy, r, { fill: this.secondaryColor });

    // Draw pie chart slice for power output
    if (sub.Pmax > 0 && clampedP > 0 && !allTripped) {
        const endAngle = PIE_CHART_START_ANGLE + (TWO_PI * clampedP / sub.Pmax);
        this.drawPieSlice(cx, cy, r, PIE_CHART_START_ANGLE, endAngle, displayColor);
    }
    
    // Draw inner circle border
    this.drawCircle(cx, cy, r, { stroke: borderColor, lineWidth: GENERATOR_OUTLINE_WIDTH });
  }

  private drawHoverLabel() {
    if (!this.state.hoverBranch) return;

    const branch = this.state.hoverBranch;
    if (!branch.sub1 || !branch.sub2) return;

    const Lat = 0.5 * (branch.sub1.Latitude + branch.sub2.Latitude);
    const Lon = 0.5 * (branch.sub1.Longitude + branch.sub2.Longitude);
    const pos = this.getScreenPos(Lon, Lat);
    const cx = pos.x + LABEL_OFFSET_X;
    const cy = pos.y + LABEL_OFFSET_Y;

    let text = `${Math.abs(branch.P).toFixed(0)} MW`;
    let color = this.primaryColor;

    const isTripped = branch.Status1 === BranchStatus.TRIP || branch.Status2 === BranchStatus.TRIP;
    const isDisconnected = branch.Status1 === BranchStatus.DIS && (branch.Circuits === 1 || branch.Status2 === BranchStatus.DIS);
    const overloadRatio = Math.abs(branch.P) / (branch.Circuits * branch.Pmax);
    const isCriticallyOverloaded = overloadRatio > BRANCH_OVERLOAD_CRITICAL_THRESHOLD_LABEL;
    const isOverloaded = overloadRatio > BRANCH_OVERLOAD_NORMAL_THRESHOLD;

    if (isTripped) {
      text = "TRIPPED - cannot reclose";
      color = AppColors.TRIPPED;
    } else if (isDisconnected) {
      text = "Line out of service";
    } else if (isCriticallyOverloaded) {
      color = AppColors.OVERLOAD_CRITICAL;
      text += " (CRITICALLY OVERLOADED)";
    } else if (isOverloaded) {
      color = AppColors.OVERLOAD_NORMAL;
      text += " (overloaded)";
    }
    
    this.drawOutlinedText(text, cx, cy, FONT_HOVER, color, this.secondaryColor);
  }

  // --- Private State & Logic Helpers ---

  private getBranchOverloadColor(branch: Branch): string {
    const overloadRatio = Math.abs(branch.P) / (branch.Circuits * branch.Pmax);
    if (overloadRatio > BRANCH_OVERLOAD_CRITICAL_THRESHOLD_DRAW) {
        return AppColors.OVERLOAD_CRITICAL;
    }
    if (overloadRatio > BRANCH_OVERLOAD_NORMAL_THRESHOLD) {
        return AppColors.OVERLOAD_NORMAL;
    }
    return this.primaryColor;
  }

  private getGeneratorColor(category: string): string {
    return GenerationTypeConfig[category as SubstationCategory]?.color || GenerationTypeConfig[SubstationCategory.Thermal].color;
  }

  private getSubstationPower(sub: Substation): number {
    return sub.U.reduce((acc, unit) => acc + unit.P, 0);
  }

  private isSubstationTripped(sub: Substation): boolean {
    // A substation is considered tripped if all its units are tripped.
    if (sub.Units === 0) return false;
    return sub.U.every((unit) => unit.Status === UnitStatus.TRIP);
  }
}