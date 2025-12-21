"use client";

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Substation, Unit } from "@/lib/game/types"
import { UnitRow } from "@/components/modals/substation-controls/gen-unit"

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
    if (sub.Category === "Load") {
      return `This substation has ${sub.Units} load circuits.`;
    }
    let baseText = `This substation has ${sub.Units} ${sub.Category} generating units.`;
    if (sub.Category === "Wind" && frWind !== undefined) {
      const p_avail = (frWind * sub.Pmax / sub.Units).toFixed(0);
      baseText += `<br/>At current wind levels, ${(frWind * 100).toFixed(0)}% of Max power is available (${p_avail} MW per unit).`;
    }
    if (sub.Category === "Solar PV" && frSolar !== undefined) {
      const p_avail = (frSolar * sub.Pmax / sub.Units).toFixed(0);
      baseText += `<br/>With current solar availability, ${(frSolar * 100).toFixed(0)}% of Max power is available (${p_avail} MW per unit).`;
    }
    return baseText;
  }

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
    return { className: `${colorClass} w-3 h-3 rounded-full` };
  };

  const getIndicatorStyle = (unit: Unit, sub: Substation) => {
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
    return { className: `${colorClass} ${animationClass} w-3 h-3 rounded-full transition-all`, style: { opacity } };
  };

  return (
    <Dialog open={!!sub} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{sub.Name} Substation</DialogTitle>
          {sub.Category !== 'Load' && (
            <div className="flex items-center gap-2 pt-2">
              {sub.U.map((unit, index) => {
                const { className, style } = getIndicatorStyle(unit, sub);
                return <div key={`indicator-${index}`} className={className} style={style} title={`Unit #${index + 1}: ${unit.Status} - ${unit.P.toFixed(0)} MW`} />;
              })}
            </div>
          )}
          {sub.Category === 'Load' && (
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
      </DialogContent>
    </Dialog>
  );
}