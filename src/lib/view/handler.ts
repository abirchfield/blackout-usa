import { GameState, InteractionHandler, GameAction } from "../types";
import { ViewConfig, DrawingConfig } from "./constants";
import { clampViewBounds, clampPan, getDynamicSubstationRadius } from "./view-math";
import { getDynamicBranchRadius } from "./draw-branches";

export interface GridHandler {
  onInteract?: InteractionHandler;
  onTripHottestLine?: () => void;
  onShedMinLoad?: () => void;
  onShedMaxLoad?: () => void;
  onRampAllUp?: () => void;
  onTogglePause?: () => void;
  onToggleFastForward?: () => void;
  onResetView?: () => void;
  performAction(action: GameAction): void;
  centerAndZoomOn(longitude: number, latitude: number, zoomLevel?: number): void;
  zoomIn(x: number, y: number): void;
  zoomOut(x: number, y: number): void;
  destroy(): void;
}


const CLICK_DRAG_THRESHOLD_SQ = ViewConfig.CLICK_DRAG_THRESHOLD * ViewConfig.CLICK_DRAG_THRESHOLD;

/** Handles mouse/wheel input for panning, zooming, hover detection, and click interactions. */
export class InputHandler implements GridHandler {
  private canvas: HTMLCanvasElement;
  private state: GameState;
  public onInteract?: InteractionHandler;
  public onTripHottestLine?: () => void;
  public onShedMinLoad?: () => void;
  public onShedMaxLoad?: () => void;
  public onRampAllUp?: () => void;
  public onTogglePause?: () => void;
  public onToggleFastForward?: () => void;
  public onResetView?: () => void;

  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseLeave: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleWheel: (e: WheelEvent) => void;

  // Touch event handlers
  private boundHandleTouchStart: (e: TouchEvent) => void;
  private boundHandleTouchMove: (e: TouchEvent) => void;
  private boundHandleTouchEnd: (e: TouchEvent) => void;

  // Touch state
  private touchId: number | null = null;       // primary finger identifier
  private pinchStartDist: number = 0;          // initial distance between two fingers
  private pinchStartScale: number = 0;         // scale at pinch start
  private pinchMidX: number = 0;               // midpoint screen X at pinch start
  private pinchMidY: number = 0;               // midpoint screen Y at pinch start
  private isPinching: boolean = false;

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

  constructor(canvas: HTMLCanvasElement, state: GameState) {
    this.canvas = canvas;
    this.state = state;

    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);

    this.canvas.addEventListener("mousedown", this.boundHandleMouseDown);
    this.canvas.addEventListener("mousemove", this.boundHandleMouseMove);
    this.canvas.addEventListener("mouseleave", this.boundHandleMouseLeave);
    this.canvas.addEventListener("mouseup", this.boundHandleMouseUp);
    this.canvas.addEventListener("wheel", this.boundHandleWheel, { passive: false });
    this.canvas.addEventListener("touchstart", this.boundHandleTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.boundHandleTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.boundHandleTouchEnd);
    this.canvas.addEventListener("touchcancel", this.boundHandleTouchEnd);

