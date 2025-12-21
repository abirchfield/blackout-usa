"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { DashboardStats } from "@/lib/game/types"

interface AppSidebarProps {
  stats?: DashboardStats;
}

export function AppSidebar({ stats }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar()

  // Default values if stats are not yet available
  const s = stats || {
    day: 1, timeStr: "1:00 PM", frequency: 60,
    loadServed: 0, loadUnserved: 0, reserves: 0,
    windGen: 0, solarGen: 0, thermalGen: 0, nuclearGen: 0,
    avgCost: 0, totalCost: 0,
    currentOpCost: 0, currentFuelCost: 0, currentUnservedCost: 0,
    totalOpCost: 0, totalFuelCost: 0, totalUnservedCost: 0
  };

  // Helper for currency formatting
  const fmtMoney = (val: number) => `$${val.toLocaleString()}`;
  const fmtMoneyK = (val: number) => `$${(val / 1000).toFixed(0)}k`;
  const fmtMoneyM = (val: number) => `$${(val / 1000000).toFixed(2)}M`;
  const fmtMW = (val: number) => `${val.toFixed(0)} MW`;

  return (
    <Sidebar collapsible="icon" className="group border-r border-border bg-sidebar !top-16 !h-[calc(100vh-4rem)] overflow-visible">
      <Button
        onClick={toggleSidebar}
        className="absolute -right-3 top-3 z-50 h-6 w-6 rounded-full border shadow-md p-0"
        variant="outline"
        size="icon"
      >
        {state === "collapsed" ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
      <SidebarContent className="font-share-tech overflow-x-hidden">
        {/* Status Group */}
        <SidebarGroup>
          <SidebarGroupContent className="space-y-3 px-2 pt-4">
            <div>
              <div id="dash-clock-label" className="text-sm text-muted-foreground">
                Day {s.day}
              </div>
              <div id="dash-clock" className="text-xl font-bold text-foreground">
                {s.timeStr}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Frequency
              </span>
              <div id="dash-freq" className={`text-2xl font-bold ${s.frequency < 59.7 || s.frequency > 60.3 ? "text-red-500" : "text-foreground"}`}>
                {s.frequency.toFixed(2)} Hz
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Load & Generation Group */}
        <SidebarGroup>
          <SidebarGroupContent className="flex transition-all duration-300 ease-in-out group-data-[state=collapsed]:gap-0 gap-2 px-2 pt-2 items-start">
            <div className="flex-none w-[120px] flex flex-col gap-3">
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
                  className="text-lg font-bold text-foreground"
                >
                  {fmtMW(s.reserves)}
                </div>
              </div>
            </div>
            {/* Generation Mix - Right Column */}
            <div className="flex-none w-[120px] flex flex-col gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out opacity-100 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:opacity-0">
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
            </div>
            {/* Generation Mix - Third Column */}
            <div className="flex-none w-[120px] flex flex-col gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out opacity-100 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:opacity-0">
              <div>
                <div className="text-xs text-muted-foreground">Nuclear</div>
                <div id="dash-nugen" className="text-lg font-bold text-pink-500">
                  {fmtMW(s.nuclearGen)}
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Costs & Financials Group */}
        <SidebarGroup>
          <SidebarGroupContent className="flex transition-all duration-300 ease-in-out group-data-[state=collapsed]:gap-0 gap-2 px-2 pt-2 items-start">
            <div className="flex-none w-[120px] flex flex-col gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Avg Cost</div>
                <div id="dash-avcost" className="text-lg font-bold text-foreground">
                  ${s.avgCost.toFixed(2)}/MWh
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Cost</div>
                <div id="dash-tcost" className="text-lg font-bold text-foreground">
                  {fmtMoneyM(s.totalCost)}
                </div>
              </div>
            </div>
            {/* Financials - Right Column */}
            <div className="flex-none w-[120px] flex flex-col gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out opacity-100 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:opacity-0">
              <div>
                <div className="text-xs text-muted-foreground">Hourly Op</div>
                <div id="dash-cfixed" className="text-lg font-bold text-foreground">{fmtMoney(s.currentOpCost)}/hr</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Hourly Fuel</div>
                <div id="dash-cfuel" className="text-lg font-bold text-foreground">{fmtMoney(s.currentFuelCost)}/hr</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Hourly Unserved</div>
                <div id="dash-cuload" className="text-lg font-bold text-foreground">{fmtMoney(s.currentUnservedCost)}/hr</div>
              </div>
            </div>
            {/* Financials - Third Column */}
            <div className="flex-none w-[120px] flex flex-col gap-3 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out opacity-100 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:opacity-0">
              <div>
                <div className="text-xs text-muted-foreground">Daily Op</div>
                <div id="dash-tfixed" className="text-lg font-bold text-foreground">{fmtMoneyK(s.totalOpCost)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Daily Fuel</div>
                <div id="dash-tfuel" className="text-lg font-bold text-foreground">{fmtMoneyK(s.totalFuelCost)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Daily Unserved</div>
                <div id="dash-tuload" className="text-lg font-bold text-foreground">{fmtMoneyK(s.totalUnservedCost)}</div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}