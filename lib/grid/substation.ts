import {
  Substation, Unit, UnitStatus, SubstationCategory, IModel,
} from "../types";
import { isInactive } from "../utils";
import { GenModel } from "./gen";
import { LoadModel } from "./load";

export class SubstationModel implements IModel {
  readonly data: Substation;
  private _gens: GenModel[] = [];
  private _loads: LoadModel[] = [];

  constructor(data: Substation) {
    this.data = data;
  }

  // --- Lifecycle ---

  setup(): void {
    const d = this.data;
    // All derived fields (idx, pmax, pmin, isLoad, isRenewable) are pre-computed in grid-data.json
    if (!d.isLoad) this._gens = d.U.map(u => new GenModel(u, d));
    // Load units: from Loads block (mixed) or from U (pure load)
    const loadData = d.isLoad ? d.U : d.Loads?.U;
    if (loadData) this._loads = loadData.map(u => new LoadModel(u));
  }

  // --- Accessors ---

  get name(): string { return this.data.Name; }
  get id(): string { return this.data.Number; }
  get isLoad(): boolean { return this.data.isLoad; }
  get hasGens(): boolean { return this._gens.length > 0; }
  get hasLoads(): boolean { return this._loads.length > 0; }
  get category(): SubstationCategory { return this.data.Category; }
  get gens(): GenModel[] { return this._gens; }
  get loads(): LoadModel[] { return this._loads; }
  get pmax(): number { return this.data.pmax; }
  get totalPmax(): number { return this.data.Pmax; }
  get idx(): number { return this.data.idx; }

  // --- Unit Iteration ---

  forEachUnit(fn: (u: Unit, index: number) => void): void {
    for (let i = 0; i < this.data.Units; ++i) fn(this.data.U[i], i);
  }

  forRange(range: { from?: number; count?: number } | undefined, fn: (u: Unit, index: number) => void): void {
    const from = range?.from ?? 0;
    const end = Math.min(from + (range?.count ?? this.data.U.length - from), this.data.U.length);
    for (let i = from; i < end; i++) fn(this.data.U[i], i);
  }

  hasUnitWithStatus(status: UnitStatus): boolean {
    for (const g of this._gens) if (g.unit.Status === status) return true;
    for (const l of this._loads) if (l.unit.Status === status) return true;
    return false;
  }

  // --- Lifecycle (delegates to unit models) ---

  resetUnits(): void {
    for (const g of this._gens) g.reset();
    for (const l of this._loads) l.reset();
  }

  tick(_dt: number): void {
    for (const g of this._gens) g.tick();
    for (const l of this._loads) l.tick();
  }

  // --- Balance ---

  /** Sum gen dispatch ranges (call after gen.prepare()). */
  genBalance(): { setpoint: number; min: number; max: number } {
    let setpoint = 0, min = 0, max = 0;
    for (const g of this._gens) {
      setpoint += g.range.setpoint;
      min += g.range.min;
      max += g.range.max;
    }
    return { setpoint, min, max };
  }

  // --- Operator Actions ---

  toggleUnit(unitIndex: number): void {
    if (this.data.isLoad) this._loads[unitIndex]?.toggle();
    else this._gens[unitIndex]?.toggle();
  }

  toggleLoadUnit(unitIndex: number): void {
    this._loads[unitIndex]?.toggle();
  }

  abortTransition(unitIndex: number): void {
    this._gens[unitIndex]?.abortTransition();
  }

  setSetpoint(unitIndex: number, value: number): void {
    this._gens[unitIndex]?.setSetpoint(value);
  }

  shedAll(): void {
    for (const l of this._loads) {
      if (l.unit.Status === UnitStatus.IN) l.toggle();
    }
  }

  // --- Scenario Mutations ---

  setUnitsStatus(status: UnitStatus, range?: number | { from?: number; count?: number }): void {
    if (typeof range === 'number') {
      const u = this.data.U[range];
      if (u) u.Status = status;
    } else {
      this.forRange(range, u => { u.Status = status; });
    }
  }

  readyUnits(range?: { from?: number; count?: number }): void {
    this.forRange(range, u => { if (u.Status === UnitStatus.TRIP) u.Status = UnitStatus.DIS; });
  }

  setUnitPower(power: number, range?: { from?: number; count?: number }): void {
    this.forRange(range, u => { u.P = power; });
  }

  // --- Topology Helpers ---

  forceTrip(unitIndex: number): void {
    if (this.data.isLoad) this._loads[unitIndex]?.forceTrip();
    else this._gens[unitIndex]?.forceTrip();
  }

  forceLoadTrip(unitIndex: number): void {
    this._loads[unitIndex]?.forceTrip();
  }

  tripActiveUnits(): { genTripped: number[]; loadTripped: number[] } {
    const genTripped: number[] = [];
    const loadTripped: number[] = [];
    for (let i = 0; i < this._gens.length; ++i) {
      if (isInactive(this._gens[i].unit.Status)) continue;
      this._gens[i].forceTrip();
      genTripped.push(i);
    }
    for (let i = 0; i < this._loads.length; ++i) {
      if (isInactive(this._loads[i].unit.Status)) continue;
      this._loads[i].forceTrip();
      loadTripped.push(i);
    }
    return { genTripped, loadTripped };
  }
}
