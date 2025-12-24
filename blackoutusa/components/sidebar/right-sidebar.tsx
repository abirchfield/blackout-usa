"use client"

import { BookText, Bell, Lightbulb, ArrowRight, RotateCw, Check, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GameStatistics, Briefing } from "@/lib/game/types"
import { ResultDetails } from "@/lib/game/scenario/scenarios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertsList } from "../modals/alerts-modal"
import { HintsList } from "../modals/hints-modal"
import { TimeController } from "../controls/time-controls"

interface RightSidebarProps {
  stats?: GameStatistics;
  briefing: Briefing | null;
  alerts: Array<{ id: number; time: string; message: string; critical: boolean; }>;
  onRemoveAlert: (id: number) => void;
  onDismissAllAlerts: () => void;
  hints: Array<{ id: number; time: string; message: string; }>;
  onRemoveHint: (id: number) => void;
  onDismissAllHints: () => void;
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
  className?: string;
  progress: number;
  isPaused: boolean;
  isFastForward: boolean;
  onTogglePause: () => void;
  onToggleFastForward: () => void;
}

interface DayResultsProps {
  stats?: GameStatistics;
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

      <div className="flex flex-col gap-3 text-sm">
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

export function RightSidebar({ stats, briefing, alerts, onRemoveAlert, onDismissAllAlerts, hints = [], onRemoveHint, onDismissAllHints, isDayFinished, isDayTransition, targetDay, totalDays, completedDays, onStartDay, onNextDay, onReplayDay, dayResultDetails, activeTab, onTabChange, className, progress, isPaused, isFastForward, onTogglePause, onToggleFastForward }: RightSidebarProps) {
  // Default values if stats are not yet available
  const s = stats || {
    day: 1,
  } as GameStatistics;

  return (
    <Sidebar collapsible="none" className={cn("group w-full lg:w-96 border-r border-border bg-sidebar lg:!top-16 lg:!h-[calc(100vh-4rem)] h-auto", className)}>
      <SidebarContent className="font-share-tech flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border h-32 flex flex-col justify-center gap-4">
          {isDayTransition ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Button onClick={onStartDay}>Start Day</Button>
              </div>
              <div className="flex justify-center gap-2">
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                  const isActive = day === targetDay;
                  const isCompleted = completedDays.includes(day);
                  if (isCompleted) {
                    return <div key={day} className="h-6 w-6 flex items-center justify-center rounded-full border-2 border-green-500 text-green-500" title={`Day ${day}: Completed`}><Check className="h-4 w-4" /></div>;
                  }
                  if (isActive) {
                    return <div key={day} className="h-6 w-6 flex items-center justify-center rounded-full border-2 border-primary text-primary font-bold text-xs" title={`Day ${day}: Active`}>{day}</div>;
                  }
                  return <div key={day} className="h-6 w-6 flex items-center justify-center rounded-full border-2 border-muted text-muted-foreground" title={`Day ${day}: Locked`}><Lock className="h-3.5 w-3.5" /></div>;
                })}
              </div>
            </div>
          ) : isDayFinished ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => onReplayDay(s.day)} variant="secondary" className="flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm">
                  <RotateCw className="h-4 w-4" />
                  <span>Replay Today</span>
                </Button>
                <Button onClick={() => onNextDay(s.day)} className="flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm">
                  <span>Next Day</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-center gap-2">
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                  const isActive = day === s.day;
                  const isCompleted = completedDays.includes(day);
                  const isNextDay = day === s.day + 1;

                  if (isCompleted && !isActive) {
                    return <div key={day} className="h-6 w-6 flex items-center justify-center rounded-full border-2 border-green-500 text-green-500" title={`Day ${day}: Completed`}><Check className="h-4 w-4" /></div>;
                  }
                  if (isActive) {
                    return <div key={day} className="h-6 w-6 flex items-center justify-center rounded-full border-2 border-primary text-primary font-bold text-xs" title={`Day ${day}: Active`}>{day}</div>;
                  }
                  if (isNextDay) {
                    return <div key={day} className="h-6 w-6 flex items-center justify-center rounded-full border-2 border-primary text-primary font-bold text-xs animate-pulse" title={`Day ${day}: Unlocked`}>{day}</div>;
                  }
                  return <div key={day} className="h-6 w-6 flex items-center justify-center rounded-full border-2 border-muted text-muted-foreground" title={`Day ${day}: Locked`}><Lock className="h-3.5 w-3.5" /></div>;
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-center items-baseline gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-muted-foreground uppercase">Day</span>
                  <span className="w-[2ch] text-left text-xl font-semibold text-muted-foreground tabular-nums">{s.day || 1}</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <span className="w-[10ch] text-center text-xl font-bold text-foreground tabular-nums tracking-wider">{s.timeStr}</span>
              </div>
              <div className="w-full max-w-xs sm:w-64 mx-auto">
                <TimeController progress={progress} isPaused={isPaused} isFastForward={isFastForward} onTogglePause={onTogglePause} onToggleFastForward={onToggleFastForward} />
              </div>
            </>
          )}
        </div>
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full px-2 pt-2 flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 rounded-none bg-transparent p-0" aria-label="Information Panels">
            <TabsTrigger
              value="brief"
              className="flex items-center gap-2 text-sm relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background z-10"
              aria-label="Briefing"
            >
              <BookText className="h-4 w-4" aria-hidden="true" />
              <span className="mr-auto">Briefing</span>
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="flex items-center gap-2 text-sm relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background z-10"
              aria-label={alerts.length > 0 ? `Alerts, ${alerts.length} new notifications` : 'Alerts'}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="mr-auto">Alerts</span>
              {alerts.length > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white" aria-hidden="true">
                  {alerts.length > 99 ? "99+" : alerts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="hints"
              className="flex items-center gap-2 text-sm relative h-10 rounded-t-md bg-transparent px-3 text-muted-foreground shadow-none transition-none data-[state=active]:bg-sidebar data-[state=active]:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background z-10"
              aria-label={hints.length > 0 ? `Hints, ${hints.length} new items` : 'Hints'}
            >
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
              <span className="mr-auto">Hints</span>
              {hints.length > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-bold text-amber-950" aria-hidden="true">
                  {hints.length > 99 ? "99+" : hints.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brief" className="bg-sidebar rounded-b-md rounded-tl-md flex flex-col flex-1 min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
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
                  </div>
                ) : <div className="p-4 text-center text-muted-foreground">No briefing available.</div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="alerts" className="bg-sidebar rounded-b-md rounded-tl-md p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <AlertsList alerts={alerts} onRemoveAlert={onRemoveAlert} onDismissAllAlerts={onDismissAllAlerts} />
          </TabsContent>
          <TabsContent value="hints" className="bg-sidebar rounded-b-md rounded-tl-md p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <HintsList hints={hints} onRemoveHint={onRemoveHint} onDismissAllHints={onDismissAllHints} />
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </Sidebar>
  )
}