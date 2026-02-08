"use client";

import { Branch, BranchStatus } from "@/lib/types";
import { branchLoading, getLoadingBarColor, hcVariant } from "@/lib/utils";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "./status-indicator";

interface BranchRecordProps {
  branch: Branch;
  label: string;
  onBranchAction: (branchId: string) => void;
  isPaused?: boolean;
  isHighContrast?: boolean;
}

function BranchRecord({ branch, label, onBranchAction, isPaused, isHighContrast }: BranchRecordProps) {
  const status = branch.Status;
  const flow = status === BranchStatus.IN ? branch.P : 0;
  const rating = branch.Pmax;
  const loading = branchLoading(branch);

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

  const barColor = getLoadingBarColor(loading);

  return (
    <TableRow aria-labelledby={`branch-header-${branch.Number}`}>
      <th scope="row" id={`branch-header-${branch.Number}`} className="font-medium text-center p-2">{label}</th>
      <TableCell>
        <div className="flex items-center gap-2">
          <StatusIndicator status={status} />
          <span>{statusText}</span>
        </div>
      </TableCell>
      <TableCell className="text-right font-mono">{Math.abs(flow).toFixed(0)} MW</TableCell>
      <TableCell className="text-right font-mono">{rating.toFixed(0)} MW</TableCell>
      <TableCell>
        <div className="flex items-center gap-2" title={`Loading: ${loading.toFixed(0)}%`} aria-label={`Branch loading: ${loading.toFixed(0)}%`}>
          <div
            role="progressbar"
            aria-valuenow={loading}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Branch loading progress bar`}
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
            variant={status === BranchStatus.IN ? "destructive" : hcVariant(isHighContrast ?? false)}
            size="sm"
            onClick={() => onBranchAction(branch.Number)}
            disabled={buttonDisabled || isPaused}
          >{buttonText}</Button>
        )}
      </TableCell>
    </TableRow>
  );
}

interface CircuitTableProps {
  branch: Branch;
  sibling?: Branch;
  onBranchAction: (branchId: string) => void;
  isPaused?: boolean;
  isHighContrast?: boolean;
}

export function CircuitTable({ branch, sibling, onBranchAction, isPaused, isHighContrast }: CircuitTableProps) {
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
        <BranchRecord branch={branch} label="1" onBranchAction={onBranchAction} isPaused={isPaused} isHighContrast={isHighContrast} />
        {sibling && (
          <BranchRecord branch={sibling} label="2" onBranchAction={onBranchAction} isPaused={isPaused} isHighContrast={isHighContrast} />
        )}
      </TableBody>
    </Table>
  );
}
