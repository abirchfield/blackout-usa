"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { Branch } from "@/lib/game/types"
import { CircuitTable } from "../tables/circuit-table"
import { LinesIcon } from "@/components/ui/lines-icon"

interface BranchModalContentProps {
  branch: Branch;
  onCircuitAction: (branchId: string, circuit: 1 | 2) => void;
  isPaused?: boolean;
  isHighContrast?: boolean;
  showTitle?: boolean; // Used to hide title when content is embedded in another component
}

export function BranchModalContent({ branch, onCircuitAction, isPaused, isHighContrast, showTitle = true }: BranchModalContentProps) {
  const fromSub = branch.sub1?.Name || branch.FromSub;
  const toSub = branch.sub2?.Name || branch.ToSub;

  return (
    <>
      {showTitle && (
        <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
          <h2 className="text-3xl font-bold leading-none tracking-tight">Line: {fromSub} to {toSub}</h2>
          <p className="text-sm text-muted-foreground">
            Total Flow: {Math.abs(branch.P).toFixed(0)} MW
          </p>
        </div>
      )}
      <CircuitTable branch={branch} onCircuitAction={onCircuitAction} isPaused={isPaused} isHighContrast={isHighContrast} />
    </>
  );
}

// --- Reusable Detail View for Sidebar ---
interface BranchDetailViewProps {
  branch: Branch;
  onClose: () => void;
  onCircuitAction: (branchId: string, circuit: 1 | 2) => void;
  isPaused?: boolean;
  isHighContrast?: boolean;
}

export function BranchDetailView({ branch, onClose, onCircuitAction, isPaused, isHighContrast }: BranchDetailViewProps) {
  const fromSub = branch.sub1?.Name || branch.FromSub;
  const toSub = branch.sub2?.Name || branch.ToSub;

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <LinesIcon className="h-7 w-7" aria-hidden="true" />
          <span className="truncate" title={`Line: ${fromSub} to ${toSub}`}>{`Line: ${fromSub} to ${toSub}`}</span>
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close details">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Total Flow: {Math.abs(branch.P).toFixed(0)} MW ({branch.P >= 0 ? `${fromSub} to ${toSub}` : `${toSub} to ${fromSub}`})
      </p>
      <div className="overflow-y-auto flex-1 min-w-0">
        <BranchModalContent branch={branch} onCircuitAction={onCircuitAction} isPaused={isPaused} isHighContrast={isHighContrast} showTitle={false} />
      </div>
    </>
  );
}

// --- Branch Modal Component ---
interface BranchModalProps {
  branch: Branch | null;
  onClose: () => void;
  onCircuitAction: (branchId: string, circuit: 1 | 2) => void;
  isPaused?: boolean;
  isHighContrast?: boolean;
}

export function BranchModal({ branch, onClose, onCircuitAction, isPaused, isHighContrast }: BranchModalProps) {
  if (!branch) return null;

  return (
    <Dialog open={!!branch} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl font-share-tech">
        {/* The DialogTitle and DialogDescription are now inside BranchModalContent,
            but we need a sr-only version here to satisfy accessibility requirements of the Dialog. */}
        <DialogHeader className="sr-only">
          <DialogTitle>Line: {branch.sub1?.Name || branch.FromSub} to {branch.sub2?.Name || branch.ToSub}</DialogTitle>
          <DialogDescription>Controls and details for the transmission line.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 relative">
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