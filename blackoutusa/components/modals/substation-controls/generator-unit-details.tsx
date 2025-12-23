// components/gen-unit-details/generator-unit-details.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Substation, Unit, STATUS_IN, STATUS_DIS, STATUS_STARTUP, STATUS_SHUTDOWN, STATUS_TRIP } from "@/lib/game/types";

interface GeneratorUnitDetailsProps {
  sub: Substation;
  unit: Unit;
  index: number;
  onUnitAction: (subId: string, unitIndex: number) => void;
  onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
  setpointValue: number;
  onSetpointChange: (index: number, value: number) => void;
  isPaused?: boolean;
}

/**
 * Renders the detailed view and controls for a single generator unit.
 */
export function GeneratorUnitDetails({
  sub,
  unit,
  index,
  onUnitAction,
  onSetSetpoint,
  setpointValue,
  onSetpointChange,
  isPaused,
}: GeneratorUnitDetailsProps) {
  const pmax_unit = sub.Pmax / sub.Units;
  const pmin_unit = sub.Pmin / sub.Units;

  // Coerce setpointValue to a number and clamp it to be safe.
  const numericSetpoint = Math.max(pmin_unit, Math.min(pmax_unit, Number(setpointValue) || 0));

  const handleSliderChange = (newValue: number[]) => {
    // Clamp the value here to ensure the state in the parent is always valid.
    const clampedValue = Math.max(pmin_unit, Math.min(pmax_unit, newValue[0]));
    onSetpointChange(index, clampedValue);
  };
  const handleSliderCommit = (newValue: number[]) => {
    onSetSetpoint(sub.Number, index, newValue[0]);
  };

  /**
   * Renders the status badge and text for the generator unit.
   */
  const renderStatusContent = () => {
    switch (unit.Status) {
      case STATUS_IN:
        return (
          <div className="flex items-center gap-2">
            <p className="font-bold">Unit #{index + 1}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">IN-SERVICE</span>
          </div>
        );
      case STATUS_DIS:
        return (
          <div className="flex items-center gap-2">
            <p className="font-bold">Unit #{index + 1}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-medium">OUT-OF-SERVICE</span>
          </div>
        );
      case STATUS_STARTUP:
        return (
          <div className="flex items-center gap-2">
            <p className="font-bold">Unit #{index + 1}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium animate-pulse">STARTING UP</span>
          </div>
        );
      case STATUS_SHUTDOWN:
        return (
          <div className="flex items-center gap-2">
            <p className="font-bold">Unit #{index + 1}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-medium">SHUTTING DOWN</span>
          </div>
        );
      case STATUS_TRIP:
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-bold">Unit #{index + 1}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">TRIPPED</span>
            </div>
            <p className="text-red-500 text-sm">Cannot be restarted.</p>
          </div>
        );
      default:
        return <p className="font-bold">Unit #{index + 1} ({unit.Status})</p>;
    }
  };

  /**
   * Renders the action controls (slider, power display, buttons) for the generator unit.
   */
  const renderActionControls = () => {
    switch (unit.Status) {
      case STATUS_IN:
        const outputPercentage = pmax_unit > 0 ? (unit.P / pmax_unit) * 100 : 0;
        return (
          <div className="flex items-center gap-4 w-full">
            <div className="w-[150px] space-y-2">
              <Slider
                value={[numericSetpoint]}
                onValueChange={handleSliderChange}
                onValueCommit={handleSliderCommit}
                min={pmin_unit}
                max={pmax_unit}
                step={1}
                disabled={isPaused}
              />
              <div className="h-1.5 w-full rounded-full bg-muted" title={`Actual Output: ${unit.P.toFixed(0)} MW`}>
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${outputPercentage}%` }}
                />
              </div>
            </div>
            <div className="text-sm font-mono text-right w-[80px]">
              <p className="font-bold">{numericSetpoint.toFixed(0)} MW</p>
              <p className="text-foreground/80">{unit.P.toFixed(0)} MW</p>
            </div>
            <div className="w-28 flex justify-end">
              <Button variant="destructive" size="sm" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused}>Shut Down</Button>
            </div>
          </div>
        );
      case STATUS_DIS:
        return (
          <div className="flex items-center justify-end gap-4 w-full">
            <div className="w-[150px] space-y-2">
              <Slider defaultValue={[pmin_unit]} min={pmin_unit} max={pmax_unit} disabled={true} />
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary/50"
                  style={{ width: `0%` }}
                />
              </div>
            </div>
            <div className="text-sm font-mono text-right w-[80px]">
              <p className="font-bold text-muted-foreground">--- MW</p>
              <p className="text-foreground/80">--- MW</p>
            </div>
            <div className="w-28 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => onUnitAction(sub.Number, index)} title={`Startup Time: ${(sub.StartTime / 60).toFixed(1)} hr`} disabled={isPaused}>
                Start Up
              </Button>
            </div>
          </div>
        );
      case STATUS_STARTUP:
        const startupProgress = sub.StartTime > 0 ? (unit.StatusCount / sub.StartTime) * 100 : 0;
        const radius = 16;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (startupProgress / 100) * circumference;
        const timeRemaining = Math.max(0, sub.StartTime - unit.StatusCount);
        const timeRemainingLabel = timeRemaining > 60 ? `${(timeRemaining / 60).toFixed(1)}h` : `${timeRemaining.toFixed(0)}m`;
        return (
          <div className="flex items-center justify-end gap-4 w-full">
            <div className="w-[150px] space-y-2">
              <Slider value={[unit.P]} min={pmin_unit} max={pmax_unit} disabled={true} />
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary/50 transition-all" style={{ width: `0%` }}/>
              </div>
            </div>
            <div className="text-sm font-mono text-right w-[80px]">
              <p className="font-bold text-muted-foreground">--- MW</p>
              <p className="text-foreground/80">{unit.P.toFixed(0)} MW</p>
            </div>
            <div className="w-28 flex justify-center">
              <div className="relative w-10 h-10" title={`Time until online: ${timeRemainingLabel}`}>
                <svg className="w-full h-full" viewBox="0 0 40 40">
                  <circle className="text-primary/20" strokeWidth="4" stroke="currentColor" fill="transparent" r={radius} cx="20" cy="20" />
                  <circle className="text-primary" strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="20" cy="20" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-primary-foreground">{timeRemainingLabel}</span>
              </div>
            </div>
          </div>
        );
      case STATUS_SHUTDOWN:
        const shutdownOutputPercentage = pmax_unit > 0 ? (unit.P / pmax_unit) * 100 : 0;
        return (
          <div className="flex items-center justify-end gap-4 w-full">
            <div className="w-[150px] space-y-2">
              <Slider value={[unit.P]} min={pmin_unit} max={pmax_unit} disabled={true} />
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary/50 transition-all"
                  style={{ width: `${shutdownOutputPercentage}%` }}
                />
              </div>
            </div>
            <div className="text-sm font-mono text-right w-[80px]">
              <p className="font-bold text-muted-foreground">--- MW</p>
              <p className="text-foreground/80">{unit.P.toFixed(0)} MW</p>
            </div>
            <div className="w-28" /> {/* Placeholder for button */}
          </div>
        );
      case STATUS_TRIP:
        return null; // Tripped units have no actions
      default:
        return null;
    }
  };

  return (
    <>
      <Separator />
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-6 py-3 text-sm">
        {/* Col 1: Unit Info */}
        <div className="w-[200px]">
          {renderStatusContent()}
        </div>

        {/* Col 2: Financials / Status Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="whitespace-nowrap">Op: <span className="font-mono">${sub.FixedCost}/hr</span></p>
          <p className="whitespace-nowrap">Fuel: <span className="font-mono">${sub.FuelCost.toFixed(0)}/MW/hr</span></p>
        </div>

        {/* Col 3: Actions */}
        <div className="justify-self-end">
          {renderActionControls()}
        </div>
      </div>
    </>
  );
}