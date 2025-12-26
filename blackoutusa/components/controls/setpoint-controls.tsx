"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import React from "react";

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