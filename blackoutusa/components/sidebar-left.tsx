"use client"

import { SidebarSeparator } from "@/components/ui/sidebar"
import { DashboardStats } from "@/lib/game/types"
import { fmtMW, fmtMoneyK, fmtMoneyM } from "@/lib/utils"
import { Wind, Sun, Flame, Atom } from "lucide-react"

interface EnergyStatsProps {
  stats: DashboardStats;
}

export function EnergyStats({ stats }: EnergyStatsProps) {
  const s = stats;

  const generationTypes = [
    { name: "Nuclear", key: "nuclearGen", color: "text-purple-400", bgColor: "bg-purple-400", icon: Atom },
    { name: "Thermal", key: "thermalGen", color: "text-orange-400", bgColor: "bg-orange-400", icon: Flame },
    { name: "Wind", key: "windGen", color: "text-cyan-400", bgColor: "bg-cyan-400", icon: Wind },
    { name: "Solar", key: "solarGen", color: "text-yellow-400", bgColor: "bg-yellow-400", icon: Sun },
  ];
  const totalGen = stats.nuclearGen + stats.thermalGen + stats.windGen + stats.solarGen;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-2 gap-y-4">
      <div>
        <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Load Served</div>
        <div id="dash-sload" className="text-lg font-bold text-sidebar-foreground">
          {fmtMW(s.loadServed)}
        </div>
      </div>
      <div>
        <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Load Unserved</div>
        <div id="dash-uload" className="text-lg font-bold text-sidebar-foreground">
          {fmtMW(s.loadUnserved)}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Reserves</div>
        <div
          id="dash-reserve"
          className={`text-xl font-bold ${
            s.reserves < 50 ? "text-red-500" : s.reserves < 500 ? "text-orange-500" : "text-sidebar-foreground"
          }`}
        >
          {fmtMW(s.reserves)}
        </div>
      </div>
      <div>
        <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Frequency</div>
        <div id="dash-freq" className={`text-lg font-bold ${s.frequency < 59.7 || s.frequency > 60.3 ? "text-red-500" : "text-sidebar-foreground"}`}>
          {s.frequency.toFixed(2)} Hz
        </div>
      </div>
      </div>

      <SidebarSeparator className="bg-sidebar-border/50" />

      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Generation Mix</div>
        </div>
        <div className="space-y-3 pt-2">
          {generationTypes.map((type) => {
            const value = stats[type.key as keyof DashboardStats] as number;
            const percentage = totalGen > 0 ? (value / totalGen) * 100 : 0;
            return (
              <div key={type.key} className="flex items-center gap-3">
                <type.icon className={`h-4 w-4 ${type.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-foreground/80 truncate">{type.name}</span>
                    <span className="font-mono font-bold whitespace-nowrap">{value.toFixed(0)} <span className="text-xs text-muted-foreground">MW</span></span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted mt-1" title={`${percentage.toFixed(1)}%`}>
                    <div
                      className={`h-1.5 rounded-full ${type.bgColor}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between items-baseline pt-3 mt-3 border-t border-sidebar-border/50">
          <span className="font-bold text-sm">Total Generation</span>
          <span className="font-mono font-bold text-sm">{totalGen.toFixed(0)} MW</span>
        </div>
      </div>

      <SidebarSeparator className="bg-sidebar-border/50" />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Total Cost</div>
            <div id="dash-tcost" className="text-xl font-bold text-sidebar-foreground">{fmtMoneyM(s.totalCost)}</div>
          </div>
          <div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">Avg. Cost</div>
            <div id="dash-avcost" className="text-xl font-bold text-sidebar-foreground">${s.avgCost.toFixed(2)}</div>
          </div>
        </div>

        <div className="space-y-2 p-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border/50">
          <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold">
            Cost Breakdown
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[9px] text-sidebar-foreground/50 uppercase">Op.</div>
              <div className="text-xs font-bold text-sidebar-foreground">{fmtMoneyK(s.totalOpCost)}</div>
            </div>
            <div>
              <div className="text-[9px] text-sidebar-foreground/50 uppercase">Fuel</div>
              <div className="text-xs font-bold text-sidebar-foreground">{fmtMoneyK(s.totalFuelCost)}</div>
            </div>
            <div>
              <div className="text-[9px] text-sidebar-foreground/50 uppercase">Unserved</div>
              <div className="text-xs font-bold text-sidebar-foreground">{fmtMoneyK(s.totalUnservedCost)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}