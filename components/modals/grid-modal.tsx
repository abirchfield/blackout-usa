"use client";

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Cable } from "lucide-react"
import { Substation, Branch, SubstationCategory, LoadCategoryType, UnitStatus, Unit } from "@/lib/types"
import { GeneratorUnitsTable } from "../tables/unit-table";
import { LoadUnitsTable } from "../tables/load-table";
import { CircuitTable } from "../tables/circuit-table";
import { GenerationTypeConfig, LoadTypeConfig } from "@/components/theme";
import { cn, branchLoading, isBranchActive } from "@/lib/utils";
import { useSimTick, useSub, useBranch, useStore, useUserPaused, useActions } from "@/lib/hooks/use-store";

// --- Generation Type Icon ---

export const GenerationTypeIcon = ({ category, className, ...props }: { category: string, className?: string } & React.ComponentProps<"svg">) => {
  const config = GenerationTypeConfig[category as SubstationCategory] || GenerationTypeConfig[SubstationCategory.Thermal];
  const Icon = config.icon;
  return (
    <Icon className={cn(`w-5 h-5 ${config.tailwind.text}`, className)} {...props} />
  );
};

// --- Substation Content ---

interface SubstationContentProps {
  sub: Substation;
  onUnitAction: (subId: string, unitIndex: number) => void;
  onLoadUnitAction?: (subId: string, unitIndex: number) => void;
  onAbortTransition?: (subId: string, unitIndex: number) => void;
  onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
  windAvail?: number;
  sunAvail?: number;
  isPaused?: boolean;
  isHighContrast?: boolean;
}

function SubstationContent({ sub, onUnitAction, onLoadUnitAction, onAbortTransition, onSetSetpoint, windAvail, sunAvail, isPaused, isHighContrast }: SubstationContentProps) {
  const [setpoints, setSetpoints] = useState<Record<number, number>>({});

  useEffect(() => {
    if (sub) {
      const initialSetpoints: Record<number, number> = {};
      sub.U.forEach((unit, index) => {
        initialSetpoints[index] = unit.Pset;
      });
      setSetpoints(initialSetpoints);
    }
  }, [sub]);

  const handleSetpointChange = (index: number, value: number) => {
    setSetpoints(prev => ({ ...prev, [index]: value }));
  };

  const getSubDescription = () => {
    if (sub.Category === SubstationCategory.Load) {
      return <>{sub.Units} load circuit{sub.Units !== 1 ? 's' : ''}</>;
    }

    const isRenewable = sub.Category === SubstationCategory.Wind || sub.Category === SubstationCategory.Solar;
    const parts: React.ReactNode[] = [];

    parts.push(<span key="count">{sub.Units} {sub.Category} unit{sub.Units !== 1 ? 's' : ''}</span>);

    if (!isRenewable && sub.U[0]) {
      parts.push(<span key="cost">Op <span className="font-mono">${sub.U[0].FixedCost}/hr</span> · Fuel <span className="font-mono">${sub.U[0].FuelCost.toFixed(0)}/MW/hr</span></span>);
    }
    if (sub.Category === SubstationCategory.Wind && windAvail !== undefined) {
      parts.push(<span key="avail"><span className="font-mono">{(windAvail * 100).toFixed(0)}%</span> avail ({(windAvail * sub.pmax).toFixed(0)} MW/unit)</span>);
    }
    if (sub.Category === SubstationCategory.Solar && sunAvail !== undefined) {
      parts.push(<span key="avail"><span className="font-mono">{(sunAvail * 100).toFixed(0)}%</span> avail ({(sunAvail * sub.pmax).toFixed(0)} MW/unit)</span>);
    }
    if (sub.Loads) {
      parts.push(<span key="loads">+ {sub.Loads.Units} load circuit{sub.Loads.Units !== 1 ? 's' : ''}</span>);
    }

    return <>{parts.reduce<React.ReactNode[]>((acc, part, i) => i === 0 ? [part] : [...acc, <span key={`sep-${i}`} className="mx-1.5 opacity-40">·</span>, part], [])}</>;
  }

  const loadAction = onLoadUnitAction ?? onUnitAction;

  return (
    <>
      <div className="text-sm text-muted-foreground mb-2">{getSubDescription()}</div>
      {sub.isLoad
        ? <LoadUnitsTable sub={sub} onUnitAction={onUnitAction} isPaused={isPaused} stickyHeader={true} />
        : <>
            <GeneratorUnitsTable sub={sub} onUnitAction={onUnitAction} onAbortTransition={onAbortTransition} onSetSetpoint={onSetSetpoint} setpoints={setpoints} onSetpointChange={handleSetpointChange} isPaused={isPaused} isHighContrast={isHighContrast} stickyHeader={true} />
            {sub.Loads && (
              <>
                <h3 className="text-sm font-semibold mt-4 mb-2">Load Circuits</h3>
                <LoadUnitsTable sub={sub} units={sub.Loads.U} onUnitAction={loadAction} isPaused={isPaused} stickyHeader={true} />
              </>
            )}
          </>
      }
    </>
  );
}

