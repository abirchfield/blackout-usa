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
import { Substation, CATEGORY_LOAD, CATEGORY_WIND, CATEGORY_SOLAR, CATEGORY_NUCLEAR } from "@/lib/game/types"
import { GeneratorUnitDetails } from "@/components/controls/gen-controls"
import { LoadUnitDetails } from "@/components/controls/load-controls"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { Button } from "@/components/ui/button"
import { Wind, Sun, Atom, Flame, Plug } from "lucide-react"

const GenerationTypeIcon = ({ category }: { category: string }) => {
  const iconProps = { className: "w-6 h-6" };
  switch (category) {
    case CATEGORY_WIND:
      return <Wind {...iconProps} className="w-6 h-6 text-cyan-400" />;
    case CATEGORY_SOLAR:
      return <Sun {...iconProps} className="w-6 h-6 text-yellow-400" />;
    case CATEGORY_NUCLEAR:
      return <Atom {...iconProps} className="w-6 h-6 text-purple-400" />;
    case CATEGORY_LOAD:
      return <Plug {...iconProps} className="w-6 h-6 text-gray-500" />;
    default: // Assuming other types are thermal
      return <Flame {...iconProps} className="w-6 h-6 text-orange-400" />;
  }
};

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

  return (
    <Dialog open={!!sub} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <DialogTitle>{sub.Name} Substation</DialogTitle>
            <GenerationTypeIcon category={sub.Category} />
            <div className="flex items-center gap-2">
              {sub.U.map((unit, index) => 
                sub.Category === CATEGORY_LOAD ? (
                  <StatusIndicator key={`indicator-${index}`} status={unit.Status} category={CATEGORY_LOAD} title={`Circuit #${index + 1}: ${unit.Status}`} />
                ) : (
                  <StatusIndicator 
                    key={`indicator-${index}`}
                    status={unit.Status}
                    power={unit.P}
                    pmax={sub.Pmax / sub.Units}
                    title={`Unit #${index + 1}: ${unit.Status} - ${unit.P.toFixed(0)} MW`}
                  />
                )
              )}
            </div>
          </div>
          <DialogDescription dangerouslySetInnerHTML={{ __html: getSubDescription() }} />
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {sub.Category === CATEGORY_LOAD
            ? sub.U.map((unit, index) => (
                <LoadUnitDetails
                  key={index}
                  sub={sub}
                  unit={unit}
                  index={index}
                  onUnitAction={onUnitAction}
                  isPaused={isPaused}
                />
              ))
            : sub.U.map((unit, index) => (
                <GeneratorUnitDetails
                  key={index}
                  sub={sub}
                  unit={unit}
                  index={index}
                  onUnitAction={onUnitAction}
                  onSetSetpoint={onSetSetpoint}
                  setpointValue={setpoints[index] ?? 0}
                  onSetpointChange={handleSetpointChange}
                  isPaused={isPaused}
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