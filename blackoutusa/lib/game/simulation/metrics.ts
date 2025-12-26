import { GameState, UnitStatus, SubstationCategory } from "../types";

const UNSERVED_LOAD_COST_PER_MW = 1000;
const MINUTES_PER_HOUR = 60.0;

export class MetricsCalculator {
  public updateMetrics(state: GameState) {
    state.metrics.loadServed = 0;
    state.metrics.loadUnserved = 0;
    state.metrics.windGen = 0;
    state.metrics.solarGen = 0;
    state.metrics.thermalGen = 0;
    state.metrics.nuclearGen = 0;
    state.metrics.reserves = 0;
    state.metrics.reservesWind = 0;
    state.metrics.reservesSolar = 0;
    state.metrics.reservesThermal = 0;
    state.metrics.reservesNuclear = 0;
    state.metrics.currentFuelCost = 0;
    state.metrics.currentOpCost = 0;
    state.metrics.currentUnservedCost = 0;

    for (const key in state.subs) {
        const sub = state.subs[key];
        for (let iu = 0; iu < sub.Units; ++iu) {
            const u = sub.U[iu];
            const pmax_unit = sub.Pmax / sub.Units;
            if (sub.Category === SubstationCategory.Load) {
                if (u.Status === UnitStatus.IN) {
                    state.metrics.loadServed += u.P;
                } else {
                    state.metrics.loadUnserved += pmax_unit * state.fr_load;
                }
            } else {
                if (u.Status === UnitStatus.IN || u.Status === UnitStatus.STARTUP || u.Status === UnitStatus.SHUTDOWN) {
                    state.metrics.currentOpCost += sub.FixedCost;
                    state.metrics.currentFuelCost += sub.FuelCost * u.P;
                }
                if (u.Status === UnitStatus.IN) { 
                    let unitReserve = 0;
                    if (sub.Category === SubstationCategory.Wind) {
                        unitReserve = (pmax_unit * state.fr_wind) - u.P;
                        state.metrics.reservesWind += unitReserve;
                    } else if (sub.Category === SubstationCategory.Solar) {
                        unitReserve = (pmax_unit * state.fr_solar) - u.P;
                        state.metrics.reservesSolar += unitReserve;
                    } else if (sub.Category === SubstationCategory.Nuclear) {
                        unitReserve = pmax_unit - u.P;
                        state.metrics.reservesNuclear += unitReserve;
                    } else { 
                        unitReserve = pmax_unit - u.P;
                        state.metrics.reservesThermal += unitReserve;
                    }
                    state.metrics.reserves += unitReserve;
                }
                if (sub.Category === SubstationCategory.Wind) state.metrics.windGen += u.P;
                else if (sub.Category === SubstationCategory.Solar) state.metrics.solarGen += u.P;
                else if (sub.Category === SubstationCategory.Nuclear) state.metrics.nuclearGen += u.P;
                else state.metrics.thermalGen += u.P;
            }
        }
    }
    state.metrics.currentUnservedCost = state.metrics.loadUnserved * UNSERVED_LOAD_COST_PER_MW;
    state.metrics.totalFuelCost += state.metrics.currentFuelCost / MINUTES_PER_HOUR;
    state.metrics.totalOpCost += state.metrics.currentOpCost / MINUTES_PER_HOUR;
    state.metrics.totalUnservedCost += state.metrics.currentUnservedCost / MINUTES_PER_HOUR;
    state.metrics.totalCost = state.metrics.totalFuelCost + state.metrics.totalOpCost + state.metrics.totalUnservedCost;
    state.metrics.totalMwh += (state.metrics.loadServed + state.metrics.loadUnserved) / MINUTES_PER_HOUR;
    if (state.metrics.totalMwh > 0) {
        state.metrics.avgCost = state.metrics.totalCost / state.metrics.totalMwh;
    }
  }
}
