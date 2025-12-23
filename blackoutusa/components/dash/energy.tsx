"use client"

import { useMemo } from "react"
import { SidebarSeparator } from "@/components/ui/sidebar"
import { DashboardStats } from "@/lib/game/types"
import { fmtMW, fmtMoneyK, fmtMoneyM } from "@/lib/utils"
import { AreaChart, Area } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

interface EnergyStatsProps {
  stats: DashboardStats;
  statsHistory?: DashboardStats[];
}

export function EnergyStats({ stats, statsHistory }: EnergyStatsProps) {
  const s = stats;

  const energyChartData = useMemo(() => {
    return statsHistory?.map(stat => ({
      time: stat.timeStr,
      wind: stat.windGen,
      solar: stat.solarGen,
      thermal: stat.thermalGen,
      nuclear: stat.nuclearGen,
    })) || [];
  }, [statsHistory]);

  const energyChartConfig = {
    wind: { label: "Wind", color: "hsl(142.1 76.2% 44.9%)" }, // text-green-500
    solar: { label: "Solar", color: "hsl(47.9 95.8% 53.1%)" }, // text-yellow-500
    thermal: { label: "Thermal", color: "hsl(215.4 16.3% 47.1%)" }, // text-gray-500
    nuclear: { label: "Nuclear", color: "hsl(332.6 79.1% 57.8%)" }, // text-pink-500
  } as const

  const showCharts = energyChartData.length > 1;

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
          <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider font-bold mb-2">Generation Mix</div>
        </div>
        {showCharts && (
          <div className="h-20 w-full">
            <ChartContainer config={energyChartConfig} className="h-full w-full">
              <AreaChart data={energyChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} >
                <Area dataKey="nuclear" type="natural" fill="var(--color-nuclear)" fillOpacity={0.4} strokeWidth={0} stackId="a" />
                <Area dataKey="thermal" type="natural" fill="var(--color-thermal)" fillOpacity={0.4} strokeWidth={0} stackId="a" />
                <Area dataKey="solar" type="natural" fill="var(--color-solar)" fillOpacity={0.4} strokeWidth={0} stackId="a" />
                <Area dataKey="wind" type="natural" fill="var(--color-wind)" fillOpacity={0.4} strokeWidth={0} stackId="a" />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
        {showCharts && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] pt-2 text-sidebar-foreground/70">
            {Object.keys(energyChartConfig)
              .reverse()
              .map((key) => {
                const config = energyChartConfig[key as keyof typeof energyChartConfig];
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                    <span>{config.label}</span>
                  </div>
                );
              })}
          </div>
        )}
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