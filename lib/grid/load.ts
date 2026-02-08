import {
  Unit, UnitStatus, LoadCategoryType,
} from "../types";
import { isInactive } from "../utils";

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

  tick(): void {
    this.unit.StatusCount += 1;
  }

  reset(): void {
    this.unit.Status = this.unit.Status0;
    this.unit.P = this.unit.Pset = this.unit.P0;
    this.unit.StatusCount = 0;
  }

  // --- Load Power ---

  applyLoadPower(loadLevel: number): void {
    if (this.unit.Status === UnitStatus.IN) {
      this.unit.P = this.pmax * loadLevel;
    } else if (isInactive(this.unit.Status)) {
      this.unit.P = 0;
    }
  }

  // --- Operator Actions ---

  toggle(): void {
    if (this.unit.Status === UnitStatus.DIS) this.unit.Status = UnitStatus.IN;
    else if (this.unit.Status === UnitStatus.IN) this.unit.Status = UnitStatus.DIS;
  }

  // --- Topology Helpers ---

  forceTrip(): void {
    this.unit.Status = UnitStatus.TRIP;
    this.unit.P = 0;
    this.unit.Pset = 0;
  }
}
