"use client";

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Substation, Unit, STATUS_IN, STATUS_DIS, STATUS_TRIP, STATUS_STARTUP, STATUS_SHUTDOWN, CATEGORY_LOAD, CATEGORY_WIND, CATEGORY_SOLAR, CATEGORY_NUCLEAR } from "@/lib/game/types"
import { UnitRow } from "@/components/modals/substation-controls/gen-unit"
import { Button } from "@/components/ui/button"

// --- Substation Modal Component ---
interface SubstationModalProps {
  sub: Substation | null;
  onClose: () => void;
  onUnitAction: (subId: string, unitIndex: number) => void;
  onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
  frWind?: number;
  frSolar?: number;
}

export function SubstationModal({ sub, onClose, onUnitAction, onSetSetpoint, frWind, frSolar }: SubstationModalProps) {
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

  if (!sub) return null;

  const handleSetpointChange = (index: number, value: number) => {
    setSetpoints(prev => ({ ...prev, [index]: value }));
  };

  const getSubDescription = () => {
    if (sub.Category === CATEGORY_LOAD) {
      return `This substation has ${sub.Units} load circuits.`;
    }
    let baseText = `This substation has ${sub.Units} ${sub.Category} generating units.`;
    if (sub.Category === CATEGORY_WIND && frWind !== undefined) {
      const p_avail = (frWind * sub.Pmax / sub.Units).toFixed(0);
      baseText += `<br/>At current wind levels, ${(frWind * 100).toFixed(0)}% of Max power is available (${p_avail} MW per unit).`;
    }
    if (sub.Category === CATEGORY_SOLAR && frSolar !== undefined) {
      const p_avail = (frSolar * sub.Pmax / sub.Units).toFixed(0);
      baseText += `<br/>With current solar availability, ${(frSolar * 100).toFixed(0)}% of Max power is available (${p_avail} MW per unit).`;
    }
    return baseText;
  }

  const getLoadIndicatorStyle = (unit: Unit) => {
    // Deactivated state: unfilled circle
    if (unit.Status === STATUS_DIS) {
      return { className: 'border border-muted-foreground w-3 h-3 rounded-full' };
    }

    let colorClass = '';
    switch (unit.Status) {
      case STATUS_IN:
        colorClass = 'bg-green-500';
        break;
      case STATUS_TRIP:
        colorClass = 'bg-red-500';
        break;
    }
    return { className: `${colorClass} w-3 h-3 rounded-full` };
  };

  const getIndicatorStyle = (unit: Unit, sub: Substation) => {
    // Deactivated state: unfilled circle
    if (unit.Status === STATUS_DIS) {
      return { className: 'border border-muted-foreground w-3 h-3 rounded-full', style: {} };
    }

    const pmax_unit = sub.Pmax / sub.Units;
    const brightness = pmax_unit > 0 ? unit.P / pmax_unit : 0;
    let colorClass = '';
    let animationClass = '';

    switch (unit.Status) {
      case STATUS_IN:
      case STATUS_STARTUP:
        colorClass = 'bg-green-500';
        if (unit.Status === STATUS_STARTUP) animationClass = 'animate-pulse';
        break;
      case STATUS_SHUTDOWN:
        colorClass = 'bg-gray-600';
        break;
      case STATUS_TRIP:
        colorClass = 'bg-red-500';
        break;
    }

    const opacity = unit.Status === STATUS_IN ? Math.max(0.2, brightness) : 1;
    return { className: `${colorClass} ${animationClass} w-3 h-3 rounded-full transition-all`, style: { opacity } };
  };

  return (
    <Dialog open={!!sub} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{sub.Name} Substation</DialogTitle>
          {sub.Category !== CATEGORY_LOAD && (
            <div className="flex items-center gap-2 pt-2">
              {sub.U.map((unit, index) => {
                const { className, style } = getIndicatorStyle(unit, sub);
                return <div key={`indicator-${index}`} className={className} style={style} title={`Unit #${index + 1}: ${unit.Status} - ${unit.P.toFixed(0)} MW`} />;
              })}
            </div>
          )}
          {sub.Category === CATEGORY_LOAD && (
            <div className="flex items-center gap-2 pt-2">
              {sub.U.map((unit, index) => {
                const { className } = getLoadIndicatorStyle(unit);
                return <div key={`indicator-${index}`} className={className} title={`Circuit #${index + 1}: ${unit.Status}`} />;
              })}
            </div>
          )}
          <DialogDescription dangerouslySetInnerHTML={{ __html: getSubDescription() }} />
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {sub.U.map((unit, index) => (
            <UnitRow
              key={index}
              sub={sub}
              unit={unit}
              index={index}
              onUnitAction={onUnitAction}
              onSetSetpoint={onSetSetpoint}
              setpointValue={setpoints[index] ?? 0}
              onSetpointChange={handleSetpointChange}
            />
          ))}
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}