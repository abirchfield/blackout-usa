"use client";

import { Branch, BranchStatus } from "@/lib/game/types";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "../indicators/status-indicator";

interface CircuitRecordProps {
  branch: Branch;
  circuitNum: 1 | 2;
  onCircuitAction: (branchId: string, circuit: 1 | 2) => void;
  isPaused?: boolean;
  isHighContrast?: boolean;
}

function CircuitRecord({ branch, circuitNum, onCircuitAction, isPaused, isHighContrast }: CircuitRecordProps) {
  const status = circuitNum === 1 ? branch.Status1 : branch.Status2;

  const inServiceCircuits = (branch.Status1 === BranchStatus.IN ? 1 : 0) + (branch.Circuits === 2 && branch.Status2 === BranchStatus.IN ? 1 : 0);
  const flow = inServiceCircuits > 0 ? branch.P / inServiceCircuits : 0;
  const rating = branch.Pmax;
  const loading = rating > 0 ? (Math.abs(flow) / rating) * 100 : 0;

  let statusText: string;
  let buttonText: string | null = null;
  let buttonDisabled = false;

  switch (status) {
    case BranchStatus.IN:
      statusText = "In-Service";
      buttonText = "Open";
      break;
    case BranchStatus.DIS:
      statusText = "Out-of-Service";
      buttonText = "Close";
      break;
    case BranchStatus.TRIP:
      statusText = "Tripped";
      buttonText = null;
      buttonDisabled = true;
      break;
    default:
      statusText = `Unknown (${status})`;
      buttonDisabled = true;
  }

  const barColor = loading > 100 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-status-in)]';

  return (
    <TableRow aria-labelledby={`circuit-header-${branch.Number}-${circuitNum}`}>
      <th scope="row" id={`circuit-header-${branch.Number}-${circuitNum}`} className="font-medium text-center p-2">{circuitNum}</th>
      <TableCell>
        <div className="flex items-center gap-2">
          <StatusIndicator status={status} />
          <span>{statusText}</span>
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">{Math.abs(flow).toFixed(0)} MW</TableCell>
      <TableCell className="text-right font-mono">{rating.toFixed(0)} MW</TableCell>
      <TableCell>
        <div className="flex items-center gap-2" title={`Loading: ${loading.toFixed(0)}%`} aria-label={`Circuit loading: ${loading.toFixed(0)}%`}>
          <div
            role="progressbar"
            aria-valuenow={loading}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Circuit loading progress bar`}
            className="h-2 w-full rounded-full bg-muted"
          >
            <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(100, loading)}%` }} />
          </div>
          <span className="text-xs font-mono text-right">{loading.toFixed(0)}%</span>
        </div>
      </TableCell>
      <TableCell>
        {buttonText && (
          <Button
            variant={status === BranchStatus.IN ? "destructive" : (isHighContrast ? "outline" : "secondary")}
            size="sm"
            onClick={() => onCircuitAction(branch.Number, circuitNum)}
            disabled={buttonDisabled || isPaused}
          >{buttonText}</Button>
        )}
      </TableCell>
    </TableRow>
  );
}

interface CircuitTableProps {
  branch: Branch;
  onCircuitAction: (branchId: string, circuit: 1 | 2) => void;
  isPaused?: boolean;
  isHighContrast?: boolean;
}

export function CircuitTable({ branch, onCircuitAction, isPaused, isHighContrast }: CircuitTableProps) {
  return (
    <Table className="w-full table-fixed">
      <caption className="sr-only">Details for each circuit in the transmission line.</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="text-center w-[10%]">#</TableHead>
          <TableHead scope="col" className="w-[25%]">Status</TableHead>
          <TableHead scope="col" className="text-right w-[15%]">Flow</TableHead>
          <TableHead scope="col" className="text-right w-[15%]">Rating</TableHead>
          <TableHead scope="col" className="w-[25%]">Loading</TableHead>
          <TableHead scope="col" className="w-[10%]">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <CircuitRecord branch={branch} circuitNum={1} onCircuitAction={onCircuitAction} isPaused={isPaused} isHighContrast={isHighContrast} />
        {branch.Circuits === 2 && (
          <CircuitRecord branch={branch} circuitNum={2} onCircuitAction={onCircuitAction} isPaused={isPaused} isHighContrast={isHighContrast} />
        )}
      </TableBody>
    </Table>
  );
}