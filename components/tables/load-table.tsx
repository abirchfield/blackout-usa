"use client";

import { Substation } from "@/lib/game/types";
import { LoadUnitDetails } from "@/components/controls";
import { cn } from "@/lib/utils";

interface LoadUnitsTableProps {
  sub: Substation;
  onUnitAction: (subId: string, unitIndex: number) => void;
  isPaused?: boolean;
  stickyHeader?: boolean;
}

export function LoadUnitsTable({
  sub,
  onUnitAction,
  isPaused,
  stickyHeader = false,
}: LoadUnitsTableProps) {
  return (
    <table className="w-full text-sm table-fixed">
      <thead className={cn("text-xs text-muted-foreground", stickyHeader && "sticky top-0 bg-background z-10")}>
        <tr className="border-b border-border/50">
          <th scope="col" className="p-2 text-center font-semibold w-[10%]">#</th>
          <th scope="col" className="p-2 text-left font-semibold w-[40%]">Type</th>
          <th scope="col" className="p-2 text-center font-semibold w-[20%]">Status</th>
          <th scope="col" className="p-2 text-right font-semibold w-[20%]">Load</th>
          <th scope="col" className="p-2 text-center font-semibold w-[10%]">Action</th>
        </tr>
      </thead>
      <tbody>
        {sub.U.map((unit, index) => (
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