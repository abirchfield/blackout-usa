"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GeneratorUnitsTable } from "@/components/tables/unit-table";
import { CircuitTable } from "@/components/tables/circuit-table";
import { SubstationCategory, UnitStatus } from "@/lib/types";
import { GenerationTypeConfig, LoadTypeConfig, StatusConfig } from "@/components/theme";
import { cn } from "@/lib/utils";
import {
  Bell,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Target,
  Zap,
  Activity,
  Settings,
  TrendingUp,
} from "lucide-react";
import {
  SubstationExample,
  LineExampleNew,
  mockSubInService,
  mockSubOutOfService,
  mockSubStartup,
  mockBranch,
  generatorTypes,
} from "@/components/modals/help-examples";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PageDot({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-2.5 h-2.5 rounded-full transition-all",
        active
          ? "bg-primary scale-110"
          : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
      )}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h5 className="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-bold mb-2">{children}</h5>
  );
}

const statusDescriptions: Record<UnitStatus, string> = {
  [UnitStatus.IN]: "Generating power",
  [UnitStatus.DIS]: "Offline — click to start",
  [UnitStatus.STARTUP]: "Warming up",
  [UnitStatus.SHUTDOWN]: "Powering down",
  [UnitStatus.TRIP]: "Faulted — cannot restart",
};

