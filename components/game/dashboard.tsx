"use client"

import { memo, useMemo } from "react"
import { GameStatistics, SubstationCategory, LoadCategoryType } from "@/lib/types"
import { GenerationTypeConfig, LoadTypeConfig, UIThresholds } from "@/components/theme"
import { cn, fmtMoneyAuto, fmtPowerAuto } from "@/lib/utils"

export const KeyStats = memo(function KeyStats({ stats, className }: { stats: GameStatistics, className?: string }) {
  const s = stats;
  const totalGeneration = s.windGen + s.solarGen + s.thermalGen + s.nuclearGen;

  return (
    <div className={cn("grid grid-cols-3 gap-4", className)} role="group" aria-label="Key game statistics">
      <div>
        <div id="freq-label" className="text-[0.65rem] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Frequency</div>
        <div id="dash-freq" className={`text-2xl sm:text-3xl font-bold tabular-nums ${s.frequency < UIThresholds.FREQUENCY_WARNING_LOW || s.frequency > UIThresholds.FREQUENCY_WARNING_HIGH ? "text-destructive" : "text-sidebar-foreground"}`} aria-labelledby="freq-label">{s.frequency.toFixed(2)} <span className="text-base text-sidebar-foreground/60">Hz</span></div>
      </div>
      <div>
        <div id="tgen-label" className="text-[0.65rem] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Total Gen.</div>
        <div id="dash-tgen" className="text-2xl sm:text-3xl font-bold tabular-nums text-sidebar-foreground" aria-labelledby="tgen-label">{fmtPowerAuto(totalGeneration)}</div>
      </div>
      <div>
        <div id="reserve-label" className="text-[0.65rem] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Reserves</div>
        <div id="dash-reserve" className={`text-2xl sm:text-3xl font-bold tabular-nums ${s.reserves < UIThresholds.RESERVES_CRITICAL_MW ? "text-destructive" : s.reserves < UIThresholds.RESERVES_WARNING_MW ? "text-[var(--color-warning)]" : "text-sidebar-foreground"}`} aria-labelledby="reserve-label">{fmtPowerAuto(s.reserves)}</div>
      </div>
    </div>
  )
});

