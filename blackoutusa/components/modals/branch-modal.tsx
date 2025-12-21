"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Branch, STATUS_IN, STATUS_DIS, STATUS_TRIP } from "@/lib/game/types"

interface CircuitDisplayProps {
  branch: Branch;
  circuitNum: 1 | 2;
  onCircuitAction: (branchId: string, circuit: 1 | 2) => void;
}

function CircuitIndicator({ status }: { status: string }) {
  let className = '';
  let title = '';

  switch (status) {
    case STATUS_IN:
      className = 'bg-green-500 w-3 h-3 rounded-full';
      title = 'In-Service';
      break;
    case STATUS_DIS:
      className = 'border border-muted-foreground w-3 h-3 rounded-full';
      title = 'Out-of-Service';
      break;
    case STATUS_TRIP:
      className = 'bg-red-500 w-3 h-3 rounded-full';
      title = 'Tripped';
      break;
    default:
      className = 'bg-gray-500 w-3 h-3 rounded-full';
      title = 'Unknown Status';
  }
  return <div className={`${className} flex-shrink-0`} title={title} />;
}

function CircuitDisplay({ branch, circuitNum, onCircuitAction }: CircuitDisplayProps) {
  const status = circuitNum === 1 ? branch.Status1 : branch.Status2;
  
  // Flow on a single circuit. If both are in, total P is shared.
  const inServiceCircuits = (branch.Status1 === STATUS_IN ? 1 : 0) + (branch.Circuits === 2 && branch.Status2 === STATUS_IN ? 1 : 0);
  const flow = inServiceCircuits > 0 ? branch.P / inServiceCircuits : 0;

  let statusText: string;
  let buttonText: string | null = null;
  let buttonDisabled = false;

  switch (status) {
    case STATUS_IN:
      statusText = `Circuit ${circuitNum} is <strong>IN-SERVICE</strong>.<br/>Flow: ${Math.abs(flow).toFixed(0)} MW<br/>Rating: ${branch.Pmax.toFixed(0)} MW`;
      buttonText = "Open (Disconnect)";
      break;
    case STATUS_DIS:
      statusText = `Circuit ${circuitNum} is <strong>OUT-OF-SERVICE</strong>.`;
      buttonText = "Close (Connect)";
      break;
    case STATUS_TRIP:
      statusText = `Circuit ${circuitNum} has <strong>TRIPPED</strong> and cannot be reclosed.`;
      buttonText = null;
      buttonDisabled = true;
      break;
    default:
      statusText = `Circuit ${circuitNum} has an unknown status: ${status}`;
      buttonDisabled = true;
  }

  return (
    <>
      <Separator />
      <div className="flex justify-between items-center py-3">
        <div className="flex items-center gap-3">
          <CircuitIndicator status={status} />
          <div className="text-sm" dangerouslySetInnerHTML={{ __html: statusText }} />
        </div>
        {buttonText && (
          <Button
            variant={status === STATUS_IN ? "destructive" : "secondary"}
            size="sm"
            onClick={() => onCircuitAction(branch.Number, circuitNum)}
            disabled={buttonDisabled}
          >
            {buttonText}
          </Button>
        )}
      </div>
    </>
  );
}

// --- Branch Modal Component ---
interface BranchModalProps {
  branch: Branch | null;
  onClose: () => void;
  onCircuitAction: (branchId: string, circuit: 1 | 2) => void;
}

export function BranchModal({ branch, onClose, onCircuitAction }: BranchModalProps) {
  if (!branch) return null;

  const fromSub = branch.sub1?.Name || branch.FromSub;
  const toSub = branch.sub2?.Name || branch.ToSub;
  const flowDirection = branch.P >= 0 ? `${fromSub} to ${toSub}` : `${toSub} to ${fromSub}`;

  return (
    <Dialog open={!!branch} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] font-share-tech">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Line: {fromSub} to {toSub}</DialogTitle>
          <DialogDescription>
            Total Flow: {Math.abs(branch.P).toFixed(0)} MW ({flowDirection})
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <CircuitDisplay branch={branch} circuitNum={1} onCircuitAction={onCircuitAction} />
          {branch.Circuits === 2 && (
            <CircuitDisplay branch={branch} circuitNum={2} onCircuitAction={onCircuitAction} />
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}