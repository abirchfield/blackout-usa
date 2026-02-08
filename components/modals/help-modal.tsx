"use client";

import { useState, useEffect, useRef } from "react";
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
import { Substation, Branch, Unit, SubstationCategory, BranchStatus, UnitStatus } from "@/lib/types";
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
  DollarSign,
  Clock,
  Power,
} from "lucide-react";
// --- Mock data for help examples ---

const mockSubBase: Substation = {
  Name: "Example",
  Number: "0",
  idx: 0,
  Latitude: 0,
  Longitude: 0,
  Units: 1,
  Category: SubstationCategory.Thermal,
  Pmax: 100,
  Pmin: 20,
  pmax: 100,
  pmin: 20,
  isLoad: false,
  isRenewable: false,
  FixedCost: 500,
  FuelCost: 50,
  StartTime: 60,
  Ramp: 5,
  U: []
};

const mockBranch: Branch = {
  Number: "0",
  FromNum: "1",
  ToNum: "2",
  fromIdx: 0,
  toIdx: 1,
  FromSub: "Example A",
  ToSub: "Example B",
  Status: BranchStatus.IN,
  P: 450,
  Pmax: 500,
  Z: 0.01,
  ybr: -100,
};

const generatorTypes = [
  SubstationCategory.Nuclear,
  SubstationCategory.Thermal,
  SubstationCategory.Wind,
  SubstationCategory.Solar,
];

// --- Visual example components ---

