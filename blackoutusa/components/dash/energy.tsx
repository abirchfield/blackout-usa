"use client"

import { useMemo } from "react"
import { SidebarSeparator } from "@/components/ui/sidebar"
import { DashboardStats } from "@/lib/game/types"
import { fmtMW, fmtMoneyK, fmtMoneyM } from "@/lib/utils"
import { AreaChart, Area } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

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

  const financeChartData = useMemo(() => {
    return statsHistory?.map(stat => ({
      time: stat.timeStr,
      totalCost: stat.totalCost / 1000000, // in $M
      avgCost: stat.avgCost,
      opCost: stat.totalOpCost / 1000, // in $k
      fuelCost: stat.totalFuelCost / 1000, // in $k
      unservedCost: stat.totalUnservedCost / 1000, // in $k
    })) || [];
  }, [statsHistory]);

  const energyChartConfig = {
    wind: { label: "Wind", color: "hsl(142.1 76.2% 44.9%)" }, // text-green-500
    solar: { label: "Solar", color: "hsl(47.9 95.8% 53.1%)" }, // text-yellow-500
    thermal: { label: "Thermal", color: "hsl(215.4 16.3% 47.1%)" }, // text-gray-500
    nuclear: { label: "Nuclear", color: "hsl(332.6 79.1% 57.8%)" }, // text-pink-500
  } as const

  const financeChartConfig = {
    totalCost: { label: "Total Cost", color: "var(--primary)" },
    avgCost: { label: "Avg. Cost", color: "var(--chart-4)" },
    opCost: { label: "Op Cost", color: "var(--chart-1)" },
    fuelCost: { label: "Fuel Cost", color: "var(--chart-2)" },
    unservedCost: { label: "Unserved Cost", color: "var(--chart-3)" },
  } as const

  const showCharts = energyChartData.length > 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-2 gap-y-4">
      <div>
        <div className="text-xs text-muted-foreground">Load Served</div>
        <div id="dash-sload" className="text-xl font-bold text-foreground">
          {fmtMW(s.loadServed)}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Load Unserved</div>
        <div id="dash-uload" className="text-xl font-bold text-foreground">
          {fmtMW(s.loadUnserved)}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Reserves</div>
        <div
          id="dash-reserve"
          className={`text-xl font-bold ${
            s.reserves < 50 ? "text-red-500" : s.reserves < 500 ? "text-orange-500" : "text-foreground"
          }`}
        >
          {fmtMW(s.reserves)}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Frequency</div>
        <div id="dash-freq" className={`text-xl font-bold ${s.frequency < 59.7 || s.frequency > 60.3 ? "text-red-500" : "text-foreground"}`}>
          {s.frequency.toFixed(2)} Hz
        </div>
      </div>
      </div>

      <SidebarSeparator />

      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-xs text-muted-foreground">Generation Mix</div>
        </div>
        {showCharts && (
          <div className="h-24 w-full">
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
          <div className="flex items-center justify-center gap-x-4 text-xs pt-2 text-muted-foreground">
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

      <SidebarSeparator />

      <div className="space-y-4">
        <div className="space-y-2">
          {/* Total Cost */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost</div>
              <div id="dash-tcost" className="text-2xl font-bold">{fmtMoneyM(s.totalCost)}</div>
            </div>
            {showCharts && (
              <div className="h-10 w-32">
                <ChartContainer config={financeChartConfig} className="h-full w-full">
                  <AreaChart data={financeChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <Area dataKey="totalCost" type="natural" fill="var(--color-totalCost)" fillOpacity={0.2} stroke="var(--color-totalCost)" strokeWidth={2} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent
                        indicator="line"
                        formatter={(value) => [`$${Number(value).toFixed(2)}M`, "Total Cost"]}
                      />}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            )}
          </div>

          {/* Avg. Cost */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Avg. Cost</div>
              <div id="dash-avcost" className="text-2xl font-bold">${s.avgCost.toFixed(2)}/MWh</div>
            </div>
            {showCharts && (
              <div className="h-10 w-32">
                <ChartContainer config={financeChartConfig} className="h-full w-full">
                  <AreaChart data={financeChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <Area dataKey="avgCost" type="natural" fill="var(--color-avgCost)" fillOpacity={0.2} stroke="var(--color-avgCost)" strokeWidth={2} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent
                        indicator="line"
                        formatter={(value) => [`$${Number(value).toFixed(2)}/MWh`, "Avg. Cost"]}
                      />}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            )}
          </div>
        </div>

        <SidebarSeparator />

        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Total Cost Breakdown
          </div>
          {/* Op Cost */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Op Cost</div>
              <div className="font-bold text-foreground">{fmtMoneyK(s.totalOpCost)}</div>
            </div>
            {showCharts && (
              <div className="h-10 w-32">
                <ChartContainer config={financeChartConfig} className="h-full w-full">
                  <AreaChart data={financeChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <Area dataKey="opCost" type="natural" fill="var(--color-opCost)" fillOpacity={0.2} stroke="var(--color-opCost)" strokeWidth={2} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent
                        indicator="line"
                        formatter={(value) => [`$${Number(value).toFixed(0)}k`, "Op Cost"]}
                      />}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            )}
          </div>
          {/* Fuel Cost */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Fuel Cost</div>
              <div className="font-bold text-foreground">{fmtMoneyK(s.totalFuelCost)}</div>
            </div>
            {showCharts && (
              <div className="h-10 w-32">
                <ChartContainer config={financeChartConfig} className="h-full w-full">
                  <AreaChart data={financeChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <Area dataKey="fuelCost" type="natural" fill="var(--color-fuelCost)" fillOpacity={0.2} stroke="var(--color-fuelCost)" strokeWidth={2} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent
                        indicator="line"
                        formatter={(value) => [`$${Number(value).toFixed(0)}k`, "Fuel Cost"]}
                      />}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            )}
          </div>
          {/* Unserved Cost */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Unserved Cost</div>
              <div className="font-bold text-foreground">{fmtMoneyK(s.totalUnservedCost)}</div>
            </div>
            {showCharts && (
              <div className="h-10 w-32">
                <ChartContainer config={financeChartConfig} className="h-full w-full">
                  <AreaChart data={financeChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <Area dataKey="unservedCost" type="natural" fill="var(--color-unservedCost)" fillOpacity={0.2} stroke="var(--color-unservedCost)" strokeWidth={2} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent
                        indicator="line"
                        formatter={(value) => [`$${Number(value).toFixed(0)}k`, "Unserved Cost"]}
                      />}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}