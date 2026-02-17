import {
  Substation, Unit, UnitStatus, SubstationCategory,
} from "../types";
import { availCapacity, isInactive } from "../utils";
import { SHUTDOWN_THRESHOLD_MW } from "./constants";
import { clamp } from "./utils";

export class GenModel {
  readonly unit: Unit;

  // Per-unit params (from Unit, copied once at construction)
  readonly pmax: number;
  readonly pmin: number;
  readonly ramp: number;
  readonly startTime: number;
  readonly fixedCost: number;
  readonly fuelCost: number;
  readonly category: SubstationCategory;
  readonly isRenewable: boolean;

  // Per-tick cached invariants (set by prepare(), read by output())
  private _setpoint = 0;
  private _avail = 0;
  private _rampDown = 0;
  private _rampUp = 0;
  private _isReady = false;

  // Per-tick dispatch range: what power can this unit deliver this tick?
  readonly range = { setpoint: 0, min: 0, max: 0 };

  constructor(unit: Unit, sub: Substation) {
    this.unit = unit;
    this.pmax = unit.Pmax;
    this.pmin = unit.Pmin;
    this.ramp = unit.Ramp;
    this.startTime = unit.StartTime;
    this.fixedCost = unit.FixedCost;
    this.fuelCost = unit.FuelCost;
    this.category = sub.Category;
    this.isRenewable = sub.isRenewable;
  }

  // --- Lifecycle ---

  tick(): void {
    this.unit.StatusCount += 1;

    if (this.unit.Status === UnitStatus.SHUTDOWN) {
      if (Math.max(this.unit.P - this.ramp, 0) <= SHUTDOWN_THRESHOLD_MW)
        this.unit.Status = UnitStatus.DIS;
    } else if (this.unit.Status === UnitStatus.STARTUP) {
      if (this.unit.StatusCount >= this.startTime) {
        this.unit.Status = UnitStatus.IN;
        if (this.pmin > 0) this.unit.Pset = this.pmin;
      }
    }
  }

  reset(): void {
    this.unit.Status = this.unit.Status0;
    this.unit.P = this.unit.Pset = this.unit.P0;
    this.unit.StatusCount = 0;
    if (this.isRenewable) this.unit.Pset = this.pmax;
  }

  /** Cache per-tick invariants and dispatch range. Call once after integrity phase, before solve. */
  prepare(windAvail: number, sunAvail: number): void {
    const r = this.range;
    const status = this.unit.Status;

    if (isInactive(status)) {
      this.unit.P = 0;
      r.setpoint = r.min = r.max = 0;
      return;
    }

    // Clamp setpoint to [pmin, pmax] and ramp limits
    let pset = this.unit.Pset;
    if (status === UnitStatus.STARTUP && this.pmin > 0) pset = this.pmin;
    pset = clamp(pset, this.pmin, this.pmax);

    const rampDown = this.unit.P - this.ramp;
    const rampUp = this.unit.P + this.ramp;
    this._setpoint = clamp(pset, rampDown, rampUp);
    this._rampDown = rampDown;
    this._rampUp = rampUp;
    this._avail = this.isRenewable
      ? availCapacity(this.pmax, this.category, windAvail, sunAvail)
      : this.pmax;
    this._isReady = status === UnitStatus.IN ||
      (status === UnitStatus.STARTUP && this.unit.StatusCount >= this.startTime);

    // Dispatch range: what power can this unit deliver this tick?
    if (status === UnitStatus.SHUTDOWN) {
      r.setpoint = r.min = r.max = Math.max(0, rampDown);
    } else if (!this._isReady) {
      r.setpoint = r.min = r.max = 0;
    } else if (this.isRenewable) {
      r.setpoint = Math.min(this._setpoint, this._avail);
      r.min = Math.max(rampDown, 0);
      r.max = Math.min(rampUp, this._avail);
    } else {
      r.setpoint = this._setpoint;
      const floor = Math.max(rampDown, this.pmin);
      r.min = status === UnitStatus.STARTUP ? Math.min(rampUp, floor) : floor;
      r.max = Math.min(rampUp, this.pmax);
    }
  }

  // --- Power Output ---

  /**
   * Compute power output for a given dispatch level alpha (range ~[-1, 1]).
   * alpha > 0 means "produce more", alpha < 0 means "produce less".
   * The result is clamped to unit bounds and ramp limits.
   */
  output(alpha: number): number {
    // Shutting down: ramp toward zero
    if (this.unit.Status === UnitStatus.SHUTDOWN)
      return Math.max(this.unit.P - this.ramp, 0);

    if (!this._isReady) return 0;

    // Start from setpoint (capped to available capacity for renewables)
    const base = this.isRenewable ? Math.min(this._setpoint, this._avail) : this._setpoint;

    // Shift by alpha (demand signal scaled by unit size)
    const target = base + alpha * this.pmax;

    // Apply ramp limits, then clamp to unit bounds
    const lo = this.isRenewable ? 0 : this.pmin;
    const hi = this.isRenewable ? this._avail : this.pmax;
    return clamp(clamp(target, this._rampDown, this._rampUp), lo, hi);
  }

  // --- Operator Actions ---

  toggle(): void {
    if (this.unit.Status === UnitStatus.DIS) {
      this.unit.Status = UnitStatus.STARTUP;
      this.unit.StatusCount = 0;
    } else if (this.unit.Status === UnitStatus.IN || this.unit.Status === UnitStatus.STARTUP) {
      this.unit.Status = UnitStatus.SHUTDOWN;
      this.unit.StatusCount = 0;
    }
  }

  abortTransition(): void {
    if (this.unit.Status === UnitStatus.STARTUP) {
      this.unit.Status = UnitStatus.DIS;
      this.unit.StatusCount = 0;
      this.unit.P = 0;
      this.unit.Pset = this.unit.P0;
    } else if (this.unit.Status === UnitStatus.SHUTDOWN) {
      this.unit.Status = UnitStatus.IN;
      this.unit.StatusCount = 0;
    }
  }

  setSetpoint(value: number): void {
    if (isNaN(value)) return;
    this.unit.Pset = clamp(value, this.pmin, this.pmax);
  }

  forceTrip(): void {
    this.unit.Status = UnitStatus.TRIP;
    this.unit.P = 0;
    this.unit.Pset = 0;
  }
}
