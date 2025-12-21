"use client"

import { Zap, DollarSign, Waypoints, Building, BookText, Bell, Lightbulb } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardStats, Substation, Branch, Briefing } from "@/lib/game/types"
import { GameEngine } from "@/lib/game/engine"
import { TimeController } from "./dash/time-controller"
import { AlertsList } from "./modals/alerts-modal"
import { HintsList } from "./modals/hints-modal"
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
  isBriefingOpen: boolean;
  onBriefingOpenChange: (open: boolean) => void;
  briefing: Briefing | null;
  alerts: Array<{ id: number; time: string; message: string; critical: boolean; }>;
  onRemoveAlert: (id: number) => void;
  hints: Array<{ id: number; time: string; message: string; }>;
  onRemoveHint: (id: number) => void;
  subs?: Record<string, Substation>;
  branches?: Record<string, Branch>;
  statsHistory?: DashboardStats[];
  onSubstationSelect: (sub: Substation) => void;
  onBranchSelect: (branch: Branch) => void;
}

export function AppSidebar({ stats, isPaused, isFastForward, onTogglePause, onToggleFastForward, isBriefingOpen, onBriefingOpenChange, briefing, alerts, onRemoveAlert, hints = [], onRemoveHint, subs, branches, statsHistory, onSubstationSelect, onBranchSelect }: AppSidebarProps) {
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
          <SidebarGroupContent className="px-2 pt-4">
            <div className="grid grid-cols-[1fr_auto_auto] items-stretch gap-2">
              {/* Left Column: Time and Controls */}
              <div className="space-y-3">
                <div className="flex justify-center">
                  <div className="shrink-0 text-center">
                    <div id="dash-clock-label" className="text-xs text-muted-foreground uppercase tracking-wider">
                      Day {s.day || 1}
                    </div>
                    <div id="dash-clock" className="text-xl font-bold text-foreground whitespace-nowrap">
                      {s.timeStr}
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
              </div>

              {/* Separator */}
              <div className="w-px bg-border" />

              {/* Right Column: Briefing, Alerts, Hints */}
              <div className="flex flex-col items-center justify-around gap-2 py-1">
                <Popover open={isBriefingOpen} onOpenChange={onBriefingOpenChange}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" title="Briefing" className="cursor-pointer">
                      <BookText className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-[400px] font-share-tech">
                    {briefing ? (
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h4 className="font-bold leading-none">Day {s.day} Briefing</h4>
                          <p className="text-sm text-muted-foreground">
                            Your objectives for the upcoming shift.
                          </p>
                        </div>
                        <div className="bg-muted/20 p-4 rounded-lg border border-border text-sm">
                          {briefing.isList ? (
                            <ul className="list-disc pl-5 space-y-2">
                              {briefing.points.map((point, index) => <li key={index}>{point}</li>)}
                            </ul>
                          ) : (<p>{briefing.points[0]}</p>)}
                        </div>
                      </div>
                    ) : <div className="p-4 text-center text-muted-foreground">No briefing available.</div>}
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" title="Alerts" className="cursor-pointer">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-[600px] font-share-tech max-h-[60vh] flex flex-col p-6">
                    <div className="mb-4">
                      <h4 className="font-bold leading-none text-xl">Alerts</h4>
                      <p className="text-sm text-muted-foreground">List of game alerts.</p>
                    </div>
                    <AlertsList alerts={alerts} onRemoveAlert={onRemoveAlert} />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" title="Hints" className="cursor-pointer">
                      <Lightbulb className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-[600px] font-share-tech max-h-[60vh] flex flex-col p-6">
                    <div className="mb-4">
                      <h4 className="font-bold leading-none text-xl">Hints</h4>
                      <p className="text-sm text-muted-foreground">List of game hints.</p>
                    </div>
                    <HintsList hints={hints} onRemoveHint={onRemoveHint} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <Tabs defaultValue="power" className="w-full px-2 pt-2">
          <TabsList className="w-full justify-start rounded-none bg-transparent p-0">
            <TabsTrigger value="power" className="relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground" title="Grid Status">
              <Zap className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger value="costs" className="relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground" title="Financials">
              <DollarSign className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger value="lines" className="relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground" title="Transmission Lines">
              <Waypoints className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger value="subs" className="relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground" title="Substations">
              <Building className="h-5 w-5" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="power" className="bg-sidebar rounded-b-md rounded-tr-md p-4">
            <EnergyStats stats={s} statsHistory={statsHistory} />
          </TabsContent>
          <TabsContent value="costs" className="bg-sidebar rounded-b-md rounded-tr-md p-4">
            <FinanceStats stats={s} statsHistory={statsHistory} />
          </TabsContent>
          <TabsContent value="lines" className="bg-sidebar rounded-b-md rounded-tr-md p-4">
            <BranchesList branches={branches} onBranchSelect={onBranchSelect} />
          </TabsContent>
          <TabsContent value="subs" className="bg-sidebar rounded-b-md rounded-tr-md p-4">
            <SubstationsList subs={subs} onSubstationSelect={onSubstationSelect} />
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </Sidebar>
  )
}