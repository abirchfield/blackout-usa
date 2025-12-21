"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Alert {
  id: number;
  time: string;
  message: string;
  critical: boolean;
}

interface AlertsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: Alert[];
  onRemoveAlert: (id: number) => void;
}

interface AlertsListProps {
  alerts: Alert[];
  onRemoveAlert: (id: number) => void;
}

export function AlertsList({ alerts, onRemoveAlert }: AlertsListProps) {
  return (
    <div className="flex-1 overflow-y-auto border-t border-border -mx-6 -mb-6">
      <div className="grid grid-cols-[90px_1fr_auto] gap-4 p-2 font-bold border-b border-border sticky top-0 bg-popover px-6">
        <div>Time</div>
        <div>Message</div>
        <div>Action</div>
      </div>
      <div className="px-6">
        {alerts.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">No alerts to show</div>
        )}
        {alerts.map((alert) => (
          <div key={alert.id} className="grid grid-cols-[90px_1fr_auto] gap-4 p-2 border-b border-border items-center">
            <div>{alert.time}</div>
            <div className={alert.critical ? "text-red-500 font-bold" : ""}>{alert.message}</div>
            <Button variant="secondary" size="sm" onClick={() => onRemoveAlert(alert.id)} className="cursor-pointer">OK</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AlertsModal({ open, onOpenChange, alerts, onRemoveAlert }: AlertsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] font-share-tech max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Alerts</DialogTitle>
          <DialogDescription className="hidden">List of game alerts</DialogDescription>
        </DialogHeader>
        <AlertsList alerts={alerts} onRemoveAlert={onRemoveAlert} />
      </DialogContent>
    </Dialog>
  );
}