function SubstationExample({ category, fillPercent, label, sublabel }: {
  category: SubstationCategory;
  fillPercent: number;
  label: string;
  sublabel?: string;
}) {
  const isLoad = category === SubstationCategory.Load;
  const config = GenerationTypeConfig[category];
  const color = isLoad ? "var(--foreground)" : `var(${config.cssVar})`;
  const center = 24;
  const strokeWidth = 2;
  const ratio = Math.max(0, Math.min(1, fillPercent / 100));

  if (isLoad) {
    const size = 30;
    const half = size / 2;
    const x = center - half;
    const y = center - half;
    const fillHeight = size * ratio;
    const fillY = y + size - fillHeight;

    return (
      <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
        <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <rect x={x} y={y} width={size} height={size} fill="var(--background)" />
          {ratio > 0 && (
            <rect x={x} y={fillY} width={size} height={fillHeight} fill={color} />
          )}
          <rect x={x} y={y} width={size} height={size} fill="none" stroke={color} strokeWidth={strokeWidth} />
        </svg>
        <div className="text-center">
          <p className="text-xs font-medium">{label}</p>
          {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
        </div>
      </div>
    );
  }

  const outerRadius = 20;
  const innerRadius = outerRadius / 1.2;
  const endAngle = -Math.PI / 2 + (Math.PI * 2 * ratio);
  const isFullCircle = ratio >= 1;

  const x = center + innerRadius * Math.cos(-Math.PI / 2);
  const y = center + innerRadius * Math.sin(-Math.PI / 2);
  const x2 = center + innerRadius * Math.cos(endAngle);
  const y2 = center + innerRadius * Math.sin(endAngle);
  const largeArcFlag = ratio > 0.5 ? 1 : 0;
  const piePath = `M${center},${center} L${x},${y} A${innerRadius},${innerRadius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx={center} cy={center} r={outerRadius} fill={color} stroke={color} strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={innerRadius} fill="var(--background)" />
        {ratio > 0 && (
          isFullCircle
            ? <circle cx={center} cy={center} r={innerRadius} fill={color} />
            : <path d={piePath} fill={color} />
        )}
        <circle cx={center} cy={center} r={innerRadius} fill="none" stroke={color} strokeWidth={strokeWidth} />
      </svg>
      <div className="text-center">
        <p className="text-xs font-medium">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}

function LineExampleNew({ status, label, showFlow }: {
  status: 'normal' | 'overloaded' | 'critical' | 'tripped' | 'out';
  label: string;
  showFlow?: boolean;
}) {
  const getLineStyle = () => {
    switch (status) {
      case 'normal':
        return { stroke: 'var(--foreground)', dasharray: 'none' };
      case 'overloaded':
        return { stroke: 'var(--color-warning)', dasharray: 'none' };
      case 'critical':
        return { stroke: 'var(--color-overload-critical)', dasharray: '8,4' };
      case 'tripped':
        return { stroke: 'var(--color-tripped)', dasharray: '5,5' };
      case 'out':
        return { stroke: 'var(--foreground)', dasharray: '5,5' };
      default:
        return { stroke: 'var(--foreground)', dasharray: 'none' };
    }
  };

  const style = getLineStyle();

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
      <div className="w-16 h-6 flex items-center justify-center">
        <svg width="100%" height="6" viewBox="0 0 64 6" className="overflow-visible">
          <line
            x1="0" y1="3" x2="64" y2="3"
            stroke={style.stroke}
            strokeWidth="3"
            strokeDasharray={style.dasharray}
            strokeLinecap="round"
          />
          {showFlow && status === 'normal' && (
            <>
              <circle cx="16" cy="3" r="2.5" fill="var(--color-power-flow)" />
              <circle cx="32" cy="3" r="2.5" fill="var(--color-power-flow)" />
              <circle cx="48" cy="3" r="2.5" fill="var(--color-power-flow)" />
            </>
          )}
        </svg>
      </div>
      <p className="text-xs font-medium text-center">{label}</p>
    </div>
  );
}

// --- Interactive circuit demo for help page ---

function InteractiveCircuitDemo() {
  const RAMP_RATE = 30;      // MW per tick
  const TICK_MS = 100;
  const TARGET_FLOW = 450;   // MW when in-service

  const [branch, setBranch] = useState<Branch>({ ...mockBranch });
  const rampRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Ramp flow toward target (TARGET_FLOW when IN, 0 when DIS)
  useEffect(() => {
    clearInterval(rampRef.current);
    const target = branch.Status === BranchStatus.IN ? TARGET_FLOW : 0;
    if (Math.abs(branch.P - target) < 0.5) return;
    rampRef.current = setInterval(() => {
      setBranch(prev => {
        const t = prev.Status === BranchStatus.IN ? TARGET_FLOW : 0;
        if (Math.abs(prev.P - t) < 0.5) return { ...prev, P: t };
        const step = Math.min(Math.abs(t - prev.P), RAMP_RATE);
        return { ...prev, P: +(prev.P + Math.sign(t - prev.P) * step).toFixed(1) };
      });
    }, TICK_MS);
    return () => clearInterval(rampRef.current);
  }, [branch.Status, branch.P]);

  return (
    <CircuitTable
      branch={branch}
      onBranchAction={() => {
        setBranch(prev => {
          if (prev.Status === BranchStatus.IN) return { ...prev, Status: BranchStatus.DIS };
          if (prev.Status === BranchStatus.DIS) return { ...prev, Status: BranchStatus.IN };
          return prev;
        });
      }}
    />
  );
}

// --- Interactive generator demo for help page ---

function InteractiveGeneratorDemo() {
  const DEMO_START_TIME = 5; // short startup for snappy demo
  const TICK_MS = 600;

  const initialUnit: Unit = {
    Status: UnitStatus.DIS, P: 0, Pset: 0, P0: 0,
    Status0: UnitStatus.DIS, StatusCount: 0,
    Pmax: 100, Pmin: 20, Ramp: 5, StartTime: DEMO_START_TIME,
    FixedCost: 500, FuelCost: 50,
  };

  const [unit, setUnit] = useState<Unit>(initialUnit);
  const [setpointVal, setSetpointVal] = useState(0);
  const rampRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Transition countdown (startup / shutdown)
  useEffect(() => {
    if (unit.Status !== UnitStatus.STARTUP && unit.Status !== UnitStatus.SHUTDOWN) return;
    const id = setInterval(() => {
      setUnit(prev => {
        const next = prev.StatusCount + 1;
        if (next >= prev.StartTime) {
          if (prev.Status === UnitStatus.STARTUP) {
            return { ...prev, Status: UnitStatus.IN, StatusCount: 0, P: prev.Pmin, Pset: prev.Pmin };
          }
          return { ...prev, Status: UnitStatus.DIS, StatusCount: 0, P: 0, Pset: 0 };
        }
        return { ...prev, StatusCount: next };
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [unit.Status]);

  // Sync slider when coming online / going offline
  useEffect(() => {
    if (unit.Status === UnitStatus.IN) setSetpointVal(unit.Pmin);
    if (unit.Status === UnitStatus.DIS) setSetpointVal(0);
  }, [unit.Status, unit.Pmin]);

  // Ramp output toward setpoint
  useEffect(() => {
    clearInterval(rampRef.current);
    if (unit.Status !== UnitStatus.IN) return;
    rampRef.current = setInterval(() => {
      setUnit(prev => {
        if (prev.Status !== UnitStatus.IN || Math.abs(prev.P - prev.Pset) < 0.5) return prev;
        const step = Math.min(Math.abs(prev.Pset - prev.P), prev.Ramp);
        return { ...prev, P: +(prev.P + Math.sign(prev.Pset - prev.P) * step).toFixed(1) };
      });
    }, 150);
    return () => clearInterval(rampRef.current);
  }, [unit.Status]);

  const demoSub: Substation = { ...mockSubBase, StartTime: DEMO_START_TIME, U: [unit] };

  return (
    <GeneratorUnitsTable
      sub={demoSub}
      onUnitAction={() => {
        setUnit(prev => {
          if (prev.Status === UnitStatus.DIS) return { ...prev, Status: UnitStatus.STARTUP, StatusCount: 0 };
          if (prev.Status === UnitStatus.IN) return { ...prev, Status: UnitStatus.SHUTDOWN, StatusCount: 0 };
          return prev;
        });
      }}
      onAbortTransition={() => {
        setUnit(prev => {
          if (prev.Status === UnitStatus.STARTUP) return { ...prev, Status: UnitStatus.DIS, StatusCount: 0, P: 0, Pset: 0 };
          if (prev.Status === UnitStatus.SHUTDOWN) return { ...prev, Status: UnitStatus.IN, StatusCount: 0 };
          return prev;
        });
      }}
      onSetSetpoint={(_sid, _idx, val) => {
        setSetpointVal(val);
        setUnit(prev => ({ ...prev, Pset: val }));
      }}
      setpoints={{ 0: setpointVal }}
      onSetpointChange={(_idx, val) => {
        setSetpointVal(val);
        setUnit(prev => ({ ...prev, Pset: val }));
      }}
      isPaused={false}
    />
  );
}

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
                  <p className="text-sm"><span className="font-semibold">Keep customers powered</span> <span className="text-muted-foreground">— If generation falls short, frequency drops and blackouts follow.</span></p>
                </div>
                <div className="flex items-start gap-2.5">
                  <DollarSign className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm"><span className="font-semibold">Keep costs low</span> <span className="text-muted-foreground">— Only start expensive plants when you need them.</span></p>
                </div>
              </div>
            </div>

            <div>
              <SectionLabel>Help Along the Way</SectionLabel>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2.5">
                  <Bell className="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm"><span className="font-semibold">Alerts</span> <span className="text-muted-foreground">— Warn about problems: overloaded lines, low reserves, trips.</span></p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="h-4 w-4 text-[var(--color-hint)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm"><span className="font-semibold">Hints</span> <span className="text-muted-foreground">— Suggest actions you can take to improve the situation.</span></p>
                </div>
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
          {/* Visual examples — side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 items-start">
            <div>
              <SectionLabel>Generators (Circles)</SectionLabel>
              <p className="text-xs text-muted-foreground mb-2">
                Produce electricity. Colored ring = fuel type. Pie fill = output level.
              </p>
              <div className="grid grid-cols-4 gap-1 justify-items-center">
                {generatorTypes.map((cat) => (
                  <SubstationExample
                    key={cat}
                    category={cat}
                    fillPercent={65}
                    label={GenerationTypeConfig[cat].name}
                  />
                ))}
              </div>
            </div>
            <div>
              <SectionLabel>Loads (Squares)</SectionLabel>
              <p className="text-xs text-muted-foreground mb-2">
                Consume electricity. Fill level = how much demand is being served.
              </p>
              <div className="flex gap-3 justify-center">
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
            </div>
          </div>

          {/* Type descriptions — aligned in their own grid row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
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

          <div className="rounded-lg border p-3 bg-card/50 text-sm">
            <span className="font-semibold">Tip</span> <span className="text-muted-foreground">— Click any substation on the map to open its control panel.
            For generators, you can start/stop units and adjust output.
            For loads, you can see demand and shed load in emergencies.</span>
          </div>
        </div>
      ),
    },

    // ── Page 2: Generator Controls ──
    {
      title: "Generator Controls",
      icon: Settings,
      subtitle: "Click any generator substation to open its controls. Try the interactive demo below.",
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

          <div className="border-t pt-3">
            <SectionLabel>Interactive Demo</SectionLabel>
            <p className="text-xs text-muted-foreground mb-2">
              Click the power button to start the unit. Once online, drag the slider to set output. Click power again to shut down.
            </p>
            <div className="border rounded-lg overflow-hidden bg-background/50">
              <InteractiveGeneratorDemo />
            </div>
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
            <SectionLabel>Interactive Demo</SectionLabel>
            <p className="text-xs text-muted-foreground mb-2">
              Click the button to open or close the line. Watch flow and loading update in real time.
            </p>
            <div className="border rounded-lg overflow-hidden bg-background/50">
              <InteractiveCircuitDemo />
            </div>
          </div>

          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
            <p className="text-sm">
              <span className="font-semibold">Cascading failures</span> <span className="text-muted-foreground">— When a line trips, its power redistributes to other lines.
              This can push them over capacity too, a chain reaction that can black out entire regions.</span>
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
        <div className="space-y-4">
          {/* Mock Hero Stats — replica of the actual sidebar top bar */}
          <div>
            <SectionLabel>Key Indicators</SectionLabel>
            <p className="text-xs text-muted-foreground mb-2">
              These three numbers sit at the top of the sidebar. They tell you the health of the grid at a glance.
            </p>
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-card/50 p-3">
              <div>
                <div className="text-[0.6rem] text-muted-foreground/60 uppercase tracking-wider font-bold">Frequency</div>
                <div className="text-lg sm:text-xl font-numeric font-bold text-foreground">60.00<span className="text-[0.6em] opacity-50 ml-[0.15em]">Hz</span></div>
              </div>
              <div>
                <div className="text-[0.6rem] text-muted-foreground/60 uppercase tracking-wider font-bold">Total Gen.</div>
                <div className="text-lg sm:text-xl font-numeric font-bold text-foreground">6.97<span className="text-[0.6em] opacity-50 ml-[0.15em]">GW</span></div>
              </div>
              <div>
                <div className="text-[0.6rem] text-muted-foreground/60 uppercase tracking-wider font-bold">Reserves</div>
                <div className="text-lg sm:text-xl font-numeric font-bold text-foreground">938<span className="text-[0.6em] opacity-50 ml-[0.15em]">MW</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 items-start">
            {/* Left: Frequency thresholds */}
            <div>
              <SectionLabel>Frequency Thresholds</SectionLabel>
              <p className="text-xs text-muted-foreground mb-2">
                Frequency reflects supply vs. demand balance. When generation falls short, frequency drops.
              </p>
              <div className="space-y-1 text-xs">
                {([
                  { value: "60.00", color: "text-[var(--color-status-in)]", dot: "bg-[var(--color-status-in)]", label: "Stable — system balanced" },
                  { value: "< 59.85", color: "text-[var(--color-warning)]", dot: "bg-[var(--color-warning)]", label: "Warning — start backup units" },
                  { value: "< 59.70", color: "text-destructive", dot: "bg-destructive", label: "Danger — loss of load imminent" },
                  { value: "< 58.00", color: "text-destructive", dot: "bg-destructive", label: "Blackout — grid collapses" },
                ] as const).map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", t.dot)} />
                    <span className={cn("font-numeric font-bold w-14 text-right shrink-0", t.color)}>{t.value}</span>
                    <span className="text-muted-foreground">{t.label}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border p-2.5 bg-card/50 text-xs mt-3">
                <span className="font-semibold">Reserves</span> <span className="text-muted-foreground">— Keep at least <strong className="text-foreground font-numeric">500 MW</strong> of spare capacity to absorb sudden trips or demand spikes.</span>
              </div>
            </div>

            {/* Right: Generation bars + costs */}
            <div className="space-y-3">
              <div>
                <SectionLabel>Generation Bars</SectionLabel>
                <p className="text-xs text-muted-foreground mb-2">
                  Each fuel type shows current output (solid) and available capacity (faded).
                </p>
                <div className="space-y-1.5">
                  {([
                    { type: SubstationCategory.Nuclear, output: 70, capacity: 85 },
                    { type: SubstationCategory.Thermal, output: 55, capacity: 90 },
                    { type: SubstationCategory.Solar, output: 30, capacity: 30 },
                    { type: SubstationCategory.Wind, output: 60, capacity: 65 },
                  ] as const).map(({ type, output, capacity }) => {
                    const config = GenerationTypeConfig[type];
                    const Icon = config.icon;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", config.tailwind.text)} aria-hidden="true" />
                        <span className="text-[11px] text-muted-foreground/60 w-14 shrink-0">{config.name}</span>
                        <div className="h-2.5 flex-1 rounded-full bg-foreground/10">
                          <div className="h-2.5 flex rounded-full overflow-hidden" style={{ width: `${capacity}%` }}>
                            <div className={cn("h-full", config.tailwind.bg)} style={{ width: `${(output / capacity) * 100}%` }} />
                            <div className={cn("h-full opacity-30", config.tailwind.bg)} style={{ width: `${((capacity - output) / capacity) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border p-2.5 bg-card/50 text-xs mt-2">
                <span className="font-semibold">Costs</span> <span className="text-muted-foreground">— Each running unit charges a <strong className="text-foreground">fixed cost</strong> per hour plus a <strong className="text-foreground">fuel cost</strong> per MW. Unserved load incurs a steep <strong className="text-foreground">penalty</strong>. Your goal is to minimize total cost while keeping the lights on.</span>
              </div>
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold leading-tight">Start units early</p>
                <p className="text-xs text-muted-foreground mt-0.5">Thermal units take minutes to warm up. Begin startup before demand peaks.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Power className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold leading-tight">Shut down idle units</p>
                <p className="text-xs text-muted-foreground mt-0.5">Every running generator has a fixed cost. Turn off what you don&apos;t need.</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3 bg-card/50">
            <SectionLabel>Keyboard Shortcuts</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
              <div><Badge variant="secondary" className="mr-1.5 font-mono text-[10px]">Space</Badge> Pause / Resume</div>
              <div><Badge variant="secondary" className="mr-1.5 font-mono text-[10px]">F</Badge> Fast forward (10x)</div>
              <div><Badge variant="secondary" className="mr-1.5 font-mono text-[10px]">E</Badge> Emergency load shed</div>
              <div><Badge variant="secondary" className="mr-1.5 font-mono text-[10px]">L</Badge> Trip overloaded line</div>
              <div><Badge variant="secondary" className="mr-1.5 font-mono text-[10px]">K</Badge> Shed smallest load</div>
              <div><Badge variant="secondary" className="mr-1.5 font-mono text-[10px]">R</Badge> Ramp up generation</div>
              <div><Badge variant="secondary" className="mr-1.5 font-mono text-[10px]">C</Badge> Center on selection</div>
              <div><Badge variant="outline" className="mr-1.5 text-[10px]">Click + Drag</Badge> Pan</div>
              <div><Badge variant="outline" className="mr-1.5 text-[10px]">Scroll</Badge> Zoom</div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const totalPages = helpPages.length;

  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 0));

  // Reset to first page when modal opens
  useEffect(() => {
    if (open) {
      setCurrentPage(0);
    }
  }, [open]);

  const PageIcon = helpPages[currentPage].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="help-modal" className="sm:max-w-3xl font-sans max-h-[85vh] flex flex-col" overlayClassName="bg-black/70">
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
