"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Substation, SubstationCategory } from "@/lib/game/types"
import { GenerationTypeConfig } from "@/lib/game/config"
import { StatusIndicator } from "@/components/indicators/status-indicator"

interface SubstationsListProps {
  subs?: Record<string, Substation>;
  onSubstationSelect: (sub: Substation) => void;
}

const GenerationTypeIcon = ({ category }: { category: string }) => {
  const config = GenerationTypeConfig[category as SubstationCategory] || GenerationTypeConfig[SubstationCategory.Thermal];
  const Icon = config.icon;
  return (
    <Icon className={`w-3.5 h-3.5 ${config.tailwind.text}`} />
  );
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
                      <div className="flex items-center gap-1 flex-wrap">                        {sub.Category === SubstationCategory.Load 
                          ? sub.U.map((unit, index) => (
                              <StatusIndicator 
                                key={`indicator-${sub.Number}-${index}`} 
                                status={unit.Status}                                 category={SubstationCategory.Load} 
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