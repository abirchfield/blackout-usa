"use client";

import { Slider } from "@/components/ui/slider";

interface SetpointControlProps {
  value: number;
  pmin: number;
  pmax: number;
  actualPower: number;
  onValueChange?: (newValue: number[]) => void;
  onValueCommit?: (newValue: number[]) => void;
  disabled: boolean;
}

/**
 * A reusable component that renders an annotated power slider.
 * It combines the setpoint slider with an overlay showing the actual power output.
 */
export const SetpointControl = ({
  value,
  pmin,
  pmax,
  actualPower,
  onValueChange,
  onValueCommit,
  disabled,
}: SetpointControlProps) => {
  // The output percentage should be based on the full range of the slider, from 0 to pmax.
  const outputPercentage = pmax > 0 ? (actualPower / pmax) * 100 : 0;

  return (
    <div className="w-[150px]">
      <div className="relative flex h-5 w-full items-center">
        <Slider value={[value]} onValueChange={onValueChange} onValueCommit={onValueCommit} min={0} max={pmax} step={1} disabled={disabled} />
        <div className="pointer-events-none absolute top-1/2 h-0.5 w-full -translate-y-1/2">
          <div
            className="h-full rounded-full bg-primary/90"
            style={{ width: `${outputPercentage}%` }}
            title={`Actual Output: ${actualPower.toFixed(0)} MW`} />
        </div>
      </div>
    </div>
  );
};