"use client";

import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Substation, Unit } from "@/lib/game/types"

interface UnitRowProps {
  sub: Substation;
  unit: Unit;
  index: number;
  onUnitAction: (subId: string, unitIndex: number) => void;
  onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
  setpointValue: number;
  onSetpointChange: (index: number, value: number) => void;
}

export function UnitRow({ sub, unit, index, onUnitAction, onSetSetpoint, setpointValue, onSetpointChange }: UnitRowProps) {
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

  const renderContent = () => {
    switch (unit.Status) {
      case "IN":
        return (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold">Unit #{index + 1}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">IN-SERVICE</span>
            </div>
          </div>
        );
      case "DIS":
        return (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold">Unit #{index + 1}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-medium">OUT-OF-SERVICE</span>
            </div>
          </div>
        );
      case "STARTUP":
        return (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold">Unit #{index + 1}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium animate-pulse">STARTING UP</span>
            </div>
          </div>
        );
      case "SHUTDOWN":
        return (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold">Unit #{index + 1}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-medium">SHUTTING DOWN</span>
            </div>
          </div>
        );
      case "TRIP":
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-bold">Unit #{index + 1}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">TRIPPED</span>
            </div>
            <p className="text-red-500 text-sm">Cannot be restarted.</p>
          </div>
        );
    }
  };

  const renderActions = () => {
    switch (unit.Status) {
      case "IN":
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
              <Button variant="destructive" size="sm" onClick={() => onUnitAction(sub.Number, index)}>Shut Down</Button>
            </div>
          </div>
        )
      case "DIS":
        return (
          <div className="flex items-center justify-end gap-4 w-full">
            <div className="w-[150px] space-y-2">
              <Slider defaultValue={[pmin_unit]} min={pmin_unit} max={pmax_unit} disabled />
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
              <Button variant="secondary" size="sm" onClick={() => onUnitAction(sub.Number, index)} title={`Startup Time: ${(sub.StartTime / 60).toFixed(1)} hr`}>
                Start Up
              </Button>
            </div>
          </div>
        );
      case "STARTUP":
        const startupProgress = sub.StartTime > 0 ? (unit.StatusCount / sub.StartTime) * 100 : 0;
        const radius = 16;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (startupProgress / 100) * circumference;
        const timeRemaining = Math.max(0, sub.StartTime - unit.StatusCount);
        const timeRemainingLabel = timeRemaining > 60 ? `${(timeRemaining / 60).toFixed(1)}h` : `${timeRemaining.toFixed(0)}m`;
        return (
          <div className="flex items-center justify-end gap-4 w-full">
            <div className="w-[150px] space-y-2">
              <Slider value={[unit.P]} min={pmin_unit} max={pmax_unit} disabled />
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
      case "SHUTDOWN":
        const shutdownOutputPercentage = pmax_unit > 0 ? (unit.P / pmax_unit) * 100 : 0;
        return (
          <div className="flex items-center justify-end gap-4 w-full">
            <div className="w-[150px] space-y-2">
              <Slider value={[unit.P]} min={pmin_unit} max={pmax_unit} disabled />
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
      case "TRIP":
        return null;
      default:
        return null;
    }
  };
  
  const renderLoadActions = () => {
    switch (unit.Status) {
      case "IN":
        return <Button variant="destructive" size="sm" onClick={() => onUnitAction(sub.Number, index)}>Disconnect</Button>;
      case "DIS":
        return <Button variant="secondary" size="sm" onClick={() => onUnitAction(sub.Number, index)}>Connect</Button>;
      case "TRIP":
        return null;
      default:
        return null;
    }
  }

  const renderLoadContent = () => {
    switch (unit.Status) {
      case "IN":
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-bold">Circuit #{index + 1}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/20 text-foreground font-medium">IN-SERVICE</span>
            </div>
            <p className="text-sm font-mono">{unit.P.toFixed(0)} MW</p>
          </div>
        );
      case "DIS":
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-bold">Circuit #{index + 1}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 font-medium">OUT-OF-SERVICE</span>
            </div>
          </div>
        );
      case "TRIP":
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
  }

  if (sub.Category === "Load") {
    return (
      <>
        <Separator />
        <div className="flex justify-between items-center py-3">
          <div className="text-sm">
            {renderLoadContent()}
          </div>
          <div className="shrink-0">
            {renderLoadActions()}
          </div>
        </div>
      </>
    );
  }

  // Consistent 3-column layout for all generator units
  return (
    <>
      <Separator />
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-6 py-3 text-sm">
        {/* Col 1: Unit Info */}
        <div className="w-[200px]">
          {renderContent()}
        </div>

        {/* Col 2: Financials / Status Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="whitespace-nowrap">Op: <span className="font-mono">${sub.FixedCost}/hr</span></p>
          <p className="whitespace-nowrap">Fuel: <span className="font-mono">${sub.FuelCost.toFixed(0)}/MW/hr</span></p>
        </div>

        {/* Col 3: Actions */}
        <div className="justify-self-end">
          {renderActions()}
        </div>
      </div>
    </>
  );
}