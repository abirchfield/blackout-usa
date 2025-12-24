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
import { Substation, SubstationCategory } from "@/lib/game/types"
import { GeneratorUnitDetails } from "@/components/controls/unit-controls"
import { GenerationTypeConfig } from "@/lib/game/config"
import { LoadUnitDetails } from "@/components/controls/load-controls"
import { StatusIndicator } from "@/components/indicators/status-indicator"
import { Button } from "@/components/ui/button"

const GenerationTypeIcon = ({ category }: { category: string }) => {
  const config = GenerationTypeConfig[category as SubstationCategory] || GenerationTypeConfig[SubstationCategory.Thermal];
  const Icon = config.icon;
  return (
    <Icon className={`w-6 h-6 ${config.tailwind.text}`} />
  );
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
    if (sub.Category === SubstationCategory.Load) {
      return `This substation has ${sub.Units} load circuits.`;
    }
    let baseText = `This substation has ${sub.Units} ${sub.Category} generating units.`;
    if (sub.Category === SubstationCategory.Wind && frWind !== undefined) {
      const p_avail = (frWind * sub.Pmax / sub.Units).toFixed(0);
      baseText += `<br/>At current wind levels, ${(frWind * 100).toFixed(0)}% of Max power is available (${p_avail} MW per unit).`;
    }
    if (sub.Category === SubstationCategory.Solar && frSolar !== undefined) {
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
          </div>
          <DialogDescription dangerouslySetInnerHTML={{ __html: getSubDescription() }} />
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {sub.Category === SubstationCategory.Load
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