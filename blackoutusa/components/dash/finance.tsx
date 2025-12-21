"use client"

import { useMemo } from "react"
import { SidebarSeparator } from "@/components/ui/sidebar"
import { DashboardStats } from "@/lib/game/types"
import { fmtMoneyK, fmtMoneyM } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AreaChart, Area, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
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
      opCost: stat.totalOpCost / 1000, // in $k
      fuelCost: stat.totalFuelCost / 1000, // in $k
      unservedCost: stat.totalUnservedCost / 1000, // in $k
    })) || [];
  }, [statsHistory]);

  const chartConfig = {
    totalCost: { label: "Total Cost", color: "hsl(var(--primary))" },
    opCost: { label: "Op Cost", color: "hsl(var(--chart-1))" },
    fuelCost: { label: "Fuel Cost", color: "hsl(var(--chart-2))" },
    unservedCost: { label: "Unserved Cost", color: "hsl(var(--chart-3))" },
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="dash-tcost" className="text-2xl font-bold">{fmtMoneyM(s.totalCost)}</div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="dash-avcost" className="text-2xl font-bold">${s.avgCost.toFixed(2)}/MWh</div>
          </CardContent>
        </Card>
      </div>

      <SidebarSeparator />

      {/* Charts */}
      <Tabs defaultValue="breakdown">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="total">Total Cost</TabsTrigger>
        </TabsList>
        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 1 ? (
                <ChartContainer config={chartConfig} className="h-[150px] w-full">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value, index) => index % 4 === 0 ? value : ""} style={{ fontSize: '0.7rem' }} />
                    <YAxis tickFormatter={(value) => `$${value}k`} style={{ fontSize: '0.7rem' }} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Area dataKey="unservedCost" type="natural" fill="var(--color-unservedCost)" stroke="var(--color-unservedCost)" stackId="a" />
                    <Area dataKey="fuelCost" type="natural" fill="var(--color-fuelCost)" stroke="var(--color-fuelCost)" stackId="a" />
                    <Area dataKey="opCost" type="natural" fill="var(--color-opCost)" stroke="var(--color-opCost)" stackId="a" />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">Not enough data to display chart.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="total">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total Cost Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 1 ? (
                <ChartContainer config={chartConfig} className="h-[150px] w-full">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value, index) => index % 4 === 0 ? value : ""} style={{ fontSize: '0.7rem' }} />
                    <YAxis tickFormatter={(value) => `$${value}M`} style={{ fontSize: '0.7rem' }} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Line dataKey="totalCost" type="natural" stroke="var(--color-totalCost)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">Not enough data to display chart.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hourly Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-muted-foreground">Op Cost</div>
          <div className="font-bold text-foreground">{fmtMoneyK(s.currentOpCost)}/hr</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Fuel Cost</div>
          <div className="font-bold text-foreground">{fmtMoneyK(s.currentFuelCost)}/hr</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Unserved</div>
          <div className="font-bold text-foreground">{fmtMoneyK(s.currentUnservedCost)}/hr</div>
        </div>
      </div>
    </div>
  );
}