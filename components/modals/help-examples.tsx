import { Substation, UnitStatus, SubstationCategory } from "@/lib/types";
import { GenerationTypeConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// --- Mock data for help modal examples ---

const mockSubBase: Substation = {
  Name: "Help Substation",
  Number: "0",
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

// --- Example components ---

export function LoadExample({ inService }: { inService: boolean }) {
  const radius = 24;
  const center = 28;
  const strokeWidth = 3;

  const x = center + radius * Math.cos(-Math.PI / 2);
  const y = center + radius * Math.sin(-Math.PI / 2);
  const x2 = center + radius * Math.cos(Math.PI);
  const y2 = center + radius * Math.sin(Math.PI);
  const piePath = `M${center},${center} L${x},${y} A${radius},${radius} 0 1,1 ${x2},${y2} Z`;

  return (
    <div role="group" aria-label={inService ? "In-service load" : "Out-of-service load"} className="text-center p-4 border border-white/20 rounded-lg bg-background/50 flex flex-col items-center justify-center w-48 h-32">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="var(--background)" />
        {inService && <path d={piePath} fill="var(--foreground)" />}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--foreground)" strokeWidth={strokeWidth} />
      </svg>
      <p className="mt-2 text-sm">{inService ? "In-service load" : "Out-of-service load"}</p>
    </div>
  );
}

export function GeneratorExample({ category, p, pmax, capacityLabel }: { category: SubstationCategory, p: number, pmax: number, capacityLabel: string }) {
  const outerRadius = 24;
  const innerRadius = outerRadius / 1.2;
  const center = 28;
  const strokeWidth = 1;
  const genConfig = GenerationTypeConfig[category];
  const genColor = genConfig.color;

  const ratio = Math.max(0, Math.min(1, p / pmax));
  const endAngle = -Math.PI / 2 + (Math.PI * 2 * ratio);
  const isFullCircle = ratio >= 1;

  const x = center + innerRadius * Math.cos(-Math.PI / 2);
  const y = center + innerRadius * Math.sin(-Math.PI / 2);
  const x2 = center + innerRadius * Math.cos(endAngle);
  const y2 = center + innerRadius * Math.sin(endAngle);
  const largeArcFlag = ratio > 0.5 ? 1 : 0;

  const piePath = `M${center},${center} L${x},${y} A${innerRadius},${innerRadius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;

  return (
    <div role="group" aria-label={`${genConfig.name} generator at ${capacityLabel}`} className="text-center p-4 border border-white/20 rounded-lg bg-background/50 flex flex-col items-center justify-center w-48 h-32">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx={center} cy={center} r={outerRadius} fill={genColor} stroke={genColor} strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={innerRadius} fill="var(--background)" />
        {ratio > 0 && (
          isFullCircle
            ? <circle cx={center} cy={center} r={innerRadius} fill={genColor} />
            : <path d={piePath} fill={genColor} />
        )}
        <circle cx={center} cy={center} r={innerRadius} fill="none" stroke={genColor} strokeWidth={strokeWidth} />
      </svg>
      <div className="mt-2 text-sm flex items-center justify-center gap-2 whitespace-nowrap">
        <span className="font-bold">{genConfig.name}</span>
        <Badge variant="secondary">{capacityLabel}</Badge>
      </div>
    </div>
  );
}

export function LineExample({ colorClass, dashed, outOfService, label }: { colorClass: string, dashed?: boolean, outOfService?: boolean, label: string }) {
  return (
    <div role="group" aria-label={`Example of a ${label} transmission line`} className="text-center p-4 border border-white/20 rounded-lg bg-background/50 flex flex-col items-center justify-center w-48 h-32">
      <div className="w-24 h-12 flex items-center justify-center">
        <svg width="100%" height="6" viewBox="0 0 100 6" className="overflow-visible">
          {outOfService ? (
            <>
              <line x1="0" y1="3" x2="100" y2="3" stroke="var(--foreground)" strokeWidth="4" />
              <line x1="0" y1="3" x2="100" y2="3" stroke="var(--background)" strokeWidth="5" strokeDasharray="5, 5" />
            </>
          ) : (
            <line x1="0" y1="3" x2="100" y2="3" className={colorClass} strokeWidth="4" strokeDasharray={dashed ? "8, 4" : "none"} />
          )}
        </svg>
      </div>
      <p className="mt-2 text-sm">{label}</p>
    </div>
  );
}

export function LegendRow({ icon: Icon, name, description, colorClass }: { icon: React.ElementType, name: string, description: string, colorClass: string }) {
  return (
    <div className="flex items-start gap-4 p-2">
      <div className="flex-shrink-0 rounded-md h-10 w-10 flex items-center justify-center bg-muted" aria-hidden="true">
        <Icon className={cn("h-6 w-6", colorClass)} />
      </div>
      <div>
        <div className="font-bold">{name}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

export function FrequencyDisplay({ freq, label }: { freq: number, label: string }) {
  const colorClass = freq < 59.7 || freq > 60.3 ? "text-destructive" : freq < 59.85 || freq > 60.15 ? "text-[var(--color-warning)]" : "text-foreground";
  return (
    <div className="text-center p-4 border border-white/20 rounded-lg bg-background/50 flex flex-col items-center justify-center" role="figure" aria-label={`Frequency: ${freq.toFixed(2)} Hz. Status: ${label}.`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Frequency</div>
      <div className={cn("text-2xl font-bold", colorClass)}>{freq.toFixed(2)} Hz</div>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
