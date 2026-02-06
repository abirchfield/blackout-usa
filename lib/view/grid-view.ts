import { GameState, InteractionHandler, EngineSettings, SimulationAction } from "../types";
import { GameAction } from "../key-bindings";

/** Callbacks the view needs from the engine for user-initiated actions. */
export interface ViewCallbacks {
  onDispatch: (action: SimulationAction) => void;
  onTogglePause: () => void;
  onToggleFastForward: () => void;
}

/** Rendering + input layer — shields the engine from SVG/DOM details. */
export interface IGridView {
  init(state: GameState, callbacks: ViewCallbacks): void;
  draw(isPaused: boolean, isFastForward: boolean): void;
  reparent(container: HTMLDivElement): void;
  applySettings(s: EngineSettings): void;
  performAction(action: GameAction): void;
  set onInteract(handler: InteractionHandler | undefined);
  destroy(): void;
}
import { SvgDrawer } from "./drawer";
import { SvgHandler } from "./handler";

export class GridView implements IGridView {
  private drawer: SvgDrawer;
  private handler?: SvgHandler;
  private state!: GameState;
  private isViewInitialized = false;
  private interactive: boolean;

  constructor(element: HTMLDivElement, interactive = true) {
    this.drawer = new SvgDrawer(element);
    this.interactive = interactive;
  }

  init(state: GameState, callbacks: ViewCallbacks): void {
    this.state = state;
    if (this.interactive) {
      const handler = new SvgHandler(this.drawer.svgElement, state);
      handler.onResetView = () => { this.isViewInitialized = false; };
      handler.onDispatch = callbacks.onDispatch;
      handler.onTogglePause = callbacks.onTogglePause;
      handler.onToggleFastForward = callbacks.onToggleFastForward;
      this.handler = handler;
    }
  }

  draw(isPaused: boolean, isFastForward: boolean): void {
    this.drawer.resizeCanvas();
    if (!this.isViewInitialized && this.drawer.isCanvasReady()) {
      this.drawer.setInitialView(this.state);
      this.isViewInitialized = true;
    }
    this.drawer.draw(this.state, isPaused, isFastForward);
  }

  applySettings(s: EngineSettings): void {
    if (s.theme !== undefined) this.state.theme = s.theme;
    if (s.animationsEnabled !== undefined) this.state.animationsEnabled = s.animationsEnabled;
    if (s.renderMapLabels !== undefined) this.state.renderMapLabels = s.renderMapLabels;
    if (s.zoomSensitivity !== undefined) this.state.zoomSensitivity = s.zoomSensitivity;
    if (s.keyBindings !== undefined) this.state.keyBindings = s.keyBindings;
  }

  reparent(container: HTMLDivElement): void {
    this.drawer.reparent(container);
  }

  performAction(action: GameAction): void {
    this.handler?.performAction(action);
  }

  set onInteract(h: InteractionHandler | undefined) {
    if (this.handler) this.handler.onInteract = h;
  }

  destroy(): void {
    this.handler?.destroy();
    this.drawer.destroy();
    this.handler = undefined;
  }
}
