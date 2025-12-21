"use client"

import { Zap, DollarSign, Waypoints, Building } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardStats, Substation, Branch } from "@/lib/game/types"
import { GameEngine } from "@/lib/game/engine"
import { TimeController } from "./dash/time-controller"
import { EnergyStats } from "./dash/energy"
import { FinanceStats } from "./dash/finance"
import { BranchesList } from "./dash/branches"
import { SubstationsList } from "./dash/substations"

interface AppSidebarProps {
  stats?: DashboardStats;
  isPaused: boolean;
  isFastForward: boolean;
  onTogglePause: () => void;
  onToggleFastForward: () => void;
  subs?: Record<string, Substation>;
  branches?: Record<string, Branch>;
  statsHistory?: DashboardStats[];
  onSubstationSelect: (sub: Substation) => void;
  onBranchSelect: (branch: Branch) => void;
}

export function AppSidebar({ stats, isPaused, isFastForward, onTogglePause, onToggleFastForward, subs, branches, statsHistory, onSubstationSelect, onBranchSelect }: AppSidebarProps) {
  // Default values if stats are not yet available
  const s = stats || {
    day: 1,
    timeStr: "...", timeStep: 0, frequency: 60,
    loadServed: 0, loadUnserved: 0, reserves: 0,
    windGen: 0, solarGen: 0, thermalGen: 0, nuclearGen: 0,
    avgCost: 0, totalCost: 0,
    currentOpCost: 0, currentFuelCost: 0, currentUnservedCost: 0,
    totalOpCost: 0, totalFuelCost: 0, totalUnservedCost: 0,
    fr_wind: 0,
    fr_solar: 0,
  } as DashboardStats;

  // Calculate progress based on timeStep from engine (0 to 600)
  const timeStep = s.timeStep || 0;
  const progress = Math.min(100, Math.max(0, (timeStep / GameEngine.GAME_DURATION) * 100));

  return (
    <Sidebar collapsible="none" className="group border-r border-border bg-sidebar !top-16 !h-[calc(100vh-4rem)] overflow-visible">
      <SidebarContent className="font-share-tech overflow-x-hidden">
        {/* Status Group */}
        <SidebarGroup>
          <SidebarGroupContent className="space-y-3 px-2 pt-4">
            <div className="flex items-start gap-8">
              <div className="shrink-0">
                <div id="dash-clock-label" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Day {s.day || 1}
                </div>
                <div id="dash-clock" className="text-xl font-bold text-foreground whitespace-nowrap">
                  {s.timeStr}
                </div>
              </div>
              <div className="shrink-0">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Frequency
                </div>
                <div id="dash-freq" className={`text-xl font-bold ${s.frequency < 59.7 || s.frequency > 60.3 ? "text-red-500" : "text-foreground"}`}>
                  {s.frequency.toFixed(2)} Hz
                </div>
              </div>
            </div>
            
            <TimeController 
              progress={progress}
              isPaused={isPaused}
              isFastForward={isFastForward}
              onTogglePause={onTogglePause}
              onToggleFastForward={onToggleFastForward}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <Tabs defaultValue="power" className="w-full px-2 pt-2">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="power" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground" title="Grid Status">
              <Zap className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger value="costs" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground" title="Financials">
              <DollarSign className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger value="lines" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground" title="Transmission Lines">
              <Waypoints className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger value="subs" className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground" title="Substations">
              <Building className="h-5 w-5" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="power" className="mt-4">
            <EnergyStats stats={s} />
          </TabsContent>
          <TabsContent value="costs" className="mt-4">
            <FinanceStats stats={s} statsHistory={statsHistory} />
          </TabsContent>
          <TabsContent value="lines" className="mt-4">
            <BranchesList branches={branches} onBranchSelect={onBranchSelect} />
          </TabsContent>
          <TabsContent value="subs" className="mt-4">
            <SubstationsList subs={subs} onSubstationSelect={onSubstationSelect} />
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </Sidebar>
  )
}