// --- Branch Content ---

function BranchContent({ branch, sibling, onBranchAction, isPaused, isHighContrast }: {
  branch: Branch;
  sibling?: Branch;
  onBranchAction: (branchId: string) => void;
  isPaused?: boolean;
  isHighContrast?: boolean;
}) {
  const fromSub = branch.sub1?.Name || branch.FromSub;
  const toSub = branch.sub2?.Name || branch.ToSub;
  const flowDirection = branch.P >= 0 ? `${fromSub} → ${toSub}` : `${toSub} → ${fromSub}`;

  const branchActive = isBranchActive(branch);
  const siblingActive = sibling ? isBranchActive(sibling) : false;
  const totalCapacity = (branchActive ? branch.Pmax : 0) + (siblingActive ? sibling!.Pmax : 0);
  const circuitCount = sibling ? 2 : 1;
  const loading = branchLoading(branch);

  const parts: React.ReactNode[] = [];
  parts.push(<span key="circuits">{circuitCount} circuit{circuitCount !== 1 ? 's' : ''}</span>);
  parts.push(<span key="flow"><span className="font-mono">{Math.abs(branch.P).toFixed(0)} MW</span> {flowDirection}</span>);
  parts.push(<span key="loading">Loading <span className={cn("font-mono", loading > 100 ? "text-destructive" : "")}>{loading.toFixed(0)}%</span> of {totalCapacity.toFixed(0)} MW</span>);

  return (
    <>
      <div className="text-sm text-muted-foreground mb-2">
        {parts.reduce<React.ReactNode[]>((acc, part, i) => i === 0 ? [part] : [...acc, <span key={`sep-${i}`} className="mx-1.5 opacity-40">·</span>, part], [])}
      </div>
      <CircuitTable branch={branch} sibling={sibling} onBranchAction={onBranchAction} isPaused={isPaused} isHighContrast={isHighContrast} />
    </>
  );
}

// --- Load Summary Bar ---

