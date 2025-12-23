"use client"

import { Zap } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardStats, Substation, Branch } from "@/lib/game/types"
import { EnergyStats } from "./dash/energy"
import { BranchesList } from "./dash/branches"
import { SubstationsList } from "./dash/substations"
import { SubstationIcon } from "./icons/substation-icon"
import { LinesIcon } from "./icons/lines-icon"

interface AppSidebarProps {
  stats?: DashboardStats;
  subs?: Record<string, Substation>;
  branches?: Record<string, Branch>;
  statsHistory?: DashboardStats[];
  onSubstationSelect: (sub: Substation) => void;
  onBranchSelect: (branch: Branch) => void;
}

export function AppSidebar({ stats, subs, branches, statsHistory, onSubstationSelect, onBranchSelect }: AppSidebarProps) {
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

  return (
    <Sidebar collapsible="none" className="group w-96 border-r border-border bg-sidebar !top-16 !h-[calc(100vh-4rem)] overflow-visible">
      <SidebarContent className="font-share-tech flex flex-col overflow-hidden">
        {/* Energy, finanace, branches, and substation tabs */}

        <Tabs defaultValue="power" className="flex flex-1 flex-col w-full px-2 pt-2 min-h-0">
          <TabsList className="grid w-full grid-cols-3 rounded-none bg-transparent p-0">
            <TabsTrigger value="power" className="flex items-center justify-center gap-2 text-sm relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground" title="Grid Status">
              <Zap className="h-4 w-4" />
              <span>Power</span>
            </TabsTrigger>
            <TabsTrigger value="lines" className="flex items-center justify-center gap-2 text-sm relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground" title="Transmission Lines">
              <LinesIcon className="h-4 w-4 shrink-0" />
              <span>Lines</span>
            </TabsTrigger>
            <TabsTrigger value="subs" className="flex items-center justify-center gap-2 text-sm relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground" title="Substations">
              <SubstationIcon className="h-4 w-4 shrink-0" />
              <span>Substations</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="power" className="bg-sidebar rounded-b-md rounded-tr-md p-4">
            <EnergyStats stats={s} statsHistory={statsHistory} />
          </TabsContent>
          <TabsContent value="lines" className="flex-1 overflow-y-auto bg-sidebar rounded-b-md rounded-tr-md p-4">
            <BranchesList branches={branches} onBranchSelect={onBranchSelect} />
          </TabsContent>
          <TabsContent value="subs" className="flex-1 overflow-y-auto bg-sidebar rounded-b-md rounded-tr-md p-4">
            <SubstationsList subs={subs} onSubstationSelect={onSubstationSelect} />
          </TabsContent>
        </Tabs>
      
      </SidebarContent>
    </Sidebar>
  )
}