"use client"

import { Zap, Wind, DollarSign, Waypoints, Building } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardStats, Substation, Branch, Unit } from "@/lib/game/types"
import { GameEngine } from "@/lib/game/engine"
import { TimeController } from "@/components/time-controller"

interface AppSidebarProps {
  stats?: DashboardStats;
  day: number;
  isPaused: boolean;
  isFastForward: boolean;
  onTogglePause: () => void;
  onToggleFastForward: () => void;
  subs?: Record<string, Substation>;
  branches?: Record<string, Branch>;
  onSubstationSelect: (sub: Substation) => void;
  onBranchSelect: (branch: Branch) => void;
}

export function AppSidebar({ stats, day, isPaused, isFastForward, onTogglePause, onToggleFastForward, subs, branches, onSubstationSelect, onBranchSelect }: AppSidebarProps) {
  // Default values if stats are not yet available
  const s = stats || {
    timeStr: "1:00 PM", frequency: 60, timeStep: 0,
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

  // Calculate progress based on timeStep from engine (0 to 600)
  const timeStep = s.timeStep || 0;
  const progress = Math.min(100, Math.max(0, (timeStep / GameEngine.GAME_DURATION) * 100));

  const getGenIndicatorStyle = (unit: Unit, sub: Substation) => {
    const pmax_unit = sub.Pmax / sub.Units;
    const brightness = pmax_unit > 0 ? unit.P / pmax_unit : 0;
    let colorClass = 'bg-gray-700'; // Default for DIS
    let animationClass = '';

    switch (unit.Status) {
      case 'IN':
      case 'STARTUP':
        if (sub.Category === 'Wind') colorClass = 'bg-green-500';
        else if (sub.Category === 'Solar PV') colorClass = 'bg-yellow-500';
        else if (sub.Category === 'Nuclear Steam') colorClass = 'bg-pink-500';
        else colorClass = 'bg-gray-400';
        if (unit.Status === 'STARTUP') animationClass = 'animate-pulse';
        break;
      case 'SHUTDOWN':
        colorClass = 'bg-gray-600';
        break;
      case 'TRIP':
        colorClass = 'bg-red-500';
        break;
    }

    const opacity = unit.Status === 'IN' ? Math.max(0.2, brightness) : 1;
    return { className: `${colorClass} ${animationClass} w-2 h-2 rounded-full transition-all`, style: { opacity } };
  };

  const getLoadIndicatorStyle = (unit: Unit) => {
    let colorClass = 'bg-muted-foreground'; // Default for DIS
    switch (unit.Status) {
      case 'IN':
        colorClass = 'bg-foreground'; // Theme-aware: white on dark, black on light
        break;
      case 'TRIP':
        colorClass = 'bg-red-500';
        break;
    }
    return { className: `${colorClass} w-2 h-2 rounded-full` };
  };

  return (
    <Sidebar collapsible="none" className="group border-r border-border bg-sidebar !top-16 !h-[calc(100vh-4rem)] overflow-visible">
      <SidebarContent className="font-share-tech overflow-x-hidden">
        {/* Status Group */}
        <SidebarGroup>
          <SidebarGroupContent className="space-y-3 px-2 pt-4">
            <div className="flex items-start gap-8">
              <div className="shrink-0">
                <div id="dash-clock-label" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Day {day || 1}
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
              <div className="col-span-2">
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
              <div className="col-span-2 pt-2">
                <SidebarSeparator />
              </div>
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
              <div>
                <div className="text-xs text-muted-foreground">Nuclear</div>
                <div id="dash-nugen" className="text-lg font-bold text-pink-500">
                  {fmtMW(s.nuclearGen)}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="costs" className="mt-4">
            <div className="grid grid-cols-2 gap-x-2 gap-y-4">
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">Total Cost</div>
                <div id="dash-tcost" className="text-lg font-bold text-foreground">
                  {fmtMoneyM(s.totalCost)}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">Avg Cost</div>
                <div id="dash-avcost" className="text-lg font-bold text-foreground">
                  ${s.avgCost.toFixed(2)}/MWh
                </div>
              </div>

              <div className="col-span-2 pt-2"><SidebarSeparator /></div>

              {/* Hourly Costs */}
              <div>
                <div className="text-xs text-muted-foreground">Hourly Op</div>
                <div id="dash-cfixed" className="text-lg font-bold text-foreground">{fmtMoneyK(s.currentOpCost)}/hr</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Hourly Fuel</div>
                <div id="dash-cfuel" className="text-lg font-bold text-foreground">{fmtMoneyK(s.currentFuelCost)}/hr</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Hourly Unserved</div>
                <div id="dash-cuload" className="text-lg font-bold text-foreground">{fmtMoneyK(s.currentUnservedCost)}/hr</div>
              </div>
              <div></div> {/* Spacer */}

              {/* Daily Costs */}
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
          </TabsContent>

          <TabsContent value="lines" className="mt-4">
            <div className="max-h-[calc(100vh-22rem)] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Line</TableHead>
                    <TableHead className="text-right">State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches && Object.values(branches).length > 0 ? (
                    Object.values(branches)
                      .sort((a, b) => `${a.sub1?.Name}-${a.sub2?.Name}`.localeCompare(`${b.sub1?.Name}-${b.sub2?.Name}`))
                      .map(branch => {
                        const totalRating = branch.Pmax * branch.Circuits;
                        const loading = totalRating > 0 ? (Math.abs(branch.P) / totalRating) * 100 : 0;

                        let inServiceCircuits = 0;
                        if (branch.Status1 === 'IN') inServiceCircuits++;
                        if (branch.Circuits === 2 && branch.Status2 === 'IN') inServiceCircuits++;

                        let statusElement;
                        if (inServiceCircuits === 0) {
                          const isTripped = branch.Status1 === 'TRIP' || (branch.Circuits === 2 && branch.Status2 === 'TRIP');
                          if (isTripped) {
                            statusElement = <span className="text-xs text-red-500 font-medium">TRIPPED</span>;
                          } else {
                            statusElement = <span className="text-xs text-muted-foreground">OPEN</span>;
                          }
                        } else {
                          let barColor = 'bg-primary';
                          if (loading > 120) barColor = 'bg-orange-500';
                          else if (loading > 100) barColor = 'bg-yellow-500';
                          
                          statusElement = (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-10 rounded-full bg-muted" title={`Loading: ${loading.toFixed(0)}%`}>
                                <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(100, loading)}%` }} />
                              </div>
                              <span className="text-xs font-mono w-8 text-right">{loading.toFixed(0)}%</span>
                            </div>
                          );
                        }

                        return (
                          <TableRow key={branch.Number} className="cursor-pointer" onClick={() => onBranchSelect(branch)}>
                            <TableCell className="font-medium text-xs py-2 truncate pr-4">{branch.sub1?.Name} - {branch.sub2?.Name}</TableCell>
                            <TableCell className="py-2 text-right">{statusElement}</TableCell>
                          </TableRow>
                        );
                      })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                        No lines to show.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="subs" className="mt-4">
            <div className="max-h-[calc(100vh-22rem)] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Substation</TableHead>
                    <TableHead>Load Status</TableHead>
                    <TableHead>Supply Status</TableHead>
                    <TableHead className="text-right">Power</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs && Object.values(subs).length > 0 ? (
                    Object.values(subs)
                      .sort((a, b) => a.Name.localeCompare(b.Name))
                      .map(sub => {
                        const totalPower = sub.U.reduce((acc, unit) => acc + unit.P, 0);
                        return (
                          <TableRow key={sub.Number} className="cursor-pointer" onClick={() => onSubstationSelect(sub)}>
                            <TableCell className="font-medium text-xs py-2 truncate">{sub.Name}</TableCell>
                            <TableCell className="py-2">
                              {sub.Category === 'Load' && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {sub.U.map((unit, index) => {
                                    const { className } = getLoadIndicatorStyle(unit);
                                    return <div key={`indicator-${sub.Number}-${index}`} className={className} title={`Circuit #${index + 1}: ${unit.Status}`} />;
                                  })}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="py-2">
                              {sub.Category !== 'Load' && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {sub.U.map((unit, index) => {
                                    const { className, style } = getGenIndicatorStyle(unit, sub);
                                    return <div key={`indicator-${sub.Number}-${index}`} className={className} style={style} title={`Unit #${index + 1}: ${unit.Status} - ${unit.P.toFixed(0)} MW`} />;
                                  })}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs py-2">{totalPower.toFixed(0)} MW</TableCell>
                          </TableRow>
                        )
                      })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No substations to show.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

        </Tabs>
      </SidebarContent>
    </Sidebar>
  )
}