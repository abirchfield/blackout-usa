"use client"

import { GameStatistics, SubstationCategory, LoadCategoryType } from "@/lib/types"
import { GenerationTypeConfig, LoadTypeConfig } from "@/lib/config"
import { cn, fmtMoneyAuto, fmtPowerAuto } from "@/lib/utils"

export function KeyStats({ stats, totalGeneration, className }: { stats: GameStatistics, totalGeneration: number, className?: string }) {
  const s = stats;

  return (
    <div className={cn("grid grid-cols-3 gap-4", className)} role="group" aria-label="Key game statistics">
      <div>
        <div id="freq-label" className="text-xs text-sidebar-foreground/60 uppercase tracking-wider font-bold">Frequency</div>
        <div id="dash-freq" className={`text-2xl font-bold ${s.frequency < 59.7 || s.frequency > 60.3 ? "text-destructive" : "text-sidebar-foreground"}`} aria-labelledby="freq-label">{s.frequency.toFixed(2)} Hz</div>
      </div>
      <div>
        <div id="tgen-label" className="text-xs text-sidebar-foreground/60 uppercase tracking-wider font-bold">Total Gen.</div>
        <div id="dash-tgen" className="text-2xl font-bold text-sidebar-foreground" aria-labelledby="tgen-label">{fmtPowerAuto(totalGeneration)}</div>
      </div>
      <div>
        <div id="reserve-label" className="text-xs text-sidebar-foreground/60 uppercase tracking-wider font-bold">Reserves</div>
        <div id="dash-reserve" className={`text-2xl font-bold ${s.reserves < 50 ? "text-destructive" : s.reserves < 500 ? "text-[var(--color-warning)]" : "text-sidebar-foreground"}`} aria-labelledby="reserve-label">{fmtPowerAuto(s.reserves)}</div>
      </div>
    </div>
  )
}

