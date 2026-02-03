"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Substation, SubstationCategory } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { GenerationTypeConfig } from "@/lib/config"
import { StatusIndicator } from "@/components/ui/status-indicator"

interface SubstationsListProps {
  subs?: Record<string, Substation>;
  onSubstationSelect: (sub: Substation) => void;
}

const GenerationTypeIcon = ({ category, ...props }: { category: string } & React.ComponentProps<"svg">) => {
  const config = GenerationTypeConfig[category as SubstationCategory] || GenerationTypeConfig[SubstationCategory.Thermal];
  const Icon = config.icon;
  return (
    <Icon className={`w-3.5 h-3.5 ${config.tailwind.text}`} {...props} />
  );
};

export function SubstationsList({ subs, onSubstationSelect }: SubstationsListProps) {
  return (
    <div>
      <Table>
        <caption className="sr-only">A sortable list of all substations in the grid. Select a substation to view its details.</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-[40%] min-w-[140px] text-muted-foreground">Substation</TableHead>
            <TableHead scope="col" className="w-[35%] min-w-[120px] text-muted-foreground">Status</TableHead>
            <TableHead scope="col" className="w-[25%] min-w-[100px] text-right text-muted-foreground">Power</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subs && Object.values(subs).length > 0 ? (
            Object.values(subs)
              .sort((a, b) => a.Name.localeCompare(b.Name))
              .map(sub => {
                const totalPower = sub.U.reduce((acc, unit) => acc + unit.P, 0);
                return (
                  <TableRow key={sub.Number}>
                    <TableHead scope="row" className="font-medium text-xs py-2 truncate pr-4 text-foreground">
                      <Button
                        variant="link"
                        onClick={() => onSubstationSelect(sub)}
                        className="p-0 h-auto text-foreground text-xs font-medium justify-start text-left"
                      >
                        {sub.Name}
                      </Button>
                    </TableHead>
                    <TableCell className="py-2 pr-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {sub.Category === SubstationCategory.Load
                          ? sub.U.map((unit, index) => {
                            const title = `Circuit #${index + 1}: ${unit.Status}`;
                            return (
                              <span key={`indicator-${sub.Number}-${index}`} role="img" aria-label={title}>
                                <StatusIndicator status={unit.Status} category={SubstationCategory.Load} className="w-2.5 h-2.5" title={title} />
                              </span>
                            );
                          })
                          : sub.U.map((unit, index) => {
                            const title = `Unit #${index + 1}: ${unit.Status} - ${unit.P.toFixed(0)} MW`;
                            return (
                              <span key={`indicator-${sub.Number}-${index}`} role="img" aria-label={title}>
                                <StatusIndicator status={unit.Status} power={unit.P} pmax={sub.Pmax / sub.Units} className="w-2.5 h-2.5" title={title} />
                              </span>
                            );
                          })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs py-2 text-foreground whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>{totalPower.toFixed(0)} MW</span>
                        <span className="sr-only">{sub.Category}</span>
                        <GenerationTypeIcon category={sub.Category} aria-hidden="true" />
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