    // Invalidate cached rect on resize or scroll
    this.boundInvalidateRect = () => { this.cachedRect = null; };
    this.resizeObserver = new ResizeObserver(this.boundInvalidateRect);
    this.resizeObserver.observe(this.canvas);
    window.addEventListener("scroll", this.boundInvalidateRect, { passive: true });
  }

  /** Remove all event listeners and observers. */
  public destroy() {
    this.canvas.removeEventListener("mousedown", this.boundHandleMouseDown);
    this.canvas.removeEventListener("mousemove", this.boundHandleMouseMove);
    this.canvas.removeEventListener("mouseleave", this.boundHandleMouseLeave);
    this.canvas.removeEventListener("mouseup", this.boundHandleMouseUp);
    this.canvas.removeEventListener("wheel", this.boundHandleWheel);
    this.canvas.removeEventListener("touchstart", this.boundHandleTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundHandleTouchMove);
    this.canvas.removeEventListener("touchend", this.boundHandleTouchEnd);
    this.canvas.removeEventListener("touchcancel", this.boundHandleTouchEnd);
    this.resizeObserver.disconnect();
    window.removeEventListener("scroll", this.boundInvalidateRect);
    if (this.moveRafId) {
      cancelAnimationFrame(this.moveRafId);
      this.moveRafId = 0;
    }
  }

  private getRect(): DOMRect {
    if (!this.cachedRect) {
      this.cachedRect = this.canvas.getBoundingClientRect();
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
    this.state.dragStartX = offsetX;
    this.state.dragStartY = offsetY;
    this.state.dragOrigX = offsetX;
    this.state.dragOrigY = offsetY;
  }

  private handleMouseMove(e: MouseEvent) {
    const { offsetX, offsetY } = this.getMouseOffset(e);

    if (this.state.inDrag) {
      // Panning — runs immediately, no hover detection needed
      const prevX0 = this.state.x0;
      const prevY0 = this.state.y0;
      const deltaX = offsetX - this.state.dragStartX;
      const deltaY = offsetY - this.state.dragStartY;
      this.state.x0 -= deltaX / this.state.scaleX;
      this.state.y0 += deltaY / this.state.scaleY;
      this.clampPanBounds(prevX0, prevY0);
      this.state.dragStartX = offsetX;
      this.state.dragStartY = offsetY;
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
    if (this.state._vSim !== this.lastCachedVersion) {
      this.subsArray = Object.values(this.state.subs);
      this.branchArray = Object.values(this.state.branches);
      this.lastCachedVersion = this.state._vSim;
    }
  }

  private processHover(e: MouseEvent) {
    const { offsetX, offsetY } = this.getMouseOffset(e);
    this.hitTestAt(offsetX, offsetY);
  }

  private handleMouseUp(e: MouseEvent) {
    const { offsetX, offsetY } = this.getMouseOffset(e);
    this.state.inDrag = false;
    const dx = offsetX - this.state.dragOrigX;
    const dy = offsetY - this.state.dragOrigY;

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

  // ── Touch handlers ──────────────────────────────────────────────

  private touchOffset(t: Touch): { offsetX: number; offsetY: number } {
    const rect = this.getRect();
    return { offsetX: t.clientX - rect.left, offsetY: t.clientY - rect.top };
  }

  private static pinchDist(a: Touch, b: Touch): number {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private handleTouchStart(e: TouchEvent) {
    // Two-finger pinch start
    if (e.touches.length === 2) {
      e.preventDefault();
      this.isPinching = true;
      this.state.inDrag = false;
      const [a, b] = [e.touches[0], e.touches[1]];
      this.pinchStartDist = InputHandler.pinchDist(a, b);
      this.pinchStartScale = this.state.scaleX;
      const rect = this.getRect();
      this.pinchMidX = (a.clientX + b.clientX) / 2 - rect.left;
      this.pinchMidY = (a.clientY + b.clientY) / 2 - rect.top;
      return;
    }

    // Single-finger drag/tap start
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      this.touchId = touch.identifier;
      const { offsetX, offsetY } = this.touchOffset(touch);
      this.state.inDrag = true;
      this.state.dragStartX = offsetX;
      this.state.dragStartY = offsetY;
      this.state.dragOrigX = offsetX;
      this.state.dragOrigY = offsetY;

      // Run hover detection at tap point so hoverSub/hoverBranch is set for touchEnd
      this.hitTestAt(offsetX, offsetY);
    }
  }

  private handleTouchMove(e: TouchEvent) {
    // Pinch zoom
    if (this.isPinching && e.touches.length >= 2) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = InputHandler.pinchDist(a, b);
      if (this.pinchStartDist > 0) {
        const factor = dist / this.pinchStartDist;
        let newScale = this.pinchStartScale * factor;
        newScale = Math.max(this.state.scaleMin, Math.min(newScale, this.state.scaleMax));
        if (newScale !== this.state.scaleX) {
          const actualFactor = newScale / this.state.scaleX;
          this.state.scaleX = newScale;
          this.state.scaleY = newScale;
          this.state.x0 += this.pinchMidX / (this.state.scaleX / actualFactor) * (1 - 1 / actualFactor);
          this.state.y0 -= this.pinchMidY / (this.state.scaleX / actualFactor) * (1 - 1 / actualFactor);
        }
      }
      return;
    }

    // Single-finger pan
    if (e.touches.length === 1 && this.state.inDrag) {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch.identifier !== this.touchId) return;
      const { offsetX, offsetY } = this.touchOffset(touch);
      const prevX0 = this.state.x0;
      const prevY0 = this.state.y0;
      const deltaX = offsetX - this.state.dragStartX;
      const deltaY = offsetY - this.state.dragStartY;
      this.state.x0 -= deltaX / this.state.scaleX;
      this.state.y0 += deltaY / this.state.scaleY;
      this.clampPanBounds(prevX0, prevY0);
      this.state.dragStartX = offsetX;
      this.state.dragStartY = offsetY;
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (this.isPinching) {
      // End pinch when fewer than 2 fingers remain
      if (e.touches.length < 2) this.isPinching = false;
      return;
    }

    // Check for tap (vs drag) — same threshold as mouse click
    if (this.state.inDrag) {
      // Find the ended touch
      const ended = Array.from(e.changedTouches).find(t => t.identifier === this.touchId);
      if (ended) {
        const { offsetX, offsetY } = this.touchOffset(ended);
        const dx = offsetX - this.state.dragOrigX;
        const dy = offsetY - this.state.dragOrigY;
        if (dx * dx + dy * dy < CLICK_DRAG_THRESHOLD_SQ) {
          // Tap — trigger interaction
          if (this.state.hoverSub && this.onInteract) {
            this.onInteract("sub", this.state.hoverSub);
          } else if (this.state.hoverBranch && this.onInteract) {
            this.onInteract("branch", this.state.hoverBranch);
          }
        }
      }
    }

    this.state.inDrag = false;
    this.touchId = null;
    this.state.hoverSub = null;
    this.state.hoverBranch = null;
  }

  /** Core hit-test: find the substation or branch nearest to a screen point. */
  private hitTestAt(offsetX: number, offsetY: number) {
    this.state.hoverSub = null;
    this.state.hoverBranch = null;

    const worldX = this.state.x0 + offsetX / this.state.scaleX;
    const worldY = this.state.y0 - offsetY / this.state.scaleY;
    const scaleFactor = Math.sqrt(this.state.scaleX / this.state.referenceScale);
    const hoverRadius = getDynamicSubstationRadius(scaleFactor, true);
    const hoverRadiusSq = (hoverRadius / this.state.scaleX) * (hoverRadius / this.state.scaleX);

    this.ensureCachedArrays();

    for (const sub of this.subsArray) {
      const dx = worldX - sub.Longitude;
      const dy = worldY - sub.Latitude;
      if (dx * dx + dy * dy < hoverRadiusSq) {
        this.state.hoverSub = sub;
        return;
      }
    }

    let mindist = ViewConfig.BRANCH_HOVER_RADIUS;
    const normalRadius = getDynamicBranchRadius(scaleFactor, false);
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

        let effectiveDist: number;
        if (branch.sibling) {
          const offset = branch.Number < branch.sibling ? -1 : 1;
          effectiveDist = Math.abs(signedPerpPx - offset * halfOffPx);
        } else {
          effectiveDist = Math.abs(signedPerpPx);
        }

        if (effectiveDist < mindist) {
          this.state.hoverBranch = branch;
          mindist = effectiveDist;
        }
      }
    }
  }

  // ── Mouse wheel ─────────────────────────────────────────────────

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const { offsetX, offsetY } = this.getMouseOffset(e);
    // Normalize delta to pixels (Firefox sends DOM_DELTA_LINE for mouse wheel)
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 33;                // DOM_DELTA_LINE → approx pixels
    else if (e.deltaMode === 2) delta *= window.innerHeight; // DOM_DELTA_PAGE → pixels
    // Exp for a smooth, symmetric zoom curve.
    // At default sensitivity (1.0), one mouse wheel notch (deltaY≈100) zooms ~26%.
    const zoomFactor = Math.exp(-delta * 0.003 * this.state.zoomSensitivity);
    this.zoom(offsetX, offsetY, zoomFactor);
  }

  /** Execute a game action (pan, zoom, pause, emergency ops). */
  public performAction(action: GameAction) {
    const panAmount = ViewConfig.KEYBOARD_PAN_AMOUNT;
    const rect = this.getRect();
    const x = rect.width / 2;
    const y = rect.height / 2;
    switch (action) {
      case "ZOOM_IN": this.zoomIn(x, y); break;
      case "ZOOM_OUT": this.zoomOut(x, y); break;
      case "PAN_LEFT": { const px = this.state.x0; this.state.x0 -= panAmount / this.state.scaleX; this.clampPanBounds(px, this.state.y0); break; }
      case "PAN_RIGHT": { const px = this.state.x0; this.state.x0 += panAmount / this.state.scaleX; this.clampPanBounds(px, this.state.y0); break; }
      case "PAN_DOWN": { const py = this.state.y0; this.state.y0 -= panAmount / this.state.scaleY; this.clampPanBounds(this.state.x0, py); break; }
      case "PAN_UP": { const py = this.state.y0; this.state.y0 += panAmount / this.state.scaleY; this.clampPanBounds(this.state.x0, py); break; }
      case "RESET_ZOOM": this.onResetView?.(); break;
      case "TOGGLE_PAUSE": this.onTogglePause?.(); break;
      case "TOGGLE_FAST_FORWARD": this.onToggleFastForward?.(); break;
      case "DISCONNECT_MOST_LOADED_LINE": this.onTripHottestLine?.(); break;
      case "DISCONNECT_SMALLEST_LOAD": this.onShedMinLoad?.(); break;
      case "RAMP_ALL_GENERATION_UP": this.onRampAllUp?.(); break;
      case "EMERGENCY_LOAD_SHED": this.onShedMaxLoad?.(); break;
      case "CENTER_VIEW_ON_SELECTION":
        // Center on hovered substation or branch midpoint
        if (this.state.hoverSub) {
          this.centerAndZoomOn(this.state.hoverSub.Longitude, this.state.hoverSub.Latitude);
        } else if (this.state.hoverBranch?.sub1 && this.state.hoverBranch?.sub2) {
          const midLon = (this.state.hoverBranch.sub1.Longitude + this.state.hoverBranch.sub2.Longitude) / 2;
          const midLat = (this.state.hoverBranch.sub1.Latitude + this.state.hoverBranch.sub2.Latitude) / 2;
          this.centerAndZoomOn(midLon, midLat);
        }
        break;
    }
  }

  private zoom(x: number, y: number, zoomFactor: number) {
    const oldScale = this.state.scaleX;
    let newScale = oldScale * zoomFactor;
    newScale = Math.max(this.state.scaleMin, Math.min(newScale, this.state.scaleMax));

    if (newScale === oldScale) return;

    const actualFactor = newScale / oldScale;
    this.state.scaleX = newScale;
    this.state.scaleY = newScale;

    this.state.x0 += x / oldScale * (1 - 1 / actualFactor);
    this.state.y0 -= y / oldScale * (1 - 1 / actualFactor);
    // No hard clamp here — soft clamp in the frame loop handles boundary return smoothly
  }

  /** Center the viewport on a world coordinate and optionally set zoom level. */
  public centerAndZoomOn(longitude: number, latitude: number, zoomLevel: number = this.state.referenceScale * ViewConfig.DETAIL_ZOOM_RATIO) {
    this.state.scaleX = zoomLevel;
    this.state.scaleY = zoomLevel;
    const rect = this.getRect();
    this.state.x0 = longitude - (rect.width / 2 / this.state.scaleX);
    this.state.y0 = latitude + (rect.height / 2 / this.state.scaleY);
    this.clampToBounds();
  }

  private clampToBounds() {
    const rect = this.getRect();
    clampViewBounds(this.state, rect.width, rect.height);
  }

  private clampPanBounds(prevX0: number, prevY0: number) {
    const rect = this.getRect();
    clampPan(this.state, prevX0, prevY0, rect.width, rect.height);
  }

  /** Zoom in by one keyboard step around a screen point. */
  public zoomIn(x: number, y: number) {
    // Keyboard zoom: ~35% per press (matches one mouse wheel notch at default sensitivity)
    const zoomFactor = Math.exp(0.3 * this.state.zoomSensitivity);
    this.zoom(x, y, zoomFactor);
  }

  /** Zoom out by one keyboard step around a screen point. */
  public zoomOut(x: number, y: number) {
    const zoomFactor = Math.exp(-0.3 * this.state.zoomSensitivity);
    this.zoom(x, y, zoomFactor);
  }
}