export function GenerationDashboard({ stats }: { stats: GameStatistics }) {
  const s = stats;
  const totalGeneration = s.windGen + s.solarGen + s.thermalGen + s.nuclearGen;
  const totalSystemCapacity = totalGeneration + s.reserves;

  const generationSources = [
    { type: SubstationCategory.Nuclear, value: s.nuclearGen, reserve: s.reservesNuclear },
    { type: SubstationCategory.Thermal, value: s.thermalGen, reserve: s.reservesThermal },
    { type: SubstationCategory.Solar, value: s.solarGen, reserve: s.reservesSolar },
    { type: SubstationCategory.Wind, value: s.windGen, reserve: s.reservesWind },
  ];

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-3">
        {generationSources.map(({ type, value, reserve }, index) => {
          const config = GenerationTypeConfig[type as SubstationCategory];
          if (!config) return null;
          const Icon = config.icon;
          const capacity = value + reserve;
          const capacityPercentage = totalSystemCapacity > 0 ? (capacity / totalSystemCapacity) * 100 : 0;
          const actualPercentageOfCapacity = capacity > 0 ? (value / capacity) * 100 : 0;

          return (
            <div key={index} className="flex items-center gap-3">
              <Icon className={`h-4 w-4 ${config.tailwind.text} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline text-xs">
                  <span id={`gen-name-${index}`} className="text-foreground/80 truncate">{config.name}</span>
                  <span id={`gen-value-${index}`} className="font-mono font-bold whitespace-nowrap">{value.toFixed(0)} <span className="text-xs text-muted-foreground">MW</span></span>
                </div>
                <div
                  className="h-1.5 w-full rounded-full bg-foreground/10 mt-1"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={capacity}
                  aria-valuenow={value}
                  aria-labelledby={`gen-name-${index} gen-value-${index}`}
                  aria-describedby={`gen-desc-${index}`}
                  title={`Capacity: ${capacity.toFixed(0)} MW`}
                >
                  <span id={`gen-desc-${index}`} className="sr-only">. Total capacity is {capacity.toFixed(0)} MW, with {reserve.toFixed(0)} MW in reserve.</span>
                  <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${capacityPercentage}%` }}>
                      <div
                          className={cn(config.tailwind.bg)}
                          style={{ width: `${actualPercentageOfCapacity}%` }}
                          title={`Current Output: ${value.toFixed(0)} MW`}
                      />
                      <div
                          className={cn(config.tailwind.bg, "opacity-30")}
                          style={{ width: `${100 - actualPercentageOfCapacity}%` }}
                          title={`Reserve Capacity: ${reserve.toFixed(0)} MW`}
                      />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-4 pt-3 mt-3 border-t border-border/50" role="group" aria-label="Cost statistics">
        <div>
          <div id="total-cost-label" className="text-xs text-sidebar-foreground/60 uppercase tracking-wider font-bold">Total Cost</div>
            <div className="text-lg font-bold text-sidebar-foreground" aria-labelledby="total-cost-label">{fmtMoneyAuto(s.totalCost)}</div>
          </div>
          <div>
            <div id="avg-cost-label" className="text-xs text-sidebar-foreground/60 uppercase tracking-wider font-bold">Avg. Cost</div>
            <div className="text-lg font-bold text-sidebar-foreground" aria-labelledby="avg-cost-label">${s.avgCost.toFixed(2)}</div>
          </div>
          <div>
            <div id="op-cost-label" className="text-xs text-sidebar-foreground/60 uppercase tracking-wider font-bold">Op. Cost</div>
            <div className="text-lg font-bold text-sidebar-foreground" aria-labelledby="op-cost-label">{fmtMoneyAuto(s.totalOpCost)}</div>
          </div>
          <div>
            <div id="fuel-cost-label" className="text-xs text-sidebar-foreground/60 uppercase tracking-wider font-bold">Fuel Cost</div>
            <div className="text-lg font-bold text-sidebar-foreground" aria-labelledby="fuel-cost-label">{fmtMoneyAuto(s.totalFuelCost)}</div>
          </div>
        </div>
    </div>
  );
}

export function LoadDashboard({ stats }: { stats: GameStatistics }) {
  const s = stats;
  const loadMix = [
    { ...LoadTypeConfig[LoadCategoryType.Residential], value: s.loadServedResidential },
    { ...LoadTypeConfig[LoadCategoryType.Commercial], value: s.loadServedCommercial },
    { ...LoadTypeConfig[LoadCategoryType.Industrial], value: s.loadServedIndustrial },
    { ...LoadTypeConfig[LoadCategoryType.Datacenter], value: s.loadServedDatacenter },
  ];

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-3">
        {loadMix.map(({ name, value, icon: Icon, tailwind }, index) => {
          const barPercentage = s.loadServed > 0 ? (value / s.loadServed) * 100 : 0;
          return (
            <div key={index} className="flex items-center gap-3">
              <Icon className={cn("h-4 w-4 flex-shrink-0", tailwind.text)} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline text-xs">
                  <span id={`load-name-${index}`} className="text-foreground/80 truncate">{name}</span>
                  <span id={`load-value-${index}`} className="font-mono font-bold whitespace-nowrap">{value.toFixed(0)} <span className="text-xs text-muted-foreground">MW</span></span>
                </div>
                <div
                  className="h-1.5 w-full rounded-full bg-foreground/10 mt-1"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={barPercentage}
                  aria-labelledby={`load-name-${index} load-value-${index}`}
                  title={`${barPercentage.toFixed(1)}%`}
                >
                  <div className={cn("h-1.5 rounded-full", tailwind.bg)} style={{ width: `${barPercentage}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-4 pt-3 mt-3 border-t border-border/50" role="group" aria-label="Load statistics">
        <div>
          <div id="total-load-label" className="text-xs text-sidebar-foreground/60 uppercase tracking-wider font-bold">Total Load</div>
          <div className="text-lg font-bold text-sidebar-foreground" aria-labelledby="total-load-label">{fmtPowerAuto(s.loadServed)}</div>
        </div>
        <div>
          <div id="unserved-load-label" className="text-xs text-sidebar-foreground/60 uppercase tracking-wider font-bold">Unserved Load</div>
          <div className="text-lg font-bold text-sidebar-foreground" aria-labelledby="unserved-load-label">{fmtPowerAuto(s.loadUnserved)}</div>
        </div>
        <div>
          <div id="unserved-cost-label" className="text-xs text-sidebar-foreground/60 uppercase tracking-wider font-bold">Unserved Cost</div>
          <div className="text-lg font-bold text-sidebar-foreground" aria-labelledby="unserved-cost-label">{fmtMoneyAuto(s.totalUnservedCost)}</div>
        </div>
      </div>
    </div>
  );
}

export function EnergyDashboard({ stats }: { stats: GameStatistics }) {
  return (
    <div className="space-y-6">
      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Generation</h4>
      <GenerationDashboard stats={stats} />
      <hr className="my-4 border-t border-border/50" />
      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Load</h4>
      <LoadDashboard stats={stats} />
    </div>
  );
}