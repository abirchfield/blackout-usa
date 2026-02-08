"use client";

import { Substation, Unit } from "@/lib/types";
import { LoadUnitDetails } from "@/components/game/controls";
import { cn } from "@/lib/utils";

interface LoadUnitsTableProps {
  sub: Substation;
  units?: Unit[];
  onUnitAction: (subId: string, unitIndex: number) => void;
  isPaused?: boolean;
  stickyHeader?: boolean;
}

export function LoadUnitsTable({
  sub,
  units,
  onUnitAction,
  isPaused,
  stickyHeader = false,
}: LoadUnitsTableProps) {
  const loadUnits = units ?? sub.U;
  return (
    <table className="w-full text-sm table-fixed">
      <thead className={cn("text-xs text-muted-foreground", stickyHeader && "sticky top-0 bg-background z-10")}>
        <tr className="border-b border-border/50">
          <th scope="col" className="p-2 text-center font-semibold w-[8%]">#</th>
          <th scope="col" className="p-2 text-left font-semibold w-[25%]">Type</th>
          <th scope="col" className="p-2 text-center font-semibold w-[12%]">Status</th>
          <th scope="col" className="p-2 text-right font-semibold w-[15%]">Load</th>
          <th scope="col" className="p-2 text-left font-semibold w-[28%]">Loading</th>
          <th scope="col" className="p-2 text-center font-semibold w-[12%]">Action</th>
        </tr>
      </thead>
      <tbody>
        {loadUnits.map((unit, index) => (
          <LoadUnitDetails
            key={index}
            sub={sub}
            unit={unit}
            index={index}
            onUnitAction={onUnitAction}
            isPaused={isPaused}
          />
        ))}
      </tbody>
    </table>
  );
}