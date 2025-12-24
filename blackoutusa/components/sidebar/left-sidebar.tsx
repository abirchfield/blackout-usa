"use client"

import { GameStatistics, SubstationCategory } from "@/lib/game/types"
import { GenerationTypeConfig } from "@/lib/game/config"
import { cn, fmtMoneyAuto, fmtPowerAuto } from "@/lib/utils"
import { Home, Factory, BrainCircuit } from "lucide-react"

const SidebarSeparator = ({ className }: { className?: string }) => (
  <div className={cn("h-px w-full bg-border", className)} />
);

export function EnergyStats({ stats }: { stats: GameStatistics }) {
  const s = stats;
  const totalGeneration = s.windGen + s.solarGen + s.thermalGen + s.nuclearGen;
  const totalSystemCapacity = totalGeneration + s.reserves;

  const generationSources = [
    { type: SubstationCategory.Nuclear, value: s.nuclearGen, reserve: s.reservesNuclear },
    { type: SubstationCategory.Thermal, value: s.thermalGen, reserve: s.reservesThermal },
    { type: SubstationCategory.Solar, value: s.solarGen, reserve: s.reservesSolar },
    { type: SubstationCategory.Wind, value: s.windGen, reserve: s.reservesWind },
  ];

  const loadMix = [
    { name: "Residential", percentage: 0.45, icon: Home, color: "bg-blue-400" },
    { name: "Industrial", percentage: 0.35, icon: Factory, color: "bg-indigo-400" },
    { name: "AI Datacenters", percentage: 0.20, icon: BrainCircuit, color: "bg-purple-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Frequency</div>
          <div id="dash-freq" className={`text-lg font-bold ${s.frequency < 59.7 || s.frequency > 60.3 ? "text-red-500" : "text-sidebar-foreground"}`}>
            {s.frequency.toFixed(2)} Hz
          </div>
        </div>
        <div>
          <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Total Gen.</div>
          <div id="dash-tgen" className="text-lg font-bold text-sidebar-foreground">{fmtPowerAuto(totalGeneration)}</div>
        </div>
        <div>
          <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Reserves</div>
          <div
            id="dash-reserve"
            className={`text-lg font-bold ${
              s.reserves < 50 ? "text-red-500" : s.reserves < 500 ? "text-orange-500" : "text-sidebar-foreground"
            }`}
          >{fmtPowerAuto(s.reserves)}</div>
        </div>
      </div>

      <div>
        <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Generation Mix</div>
        <div className="space-y-3 pt-2">
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
                    <span className="text-foreground/80 truncate">{config.name}</span>
                    <span className="font-mono font-bold whitespace-nowrap">{value.toFixed(0)} <span className="text-xs text-muted-foreground">MW</span></span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted mt-1" title={`Capacity: ${capacity.toFixed(0)} MW`}>
                    <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${capacityPercentage}%` }}>
                        <div
                            className={cn(config.tailwind.bg)}
                            style={{ width: `${actualPercentageOfCapacity}%` }}
                            title={`Actual: ${value.toFixed(0)} MW`}
                        />
                        <div
                            className={cn(config.tailwind.bg, "opacity-30")}
                            style={{ width: `${100 - actualPercentageOfCapacity}%` }}
                            title={`Reserve: ${reserve.toFixed(0)} MW`}
                        />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-4 pt-3 mt-3 border-t border-border/50">
          <div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Total Cost</div>
            <div className="text-lg font-bold text-sidebar-foreground">{fmtMoneyAuto(s.totalCost)}</div>
          </div>
          <div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Avg. Cost</div>
            <div className="text-lg font-bold text-sidebar-foreground">${s.avgCost.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Op. Cost</div>
            <div className="text-lg font-bold text-sidebar-foreground">{fmtMoneyAuto(s.totalOpCost)}</div>
          </div>
          <div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Fuel Cost</div>
            <div className="text-lg font-bold text-sidebar-foreground">{fmtMoneyAuto(s.totalFuelCost)}</div>
          </div>
        </div>
      </div>

      <SidebarSeparator className="bg-border/50" />

      <div>
        <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Load Mix</div>
        <div className="space-y-3 pt-2">
          {loadMix.map(({ name, percentage, icon: Icon, color }) => {
            const value = s.loadServed * percentage;
            const barPercentage = s.loadServed > 0 ? (value / s.loadServed) * 100 : 0;
            return (
              <div key={name} className="flex items-center gap-3">
                <Icon className={`h-4 w-4 text-muted-foreground flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-foreground/80 truncate">{name}</span>
                    <span className="font-mono font-bold whitespace-nowrap">{value.toFixed(0)} <span className="text-xs text-muted-foreground">MW</span></span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted mt-1" title={`${barPercentage.toFixed(1)}%`}>
                    <div
                      className={`h-1.5 rounded-full ${color}`}
                      style={{ width: `${barPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-4 pt-3 mt-3 border-t border-border/50">
            <div>
                <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Total Load</div>
                <div className="text-lg font-bold text-sidebar-foreground">{fmtPowerAuto(s.loadServed)}</div>
            </div>
            <div>
                <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Unserved Load</div>
                <div className="text-lg font-bold text-sidebar-foreground">{fmtPowerAuto(s.loadUnserved)}</div>
            </div>
            <div>
                <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Unserved Cost</div>
                <div className="text-lg font-bold text-sidebar-foreground">{fmtMoneyAuto(s.totalUnservedCost)}</div>
            </div>
        </div>
      </div>
    </div>
  );
}