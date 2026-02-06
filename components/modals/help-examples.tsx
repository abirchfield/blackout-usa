"use client";

import { Substation, Branch, UnitStatus, SubstationCategory, BranchStatus } from "@/lib/types";
import { GenerationTypeConfig } from "@/components/theme";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Bell, Lightbulb } from "lucide-react";

// --- Mock data for help modal examples ---

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
  FixedCost: 500,
  FuelCost: 50,
  StartTime: 60,
  Ramp: 5,
  U: []
};

export const mockSubInService: Substation = {
  ...mockSubBase,
  U: [{ Status: UnitStatus.IN, P: 65, Pset: 65, P0: 65, Status0: UnitStatus.IN, StatusCount: 0 }]
};

export const mockSubOutOfService: Substation = {
  ...mockSubBase,
  U: [{ Status: UnitStatus.DIS, P: 0, Pset: 0, P0: 0, Status0: UnitStatus.DIS, StatusCount: 0 }]
};

export const mockSubStartup: Substation = {
  ...mockSubBase,
  U: [{ Status: UnitStatus.STARTUP, P: 0, Pset: 0, P0: 0, Status0: UnitStatus.DIS, StatusCount: 30 }]
};

export const mockBranch: Branch = {
  Number: "0",
  FromNum: "1",
  ToNum: "2",
  fromIdx: 0,
  toIdx: 1,
  FromSub: "Example A",
  ToSub: "Example B",
  Circuits: 2,
  Status1: BranchStatus.IN,
  Status2: BranchStatus.DIS,
  P: 450,
  Pmax: 500,
  Z: 0.01,
  ybr: -100,
};

// --- Substation Visual Examples ---
// Generators = circles with colored outer ring + pie fill (matching SVG drawer)
// Loads = squares with bottom-up rectangular fill (matching SVG drawer)

interface SubstationExampleProps {
  category: SubstationCategory;
  fillPercent: number;
  label: string;
  sublabel?: string;
}

export function SubstationExample({ category, fillPercent, label, sublabel }: SubstationExampleProps) {
  const isLoad = category === SubstationCategory.Load;
  const config = GenerationTypeConfig[category];
  const color = isLoad ? "var(--foreground)" : `var(${config.cssVar})`;
  const center = 24;
  const strokeWidth = 2;
  const ratio = Math.max(0, Math.min(1, fillPercent / 100));

  if (isLoad) {
    // Loads are squares with bottom-up fill
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

  // Generators are circles with colored outer ring + pie fill
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

// --- Line/Branch Examples ---

interface LineExampleProps {
  status: 'normal' | 'overloaded' | 'critical' | 'tripped' | 'out';
  label: string;
  showFlow?: boolean;
}

export function LineExampleNew({ status, label, showFlow }: LineExampleProps) {
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

// --- Legend Row ---

export function LegendRow({ icon: Icon, name, description, colorClass }: { icon: React.ElementType, name: string, description: string, colorClass: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", colorClass)} aria-hidden="true" />
      <div className="min-w-0">
        <span className="font-semibold text-sm">{name}</span>
        <span className="text-xs text-muted-foreground ml-2">{description}</span>
      </div>
    </div>
  );
}

// --- Frequency Display (matches KeyStats component style) ---

export function FrequencyDisplay({ freq, label }: { freq: number, label: string }) {
  const getColor = () => {
    if (freq < 59.7 || freq > 60.3) return "text-destructive";
    if (freq < 59.85 || freq > 60.15) return "text-[var(--color-warning)]";
    return "text-foreground";
  };

  return (
    <div>
      <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-bold">{label}</div>
      <div className={cn("text-2xl font-bold tabular-nums", getColor())}>
        {freq.toFixed(2)} <span className="text-base text-muted-foreground">Hz</span>
      </div>
    </div>
  );
}

// --- Dashboard Stat Card (matches KeyStats component style) ---

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ label, value, unit, variant = 'default' }: StatCardProps) {
  const colorMap = {
    default: 'text-foreground',
    success: 'text-foreground',
    warning: 'text-[var(--color-warning)]',
    danger: 'text-destructive',
  };

  return (
    <div>
      <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-bold">{label}</div>
      <div className={cn("text-xl font-bold tabular-nums", colorMap[variant])}>
        {value}{unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
      </div>
    </div>
  );
}

// --- Circuit Status Example ---

export function CircuitExample({ circuitNum, status, flow, rating }: { circuitNum: number, status: BranchStatus, flow: number, rating: number }) {
  const loading = rating > 0 ? (Math.abs(flow) / rating) * 100 : 0;
  const statusLabel = status === BranchStatus.IN ? 'In-Service' : status === BranchStatus.DIS ? 'Out-of-Service' : 'Tripped';
  const statusIcon = status === BranchStatus.IN ? CheckCircle2 : status === BranchStatus.DIS ? XCircle : AlertTriangle;
  const StatusIcon = statusIcon;

  const getLoadingColor = () => {
    if (loading > 100) return 'bg-destructive';
    if (loading > 80) return 'bg-[var(--color-warning)]';
    return 'bg-primary';
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <Badge variant="outline" className="font-mono text-xs">#{circuitNum}</Badge>
      <div className="flex items-center gap-1.5">
        <StatusIcon className={cn("h-4 w-4", status === BranchStatus.IN ? "text-[var(--color-status-in)]" : status === BranchStatus.TRIP ? "text-destructive" : "text-muted-foreground")} />
        <span className="text-xs">{statusLabel}</span>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", getLoadingColor())} style={{ width: `${Math.min(100, loading)}%` }} />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{loading.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// --- Notification Example (matches real notification list items) ---

export function NotificationExample({ type, message, time }: { type: 'alert' | 'hint', message: string, time?: string }) {
  const Icon = type === 'alert' ? Bell : Lightbulb;
  const iconColor = type === 'alert' ? 'text-[var(--color-warning)]' : 'text-[var(--color-hint)]';

  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-b-0">
      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", iconColor)} aria-hidden="true" />
      <Badge variant="secondary" className="mt-0 whitespace-nowrap text-[10px] shrink-0">{time || "3:45 PM"}</Badge>
      <p className="flex-1 text-sm leading-snug">{message}</p>
    </div>
  );
}

// --- Export helpers ---

export const generatorTypes = [
  SubstationCategory.Nuclear,
  SubstationCategory.Thermal,
  SubstationCategory.Wind,
  SubstationCategory.Solar,
];
