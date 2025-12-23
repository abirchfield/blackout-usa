"use client";

import { Substation, Unit, CATEGORY_LOAD } from "@/lib/game/types"
import { GeneratorUnitDetails } from "./generator-unit-details";
import { LoadUnitDetails } from "./load-unit-details";

interface UnitRowProps {
  sub: Substation;
  unit: Unit;
  index: number;
  onUnitAction: (subId: string, unitIndex: number) => void;
  onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
  setpointValue: number;
  onSetpointChange: (index: number, value: number) => void;
  isPaused?: boolean;
}

export function UnitRow({ sub, unit, index, onUnitAction, onSetSetpoint, setpointValue, onSetpointChange, isPaused }: UnitRowProps) {
  if (sub.Category === CATEGORY_LOAD) {
    return (
      <LoadUnitDetails
        sub={sub}
        unit={unit}
        index={index}
        onUnitAction={onUnitAction}
        isPaused={isPaused}
      />
    );
  }

  return (
    <GeneratorUnitDetails
      sub={sub}
      unit={unit}
      index={index}
      onUnitAction={onUnitAction}
      onSetSetpoint={onSetSetpoint}
      setpointValue={setpointValue}
      onSetpointChange={onSetpointChange}
      isPaused={isPaused}
    />
  );
}