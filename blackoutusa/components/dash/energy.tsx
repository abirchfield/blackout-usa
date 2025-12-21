"use client"

import { useMemo } from "react"
import { SidebarSeparator } from "@/components/ui/sidebar"
import { DashboardStats } from "@/lib/game/types"
import { fmtMW } from "@/lib/utils"
import { AreaChart, Area } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

interface EnergyStatsProps {
  stats: DashboardStats;
  statsHistory?: DashboardStats[];
}

export function EnergyStats({ stats, statsHistory }: EnergyStatsProps) {
  const s = stats;

  const chartData = useMemo(() => {
    return statsHistory?.map(stat => ({
      time: stat.timeStr,
      wind: stat.windGen,
      solar: stat.solarGen,
      thermal: stat.thermalGen,
      nuclear: stat.nuclearGen,
    })) || [];
  }, [statsHistory]);

  const chartConfig = {
    wind: { label: "Wind", color: "hsl(142.1 76.2% 44.9%)" }, // text-green-500
    solar: { label: "Solar", color: "hsl(47.9 95.8% 53.1%)" }, // text-yellow-500
    thermal: { label: "Thermal", color: "hsl(215.4 16.3% 47.1%)" }, // text-gray-500
    nuclear: { label: "Nuclear", color: "hsl(332.6 79.1% 57.8%)" }, // text-pink-500
  } as const

  const showChart = chartData.length > 1;

  return (
    <div className="space-y-4">
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
      <div>
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
      <div>
        <div className="text-xs text-muted-foreground">Frequency</div>
        <div id="dash-freq" className={`text-lg font-bold ${s.frequency < 59.7 || s.frequency > 60.3 ? "text-red-500" : "text-foreground"}`}>
          {s.frequency.toFixed(2)} Hz
        </div>
      </div>
      </div>

      <SidebarSeparator />

      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-xs text-muted-foreground">Generation Mix</div>
        </div>
        {showChart && (
          <div className="h-24 w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} >
                <Area dataKey="nuclear" type="natural" fill="var(--color-nuclear)" fillOpacity={0.4} strokeWidth={0} stackId="a" />
                <Area dataKey="thermal" type="natural" fill="var(--color-thermal)" fillOpacity={0.4} strokeWidth={0} stackId="a" />
                <Area dataKey="solar" type="natural" fill="var(--color-solar)" fillOpacity={0.4} strokeWidth={0} stackId="a" />
                <Area dataKey="wind" type="natural" fill="var(--color-wind)" fillOpacity={0.4} strokeWidth={0} stackId="a" />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
        {showChart && (
          <div className="flex items-center justify-center gap-x-4 text-xs pt-2 text-muted-foreground">
            {Object.keys(chartConfig)
              .reverse()
              .map((key) => {
                const config = chartConfig[key as keyof typeof chartConfig];
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
    </div>
  );
}