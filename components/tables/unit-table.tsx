"use client";

import { Substation, Unit, UnitStatus } from "@/lib/types";
import { Timer, Power, X } from "lucide-react";
import { cn, hcVariant } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PowerSlider } from "@/components/game/controls";
import { StatusConfig } from "@/components/theme";

export interface ColumnConfig {
  unit?: boolean;
  status?: boolean;
  output?: boolean;
  setpoint?: boolean;
  actual?: boolean;
  time?: boolean;
  action?: boolean;
}

const defaultColumnConfig: Required<ColumnConfig> = {
  unit: true,
  status: true,
  output: true,
  setpoint: false,
  actual: true,
  time: true,
  action: true,
};

const MINUTES_IN_HOUR = 60;
const formatTimeRemaining = (minutes: number): string => {
  if (minutes > MINUTES_IN_HOUR) {
    const hours = minutes / MINUTES_IN_HOUR;
    return `${hours.toFixed(1)}h`;
  }
  return `${minutes.toFixed(0)}m`;
};

interface GeneratorUnitDetailsProps {
  sub: Substation;
  unit: Unit;
  index: number;
  onUnitAction: (subId: string, unitIndex: number) => void;
  onAbortTransition?: (subId: string, unitIndex: number) => void;
  onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
  setpointValue: number;
  onSetpointChange: (index: number, value: number) => void;
  isPaused?: boolean;
  isHighContrast?: boolean;
  columnConfig?: ColumnConfig;
}

export function GeneratorUnitDetails({
  sub,
  unit,
  index,
  onUnitAction,
  onAbortTransition,
  onSetSetpoint,
  setpointValue,
  onSetpointChange,
  isPaused,
  isHighContrast,
  columnConfig: rawColumnConfig,
}: GeneratorUnitDetailsProps) {
  const pmax_unit = unit.Pmax;
  const pmin_unit = unit.Pmin;
  const columnConfig = { ...defaultColumnConfig, ...rawColumnConfig };

  // Coerce the setpoint from props to a number and clamp it to be safe for the UI.
  const numericSetpoint = Math.max(pmin_unit, Math.min(pmax_unit, Number(setpointValue) || 0));

  const handleSliderChange = (newValue: number[]) => {
    const clampedValue = Math.max(pmin_unit, Math.min(pmax_unit, newValue[0]));
    onSetpointChange(index, clampedValue);
  };
  const handleSliderCommit = (newValue: number[]) => {
    onSetSetpoint(sub.Number, index, newValue[0]);
  };

  const config = StatusConfig[unit.Status];
  const StatusIcon = config.icon;

  let controlElement: React.ReactNode = null;
  let actualElement: React.ReactNode = '---';
  let timeElement: React.ReactNode = null;
  let actionButtonElement: React.ReactNode = null;
  const mwSuffix = <span className="text-xs text-muted-foreground ml-1">MW</span>;
  if (unit.Status !== UnitStatus.TRIP) {
    actualElement = <>{unit.P.toFixed(0)}{mwSuffix}</>;

    const sliderProps = {
      setpoint: numericSetpoint,
      actual: unit.P,
      pmax: pmax_unit,
      disabled: !!isPaused,
    };

    switch (unit.Status) {
      case UnitStatus.IN:
        const rampTimeHours = (unit.StartTime / 60).toFixed(1);
        controlElement = <PowerSlider {...sliderProps} onValueChange={handleSliderChange} onValueCommit={handleSliderCommit} />;
        timeElement = (
          <time
            className="text-xs text-muted-foreground"
            dateTime={`PT${unit.StartTime}M`}
            title={`Characteristic ramp time: ${rampTimeHours} hr`}
            aria-label={`Characteristic ramp time: ${rampTimeHours} hours`}
          >
            {rampTimeHours} hr
          </time>
        );
        actionButtonElement = <Button variant="destructive" size="icon" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused} aria-label={`Shut Down Unit ${index + 1}`}><Power className="h-5 w-5" aria-hidden="true" /></Button>;
        break;
      case UnitStatus.DIS:
        const startupTimeHours = (unit.StartTime / 60).toFixed(1);
        controlElement = <PowerSlider {...sliderProps} actual={0} disabled={true} />;
        actualElement = <>{(0).toFixed(0)}{mwSuffix}</>;
        timeElement = (
          <time
            className="text-xs text-muted-foreground"
            dateTime={`PT${unit.StartTime}M`}
            title={`Startup Time: ${startupTimeHours} hr`}
            aria-label={`Startup time: ${startupTimeHours} hours`}
          >
            {startupTimeHours} hr
          </time>
        );
        actionButtonElement = <Button variant={hcVariant(isHighContrast ?? false)} size="icon" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused} aria-label={`Start Up Unit ${index + 1}`}><Power className="h-5 w-5" aria-hidden="true" /></Button>;
        break;
      case UnitStatus.STARTUP:
        controlElement = <PowerSlider {...sliderProps} disabled={true} />;
        const startupTimeRemaining = Math.max(0, unit.StartTime - unit.StatusCount);
        const formattedStartupTime = formatTimeRemaining(startupTimeRemaining);
        timeElement = (
          <time
            className="text-xs text-[var(--color-status-startup)]"
            dateTime={`PT${startupTimeRemaining}M`}
            title={`Time until online: ${formattedStartupTime}`}
            aria-label={`Time until online: ${formattedStartupTime}`}
          >
            {formattedStartupTime}
          </time>
        );
        actionButtonElement = onAbortTransition ? (
          <Button variant="outline" size="icon" onClick={() => onAbortTransition(sub.Number, index)} disabled={isPaused} aria-label={`Abort startup of Unit ${index + 1}`} className="border-[var(--color-status-startup)] text-[var(--color-status-startup)] hover:bg-[var(--color-status-startup)]/10">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="secondary" size="icon" disabled={true} aria-label={`Unit ${index + 1} is starting up`} className="animate-pulse"><Power className="h-5 w-5" aria-hidden="true" /></Button>
        );
        break;
      case UnitStatus.SHUTDOWN:
        controlElement = <PowerSlider {...sliderProps} disabled={true} />;
        const shutdownTimeRemaining = Math.max(0, unit.StartTime - unit.StatusCount);
        const formattedShutdownTime = formatTimeRemaining(shutdownTimeRemaining);
        timeElement = (
          <time
            className="text-xs text-muted-foreground"
            dateTime={`PT${shutdownTimeRemaining}M`}
            title={`Time until offline: ${formattedShutdownTime}`}
            aria-label={`Time until offline: ${formattedShutdownTime}`}
          >
            {formattedShutdownTime}
          </time>
        );
        actionButtonElement = onAbortTransition ? (
          <Button variant="outline" size="icon" onClick={() => onAbortTransition(sub.Number, index)} disabled={isPaused} aria-label={`Abort shutdown of Unit ${index + 1}`} className="border-destructive text-destructive hover:bg-destructive/10">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="destructive" size="icon" disabled={true} aria-label={`Unit ${index + 1} is shutting down`} className="animate-pulse"><Power className="h-5 w-5" aria-hidden="true" /></Button>
        );
        break;
    }
  }

  return (
    <tr className="border-t border-border/50 align-middle" aria-labelledby={`unit-row-header-${sub.Number}-${index}`}>
      {columnConfig.unit && (
        <th scope="row" id={`unit-row-header-${sub.Number}-${index}`} className="p-2 align-middle font-bold text-center">{index + 1}</th>
      )}
      {columnConfig.status && (
        <td className="p-2 align-middle text-center">
          {StatusIcon && (
            <StatusIcon role="img" aria-label={config.label} className={cn("h-5 w-5 mx-auto", config.tailwind.text)} title={config.label} />
          )}
        </td>
      )}
      {columnConfig.output && (
        <td className="p-2 align-middle">{controlElement}</td>
      )}
      {columnConfig.actual && (
        <td className="p-2 font-mono align-middle text-right">{actualElement}</td>
      )}
      {columnConfig.time && (
        <td className="p-2 align-middle text-right">{timeElement}</td>
      )}
      {columnConfig.action && (
        <td className="p-2 align-middle text-center">{actionButtonElement}</td>
      )}
    </tr>
  );
}

