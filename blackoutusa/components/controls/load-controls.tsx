// components/gen-unit-details/load-unit-details.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Substation, Unit, STATUS_IN, STATUS_DIS, STATUS_TRIP } from "@/lib/game/types";

interface LoadUnitDetailsProps {
  sub: Substation;
  unit: Unit;
  index: number;
  onUnitAction: (subId: string, unitIndex: number) => void;
  isPaused?: boolean;
}

const statusStyles: Record<string, { text: string; className: string }> = {
  [STATUS_IN]: { text: 'IN-SERVICE', className: 'bg-green-500/20 text-green-400' },
  [STATUS_DIS]: { text: 'OUT-OF-SERVICE', className: 'bg-gray-500/20 text-gray-400' },
  [STATUS_TRIP]: { text: 'TRIPPED', className: 'bg-red-500/20 text-red-400' },
};

/**
 * Renders the detailed view and controls for a single load unit (circuit).
 */
export function LoadUnitDetails({ sub, unit, index, onUnitAction, isPaused }: LoadUnitDetailsProps) {
  /**
   * Renders the status badge and text for the load unit.
   */
  const renderStatusContent = () => {
    const style = statusStyles[unit.Status];

    if (!style) {
      return <p className="font-bold">Circuit #{index + 1} ({unit.Status})</p>;
    }

    return (
      <div className="space-y-1">
        <p className="font-bold">Circuit #{index + 1}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.className}`}>
          {style.text}
        </span>
        {unit.Status === STATUS_TRIP && (
          <p className="text-red-500 text-sm">Cannot be reconnected.</p>
        )}
      </div>
    );
  };

  /**
   * Renders the action button for the load unit.
   */
  const renderActionControls = () => {
    switch (unit.Status) {
      case STATUS_IN:
        return <Button variant="destructive" size="sm" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused}>Disconnect</Button>;
      case STATUS_DIS:
        return <Button variant="secondary" size="sm" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused}>Connect</Button>;
      case STATUS_TRIP:
        return null; // Tripped units have no actions
      default:
        return null;
    }
  };

  return (
    <>
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 py-3 text-sm">
        {/* Left part: Unit status */}
        <div className="w-auto flex-shrink-0">
          {renderStatusContent()}
        </div>

        {/* Right part: Action controls */}
        <div className="w-full sm:w-auto flex items-center justify-end gap-x-4">
          {unit.Status === STATUS_IN && (
            <div className="text-sm font-mono text-right">
              <p className="font-bold">{unit.P.toFixed(0)} MW</p>
            </div>
          )}
          {renderActionControls()}
        </div>
      </div>
    </>
  );
}