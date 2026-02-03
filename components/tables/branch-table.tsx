"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Branch, BranchStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"

interface BranchesListProps {
  branches?: Record<string, Branch>;
  onBranchSelect: (branch: Branch) => void;
}

const getBranchIndicator = (branch: Branch) => {
  const totalRating = branch.Pmax * branch.Circuits;
  const loading = totalRating > 0 ? (Math.abs(branch.P) / totalRating) * 100 : 0;

  const isTripped = branch.Status1 === BranchStatus.TRIP || (branch.Circuits === 2 && branch.Status2 === BranchStatus.TRIP);
  if (isTripped) {
    return { className: 'bg-destructive w-2.5 h-2.5 rounded-full', title: 'Tripped' };
  }

  let inServiceCircuits = 0;
  if (branch.Status1 === BranchStatus.IN) inServiceCircuits++;
  if (branch.Circuits === 2 && branch.Status2 === BranchStatus.IN) inServiceCircuits++;

  if (inServiceCircuits === 0) {
    return { className: 'border border-muted-foreground w-2.5 h-2.5 rounded-full', title: 'Out-of-Service' };
  }

  // If in service, check for overload
  if (loading > 100) {
    return { className: 'bg-[var(--color-warning)] w-2.5 h-2.5 rounded-full', title: `Overloaded: ${loading.toFixed(0)}%` };
  }

  // If in service and not overloaded
  return { className: 'bg-[var(--color-status-in)] w-2.5 h-2.5 rounded-full', title: `In-Service: ${loading.toFixed(0)}%` };
};

export function BranchesList({ branches, onBranchSelect }: BranchesListProps) {
  return (
    <div>
      <Table>
        <caption className="sr-only">A sortable list of all transmission lines in the grid. Select a line to view its details.</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-[60%] min-w-[180px] text-muted-foreground">Line</TableHead>
            <TableHead scope="col" className="w-[40%] min-w-[140px] text-right text-muted-foreground">State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches && Object.values(branches).length > 0 ? (
            Object.values(branches)
              .sort((a, b) => `${a.sub1?.Name}-${a.sub2?.Name}`.localeCompare(`${b.sub1?.Name}-${b.sub2?.Name}`))
              .map(branch => {
                const totalRating = branch.Pmax * branch.Circuits;
                const loading = totalRating > 0 ? (Math.abs(branch.P) / totalRating) * 100 : 0;
                const indicator = getBranchIndicator(branch);

                let inServiceCircuits = 0;
                if (branch.Status1 === BranchStatus.IN) inServiceCircuits++;
                if (branch.Circuits === 2 && branch.Status2 === BranchStatus.IN) inServiceCircuits++;

                const barColor = loading > 100 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-status-in)]';

                return (
                  <TableRow key={branch.Number}>
                    <TableHead scope="row" className="font-medium text-xs py-2 truncate pr-4 text-foreground">
                      <Button
                        variant="link"
                        onClick={() => onBranchSelect(branch)}
                        className="p-0 h-auto text-foreground text-xs font-medium justify-start text-left"
                      >
                        {branch.sub1?.Name} - {branch.sub2?.Name}
                      </Button>
                    </TableHead>
                    <TableCell className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div role="img" aria-label={indicator.title} className={indicator.className} title={indicator.title} />
                        {inServiceCircuits > 0 && (
                           <>
                            <div
                              role="progressbar"
                              aria-valuenow={loading}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`Line loading: ${loading.toFixed(0)}%`}
                              title={`Loading: ${loading.toFixed(0)}%`}
                              className="h-1.5 w-16 rounded-full bg-muted"
                            >
                              <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(100, loading)}%` }} />
                            </div>
                            <span className="text-xs font-mono w-8 text-right text-foreground" aria-hidden="true">{loading.toFixed(0)}%</span>
                           </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
          ) : (
            <TableRow>
              <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                No lines to show.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}