"use client"

import { BookText, Bell, Lightbulb, ArrowRight, RotateCw, Check, Lock } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardStats, Briefing } from "@/lib/game/types"
import { ResultDetails } from "@/lib/game/scenarios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertsList } from "./modals/alerts-modal"
import { HintsList } from "./modals/hints-modal"

interface RightSidebarProps {
  stats?: DashboardStats;
  briefing: Briefing | null;
  alerts: Array<{ id: number; time: string; message: string; critical: boolean; }>;
  onRemoveAlert: (id: number) => void;
  hints: Array<{ id: number; time: string; message: string; }>;
  onRemoveHint: (id: number) => void;
  isDayFinished: boolean;
  isDayTransition: boolean;
  targetDay: number;
  totalDays: number;
  completedDays: number[];
  onStartDay: () => void;
  onNextDay: (currentDay: number) => void;
  onReplayDay: (currentDay: number) => void;
  dayResultDetails: ResultDetails | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface DayResultsProps {
  stats?: DashboardStats;
  day: number;
  resultDetails: ResultDetails | null;
}

function DayResults({ stats, day, resultDetails }: DayResultsProps) {
  if (!stats || !resultDetails) return <div className="p-4 text-center text-muted-foreground">No results available.</div>;

  const performanceMap = {
    record: { title: "Record Breaker", variant: 'default' as const },
    good: { title: "Great Job", variant: 'secondary' as const },
    okay: { title: "Not Bad", variant: 'outline' as const },
    bad: { title: "Could Be Better", variant: 'destructive' as const },
  };
  const performance = performanceMap[resultDetails.performance];

  return (
    <div className="space-y-6">
      <h4 className="font-bold leading-none text-base">Day {day} Results</h4>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground text-sm">
        <Badge variant={performance.variant} className="self-start">{performance.title}</Badge>
        <p>
          Total cost for your shift was <strong className="text-base font-mono">${resultDetails.costM}M</strong>.
        </p>
        <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: resultDetails.message }} />
      </div>

      <div className="border-t pt-4">
        <h4 className="text-base font-bold mb-2">Additional Stats</h4>
        <div className="text-xs space-y-1.5 text-muted-foreground">
          <div className="flex justify-between items-center"><span>Op. Cost:</span> <span className="font-mono text-foreground">${(stats.totalOpCost / 1000).toFixed(0)}k</span></div>
          <div className="flex justify-between items-center"><span>Fuel Cost:</span> <span className="font-mono text-foreground">${(stats.totalFuelCost / 1000).toFixed(0)}k</span></div>
          <div className="flex justify-between items-center"><span>Unserved Cost:</span> <span className="font-mono text-foreground">${(stats.totalUnservedCost / 1000).toFixed(0)}k</span></div>
          <div className="flex justify-between items-center"><span>Avg. Cost:</span> <span className="font-mono text-foreground">${stats.avgCost.toFixed(2)}/MWh</span></div>
        </div>
      </div>
    </div>
  );
}

export function RightSidebar({ stats, briefing, alerts, onRemoveAlert, hints = [], onRemoveHint, isDayFinished, isDayTransition, targetDay, totalDays, completedDays, onStartDay, onNextDay, onReplayDay, dayResultDetails, activeTab, onTabChange }: RightSidebarProps) {
  // Default values if stats are not yet available
  const s = stats || {
    day: 1,
  } as DashboardStats;

  return (
    <Sidebar collapsible="none" className="group w-96 border-l border-border bg-sidebar !top-16 !h-[calc(100vh-4rem)]">
      <SidebarContent className="font-share-tech flex flex-col overflow-hidden">
        {/* Briefing, Alerts, Hints*/}

        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full px-2 pt-2 flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 rounded-none bg-transparent p-0">
            <TabsTrigger value="brief" className="flex items-center gap-2 text-sm relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground">
              <BookText className="h-4 w-4" />
              <span className="mr-auto">Briefing</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2 text-sm relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="mr-auto">Alerts</span>
              {alerts.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {alerts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="hints" className="flex items-center gap-2 text-sm relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground">
              <Lightbulb className="h-4 w-4" />
              <span className="mr-auto">Hints</span>
              {hints.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-amber-950">
                  {hints.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brief" className="bg-sidebar rounded-b-md rounded-tl-md flex flex-col flex-1 min-h-0">
            <div className="p-4 flex-1 overflow-y-auto">
              {isDayFinished ? (
                <DayResults
                  stats={stats}
                  day={s.day}
                  resultDetails={dayResultDetails}
                />
              ) : (
                briefing ? (
                  <div className="space-y-3">
                    <h4 className="font-bold leading-none">Day {targetDay} Briefing</h4>
                    <div className="bg-muted/20 p-3 rounded-lg border border-border text-sm">
                      {briefing.isList ? (
                        <ul className="list-disc pl-4 space-y-1.5">
                          {briefing.points.map((point, index) => <li key={index}>{point}</li>)}
                        </ul>
                      ) : (<p>{briefing.points[0]}</p>)}
                    </div>
                    {isDayTransition && <div className="pt-2"><Button onClick={onStartDay} className="w-full">Start Day</Button></div>}
                  </div>
                ) : <div className="p-4 text-center text-muted-foreground">No briefing available.</div>
              )}
            </div>
            <div className="p-4 border-t border-border space-y-4">
              {isDayFinished && (
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => onReplayDay(s.day)} variant="secondary" className="flex items-center justify-center gap-2 cursor-pointer">
                    <RotateCw className="h-4 w-4" />
                    <span>Replay Today</span>
                  </Button>
                  <Button onClick={() => onNextDay(s.day)} className="flex items-center justify-center gap-2 cursor-pointer">
                    <span>Next Day</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex justify-center gap-2">
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                  const isActive = (isDayTransition && day === targetDay) || (!isDayTransition && !isDayFinished && day === s.day);
                  const isCompleted = completedDays.includes(day);

                  if (isCompleted) {
                    return <div key={day} className="h-6 w-6 flex items-center justify-center rounded-full border-2 border-green-500 text-green-500" title={`Day ${day}: Completed`}><Check className="h-4 w-4" /></div>;
                  }
                  if (isActive) {
                    return <div key={day} className="h-6 w-6 flex items-center justify-center rounded-full border-2 border-primary text-primary font-bold text-xs" title={`Day ${day}: Active`}>{day}</div>;
                  }
                  // Future day
                  return <div key={day} className="h-6 w-6 flex items-center justify-center rounded-full border-2 border-muted text-muted-foreground" title={`Day ${day}: Locked`}><Lock className="h-3.5 w-3.5" /></div>;
                })}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="alerts" className="bg-sidebar rounded-b-md rounded-tl-md p-4">
            <AlertsList alerts={alerts} onRemoveAlert={onRemoveAlert} />
          </TabsContent>
          <TabsContent value="hints" className="bg-sidebar rounded-b-md rounded-tl-md p-4">
            <HintsList hints={hints} onRemoveHint={onRemoveHint} />
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </Sidebar>
  )
}