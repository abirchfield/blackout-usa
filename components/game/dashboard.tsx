"use client"

import { memo, useMemo } from "react"
import { StatsSnapshot, SubstationCategory, LoadCategoryType } from "@/lib/types"
import { GenerationTypeConfig, LoadTypeConfig, UIThresholds } from "@/components/theme"
import { cn, fmtPower, fmtMoney } from "@/lib/utils"

// --- Standardized numeric styling ---
// STAT_HERO: large key stats. font-numeric (Geist Mono + tabular-nums) for
//   fixed-width digits that don't wiggle. Sized at text-xl/2xl to fit the 3-col grid.
// STAT_VALUE: inline values in tables/rows.
const STAT_HERO = "font-numeric font-bold whitespace-nowrap";
const STAT_VALUE = "font-numeric font-bold whitespace-nowrap";

// Unit suffix sizing: 0.6em for hero stats (text-2xl+), 0.8em for body text (text-sm).
function Unit({ v, u, hero }: { v: string; u: string; hero?: boolean }) {
  return <>{v}{u && <span className={cn(hero ? "text-[0.6em]" : "text-[0.8em]", "opacity-50 ml-[0.15em]")}>{u}</span>}</>;
}

export const KeyStats = memo(function KeyStats({ stats, className }: { stats: StatsSnapshot, className?: string }) {
  const s = stats;
  const totalGeneration = s.windGen + s.solarGen + s.thermalGen + s.nuclearGen;
  const [genV, genU] = fmtPower(totalGeneration);
  const [resV, resU] = fmtPower(s.reserves);

  return (
    <div className={cn("grid grid-cols-3 gap-4", className)} role="group" aria-label="Key game statistics">
      <div>
        <div id="freq-label" className="text-[0.65rem] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Frequency</div>
        <div id="dash-freq" className={cn("text-2xl sm:text-3xl", STAT_HERO, s.frequency < UIThresholds.FREQUENCY_WARNING_LOW || s.frequency > UIThresholds.FREQUENCY_WARNING_HIGH ? "text-destructive" : "text-sidebar-foreground")} aria-labelledby="freq-label">
          <Unit v={s.frequency.toFixed(2)} u="Hz" hero />
        </div>
      </div>
      <div>
        <div id="tgen-label" className="text-[0.65rem] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Total Gen.</div>
        <div id="dash-tgen" className={cn("text-2xl sm:text-3xl text-sidebar-foreground", STAT_HERO)} aria-labelledby="tgen-label">
          <Unit v={genV} u={genU} hero />
        </div>
      </div>
      <div>
        <div id="reserve-label" className="text-[0.65rem] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Reserves</div>
        <div id="dash-reserve" className={cn("text-2xl sm:text-3xl", STAT_HERO, s.reserves < UIThresholds.RESERVES_CRITICAL_MW ? "text-destructive" : s.reserves < UIThresholds.RESERVES_WARNING_MW ? "text-[var(--color-warning)]" : "text-sidebar-foreground")} aria-labelledby="reserve-label">
          <Unit v={resV} u={resU} hero />
        </div>
      </div>
    </div>
  )
});

