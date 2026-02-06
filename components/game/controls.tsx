"use client";

/** Reusable game widgets: PowerSlider (unit setpoint control), LoadUnitDetails (load info).
 *  Used by modals and table views. */
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider";
import { Substation, Unit, UnitStatus, LoadCategoryType } from "@/lib/types"
import { LoadTypeConfig, StatusConfig } from "@/components/theme"
import { Power } from "lucide-react"
import { cn } from "@/lib/utils"
import React from "react";

// --- Load Controls ---

interface LoadUnitDetailsProps {
  sub: Substation;
  unit: Unit;
  index: number;
  onUnitAction: (subId: string, unitIndex: number) => void;
  isPaused?: boolean;
}

const loadCategories = Object.values(LoadCategoryType);

/**
 * Renders the detailed view and controls for a single load unit (circuit).
 */
export function LoadUnitDetails({ sub, unit, index, onUnitAction, isPaused }: LoadUnitDetailsProps) {
  const config = StatusConfig[unit.Status];
  const StatusIcon = config.icon;
  const category = loadCategories[index % loadCategories.length];
  const { icon: TypeIcon, name: typeName, tailwind } = LoadTypeConfig[category];
  const mwSuffix = <span className="text-xs text-muted-foreground ml-1">MW</span>;

  let actionButtonElement: React.ReactNode = null;
  switch (unit.Status) {
    case UnitStatus.IN:
      actionButtonElement = <Button variant="destructive" size="icon" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused} aria-label={`Disconnect Circuit ${index + 1}`} className="cursor-pointer"><Power className="h-5 w-5" /></Button>;
      break;
    case UnitStatus.DIS:
      actionButtonElement = <Button variant="secondary" size="icon" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused} aria-label={`Connect Circuit ${index + 1}`} className="cursor-pointer"><Power className="h-5 w-5" /></Button>;
      break;
    default:
      actionButtonElement = <Button variant="ghost" size="icon" disabled={true} aria-label="Action unavailable" />;
  }

  return (
    <tr className="border-t border-border/50 align-middle" aria-labelledby={`load-circuit-header-${sub.Number}-${index}`}>
      <th scope="row" id={`load-circuit-header-${sub.Number}-${index}`} className="p-2 align-middle font-bold text-center">
        {index + 1}
      </th>
      <td className="p-2 align-middle text-left">
        <TypeIcon aria-hidden="true" className={cn("h-4 w-4 inline-block mr-2 align-middle", tailwind.text)} />
        <span className="align-middle">{typeName}</span>
      </td>
      <td className="p-2 align-middle text-center">
        {config && (
          <StatusIcon role="img" aria-label={config.label} className={cn("h-5 w-5 mx-auto", config.tailwind.text)} title={config.label} />
        )}
      </td>
      <td className="p-2 font-mono align-middle text-right">
        {unit.Status === UnitStatus.IN ? <>{unit.P.toFixed(0)}{mwSuffix}</> : '---'}
      </td>
      <td className="p-2 align-middle text-center">
        {actionButtonElement}
      </td>
    </tr>
  );
}

// --- Setpoint Controls ---

/**
 * Renders a slider for power control with visual feedback for setpoint and actual output.
 * - Setpoint: Controlled by the slider thumb (what you're requesting)
 * - Actual: Shown as a filled bar (current output, may lag behind setpoint)
 */
export const PowerSlider = ({
  setpoint,
  actual,
  pmax,
  onValueChange,
  onValueCommit,
  disabled,
}: {
  setpoint: number;
  actual: number;
  pmax: number;
  onValueChange?: (newValue: number[]) => void;
  onValueCommit?: (newValue: number[]) => void;
  disabled: boolean;
}) => {
  const outputPercentage = pmax > 0 ? (actual / pmax) * 100 : 0;

  return (
    <div className={cn("w-full flex items-center gap-2", disabled && "opacity-60")}>
      <div className="relative flex-1 h-6 flex items-center">
        {/* Actual output bar - shown underneath */}
        <div
          className="absolute inset-y-0 left-0 flex items-center w-full pointer-events-none"
          title={`Actual Output: ${actual.toFixed(0)} MW`}
        >
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/70 transition-all duration-300"
              style={{ width: `${outputPercentage}%` }}
            />
          </div>
        </div>
        {/* Slider control - on top with higher z-index */}
        <div className="relative z-10 w-full">
          <Slider
            value={[setpoint]}
            onValueChange={onValueChange}
            onValueCommit={onValueCommit}
            min={0}
            max={pmax}
            step={1}
            disabled={disabled}
            aria-label={`Setpoint: ${setpoint.toFixed(0)} MW, Actual: ${actual.toFixed(0)} MW`}
            className="power-slider"
          />
        </div>
      </div>
      {/* Numeric setpoint display */}
      <span className="text-xs font-mono text-muted-foreground w-12 text-right tabular-nums">
        {setpoint.toFixed(0)} MW
      </span>
    </div>
  );
};

