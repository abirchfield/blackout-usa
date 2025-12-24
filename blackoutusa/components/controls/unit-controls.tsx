// components/gen-unit-details/generator-unit-details.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Substation, Unit, UnitStatus } from "@/lib/game/types";
import { StartupDial } from "../indicators/startup-indicator";

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

const statusStyles: Record<UnitStatus, { text: string; className: string }> = {
  [UnitStatus.IN]: { text: 'IN-SERVICE', className: 'bg-green-500/20 text-green-400' },
  [UnitStatus.DIS]: { text: 'OUT-OF-SERVICE', className: 'bg-gray-500/20 text-gray-400' },
  [UnitStatus.STARTUP]: { text: 'STARTING UP', className: 'bg-yellow-500/20 text-yellow-400 animate-pulse' },
  [UnitStatus.SHUTDOWN]: { text: 'SHUTTING DOWN', className: 'bg-gray-500/20 text-gray-400' },
  [UnitStatus.TRIP]: { text: 'TRIPPED', className: 'bg-red-500/20 text-red-400' },
};

/**
 * A reusable component that renders an annotated power slider and labeled numeric display.
 */
const PowerControl = ({
  setpoint,
  actual,
  pmin,
  pmax,
  onValueChange,
  onValueCommit,
  disabled,
  showSetpoint = true,
}: {
  setpoint: number;
  actual: number;
  pmin: number;
  pmax: number;
  onValueChange?: (newValue: number[]) => void;
  onValueCommit?: (newValue: number[]) => void;
  disabled: boolean;
  showSetpoint?: boolean;
}) => {
  // Percentages should be based on the full range of the slider, from 0 to pmax.
  const outputPercentage = pmax > 0 ? (actual / pmax) * 100 : 0;
  const pminPercentage = pmax > 0 ? (pmin / pmax) * 100 : 0;

  return (
    <div className="flex items-center gap-x-4">
      <div className="w-[150px]">
        <div className="relative flex h-5 w-full items-center">
          {/* The slider for SETPOINT. Its own fill is hidden by making it transparent. */}
          <div className="w-full" style={{ "--primary": "transparent" } as React.CSSProperties}>
            <Slider value={[setpoint]} onValueChange={onValueChange} onValueCommit={onValueCommit} min={0} max={pmax} step={1} disabled={disabled} />
          </div>
          {/* The fill for ACTUAL power. This is an overlay. */}
          <div
            className="pointer-events-none absolute top-1/2 h-2 w-full -translate-y-1/2"
            title={`Actual Output: ${actual.toFixed(0)} MW`}
          >
            <div
              className="h-full rounded-full bg-primary/80"
              style={{ width: `${outputPercentage}%` }}
            />
          </div>
        </div>
      </div>
      <div className="text-sm font-mono text-right w-[100px] space-y-1">
        <div className="flex items-baseline justify-end gap-1.5">
          <span className="text-xs text-muted-foreground">Set:</span>
          <span className={`font-bold w-[4ch] text-right ${!showSetpoint ? 'text-muted-foreground' : ''}`}>
            {showSetpoint ? setpoint.toFixed(0) : '---'}
          </span>
          <span className="text-xs text-muted-foreground">MW</span>
        </div>
        <div className="flex items-baseline justify-end gap-1.5">
          <span className="text-xs text-muted-foreground">Actual:</span>
          <span className="font-bold w-[4ch] text-right">
            {actual.toFixed(0)}
          </span>
          <span className="text-xs text-muted-foreground">MW</span>
        </div>
      </div>
    </div>
  );
};
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

  // Coerce the setpoint from props to a number and clamp it to be safe for the UI.
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
    const style = statusStyles[unit.Status];

    if (!style) {
      return <p className="font-bold">Unit #{index + 1} ({unit.Status})</p>;
    }

    return (
      <div>
        <div className="flex items-baseline gap-2">
          <p className="font-bold">Unit #{index + 1}</p>
          {unit.Status === UnitStatus.TRIP && <p className="text-red-500 text-sm whitespace-nowrap">Cannot be restarted.</p>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.className}`}>
          {style.text}
        </span>
      </div>
    );
  };

  /**
   * Renders the action controls (slider, power display, buttons) for the generator unit.
   */
  const renderActionControls = () => {
    if (unit.Status === UnitStatus.TRIP) return null;

    let powerControlProps: Omit<React.ComponentProps<typeof PowerControl>, 'pmin' | 'pmax'>;
    let actionElement: React.ReactNode = <div className="w-28" />; // Default placeholder

    switch (unit.Status) {
      case UnitStatus.IN:
        powerControlProps = {
          setpoint: numericSetpoint,
          actual: unit.P,
          onValueChange: handleSliderChange,
          onValueCommit: handleSliderCommit,
          disabled: !!isPaused,
          showSetpoint: true,
        };
        actionElement = (
          <div className="w-28 flex justify-end">
            <Button variant="destructive" size="sm" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused}>Shut Down</Button>
          </div>
        );
        break;
      case UnitStatus.DIS:
        powerControlProps = {
          setpoint: numericSetpoint,
          actual: 0,
          disabled: true,
          showSetpoint: true,
        };
        actionElement = (
          <div className="w-28 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => onUnitAction(sub.Number, index)} title={`Startup Time: ${(sub.StartTime / 60).toFixed(1)} hr`} disabled={isPaused}>
              Start Up
            </Button>
          </div>
        );
        break;
      case UnitStatus.STARTUP:
        powerControlProps = {
          setpoint: numericSetpoint,
          actual: unit.P,
          disabled: true,
          showSetpoint: true,
        };
        actionElement = (
          <div className="w-28 flex justify-center">
            <StartupDial startTime={sub.StartTime} statusCount={unit.StatusCount} />
          </div>
        );
        break;
      case UnitStatus.SHUTDOWN:
        powerControlProps = {
          setpoint: numericSetpoint,
          actual: unit.P,
          disabled: true,
          showSetpoint: true,
        };
        // actionElement is the default placeholder
        break;
      default:
        return null;
    }

    return (
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        <PowerControl
          pmin={pmin_unit}
          pmax={pmax_unit}
          {...powerControlProps}
        />
        {actionElement}
      </div>
    );
  };

  return (
    <>
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 py-3 text-sm">
        {/* Left part: Unit status and financial info */}
        <div className="flex items-center gap-x-4">
          <div className="w-auto flex-shrink-0">
            {renderStatusContent()}
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs text-muted-foreground hidden sm:grid">
            <span>Op. Cost:</span>
            <span className="font-mono text-right text-foreground">${sub.FixedCost}/hr</span>
            <span>Fuel Cost:</span>
            <span className="font-mono text-right text-foreground">${sub.FuelCost.toFixed(0)}/MW/hr</span>
          </div>
        </div>

        {/* Right part: Action controls */}
        <div className="w-full sm:w-auto">
          {renderActionControls()}
        </div>
      </div>
    </>
  );
}