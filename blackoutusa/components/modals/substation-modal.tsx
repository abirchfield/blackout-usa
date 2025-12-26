"use client";

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { Substation, SubstationCategory } from "@/lib/game/types"
import { GeneratorUnitsTable } from "../tables/unit-table";
import { LoadUnitsTable } from "../tables/load-table";
import { GenerationTypeConfig } from "@/lib/game/config";
import { cn } from "@/lib/utils";

export const GenerationTypeIcon = ({ category, className, ...props }: { category: string, className?: string } & React.ComponentProps<"svg">) => {
  const config = GenerationTypeConfig[category as SubstationCategory] || GenerationTypeConfig[SubstationCategory.Thermal];
  const Icon = config.icon;
  return (
    <Icon className={cn(`w-5 h-5 ${config.tailwind.text}`, className)} {...props} />
  );
};

// --- Reusable Content Component ---
interface SubstationModalContentProps {
  sub: Substation;
  onUnitAction: (subId: string, unitIndex: number) => void;
  onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
  frWind?: number;
  frSolar?: number;
  isPaused?: boolean;
}

export function SubstationModalContent({ sub, onUnitAction, onSetSetpoint, frWind, frSolar, isPaused }: SubstationModalContentProps) {
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
      return <p>This substation has {sub.Units} load circuits.</p>;
    }

    const isRenewable = sub.Category === SubstationCategory.Wind || sub.Category === SubstationCategory.Solar;

    const costDescription = !isRenewable ? (
      <p>
        Each unit has a fixed operating cost of <Badge variant="secondary" className="font-mono">${sub.FixedCost}/hr</Badge> and a variable fuel cost of <Badge variant="secondary" className="font-mono">${sub.FuelCost.toFixed(0)}/MW/hr</Badge>.
      </p>
    ) : null;

    const windDescription = sub.Category === SubstationCategory.Wind && frWind !== undefined ? (
      <p>
        At current wind levels, <Badge variant="outline" className="font-mono">{(frWind * 100).toFixed(0)}%</Badge> of Max power is available ({(frWind * sub.Pmax / sub.Units).toFixed(0)} MW per unit).
      </p>
    ) : null;

    const solarDescription = sub.Category === SubstationCategory.Solar && frSolar !== undefined ? (
      <p>
        With current solar availability, <Badge variant="outline" className="font-mono">{(frSolar * 100).toFixed(0)}%</Badge> of Max power is available ({(frSolar * sub.Pmax / sub.Units).toFixed(0)} MW per unit).
      </p>
    ) : null;

    return (
      <div className="space-y-1.5">
        <p>This substation has {sub.Units} {sub.Category} generating units.</p>
        {costDescription}
        {windDescription}
        {solarDescription}
      </div>
    );
  }

  return (
    <>
      <div className="text-sm text-muted-foreground mb-4">{getSubDescription()}</div>
      {sub.Category === SubstationCategory.Load
        ? <LoadUnitsTable sub={sub} onUnitAction={onUnitAction} isPaused={isPaused} stickyHeader={true} />
        : <GeneratorUnitsTable sub={sub} onUnitAction={onUnitAction} onSetSetpoint={onSetSetpoint} setpoints={setpoints} onSetpointChange={handleSetpointChange} isPaused={isPaused} stickyHeader={true} />
      }
    </>
  );
}

// --- Reusable Detail View for Sidebar ---
interface SubstationDetailViewProps extends SubstationModalContentProps {
  onClose: () => void;
}

export function SubstationDetailView({ sub, onClose, ...contentProps }: SubstationDetailViewProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold flex items-center gap-2 truncate">
          <GenerationTypeIcon category={sub.Category} className="flex-shrink-0" aria-hidden="true" />
          <span className="truncate" title={`${sub.Name} Substation`}>{`${sub.Name} Substation`}</span>
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close details">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div role="region" aria-label={`${sub.Name} Controls`} className="overflow-y-auto flex-1 min-w-0">
        <SubstationModalContent
          sub={sub}
          {...contentProps}
        />
      </div>
    </>
  );
}


// --- Substation Modal Component ---
interface SubstationModalProps {
  sub: Substation | null;
  onClose: () => void;
  onUnitAction: (subId: string, unitIndex: number) => void;
  onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
  frWind?: number;
  frSolar?: number;
  isPaused?: boolean;
}

export function SubstationModal({ sub, onClose, onUnitAction, onSetSetpoint, frWind, frSolar, isPaused }: SubstationModalProps) {
  if (!sub) return null;

  return (
    <Dialog open={!!sub} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GenerationTypeIcon category={sub.Category} aria-hidden="true" />
            <span className="text-lg font-semibold leading-none tracking-tight">{sub.Name} Substation</span>
          </DialogTitle>
          <DialogDescription className="sr-only">Controls and details for {sub.Name}.</DialogDescription>
        </DialogHeader>
        <div role="region" aria-label={`${sub.Name} Controls`} className="max-h-[60vh] overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 relative">
          <SubstationModalContent
            sub={sub}
            onUnitAction={onUnitAction}
            onSetSetpoint={onSetSetpoint}
            frWind={frWind}
            frSolar={frSolar}
            isPaused={isPaused}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}