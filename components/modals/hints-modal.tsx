"use client";

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface Hint {
  id: number;
  time: string;
  message: string;
}

interface HintsListProps {
  hints: Hint[];
  onRemoveHint: (id: number) => void;
  onDismissAllHints: () => void;
}

export function HintsList({ hints, onRemoveHint, onDismissAllHints }: HintsListProps) {
  return (
    <div>
      {hints.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">No hints to show</div>
      ) : (
        <div>
          <div className="flex justify-end p-2 border-b">
            <Button variant="ghost" size="sm" onClick={onDismissAllHints}>Dismiss All</Button>
          </div>
          <ul className="flex flex-col" aria-label="List of hints">
            {hints.map((hint) => (
              <li key={hint.id} className="flex items-start gap-3 border-b p-3">
                <Badge variant="secondary" className="mt-0.5 whitespace-nowrap">{hint.time}</Badge>
                <p className="flex-1 text-sm leading-snug">
                  {hint.message}
                </p>
                <Button variant="ghost" size="icon" onClick={() => onRemoveHint(hint.id)} className="h-6 w-6 shrink-0 cursor-pointer" aria-label={`Dismiss hint: ${hint.message}`}>
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