const GenerationDashboard = memo(function GenerationDashboard({ stats }: { stats: StatsSnapshot }) {
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
      <div className="space-y-2">
        {generationSources.map(({ type, value, reserve }, index) => {
          const config = GenerationTypeConfig[type as SubstationCategory];
          if (!config) return null;
          const Icon = config.icon;
          const capacity = value + reserve;
          const capacityPercentage = totalSystemCapacity > 0 ? (capacity / totalSystemCapacity) * 100 : 0;
          const actualPercentageOfCapacity = capacity > 0 ? (value / capacity) * 100 : 0;

          return (
            <div key={index} className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${config.tailwind.text} flex-shrink-0`} />
              <span id={`gen-name-${index}`} className="text-sm text-sidebar-foreground/50 w-[5rem] flex-shrink-0">{config.name}</span>
              <div
                className="h-3 flex-1 rounded-full bg-foreground/10"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={capacity}
                aria-valuenow={value}
                aria-labelledby={`gen-name-${index} gen-value-${index}`}
                aria-describedby={`gen-desc-${index}`}
                title={`Capacity: ${capacity.toFixed(0)} MW`}
              >
                <span id={`gen-desc-${index}`} className="sr-only">. Total capacity is {capacity.toFixed(0)} MW, with {reserve.toFixed(0)} MW in reserve.</span>
                <div className="h-3 flex rounded-full overflow-hidden" style={{ width: `${capacityPercentage}%` }}>
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
              <span id={`gen-value-${index}`} className={cn("text-base w-20 text-right text-sidebar-foreground/70", STAT_VALUE)}>
                <Unit v={value.toFixed(0)} u="MW" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const LoadDashboard = memo(function LoadDashboard({ stats }: { stats: StatsSnapshot }) {
  const s = stats;
  const loadMix = useMemo(() => [
    { ...LoadTypeConfig[LoadCategoryType.Residential], value: s.loadServedResidential },
    { ...LoadTypeConfig[LoadCategoryType.Commercial], value: s.loadServedCommercial },
    { ...LoadTypeConfig[LoadCategoryType.Industrial], value: s.loadServedIndustrial },
    { ...LoadTypeConfig[LoadCategoryType.Datacenter], value: s.loadServedDatacenter },
  ], [s.loadServedResidential, s.loadServedCommercial, s.loadServedIndustrial, s.loadServedDatacenter]);

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {loadMix.map(({ name, value, icon: Icon, tailwind }, index) => {
          const barPercentage = s.loadServed > 0 ? (value / s.loadServed) * 100 : 0;
          return (
            <div key={index} className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4 flex-shrink-0", tailwind.text)} />
              <span id={`load-name-${index}`} className="text-sm text-sidebar-foreground/50 w-[5rem] flex-shrink-0">{name}</span>
              <div
                className="h-3 flex-1 rounded-full bg-foreground/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={barPercentage}
                aria-labelledby={`load-name-${index} load-value-${index}`}
                title={`${barPercentage.toFixed(1)}%`}
              >
                <div className={cn("h-3 rounded-full", tailwind.bg)} style={{ width: `${barPercentage}%` }} />
              </div>
              <span id={`load-value-${index}`} className={cn("text-base w-20 text-right text-sidebar-foreground/70", STAT_VALUE)}>
                <Unit v={value.toFixed(0)} u="MW" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/** Single label → value row for the summary grid. */
function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-sidebar-foreground/60 truncate">{label}</span>
      <span className={cn("text-sidebar-foreground", STAT_VALUE)}>{value}</span>
    </div>
  );
}

/** Concatenate fmtMoney tuple into a single string (no tiny/faded suffix). */
function moneyStr(val: number): string {
  const [v, u] = fmtMoney(val);
  return v + u;
}

export const Dashboard = memo(function Dashboard({ stats }: { stats: StatsSnapshot }) {
  const s = stats;
  const [loadV, loadU] = fmtPower(s.loadServed);
  const [unservedV, unservedU] = fmtPower(s.loadUnserved);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1">Generation</h4>
      <GenerationDashboard stats={stats} />
      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1 mt-4">Load</h4>
      <LoadDashboard stats={stats} />
      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1 mt-4">Summary</h4>
      <div className="grid gap-x-4 gap-y-0.5 text-sm" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))' }} role="group" aria-label="Summary statistics">
        <StatRow label="Total Load" value={<Unit v={loadV} u={loadU} />} />
        <StatRow label="Total Cost" value={moneyStr(s.totalCost)} />
        <StatRow label="Unserved Load" value={<Unit v={unservedV} u={unservedU} />} />
        <StatRow label="Operating Cost" value={moneyStr(s.totalOpCost)} />
        <StatRow label="Unserved Cost" value={moneyStr(s.totalUnservedCost)} />
        <StatRow label="Fuel Cost" value={moneyStr(s.totalFuelCost)} />
        <StatRow label="Avg. Cost" value={`$${s.avgCost.toFixed(2)}`} />
      </div>
    </div>
  );
});
