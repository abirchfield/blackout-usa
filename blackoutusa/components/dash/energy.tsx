"use client"

import { SidebarSeparator } from "@/components/ui/sidebar"
import { DashboardStats } from "@/lib/game/types"
import { fmtMW } from "@/lib/utils"

interface EnergyStatsProps {
  stats: DashboardStats;
}

export function EnergyStats({ stats }: EnergyStatsProps) {
  const s = stats;

  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-4">
      <div>
        <div className="text-xs text-muted-foreground">Load Served</div>
        <div id="dash-sload" className="text-lg font-bold text-foreground">
          {fmtMW(s.loadServed)}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Load Unserved</div>
        <div id="dash-uload" className="text-lg font-bold text-foreground">
          {fmtMW(s.loadUnserved)}
        </div>
      </div>
      <div className="col-span-2">
        <div className="text-xs text-muted-foreground">Reserves</div>
        <div
          id="dash-reserve"
          className={`text-lg font-bold ${
            s.reserves < 50 ? "text-red-500" : s.reserves < 500 ? "text-orange-500" : "text-foreground"
          }`}
        >
          {fmtMW(s.reserves)}
        </div>
      </div>
      <div className="col-span-2 pt-2">
        <SidebarSeparator />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Wind</div>
        <div id="dash-wgen" className="text-lg font-bold text-green-500">
          {fmtMW(s.windGen)}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Solar</div>
        <div id="dash-sgen" className="text-lg font-bold text-yellow-500">
          {fmtMW(s.solarGen)}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Thermal</div>
        <div id="dash-thgen" className="text-lg font-bold text-gray-400">
          {fmtMW(s.thermalGen)}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Nuclear</div>
        <div id="dash-nugen" className="text-lg font-bold text-pink-500">
          {fmtMW(s.nuclearGen)}
        </div>
      </div>
    </div>
  );
}