import {
  Unit, UnitStatus, LoadCategoryType,
} from "../types";
import { isInactive } from "../utils";

/** Per-unit load model: tracks status and scales power with demand level. */
export class LoadModel {
  readonly unit: Unit;

  // Per-unit params (from Unit, copied once at construction)
  readonly pmax: number;
  readonly loadCategory: LoadCategoryType | undefined;

  constructor(unit: Unit) {
    this.unit = unit;
    this.pmax = unit.Pmax;
    this.loadCategory = unit.LoadCategory;
  }

  // --- Lifecycle ---

  /** Restore load unit to initial status and power. */
  reset(): void {
    this.unit.Status = this.unit.Status0;
    this.unit.P = this.unit.Pset = this.unit.P0;
    this.unit.StatusCount = 0;
  }

  // --- Load Power ---

  /** Set load power based on current demand level multiplier. */
  applyLoadPower(loadLevel: number): void {
    if (this.unit.Status === UnitStatus.IN) {
      this.unit.P = this.pmax * loadLevel;
    } else if (isInactive(this.unit.Status)) {
      this.unit.P = 0;
    }
  }

  // --- Operator Actions ---

  /** Connect or disconnect the load unit. */
  toggle(): void {
    if (this.unit.Status === UnitStatus.DIS) this.unit.Status = UnitStatus.IN;
    else if (this.unit.Status === UnitStatus.IN) this.unit.Status = UnitStatus.DIS;
  }

  // --- Topology Helpers ---

  /** Immediately trip the load unit. */
  forceTrip(): void {
    this.unit.Status = UnitStatus.TRIP;
    this.unit.P = 0;
    this.unit.Pset = 0;
  }
}
