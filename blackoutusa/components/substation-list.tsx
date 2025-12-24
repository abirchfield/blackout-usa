"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Substation, Unit, STATUS_IN, STATUS_DIS, STATUS_STARTUP, STATUS_SHUTDOWN, STATUS_TRIP, CATEGORY_LOAD, CATEGORY_WIND, CATEGORY_SOLAR, CATEGORY_NUCLEAR } from "@/lib/game/types"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { Wind, Sun, Atom, Flame, Plug } from "lucide-react"

interface SubstationsListProps {
  subs?: Record<string, Substation>;
  onSubstationSelect: (sub: Substation) => void;
}

const GenerationTypeIcon = ({ category }: { category: string }) => {
  const iconProps = { className: "w-3.5 h-3.5" };
  switch (category) {
    case CATEGORY_WIND:
      return <Wind {...iconProps} className="w-3.5 h-3.5 text-cyan-400" />;
    case CATEGORY_SOLAR:
      return <Sun {...iconProps} className="w-3.5 h-3.5 text-yellow-400" />;
    case CATEGORY_NUCLEAR:
      return <Atom {...iconProps} className="w-3.5 h-3.5 text-purple-400" />;
    case CATEGORY_LOAD:
      return <Plug {...iconProps} className="w-3.5 h-3.5 text-gray-500" />;
    default: // Assuming other types are thermal
      return <Flame {...iconProps} className="w-3.5 h-3.5 text-orange-400" />;
  }
};

export function SubstationsList({ subs, onSubstationSelect }: SubstationsListProps) {
  return (
    <div>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[45%] text-muted-foreground">Substation</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="w-[90px] text-right text-muted-foreground">Power</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subs && Object.values(subs).length > 0 ? (
            Object.values(subs)
              .sort((a, b) => a.Name.localeCompare(b.Name))
              .map(sub => {
                const totalPower = sub.U.reduce((acc, unit) => acc + unit.P, 0);
                return (
                  <TableRow key={sub.Number} className="cursor-pointer" onClick={() => onSubstationSelect(sub)}>
                    <TableCell className="font-medium text-xs py-2 truncate text-foreground">{sub.Name}</TableCell>
                    <TableCell className="py-2 pr-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {sub.Category === CATEGORY_LOAD 
                          ? sub.U.map((unit, index) => (
                              <StatusIndicator 
                                key={`indicator-${sub.Number}-${index}`} 
                                status={unit.Status} 
                                category={CATEGORY_LOAD} 
                                className="w-2 h-2"
                                title={`Circuit #${index + 1}: ${unit.Status}`} />
                            ))
                          : sub.U.map((unit, index) => (
                              <StatusIndicator 
                                key={`indicator-${sub.Number}-${index}`} 
                                status={unit.Status}
                                power={unit.P}
                                pmax={sub.Pmax / sub.Units}
                                className="w-2 h-2"
                                title={`Unit #${index + 1}: ${unit.Status} - ${unit.P.toFixed(0)} MW`} />
                            ))
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 text-foreground">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>{totalPower.toFixed(0)} MW</span>
                        <GenerationTypeIcon category={sub.Category} />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                No substations to show.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}