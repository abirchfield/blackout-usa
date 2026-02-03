// components/controls/load-controls.tsx
"use client";

import { Button } from "@/components/ui/button"
import { Substation, Unit, UnitStatus, LoadCategoryType } from "@/lib/game/types"
import { LoadTypeConfig, StatusConfig } from "@/lib/game/config"
import { Power } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadUnitDetailsProps {
  sub: Substation;
  unit: Unit;
  index: number;
  onUnitAction: (subId: string, unitIndex: number) => void;
  isPaused?: boolean;
}

const loadCategories = Object.values(LoadCategoryType);

/**
 * Renders the detailed view and controls for a single load unit (circuit).
 */
export function LoadUnitDetails({ sub, unit, index, onUnitAction, isPaused }: LoadUnitDetailsProps) {
  const config = StatusConfig[unit.Status];
  const StatusIcon = config.icon;
  const category = loadCategories[index % loadCategories.length];
  const { icon: TypeIcon, name: typeName, tailwind } = LoadTypeConfig[category];
  const mwSuffix = <span className="text-xs text-muted-foreground ml-1">MW</span>;
  
  let actionButtonElement: React.ReactNode = null;
  switch (unit.Status) {
    case UnitStatus.IN:
      actionButtonElement = <Button variant="destructive" size="icon" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused} aria-label={`Disconnect Circuit ${index + 1}`} className="cursor-pointer"><Power className="h-5 w-5" /></Button>;
      break;
    case UnitStatus.DIS:
      actionButtonElement = <Button variant="secondary" size="icon" onClick={() => onUnitAction(sub.Number, index)} disabled={isPaused} aria-label={`Connect Circuit ${index + 1}`} className="cursor-pointer"><Power className="h-5 w-5" /></Button>;
      break;
    default:
      actionButtonElement = <Button variant="ghost" size="icon" disabled={true} aria-label="Action unavailable" />;
  }

  return (
    <tr className="border-t border-border/50 align-middle" aria-labelledby={`load-circuit-header-${sub.Number}-${index}`}>
      <th scope="row" id={`load-circuit-header-${sub.Number}-${index}`} className="p-2 align-middle font-bold text-center">
        {index + 1}
      </th>
      <td className="p-2 align-middle text-left">
        <TypeIcon aria-hidden="true" className={cn("h-4 w-4 inline-block mr-2 align-middle", tailwind.text)} />
        <span className="align-middle">{typeName}</span>
      </td>
      <td className="p-2 align-middle text-center">
        {config && (
          <StatusIcon role="img" aria-label={config.label} className={cn("h-5 w-5 mx-auto", config.tailwind.text)} title={config.label} />
        )}
      </td>
      <td className="p-2 font-mono align-middle text-right">
        {unit.Status === UnitStatus.IN ? <>{unit.P.toFixed(0)}{mwSuffix}</> : '---'}
      </td>
      <td className="p-2 align-middle text-center">
        {actionButtonElement}
      </td>
    </tr>
  );
}