import { Branch, GameState, Substation, BranchStatus, UnitStatus, SubstationCategory } from "../types";
import { AppColors, DrawingConfig, GenerationTypeConfig, getDynamicSubstationRadius } from "../config";
import { activeCase } from "@/data/cases";

// --- Math ---
const TWO_PI = Math.PI * 2;
const PIE_CHART_START_ANGLE = -Math.PI / 2; // Start at 12 o'clock

export class GameDrawer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  // Per-frame state
  private state!: GameState;
  private primaryColor!: string;
  private secondaryColor!: string;
  private isHoverAnimationActive: boolean = false;
  private hover_anim_cycle_state: number = 0;
  private colorWarning!: string;
  private colorOverloadCritical!: string;
  private cachedTheme: string | null = null;

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
    this.drawAllBranches(isPaused);
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

    if (this.state.animationsEnabled) {
      if (!isPaused) { // Game is running, update the main animation state
        const speedFactor = isFastForward ? DrawingConfig.ANIMATION_SPEED_FACTOR * 3 : DrawingConfig.ANIMATION_SPEED_FACTOR;
        this.state.anim_cycle_state = (this.state.anim_cycle_state + speedFactor) % DrawingConfig.POWER_FLOW_PATTERN_LENGTH;
        // Deactivate hover animation when game is running.
        this.isHoverAnimationActive = false;
      } else { // Game is paused
        if (this.state.hoverBranch) { // ...and a branch is being hovered
          if (!this.isHoverAnimationActive) {
            // First frame of a hover-while-paused: sync the hover animation
            // to the main frozen animation state to prevent a visual jump.
            this.hover_anim_cycle_state = this.state.anim_cycle_state;
            this.isHoverAnimationActive = true;
          }
          // Increment the separate hover animation state. The main state remains frozen.
          const speedFactor = DrawingConfig.ANIMATION_SPEED_FACTOR;
          this.hover_anim_cycle_state = (this.hover_anim_cycle_state + speedFactor) % DrawingConfig.POWER_FLOW_PATTERN_LENGTH;
        } else {
          // No branch is hovered, so deactivate the hover animation.
          this.isHoverAnimationActive = false;
        }
      }
    }
  }

  private setThemeColors() {
    // Only re-read computed styles when the theme actually changes.
    // getComputedStyle is expensive and was previously called every frame (~60/s).
    const currentTheme = this.state.theme;
    if (currentTheme === this.cachedTheme) return;
    this.cachedTheme = currentTheme;

    const bodyStyles = window.getComputedStyle(document.body);
    this.primaryColor = bodyStyles.color;
    this.secondaryColor = bodyStyles.backgroundColor;
    this.colorWarning = bodyStyles.getPropertyValue('--color-warning').trim();
    this.colorOverloadCritical = bodyStyles.getPropertyValue('--color-overload-critical').trim();
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
    // Always set the dash offset. If it's not provided for an animated line,
    // it should be reset to 0 to prevent animation state from leaking to static dashed lines.
    this.ctx.lineDashOffset = options.dashOffset ?? 0;
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
    this.ctx.lineWidth = DrawingConfig.LABEL_OUTLINE_WIDTH;
    this.ctx.fillStyle = fillStyle;

    this.ctx.strokeText(text, x, y);
    this.ctx.fillText(text, x, y);
  }

  // --- Private Main Drawing Methods ---

  private drawBorders() {
    if (!this.state.borders || this.state.borders.length === 0) return;

    this.ctx.strokeStyle = this.primaryColor;
    this.ctx.lineWidth = DrawingConfig.BORDER_LINE_WIDTH;
    this.ctx.beginPath();
    
    const startPos = this.getScreenPos(this.state.borders[0][0], this.state.borders[0][1]);
    this.ctx.moveTo(startPos.x, startPos.y);

    for (let i = 1; i < this.state.borders.length; i++) {
        const pos = this.getScreenPos(this.state.borders[i][0], this.state.borders[i][1]);
        this.ctx.lineTo(pos.x, pos.y);
    }
    this.ctx.stroke();
  }

  private drawAllBranches(isPaused: boolean) {
    for (const key in this.state.branches) {
      const branch = this.state.branches[key];
      if (!branch.sub1 || !branch.sub2) continue;
      const isHover = branch === this.state.hoverBranch;
      const radius = this.getDynamicBranchRadius(isHover);
      // Use consistent substation order (sub1 -> sub2) to prevent "jumping" of double circuits.
      const s1 = branch.sub1;
      const s2 = branch.sub2;
      const powerFlowsForward = branch.P >= 0; // True if power flows from sub1 to sub2
      // The original implementation drew the first circuit on the center line,
      // and the second one offset. This is asymmetric.
      // A better approach is to offset both from the center for a cleaner look.
      if (branch.Circuits === 2) {
        this.drawBranchCircuit(branch, branch.Status1, s1, s2, radius, powerFlowsForward, -1, isHover, isPaused);
        this.drawBranchCircuit(branch, branch.Status2, s1, s2, radius, powerFlowsForward, 1, isHover, isPaused);
      } else {
        // For single circuits, draw a single centered line (offsetMultiplier = 0).
        this.drawBranchCircuit(branch, branch.Status1, s1, s2, radius, powerFlowsForward, 0, isHover, isPaused);
      }
    }
    this.ctx.setLineDash([]); // Reset line dash after drawing all branches
  }

  private getSubstationRadius(isHover: boolean): number {
    return getDynamicSubstationRadius(this.state.scaleX, activeCase.mapConfig.initialView.scale, isHover);
  }

  private getDynamicBranchRadius(isHover: boolean): number {
    const baseRadius = isHover ? DrawingConfig.BRANCH_RADIUS_HOVER : DrawingConfig.BRANCH_RADIUS_NORMAL;
    const maxRadius = isHover ? DrawingConfig.BRANCH_RADIUS_HOVER_MAX : DrawingConfig.BRANCH_RADIUS_MAX;
    
    // Scale radius based on zoom, relative to a reference scale.
    // activeCase.mapConfig.initialView.scale is a good baseline where the baseRadius should apply.
    const scaleFactor = Math.sqrt(this.state.scaleX / activeCase.mapConfig.initialView.scale);
    
    const radius = baseRadius * scaleFactor;
    
    return Math.max(DrawingConfig.BRANCH_RADIUS_MIN, Math.min(radius, maxRadius));
  }

  private drawBranchCircuit(branch: Branch, status: string, s1: Substation, s2: Substation, radius: number, powerFlowsForward: boolean, offsetMultiplier: number, isHover: boolean, isPaused: boolean) {
    const p1_base = this.getScreenPos(s1.Longitude, s1.Latitude);
    const p2_base = this.getScreenPos(s2.Longitude, s2.Latitude);

    let p1 = p1_base;
    let p2 = p2_base;

    if (offsetMultiplier !== 0) {
        const dx = p2_base.x - p1_base.x;
        const dy = p2_base.y - p1_base.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            // Calculate a perpendicular vector in screen space.
            // The offset is now dynamic and proportional to the line's radius.
            // This ensures the gap between circuits scales correctly with zoom.
            // The radius is already larger on hover. Using an additional larger offset factor
            // for hover state resulted in an excessive gap. By using a single factor,
            // the gap remains proportional to the line width, which still increases on hover.
            const offsetFactor = DrawingConfig.SECOND_CIRCUIT_OFFSET_FACTOR;
            const totalOffset = radius * offsetFactor;
            // The offset is halved because we are offsetting two lines from the center.
            const offset = (totalOffset / 2) * offsetMultiplier;
            const offsetX = -dy / dist * offset;
            const offsetY = dx / dist * offset;
            p1 = { x: p1_base.x + offsetX, y: p1_base.y + offsetY };
            p2 = { x: p2_base.x + offsetX, y: p2_base.y + offsetY };
        }
    }

    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p2.x, p2.y);

    switch (status) {
        case BranchStatus.IN:
            const hasPowerFlow = Math.abs(branch.P) > DrawingConfig.MIN_POWER_FOR_ANIMATION;
            const baseColor = this.getBranchOverloadColor(branch);
            const lineWidth = radius;
            
            this.strokePath({ style: baseColor, width: lineWidth });

            if (hasPowerFlow && this.state.animationsEnabled) {
                const useHoverAnimation = isPaused && isHover;
                this.drawPowerFlowDots(radius, powerFlowsForward, useHoverAnimation);
            }
            break;
        case BranchStatus.DIS:
            // Draw solid line then dashed on top for disconnected appearance
            this.strokePath({ style: this.primaryColor, width: radius });
            this.strokePath({ style: this.secondaryColor, width: radius * DrawingConfig.POWER_FLOW_LINE_WIDTH_FACTOR, dash: DrawingConfig.DISCONNECTED_LINE_DASH });
            break;
        case BranchStatus.TRIP:
            this.strokePath({ style: AppColors.TRIPPED, width: radius, dash: DrawingConfig.DISCONNECTED_LINE_DASH });
            break;
    }
  }

  private drawPowerFlowDots(radius: number, flowsForward: boolean, useHoverAnimation: boolean) {
    let baseOffset: number;
    if (useHoverAnimation) {
      // This branch is being hovered while paused. Use the dedicated hover animation state.
      baseOffset = this.hover_anim_cycle_state;
    } else {
      // This branch is either being animated because the game is running,
      // or it's frozen because the game is paused and it's not being hovered.
      // In both cases, the correct value is the main animation state.
      baseOffset = this.state.anim_cycle_state;
    }

    // If power flows backward (relative to sub1->sub2), we reverse the animation/position
    // by subtracting the offset from the total pattern length.
    const finalOffset = flowsForward ? baseOffset : DrawingConfig.POWER_FLOW_PATTERN_LENGTH - baseOffset;

    const lineWidth = radius * DrawingConfig.POWER_FLOW_LINE_WIDTH_FACTOR;
    // Background dash to create a gap for the colored dot
    this.strokePath({ style: this.secondaryColor, width: lineWidth, dash: DrawingConfig.POWER_FLOW_DASH_BACKGROUND, dashOffset: finalOffset + 1 });
    
    // Foreground colored dot
    this.strokePath({ style: AppColors.POWER_FLOW, width: lineWidth, dash: DrawingConfig.POWER_FLOW_DASH_FOREGROUND, dashOffset: finalOffset });
  }

  private drawAllSubstations() {
    for (const key in this.state.subs) {
      const sub = this.state.subs[key];
      const { x: cx, y: cy } = this.getScreenPos(sub.Longitude, sub.Latitude);
      const isHover = sub === this.state.hoverSub;
      const radius = this.getSubstationRadius(isHover);

      if (sub.Category === SubstationCategory.Load) {
        this.drawLoadSubstation(sub, cx, cy, radius);
      } else {
        this.drawGeneratorSubstation(sub, cx, cy, radius);
      }

      if (this.state.renderCanvasText) {
        const font = isHover ? DrawingConfig.FONT_HOVER : DrawingConfig.FONT_NORMAL;
        this.drawOutlinedText(sub.Name, cx + DrawingConfig.LABEL_OFFSET_X, cy + DrawingConfig.LABEL_OFFSET_Y, font, this.primaryColor, this.secondaryColor);
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
    this.drawCircle(cx, cy, r, { stroke: displayColor, lineWidth: DrawingConfig.SUBSTATION_BORDER_WIDTH });
  }

  private drawGeneratorSubstation(sub: Substation, cx: number, cy: number, r: number) {
    const P = this.getSubstationPower(sub);
    const clampedP = Math.max(0, Math.min(P, sub.Pmax));

    const genColor = this.getGeneratorColor(sub.Category);
    const allTripped = this.isSubstationTripped(sub);

    const displayColor = allTripped ? AppColors.TRIPPED : genColor;
    const borderColor = displayColor;
    const outerR = r * DrawingConfig.GENERATOR_OUTER_RADIUS_FACTOR;

    // Draw white outline behind outer circle for contrast
    this.drawCircle(cx, cy, outerR + 1, {
        stroke: '#FFFFFF',
        lineWidth: DrawingConfig.GENERATOR_OUTLINE_WIDTH + 2
    });

    // Draw outer colored circle with border
    this.drawCircle(cx, cy, outerR, {
        fill: displayColor,
        stroke: borderColor,
        lineWidth: DrawingConfig.GENERATOR_OUTLINE_WIDTH
    });

    // Draw inner background circle
    this.drawCircle(cx, cy, r, { fill: this.secondaryColor });

    // Draw pie chart slice for power output
    if (sub.Pmax > 0 && clampedP > 0 && !allTripped) {
        const endAngle = PIE_CHART_START_ANGLE + (TWO_PI * clampedP / sub.Pmax);
        this.drawPieSlice(cx, cy, r, PIE_CHART_START_ANGLE, endAngle, displayColor);
    }

    // Draw inner circle border
    this.drawCircle(cx, cy, r, { stroke: borderColor, lineWidth: DrawingConfig.GENERATOR_OUTLINE_WIDTH });
  }

  private drawHoverLabel() {
    if (!this.state.hoverBranch) return;

    const branch = this.state.hoverBranch;
    if (!branch.sub1 || !branch.sub2) return;

    const Lat = 0.5 * (branch.sub1.Latitude + branch.sub2.Latitude);
    const Lon = 0.5 * (branch.sub1.Longitude + branch.sub2.Longitude);
    const pos = this.getScreenPos(Lon, Lat);
    const cx = pos.x + DrawingConfig.LABEL_OFFSET_X;
    const cy = pos.y + DrawingConfig.LABEL_OFFSET_Y;

    let text = `${Math.abs(branch.P).toFixed(0)} MW`;
    let color = this.primaryColor;

    const activeCircuits = this.countActiveCircuits(branch);
    const isAnyTripped = (branch.Status1 === BranchStatus.TRIP || (branch.Circuits === 2 && branch.Status2 === BranchStatus.TRIP));
    const areAllDisconnected = activeCircuits === 0 && !isAnyTripped;

    const capacity = activeCircuits * branch.Pmax;
    const overloadRatio = capacity > 0 ? Math.abs(branch.P) / capacity : Infinity;

    const isCriticallyOverloaded = overloadRatio > DrawingConfig.BRANCH_OVERLOAD_CRITICAL_THRESHOLD_LABEL;
    const isOverloaded = overloadRatio > DrawingConfig.BRANCH_OVERLOAD_NORMAL_THRESHOLD;

    if (isAnyTripped) {
      text = "Tripped";
      color = AppColors.TRIPPED;
    } else if (areAllDisconnected) {
      text = "Out of Service";
    } else if (isCriticallyOverloaded) {
      color = this.colorOverloadCritical;
      text += " (Critically Overloaded)";
    } else if (isOverloaded) {
      color = this.colorWarning;
      text += " (Overloaded)";
    }
    
    this.drawOutlinedText(text, cx, cy, DrawingConfig.FONT_HOVER, color, this.secondaryColor);
  }

  // --- Private State & Logic Helpers ---

  private countActiveCircuits(branch: Branch): number {
    if (branch.Circuits === 1) {
      return branch.Status1 === BranchStatus.IN ? 1 : 0;
    }
    // branch.Circuits === 2
    let active = 0;
    if (branch.Status1 === BranchStatus.IN) active++;
    if (branch.Status2 === BranchStatus.IN) active++;
    return active;
  }

  private getBranchOverloadColor(branch: Branch): string {
    const activeCircuits = this.countActiveCircuits(branch);
    if (activeCircuits === 0) return this.primaryColor; // No flow, no overload color
    const overloadRatio = Math.abs(branch.P) / (activeCircuits * branch.Pmax);
    if (overloadRatio > DrawingConfig.BRANCH_OVERLOAD_CRITICAL_THRESHOLD_DRAW) {
        return this.colorOverloadCritical;
    }
    if (overloadRatio > DrawingConfig.BRANCH_OVERLOAD_NORMAL_THRESHOLD) {
        return this.colorWarning;
    }
    return this.primaryColor;
  }

  private getGeneratorColor(category: string): string {
    const config = GenerationTypeConfig[category as SubstationCategory];
    return config?.color || GenerationTypeConfig[SubstationCategory.Thermal].color;
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