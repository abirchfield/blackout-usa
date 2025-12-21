"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Branch, STATUS_IN, STATUS_TRIP } from "@/lib/game/types"

interface BranchesListProps {
  branches?: Record<string, Branch>;
  onBranchSelect: (branch: Branch) => void;
}

export function BranchesList({ branches, onBranchSelect }: BranchesListProps) {
  return (
    <div className="max-h-[calc(100vh-22rem)] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Line</TableHead>
            <TableHead className="text-right">State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches && Object.values(branches).length > 0 ? (
            Object.values(branches)
              .sort((a, b) => `${a.sub1?.Name}-${a.sub2?.Name}`.localeCompare(`${b.sub1?.Name}-${b.sub2?.Name}`))
              .map(branch => {
                const totalRating = branch.Pmax * branch.Circuits;
                const loading = totalRating > 0 ? (Math.abs(branch.P) / totalRating) * 100 : 0;

                let inServiceCircuits = 0;
                if (branch.Status1 === STATUS_IN) inServiceCircuits++;
                if (branch.Circuits === 2 && branch.Status2 === STATUS_IN) inServiceCircuits++;

                let statusElement;
                if (inServiceCircuits === 0) {
                  const isTripped = branch.Status1 === STATUS_TRIP || (branch.Circuits === 2 && branch.Status2 === STATUS_TRIP);
                  if (isTripped) {
                    statusElement = <span className="text-xs text-red-500 font-medium">TRIPPED</span>;
                  } else {
                    statusElement = <span className="text-xs text-muted-foreground">OPEN</span>;
                  }
                } else {
                  let barColor = 'bg-primary';
                  if (loading > 120) barColor = 'bg-orange-500';
                  else if (loading > 100) barColor = 'bg-yellow-500';
                  
                  statusElement = (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-10 rounded-full bg-muted" title={`Loading: ${loading.toFixed(0)}%`}>
                        <div className={`h-1.5 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(100, loading)}%` }} />
                      </div>
                      <span className="text-xs font-mono w-8 text-right">{loading.toFixed(0)}%</span>
                    </div>
                  );
                }

                return (
                  <TableRow key={branch.Number} className="cursor-pointer" onClick={() => onBranchSelect(branch)}>
                    <TableCell className="font-medium text-xs py-2 truncate pr-4">{branch.sub1?.Name} - {branch.sub2?.Name}</TableCell>
                    <TableCell className="py-2 text-right">{statusElement}</TableCell>
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