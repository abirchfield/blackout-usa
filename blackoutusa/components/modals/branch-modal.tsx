"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Branch } from "@/lib/game/types"

// --- Branch Modal Component ---
interface BranchModalProps {
  branch: Branch | null;
  onClose: () => void;
  onCircuitAction: (branchId: string, circuit: 1 | 2) => void;
}

export function BranchModal({ branch, onClose, onCircuitAction }: BranchModalProps) {
  if (!branch) return null;

  return (
    <Dialog open={!!branch} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] font-share-tech">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Line: {branch.FromSub} to {branch.ToSub}</DialogTitle>
        </DialogHeader>
        {/* Content would be ported here, similar to SubstationModal */}
        <p>Flow: {branch.P.toFixed(0)} MW</p>
        <p>Max: {branch.Pmax.toFixed(0)} MW</p>
      </DialogContent>
    </Dialog>
  );
}