const GenerationDashboard = memo(function GenerationDashboard({ stats }: { stats: GameStatistics }) {
  const s = stats;
  const totalGeneration = s.windGen + s.solarGen + s.thermalGen + s.nuclearGen;
  const totalSystemCapacity = totalGeneration + s.reserves;

  const generationSources = useMemo(() => [
    { type: SubstationCategory.Nuclear, value: s.nuclearGen, reserve: s.reservesNuclear },
    { type: SubstationCategory.Thermal, value: s.thermalGen, reserve: s.reservesThermal },
    { type: SubstationCategory.Solar, value: s.solarGen, reserve: s.reservesSolar },
    { type: SubstationCategory.Wind, value: s.windGen, reserve: s.reservesWind },
  ], [s.nuclearGen, s.thermalGen, s.solarGen, s.windGen, s.reservesNuclear, s.reservesThermal, s.reservesSolar, s.reservesWind]);

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {generationSources.map(({ type, value, reserve }, index) => {
          const config = GenerationTypeConfig[type as SubstationCategory];
          if (!config) return null;
          const Icon = config.icon;
          const capacity = value + reserve;
          const capacityPercentage = totalSystemCapacity > 0 ? (capacity / totalSystemCapacity) * 100 : 0;
          const actualPercentageOfCapacity = capacity > 0 ? (value / capacity) * 100 : 0;

          return (
            <div key={index} className="flex items-center gap-2.5">
              <Icon className={`h-4 w-4 ${config.tailwind.text} flex-shrink-0`} />
              <span id={`gen-name-${index}`} className="text-sm text-foreground/80 w-16 flex-shrink-0">{config.name}</span>
              <div
                className="h-2.5 flex-1 rounded-full bg-foreground/10"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={capacity}
                aria-valuenow={value}
                aria-labelledby={`gen-name-${index} gen-value-${index}`}
                aria-describedby={`gen-desc-${index}`}
                title={`Capacity: ${capacity.toFixed(0)} MW`}
              >
                <span id={`gen-desc-${index}`} className="sr-only">. Total capacity is {capacity.toFixed(0)} MW, with {reserve.toFixed(0)} MW in reserve.</span>
                <div className="h-2.5 flex rounded-full overflow-hidden" style={{ width: `${capacityPercentage}%` }}>
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
              <span id={`gen-value-${index}`} className="text-sm font-mono font-bold whitespace-nowrap tabular-nums w-20 text-right">{value.toFixed(0)} <span className="text-xs text-muted-foreground">MW</span></span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-2 mt-2 border-t border-border/50 text-sm" role="group" aria-label="Cost statistics">
        <div className="flex justify-between">
          <span className="text-sidebar-foreground/60">Total Cost</span>
          <span className="font-bold tabular-nums text-sidebar-foreground">{fmtMoneyAuto(s.totalCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sidebar-foreground/60">Avg. Cost</span>
          <span className="font-bold tabular-nums text-sidebar-foreground">${s.avgCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sidebar-foreground/60">Op. Cost</span>
          <span className="font-bold tabular-nums text-sidebar-foreground">{fmtMoneyAuto(s.totalOpCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sidebar-foreground/60">Fuel Cost</span>
          <span className="font-bold tabular-nums text-sidebar-foreground">{fmtMoneyAuto(s.totalFuelCost)}</span>
        </div>
      </div>
    </div>
  );
});

const LoadDashboard = memo(function LoadDashboard({ stats }: { stats: GameStatistics }) {
  const s = stats;
  const loadMix = useMemo(() => [
    { ...LoadTypeConfig[LoadCategoryType.Residential], value: s.loadServedResidential },
    { ...LoadTypeConfig[LoadCategoryType.Commercial], value: s.loadServedCommercial },
    { ...LoadTypeConfig[LoadCategoryType.Industrial], value: s.loadServedIndustrial },
    { ...LoadTypeConfig[LoadCategoryType.Datacenter], value: s.loadServedDatacenter },
  ], [s.loadServedResidential, s.loadServedCommercial, s.loadServedIndustrial, s.loadServedDatacenter]);

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {loadMix.map(({ name, value, icon: Icon, tailwind }, index) => {
          const barPercentage = s.loadServed > 0 ? (value / s.loadServed) * 100 : 0;
          return (
            <div key={index} className="flex items-center gap-2.5">
              <Icon className={cn("h-4 w-4 flex-shrink-0", tailwind.text)} />
              <span id={`load-name-${index}`} className="text-sm text-foreground/80 w-16 flex-shrink-0">{name}</span>
              <div
                className="h-2.5 flex-1 rounded-full bg-foreground/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={barPercentage}
                aria-labelledby={`load-name-${index} load-value-${index}`}
                title={`${barPercentage.toFixed(1)}%`}
              >
                <div className={cn("h-2.5 rounded-full", tailwind.bg)} style={{ width: `${barPercentage}%` }} />
              </div>
              <span id={`load-value-${index}`} className="text-sm font-mono font-bold whitespace-nowrap tabular-nums w-20 text-right">{value.toFixed(0)} <span className="text-xs text-muted-foreground">MW</span></span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-y-0.5 pt-2 mt-2 border-t border-border/50 text-sm" role="group" aria-label="Load statistics">
        <div className="flex justify-between">
          <span className="text-sidebar-foreground/60">Total Load</span>
          <span className="font-bold tabular-nums text-sidebar-foreground">{fmtPowerAuto(s.loadServed)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sidebar-foreground/60">Unserved</span>
          <span className="font-bold tabular-nums text-sidebar-foreground">{fmtPowerAuto(s.loadUnserved)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sidebar-foreground/60">Unserved Cost</span>
          <span className="font-bold tabular-nums text-sidebar-foreground">{fmtMoneyAuto(s.totalUnservedCost)}</span>
        </div>
      </div>
    </div>
  );
});

export const Dashboard = memo(function Dashboard({ stats }: { stats: GameStatistics }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1">Generation</h4>
      <GenerationDashboard stats={stats} />
      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1 mt-4">Load</h4>
      <LoadDashboard stats={stats} />
    </div>
  );
});