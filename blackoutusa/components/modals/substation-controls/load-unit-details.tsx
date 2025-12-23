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

/**
 * Renders the detailed view and controls for a single load unit (circuit).
 */
export function LoadUnitDetails({ sub, unit, index, onUnitAction, isPaused }: LoadUnitDetailsProps) {
  /**
   * Renders the status badge and text for the load unit.
   */
  const renderStatusContent = () => {
    switch (unit.Status) {
      case STATUS_IN:
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-bold">Circuit #{index + 1}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/20 text-foreground font-medium">IN-SERVICE</span>
            </div>
            <p className="text-sm font-mono">{unit.P.toFixed(0)} MW</p>
          </div>
        );
      case STATUS_DIS:
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-bold">Circuit #{index + 1}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-medium">OUT-OF-SERVICE</span>
            </div>
          </div>
        );
      case STATUS_TRIP:
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-bold">Circuit #{index + 1}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">TRIPPED</span>
            </div>
            <p className="text-red-500 text-sm">Cannot be reconnected.</p>
          </div>
        );
      default:
        return <p><strong>Circuit #{index + 1} ({unit.Status})</strong></p>;
    }
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
      <div className="flex justify-between items-center py-3">
        <div className="text-sm">
          {renderStatusContent()}
        </div>
        <div className="shrink-0">
          {renderActionControls()}
        </div>
      </div>
    </>
  );
}