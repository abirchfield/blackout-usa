import { GameState, InteractionHandler, SimulationAction } from "./types";
import { GameAction } from "./key-bindings";

export interface IGridDrawer {
  draw(state: GameState, isPaused: boolean, isFastForward: boolean): void;
  setInitialView(state: GameState): void;
  resizeCanvas(): boolean;
  isCanvasReady(): boolean;
  destroy(): void;
}

export interface IGridHandler {
  onInteract?: InteractionHandler;
  onDispatch?: (action: SimulationAction) => void;
  onTogglePause?: () => void;
  onToggleFastForward?: () => void;
  onResetView?: () => void;
  performAction(action: GameAction): void;
  centerAndZoomOn(longitude: number, latitude: number, zoomLevel?: number): void;
  zoomIn(x: number, y: number): void;
  zoomOut(x: number, y: number): void;
  destroy(): void;
}
