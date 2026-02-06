"use client";

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge";
import { Substation, SubstationCategory } from "@/lib/types"
import { GeneratorUnitsTable } from "../tables/unit-table";
import { LoadUnitsTable } from "../tables/load-table";
import { GenerationTypeConfig } from "@/components/theme";
import { cn } from "@/lib/utils";
import { useSimTick, useSub, useStore, useUserPaused, useDispatch } from "@/lib/hooks/use-store";

export const GenerationTypeIcon = ({ category, className, ...props }: { category: string, className?: string } & React.ComponentProps<"svg">) => {
  const config = GenerationTypeConfig[category as SubstationCategory] || GenerationTypeConfig[SubstationCategory.Thermal];
  const Icon = config.icon;
  return (
    <Icon className={cn(`w-5 h-5 ${config.tailwind.text}`, className)} {...props} />
  );
};

// --- Reusable Content Component (also used in help-examples) ---
export interface SubstationModalContentProps {
  sub: Substation;
  onUnitAction: (subId: string, unitIndex: number) => void;
  onAbortTransition?: (subId: string, unitIndex: number) => void;
  onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
  frWind?: number;
  frSolar?: number;
  isPaused?: boolean;
  isHighContrast?: boolean;
}

export function SubstationModalContent({ sub, onUnitAction, onAbortTransition, onSetSetpoint, frWind, frSolar, isPaused, isHighContrast }: SubstationModalContentProps) {
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
      <div className="text-sm text-muted-foreground mb-2">{getSubDescription()}</div>
      {sub.Category === SubstationCategory.Load
        ? <LoadUnitsTable sub={sub} onUnitAction={onUnitAction} isPaused={isPaused} stickyHeader={true} />
        : <GeneratorUnitsTable sub={sub} onUnitAction={onUnitAction} onAbortTransition={onAbortTransition} onSetSetpoint={onSetSetpoint} setpoints={setpoints} onSetpointChange={handleSetpointChange} isPaused={isPaused} isHighContrast={isHighContrast} stickyHeader={true} />
      }
    </>
  );
}

// --- Substation Modal Component ---
interface SubstationModalProps {
  open: boolean;
  subId: string | undefined;
  onClose: () => void;
  isHighContrast?: boolean;
}

export function SubstationModal({ open, subId, onClose, isHighContrast }: SubstationModalProps) {
  useSimTick();
  const sub = useSub(subId);
  const frWind = useStore(e => e.state.frWind);
  const frSolar = useStore(e => e.state.frSolar);
  const isPaused = useUserPaused();
  const dispatch = useDispatch();

  const onUnitAction = useCallback((sid: string, unitIndex: number) => {
    dispatch({ type: 'TOGGLE_UNIT', subId: sid, unitIndex });
  }, [dispatch]);

  const onAbortTransition = useCallback((sid: string, unitIndex: number) => {
    dispatch({ type: 'ABORT_UNIT_TRANSITION', subId: sid, unitIndex });
  }, [dispatch]);

  const onSetSetpoint = useCallback((sid: string, unitIndex: number, value: number) => {
    dispatch({ type: 'SET_SETPOINT', subId: sid, unitIndex, value });
  }, [dispatch]);

  if (!open || !sub) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent id="substation-modal" className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GenerationTypeIcon category={sub.Category} aria-hidden="true" />
            <span className="text-lg font-semibold leading-none tracking-tight">{sub.Name} Substation</span>
          </DialogTitle>
          <DialogDescription className="sr-only">Controls and details for {sub.Name}.</DialogDescription>
        </DialogHeader>
        <div role="region" aria-label={`${sub.Name} Controls`} className="max-h-[70vh] overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 relative">
          <SubstationModalContent
            sub={sub}
            onUnitAction={onUnitAction}
            onAbortTransition={onAbortTransition}
            onSetSetpoint={onSetSetpoint}
            frWind={frWind}
            frSolar={frSolar}
            isPaused={isPaused}
            isHighContrast={isHighContrast}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
