"use client";

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider";
import { Substation, Unit, UnitStatus, LoadCategoryType } from "@/lib/game/types"
import { LoadTypeConfig, StatusConfig } from "@/lib/game/config"
import { Power, Play, Pause, FastForward } from "lucide-react"
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
 * Renders a slider for power control with an overlay showing actual output.
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

  // This is a trick to override the CSS variable for the range fill
  // used by the shadcn/ui Slider. We make it transparent so we can
  // show our own "actual output" bar underneath.
  const sliderStyle = {
    '--primary': 'transparent', // Hides the default blue range fill.
  } as React.CSSProperties;

  return (
    <div className={cn("w-full", !disabled ? "cursor-pointer" : "cursor-not-allowed")}>
      <div className="relative flex h-5 w-full items-center power-slider-wrapper">
        <div className="w-full" style={sliderStyle}>
          <Slider value={[setpoint]} onValueChange={onValueChange} onValueCommit={onValueCommit} min={0} max={pmax} step={1} disabled={disabled} />
        </div>
        <div className="pointer-events-none absolute top-1/2 h-2 w-full -translate-y-1/2" title={`Actual Output: ${actual.toFixed(0)} MW`}>
          <div className="h-full rounded-full bg-primary/80 border border-primary-foreground/30" style={{ width: `${outputPercentage}%` }} />
        </div>
      </div>
    </div>
  );
};

// --- Time Controls ---

interface TimeControllerProps {
  progress: number;
  isPaused: boolean;
  isFastForward: boolean;
  onTogglePause: () => void;
  onToggleFastForward: () => void;
}

export function TimeController({
  progress,
  isPaused,
  isFastForward,
  onTogglePause,
  onToggleFastForward
}: TimeControllerProps) {
  return (
      <div className="flex items-center gap-3 w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePause}
          aria-label={isPaused ? "Resume" : "Pause"}
          className="h-6 w-6 cursor-pointer shrink-0"
        >
          {isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
        </Button>
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden" title={`Day Progress: ${progress.toFixed(0)}%`}>
          <div
            className="h-full bg-primary transition-all duration-300 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <Button
          variant={isFastForward ? "secondary" : "ghost"}
          size="icon"
          onClick={onToggleFastForward}
          aria-label={isFastForward ? "Normal Speed" : "Fast Forward"}
          className="h-6 w-6 cursor-pointer shrink-0"
          disabled={isPaused}
        >
          <FastForward className={`h-4 w-4 ${isFastForward ? "fill-current" : ""}`} />
        </Button>
      </div>
  )
}