function LoadSummaryBar({ units }: { units: Unit[] }) {
  const activeUnits = units.filter(u => u.Status === UnitStatus.IN);
  const totalServed = activeUnits.reduce((sum, u) => sum + u.P, 0);
  const totalCapacity = units.reduce((sum, u) => sum + u.Pmax, 0);

  const byCategory = Object.values(LoadCategoryType).map(cat => {
    const catUnits = activeUnits.filter(u => (u.LoadCategory ?? LoadCategoryType.Residential) === cat);
    const served = catUnits.reduce((sum, u) => sum + u.P, 0);
    return { cat, served, config: LoadTypeConfig[cat] };
  }).filter(g => g.served > 0);

  if (totalCapacity === 0) return null;

  return (
    <div className="mb-3 space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Served Load</span>
        <span className="font-mono font-bold tabular-nums">{totalServed.toFixed(0)} <span className="text-xs text-muted-foreground font-normal">/ {totalCapacity.toFixed(0)} MW</span></span>
      </div>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted">
        {byCategory.map(({ cat, served, config }) => (
          <div
            key={cat}
            className={cn("h-full transition-all", config.tailwind.bg)}
            style={{ width: `${(served / totalCapacity) * 100}%` }}
            title={`${config.name}: ${served.toFixed(0)} MW`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {byCategory.map(({ cat, config }) => {
          const Icon = config.icon;
          return (
            <span key={cat} className="flex items-center gap-1">
              <Icon className={cn("h-3 w-3", config.tailwind.text)} aria-hidden="true" />
              {config.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// --- Grid Modal ---

interface GridModalProps {
  open: boolean;
  substationId?: string;
  branchId?: string;
  onClose: () => void;
  isHighContrast?: boolean;
}

export function GridModal({ open, substationId, branchId, onClose, isHighContrast }: GridModalProps) {
  useSimTick();

  const sub = useSub(substationId);
  const branch = useBranch(branchId);
  const siblingBranch = useBranch(branch?.sibling);
  const windAvail = useStore(e => e.state.windAvail);
  const sunAvail = useStore(e => e.state.sunAvail);
  const isPaused = useUserPaused();
  const { toggleUnit, toggleLoadUnit, abortTransition, setSetpoint, toggleBranch } = useActions();

  const onUnitAction = useCallback((sid: string, unitIndex: number) => {
    toggleUnit(sid, unitIndex);
  }, [toggleUnit]);

  const onLoadUnitAction = useCallback((sid: string, unitIndex: number) => {
    toggleLoadUnit(sid, unitIndex);
  }, [toggleLoadUnit]);

  const onAbortTransition = useCallback((sid: string, unitIndex: number) => {
    abortTransition(sid, unitIndex);
  }, [abortTransition]);

  const onSetSetpoint = useCallback((sid: string, unitIndex: number, value: number) => {
    setSetpoint(sid, unitIndex, value);
  }, [setSetpoint]);

  const onBranchAction = useCallback((bid: string) => {
    toggleBranch(bid);
  }, [toggleBranch]);

  if (!open) return null;

  if (sub) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent id="grid-modal" className="sm:max-w-3xl canvas-center">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GenerationTypeIcon category={sub.Category} aria-hidden="true" />
              <span className="text-lg font-semibold leading-none tracking-tight">{sub.Name} Substation</span>
            </DialogTitle>
            <DialogDescription className="sr-only">Controls and details for {sub.Name}.</DialogDescription>
          </DialogHeader>
          <div role="region" aria-label={`${sub.Name} Controls`} className="max-h-[70vh] overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 relative">
            {sub.isLoad && <LoadSummaryBar units={sub.U} />}
            <SubstationContent
              sub={sub}
              onUnitAction={onUnitAction}
              onLoadUnitAction={onLoadUnitAction}
              onAbortTransition={onAbortTransition}
              onSetSetpoint={onSetSetpoint}
              windAvail={windAvail}
              sunAvail={sunAvail}
              isPaused={isPaused}
              isHighContrast={isHighContrast}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (branch) {
    const fromSub = branch.sub1?.Name || branch.FromSub;
    const toSub = branch.sub2?.Name || branch.ToSub;
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent id="grid-modal" className="sm:max-w-3xl canvas-center">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cable className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
              <span className="text-lg font-semibold leading-none tracking-tight">{fromSub} — {toSub}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">Controls and details for this transmission line.</DialogDescription>
          </DialogHeader>
          <div role="region" aria-label="Line Controls" className="max-h-[70vh] overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 relative">
            <BranchContent
              branch={branch}
              sibling={siblingBranch}
              onBranchAction={onBranchAction}
              isPaused={isPaused}
              isHighContrast={isHighContrast}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
