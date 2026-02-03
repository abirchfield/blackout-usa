"use client";

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface Alert {
  id: number;
  time: string;
  message: string;
  critical: boolean;
}

interface AlertsListProps {
  alerts: Alert[];
  onRemoveAlert: (id: number) => void;
  onDismissAllAlerts: () => void;
}

export function AlertsList({ alerts, onRemoveAlert, onDismissAllAlerts }: AlertsListProps) {
  return (
    <div>
      {alerts.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">No alerts to show</div>
      ) : (
        <div>
          <div className="flex justify-end p-2 border-b">
            <Button variant="ghost" size="sm" onClick={onDismissAllAlerts}>Dismiss All</Button>
          </div>
          <ul className="flex flex-col" aria-label="List of alerts">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex items-start gap-3 border-b p-3">
                <Badge variant="secondary" className="mt-0.5 whitespace-nowrap">{alert.time}</Badge>
                <p className={`flex-1 text-sm leading-snug ${alert.critical ? "text-red-500 font-semibold" : ""}`}>
                  {alert.critical && <span className="sr-only">Critical: </span>}
                  {alert.message}
                </p>
                <Button variant="ghost" size="icon" onClick={() => onRemoveAlert(alert.id)} className="h-6 w-6 shrink-0 cursor-pointer" aria-label={`Dismiss alert: ${alert.message}`}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
