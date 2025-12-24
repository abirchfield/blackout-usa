// components/gen-unit-details/load-unit-details.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Substation, Unit, UnitStatus } from "@/lib/game/types";

interface LoadUnitDetailsProps {
  sub: Substation;
  unit: Unit;
  index: number;
  onUnitAction: (subId: string, unitIndex: number) => void;
  isPaused?: boolean;
}

const statusStyles: Record<UnitStatus, { text: string; className: string }> = {
  [UnitStatus.IN]: { text: 'IN-SERVICE', className: 'bg-green-500/20 text-green-400' },
  [UnitStatus.DIS]: { text: 'OUT-OF-SERVICE', className: 'bg-gray-500/20 text-gray-400' },
  [UnitStatus.TRIP]: { text: 'TRIPPED', className: 'bg-red-500/20 text-red-400' },
  // The following are not applicable to loads but are included for type completeness
  [UnitStatus.STARTUP]: { text: 'N/A', className: 'bg-yellow-500/20 text-yellow-400' },
  [UnitStatus.SHUTDOWN]: { text: 'N/A', className: 'bg-gray-500/20 text-gray-400' },
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
        {unit.Status === UnitStatus.TRIP && (
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
      case UnitStatus.IN:
        return <Button variant="destructive" size="sm" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused}>Disconnect</Button>;
      case UnitStatus.DIS:
        return <Button variant="secondary" size="sm" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused}>Connect</Button>;
      case UnitStatus.TRIP:
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
          {unit.Status === UnitStatus.IN && (
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