const genDesc: Record<string, string> = {
  Nuclear: "Baseload. Slow startup, lowest fuel cost.",
  Thermal: "Workhorse. Moderate startup, adjustable.",
  Wind: "Free fuel. Output varies with conditions.",
  Solar: "Free fuel. Drops to zero after sunset.",
};

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [demoSetpoint, setDemoSetpoint] = useState(65);

  const helpPages = [
    // ── Page 0: Welcome ──
    {
      title: "Welcome",
      icon: Target,
      subtitle: "You're the operator of a simulated Texas power grid. Your job: keep the lights on.",
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed">
            In this simulation, you manage <strong>power plants</strong> that produce electricity
            and <strong>transmission lines</strong> that deliver it across Texas. You decide which
            generators to run, how much power each should produce, and how to respond when equipment
            fails or demand changes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            <div>
              <SectionLabel>Your Two Goals</SectionLabel>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2.5">
                  <Zap className="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span><strong>Keep customers powered.</strong> If generation falls short, frequency drops and blackouts follow.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span><strong>Keep costs low.</strong> Some generators cost less to run. Only start expensive plants when you need them.</span>
                </div>
              </div>
            </div>

            <div>
              <SectionLabel>Getting Around</SectionLabel>
              <ul className="space-y-1.5 text-sm">
                <li><Badge variant="outline" className="mr-1.5 text-[10px]">Click + Drag</Badge> Pan the map</li>
                <li><Badge variant="outline" className="mr-1.5 text-[10px]">Scroll</Badge> Zoom in / out</li>
                <li><Badge variant="outline" className="mr-1.5 text-[10px]">Click</Badge> Select a substation or line</li>
                <li><Badge variant="secondary" className="mr-1.5 font-mono text-[10px]">Space</Badge> Pause / Resume</li>
                <li><Badge variant="secondary" className="mr-1.5 font-mono text-[10px]">F</Badge> Fast forward (10x speed)</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-3">
            <SectionLabel>Help Along the Way</SectionLabel>
            <div className="grid grid-cols-2 gap-x-5 text-sm">
              <div className="flex items-start gap-2.5">
                <Bell className="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>Alerts</strong> warn about problems — overloaded lines, low reserves, trips.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Lightbulb className="h-4 w-4 text-[var(--color-hint)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span><strong>Hints</strong> suggest actions you can take to improve the situation.</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // ── Page 1: The Grid ──
    {
      title: "The Grid",
      icon: Zap,
      subtitle: "Substations are the building blocks of the grid. They either generate or consume power.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {/* Generators column */}
            <div>
              <SectionLabel>Generators (Circles)</SectionLabel>
              <p className="text-xs text-muted-foreground mb-2">
                Produce electricity. Colored ring = fuel type. Pie fill = output level.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-3">
                {generatorTypes.map((cat) => (
                  <SubstationExample
                    key={cat}
                    category={cat}
                    fillPercent={65}
                    label={GenerationTypeConfig[cat].name}
                  />
                ))}
              </div>
              <div className="space-y-1">
                {generatorTypes.map(cat => {
                  const config = GenerationTypeConfig[cat];
                  const Icon = config.icon;
                  return (
                    <div key={cat} className="flex items-start gap-2 py-0.5">
                      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", config.tailwind.text)} aria-hidden="true" />
                      <p className="text-xs">
                        <span className="font-semibold">{config.name}</span>
                        <span className="text-muted-foreground"> — {genDesc[config.name]}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Loads column */}
            <div>
              <SectionLabel>Loads (Squares)</SectionLabel>
              <p className="text-xs text-muted-foreground mb-2">
                Consume electricity. Fill level = how much demand is being served.
              </p>
              <div className="flex flex-wrap gap-4 justify-center mb-3">
                <SubstationExample
                  category={SubstationCategory.Load}
                  fillPercent={85}
                  label="Served"
                  sublabel="Receiving power"
                />
                <SubstationExample
                  category={SubstationCategory.Load}
                  fillPercent={0}
                  label="Blacked Out"
                  sublabel="No power"
                />
              </div>
              <div className="space-y-1">
                {Object.values(LoadTypeConfig).map(config => {
                  const Icon = config.icon;
                  return (
                    <div key={config.name} className="flex items-start gap-2 py-0.5">
                      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", config.tailwind.text)} aria-hidden="true" />
                      <p className="text-xs">
                        <span className="font-semibold">{config.name}</span>
                        <span className="text-muted-foreground"> — {config.description}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3 bg-card/50 text-sm">
            <strong>Tip:</strong> Click any substation on the map to open its control panel.
            For generators, you can start/stop units and adjust output.
            For loads, you can see demand and shed load in emergencies.
          </div>
        </div>
      ),
    },

    // ── Page 2: Generator Controls ──
    {
      title: "Generator Controls",
      icon: Settings,
      subtitle: "Click any generator substation to open its controls. Here's how the unit table works.",
      content: (
        <div className="space-y-3">
          <div>
            <SectionLabel>Unit Status</SectionLabel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {([UnitStatus.IN, UnitStatus.DIS, UnitStatus.STARTUP, UnitStatus.SHUTDOWN, UnitStatus.TRIP] as UnitStatus[]).map(status => {
                const config = StatusConfig[status];
                const Icon = config.icon;
                return (
                  <div key={status} className="flex items-center gap-2 py-1">
                    <Icon className={cn("h-4 w-4 flex-shrink-0", config.tailwind.text)} aria-hidden="true" />
                    <span className="text-xs"><span className="font-semibold">{config.label}</span> <span className="text-muted-foreground">— {statusDescriptions[status]}</span></span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-2">
            <SectionLabel>In-Service — Adjust Output</SectionLabel>
            <div className="border rounded-lg overflow-hidden bg-background/50">
              <GeneratorUnitsTable
                sub={mockSubInService}
                onUnitAction={() => {}}
                onSetSetpoint={(_subId, _idx, val) => setDemoSetpoint(val)}
                setpoints={{ 0: demoSetpoint }}
                onSetpointChange={(_idx, val) => setDemoSetpoint(val)}
                isPaused={false}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Drag the slider to change the target output. The unit ramps at its rated speed.</p>
          </div>

          <div>
            <SectionLabel>Out-of-Service — Start Up</SectionLabel>
            <div className="border rounded-lg overflow-hidden bg-background/50">
              <GeneratorUnitsTable
                sub={mockSubOutOfService}
                onUnitAction={() => {}}
                onSetSetpoint={() => {}}
                setpoints={{ 0: 20 }}
                onSetpointChange={() => {}}
                isPaused={false}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Click the power button to begin the startup sequence.</p>
          </div>

          <div>
            <SectionLabel>Starting Up — Wait or Abort</SectionLabel>
            <div className="border rounded-lg overflow-hidden bg-background/50">
              <GeneratorUnitsTable
                sub={mockSubStartup}
                onUnitAction={() => {}}
                onAbortTransition={() => {}}
                onSetSetpoint={() => {}}
                setpoints={{ 0: 20 }}
                onSetpointChange={() => {}}
                isPaused={false}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Countdown shows time remaining. Click the X to abort.</p>
          </div>
        </div>
      ),
    },

    // ── Page 3: Transmission Lines ──
    {
      title: "Transmission Lines",
      icon: Activity,
      subtitle: "Lines carry power between substations. Overloaded lines can trip and cause cascading failures.",
      content: (
        <div className="space-y-4">
          <div>
            <SectionLabel>Line Appearance on Map</SectionLabel>
            <p className="text-xs text-muted-foreground mb-2">
              Power flows automatically based on physics. Lines have a capacity rating — if exceeded, they can trip.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <LineExampleNew status="normal" label="Normal" showFlow />
              <LineExampleNew status="overloaded" label="Overloaded" />
              <LineExampleNew status="critical" label="Critical" />
              <LineExampleNew status="tripped" label="Tripped" />
              <LineExampleNew status="out" label="Out-of-Service" />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Above 100%: yellow. Above 120%: red with dashing. Tripped: disconnected.
            </p>
          </div>

          <div className="border-t pt-3">
            <SectionLabel>Circuit Controls</SectionLabel>
            <p className="text-xs text-muted-foreground mb-2">
              Click a line on the map to see its circuits. Lines have 1–2 circuits, each toggleable independently.
            </p>
            <div className="border rounded-lg overflow-hidden bg-background/50">
              <CircuitTable branch={mockBranch} onCircuitAction={() => {}} />
            </div>
          </div>

          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
            <p className="text-sm">
              <strong>Cascading failures:</strong> When a line trips, its power redistributes to other lines.
              This can push them over capacity too — a chain reaction that can black out entire regions.
            </p>
          </div>
        </div>
      ),
    },

    // ── Page 4: Dashboard ──
    {
      title: "Dashboard",
      icon: TrendingUp,
      subtitle: "How to read the sidebar and know when to act.",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {/* Left: Critical Indicators */}
          <div className="space-y-3">
            <div>
              <SectionLabel>Frequency</SectionLabel>
              <p className="text-xs text-muted-foreground mb-1.5">
                Shows whether generation matches load. When balanced, frequency stays
                at 60 Hz. A drop means you need more generation or less load.
              </p>
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold tabular-nums text-foreground w-14 text-right">60.00</span>
                  <span className="text-muted-foreground">Stable — system balanced</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold tabular-nums text-[var(--color-warning)] w-14 text-right">{"< 59.85"}</span>
                  <span className="text-muted-foreground">Warning — start backup units</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold tabular-nums text-destructive w-14 text-right">{"< 59.70"}</span>
                  <span className="text-muted-foreground">Danger — loss of load imminent</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold tabular-nums text-destructive w-14 text-right">{"< 40.00"}</span>
                  <span className="text-muted-foreground">Blackout — grid collapses</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-2">
              <SectionLabel>Reserves</SectionLabel>
              <p className="text-xs text-muted-foreground">
                Spare generation capacity above current load. Acts as a safety buffer.
                Keep above <strong className="text-foreground">500 MW</strong> to absorb
                sudden changes like a line tripping or generation dropping.
              </p>
            </div>

            <div className="border-t pt-2">
              <SectionLabel>Total Generation</SectionLabel>
              <p className="text-xs text-muted-foreground">
                Sum of all online generators. Should stay close to total load.
                Too low and frequency drops. Too high and you waste fuel.
              </p>
            </div>
          </div>

          {/* Right: Performance */}
          <div className="space-y-3">
            <div>
              <SectionLabel>Generation Bars</SectionLabel>
              <p className="text-xs text-muted-foreground mb-1.5">
                Each bar in the sidebar shows one fuel type&apos;s output vs. its total available capacity.
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-20 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Solid = current output</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-20 rounded-full bg-primary/30" />
                  <span className="text-muted-foreground">Faded = available but unused capacity</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                A long faded section means you have room to bring more online.
                A bar that&apos;s all solid means that fuel type is maxed out.
              </p>
            </div>

            <div className="border-t pt-2">
              <SectionLabel>Costs</SectionLabel>
              <p className="text-xs text-muted-foreground mb-1.5">
                The sidebar tracks spending during your shift. Three factors drive cost:
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex gap-2">
                  <span className="font-semibold text-foreground shrink-0">Fixed cost</span>
                  <span className="text-muted-foreground">— paid for every running unit, regardless of output</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-foreground shrink-0">Fuel cost</span>
                  <span className="text-muted-foreground">— per MW generated, varies by fuel type</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-foreground shrink-0">Unserved penalty</span>
                  <span className="text-muted-foreground">— per MW of unmet demand (very expensive)</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                It is almost always cheaper to run an extra generator than to leave
                customers without power.
              </p>
            </div>
          </div>
        </div>
      ),
    },

    // ── Page 5: Tips & Strategy ──
    {
      title: "Tips & Strategy",
      icon: Lightbulb,
      subtitle: "Practical advice for keeping the lights on and costs down.",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <SectionLabel>Keeping the Lights On</SectionLabel>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <Zap className="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Maintain 500+ MW reserves</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This buffer absorbs sudden changes like a line tripping or generation dropping.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Zap className="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Start units early</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Thermal units take minutes to warm up. Begin startup before demand peaks.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Zap className="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Watch overloaded lines</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Yellow or red lines can trip at any moment, causing cascading failures.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Zap className="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Read the alerts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">The bell icon warns you before problems become emergencies.</p>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <SectionLabel>Minimizing Costs</SectionLabel>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Use zero-cost fuel sources</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Wind and solar have no fuel charges — use them whenever they&apos;re available.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Shut down idle units</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Every running generator has a fixed cost. Turn off what you don&apos;t need.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Avoid unserved load</p>
                  <p className="text-xs text-muted-foreground mt-0.5">The penalty for dropping customers is far more expensive than any generator.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold leading-tight">Match generation to load</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Excess generation wastes fuel. Keep output balanced with demand.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  const totalPages = helpPages.length;

  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 0));

  // Reset generator demo when leaving that page
  const GENERATOR_CONTROLS_PAGE = 2;
  useEffect(() => {
    if (!open || currentPage !== GENERATOR_CONTROLS_PAGE) {
      setDemoSetpoint(65);
    }
  }, [open, currentPage]);

  // Reset to first page when modal opens
  useEffect(() => {
    if (open) {
      setCurrentPage(0);
    }
  }, [open]);

  const PageIcon = helpPages[currentPage].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="help-modal" className="sm:max-w-3xl font-share-tech max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <PageIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            {helpPages[currentPage].title}
          </DialogTitle>
          <DialogDescription>
            {helpPages[currentPage].subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-1">
          {helpPages[currentPage].content}
        </div>

        <div className="flex-shrink-0 pt-3 border-t">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1.5" role="navigation" aria-label="Help pages">
              {helpPages.map((page, idx) => (
                <PageDot
                  key={idx}
                  active={idx === currentPage}
                  onClick={() => setCurrentPage(idx)}
                  label={`Go to ${page.title}`}
                />
              ))}
            </div>

            {currentPage < totalPages - 1 ? (
              <Button size="sm" onClick={goToNextPage} className="gap-1">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Get Started
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
