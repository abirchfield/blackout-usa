"use client";

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface NotificationItem {
  id: number;
  time: string;
  message: string;
  critical?: boolean;
}

interface NotificationListProps {
  items: NotificationItem[];
  onRemove: (id: number) => void;
  onDismissAll: () => void;
  emptyMessage?: string;
  ariaLabel?: string;
}

export function NotificationList({
  items,
  onRemove,
  onDismissAll,
  emptyMessage = "Nothing to show",
  ariaLabel = "List of notifications",
}: NotificationListProps) {
  return (
    <div>
      {items.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">{emptyMessage}</div>
      ) : (
        <div>
          <div className="flex justify-end p-2 border-b">
            <Button variant="ghost" size="sm" onClick={onDismissAll}>Dismiss All</Button>
          </div>
          <ul className="flex flex-col" aria-label={ariaLabel}>
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 border-b p-3">
                <Badge variant="secondary" className="mt-0.5 whitespace-nowrap">{item.time}</Badge>
                <p className={`flex-1 text-sm leading-snug ${item.critical ? "text-red-500 font-semibold" : ""}`}>
                  {item.critical && <span className="sr-only">Critical: </span>}
                  {item.message}
                </p>
                <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} className="h-6 w-6 shrink-0 cursor-pointer" aria-label={`Dismiss: ${item.message}`}>
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
