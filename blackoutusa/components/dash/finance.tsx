"use client"

import { useMemo } from "react"
import { SidebarSeparator } from "@/components/ui/sidebar"
import { DashboardStats } from "@/lib/game/types"
import { fmtMoneyK, fmtMoneyM } from "@/lib/utils"
import { AreaChart, Area } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface FinanceStatsProps {
  stats: DashboardStats;
  statsHistory?: DashboardStats[];
}

export function FinanceStats({ stats, statsHistory }: FinanceStatsProps) {
  const s = stats;

  const chartData = useMemo(() => {
    return statsHistory?.map(stat => ({
      time: stat.timeStr,
      totalCost: stat.totalCost / 1000000, // in $M
      avgCost: stat.avgCost,
      opCost: stat.totalOpCost / 1000, // in $k
      fuelCost: stat.totalFuelCost / 1000, // in $k
      unservedCost: stat.totalUnservedCost / 1000, // in $k
    })) || [];
  }, [statsHistory]);

  const chartConfig = {
    totalCost: { label: "Total Cost", color: "var(--primary)" },
    avgCost: { label: "Avg. Cost", color: "var(--chart-4)" },
    opCost: { label: "Op Cost", color: "var(--chart-1)" },
    fuelCost: { label: "Fuel Cost", color: "var(--chart-2)" },
    unservedCost: { label: "Unserved Cost", color: "var(--chart-3)" },
  } as const

  const showCharts = chartData.length > 1;

  return (
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
              <ChartContainer config={chartConfig} className="h-full w-full">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
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
              <ChartContainer config={chartConfig} className="h-full w-full">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
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
              <ChartContainer config={chartConfig} className="h-full w-full">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
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
              <ChartContainer config={chartConfig} className="h-full w-full">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
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
              <ChartContainer config={chartConfig} className="h-full w-full">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
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
  );
}