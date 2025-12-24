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
    <div className="-mx-4 border-t">
      {alerts.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">No alerts to show</div>
      ) : (
        <div className="flex flex-col">
          <div className="p-3 border-b">
            <Button
              variant="secondary"
              size="sm"
              onClick={onDismissAllAlerts}
              disabled={alerts.length === 0}
              aria-label="Dismiss all alerts"
              className="w-full"
            >
              Dismiss All Alerts
            </Button>
          </div>
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 border-b p-3">
              <Badge variant="secondary" className="mt-0.5 whitespace-nowrap">{alert.time}</Badge>
              <p className={`flex-1 text-sm leading-snug ${alert.critical ? "text-red-500 font-semibold" : ""}`}>
                {alert.message}
              </p>
              <Button variant="ghost" size="icon" onClick={() => onRemoveAlert(alert.id)} className="h-6 w-6 shrink-0 cursor-pointer">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
