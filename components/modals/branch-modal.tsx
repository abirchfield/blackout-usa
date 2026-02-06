"use client";

import { useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Branch, BranchStatus } from "@/lib/types"
import { CircuitTable } from "../tables/circuit-table"
import { LinesIcon } from "@/components/icons/lines-icon"
import { useSimTick, useBranch, useUserPaused, useDispatch } from "@/lib/hooks/use-store";

interface BranchModalContentProps {
  branch: Branch;
  onCircuitAction: (branchId: string, circuit: 1 | 2) => void;
  isPaused?: boolean;
  isHighContrast?: boolean;
}

export function BranchModalContent({ branch, onCircuitAction, isPaused, isHighContrast }: BranchModalContentProps) {
  const fromSub = branch.sub1?.Name || branch.FromSub;
  const toSub = branch.sub2?.Name || branch.ToSub;
  const flowDirection = branch.P >= 0 ? `${fromSub} → ${toSub}` : `${toSub} → ${fromSub}`;

  // Calculate total rating and loading
  const inServiceCircuits = (branch.Status1 === BranchStatus.IN ? 1 : 0) + (branch.Circuits === 2 && branch.Status2 === BranchStatus.IN ? 1 : 0);
  const totalRating = branch.Pmax * inServiceCircuits;
  const loading = totalRating > 0 ? (Math.abs(branch.P) / totalRating) * 100 : 0;

  return (
    <>
      <div className="text-sm text-muted-foreground mb-2 space-y-1.5">
        <p>
          Power flow: <Badge variant="secondary" className="font-mono">{Math.abs(branch.P).toFixed(0)} MW</Badge> ({flowDirection})
        </p>
        <p>
          Line loading: <Badge variant={loading > 100 ? "destructive" : "outline"} className="font-mono">{loading.toFixed(0)}%</Badge> of {totalRating.toFixed(0)} MW capacity
        </p>
      </div>
      <CircuitTable branch={branch} onCircuitAction={onCircuitAction} isPaused={isPaused} isHighContrast={isHighContrast} />
    </>
  );
}

// --- Branch Modal Component ---
interface BranchModalProps {
  open: boolean;
  branchId: string | undefined;
  onClose: () => void;
  isHighContrast?: boolean;
}

export function BranchModal({ open, branchId, onClose, isHighContrast }: BranchModalProps) {
  useSimTick();
  const branch = useBranch(branchId);
  const isPaused = useUserPaused();
  const dispatch = useDispatch();

  const onCircuitAction = useCallback((bid: string, circuit: 1 | 2) => {
    dispatch({ type: 'TOGGLE_BRANCH', branchId: bid, circuitNum: circuit });
  }, [dispatch]);

  if (!open || !branch) return null;

  const fromSub = branch.sub1?.Name || branch.FromSub;
  const toSub = branch.sub2?.Name || branch.ToSub;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent id="branch-modal" className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinesIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-lg font-semibold leading-none tracking-tight">{fromSub} — {toSub}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">Controls and details for this transmission line.</DialogDescription>
        </DialogHeader>
        <div role="region" aria-label="Line Controls" className="max-h-[70vh] overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 relative">
          <BranchModalContent
            branch={branch}
            onCircuitAction={onCircuitAction}
            isPaused={isPaused}
            isHighContrast={isHighContrast}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