interface GeneratorUnitsTableProps {
  sub: Substation;
  onUnitAction: (subId: string, unitIndex: number) => void;
  onAbortTransition?: (subId: string, unitIndex: number) => void;
  onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
  setpoints: Record<number, number>;
  onSetpointChange: (index: number, value: number) => void;
  isPaused?: boolean;
  isHighContrast?: boolean;
  stickyHeader?: boolean;
  columnConfig?: ColumnConfig;
}

export function GeneratorUnitsTable({
  sub,
  onUnitAction,
  onAbortTransition,
  onSetSetpoint,
  setpoints,
  onSetpointChange,
  isPaused,
  isHighContrast,
  stickyHeader = false,
  columnConfig: rawColumnConfig,
}: GeneratorUnitsTableProps) {
  const columnConfig = { ...defaultColumnConfig, ...rawColumnConfig };

  return (
    <table className="w-full text-sm table-fixed">
      <thead className={cn("text-xs text-muted-foreground", stickyHeader && "sticky top-0 bg-background z-10")}>
        <tr className="border-b border-border/50">
          {columnConfig.unit && <th className="p-2 text-center font-semibold w-[6%]">#</th>}
          {columnConfig.status && <th className="p-2 text-center font-semibold w-[8%]">Status</th>}
          {columnConfig.output && <th className="p-2 text-left font-semibold w-[46%]">Setpoint</th>}
          {columnConfig.actual && <th className="p-2 text-right font-semibold w-[16%]">Output</th>}
          {columnConfig.time && <th className="p-2 text-right font-semibold w-[12%]"><Timer className="h-4 w-4 inline" role="img" aria-label="Time to change state" /></th>}
          {columnConfig.action && <th className="p-2 text-center font-semibold w-[12%]">Action</th>}
        </tr>
      </thead>
      <tbody>
        {sub.U.map((unit, index) => (
          <GeneratorUnitDetails
            key={index}
            sub={sub}
            unit={unit}
            index={index}
            onUnitAction={onUnitAction}
            onAbortTransition={onAbortTransition}
            onSetSetpoint={onSetSetpoint}
            setpointValue={setpoints[index] ?? 0}
            onSetpointChange={onSetpointChange}
            isPaused={isPaused}
            isHighContrast={isHighContrast}
            columnConfig={columnConfig}
          />
        ))}
      </tbody>
    </table>
  );
}