"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Substation, Unit, STATUS_IN, STATUS_STARTUP, STATUS_SHUTDOWN, STATUS_TRIP, CATEGORY_WIND, CATEGORY_SOLAR, CATEGORY_NUCLEAR } from "@/lib/game/types"

interface SubstationsListProps {
  subs?: Record<string, Substation>;
  onSubstationSelect: (sub: Substation) => void;
}

const getGenIndicatorStyle = (unit: Unit, sub: Substation) => {
  const pmax_unit = sub.Pmax / sub.Units;
  const brightness = pmax_unit > 0 ? unit.P / pmax_unit : 0;
  let colorClass = 'bg-gray-700'; // Default for DIS
  let animationClass = '';

  switch (unit.Status) {
    case STATUS_IN:
    case STATUS_STARTUP:
      if (sub.Category === CATEGORY_WIND) colorClass = 'bg-green-500';
      else if (sub.Category === CATEGORY_SOLAR) colorClass = 'bg-yellow-500';
      else if (sub.Category === CATEGORY_NUCLEAR) colorClass = 'bg-pink-500';
      else colorClass = 'bg-gray-400';
      if (unit.Status === STATUS_STARTUP) animationClass = 'animate-pulse';
      break;
    case STATUS_SHUTDOWN:
      colorClass = 'bg-gray-600';
      break;
    case STATUS_TRIP:
      colorClass = 'bg-red-500';
      break;
  }

  const opacity = unit.Status === STATUS_IN ? Math.max(0.2, brightness) : 1;
  return { className: `${colorClass} ${animationClass} w-2 h-2 rounded-full transition-all`, style: { opacity } };
};

const getLoadIndicatorStyle = (unit: Unit) => {
  let colorClass = 'bg-muted-foreground'; // Default for DIS
  switch (unit.Status) {
    case STATUS_IN:
      colorClass = 'bg-foreground'; // Theme-aware: white on dark, black on light
      break;
    case STATUS_TRIP:
      colorClass = 'bg-red-500';
      break;
  }
  return { className: `${colorClass} w-2 h-2 rounded-full` };
};

export function SubstationsList({ subs, onSubstationSelect }: SubstationsListProps) {
  return (
    <div className="max-h-[calc(100vh-22rem)] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Substation</TableHead>
            <TableHead>Load Status</TableHead>
            <TableHead>Supply Status</TableHead>
            <TableHead className="text-right">Power</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subs && Object.values(subs).length > 0 ? (
            Object.values(subs)
              .sort((a, b) => a.Name.localeCompare(b.Name))
              .map(sub => {
                const totalPower = sub.U.reduce((acc, unit) => acc + unit.P, 0);
                return (
                  <TableRow key={sub.Number} className="cursor-pointer" onClick={() => onSubstationSelect(sub)}>
                    <TableCell className="font-medium text-xs py-2 truncate">{sub.Name}</TableCell>
                    <TableCell className="py-2">
                      {sub.Category === 'Load' && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {sub.U.map((unit, index) => {
                            const { className } = getLoadIndicatorStyle(unit);
                            return <div key={`indicator-${sub.Number}-${index}`} className={className} title={`Circuit #${index + 1}: ${unit.Status}`} />;
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {sub.Category !== 'Load' && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {sub.U.map((unit, index) => {
                            const { className, style } = getGenIndicatorStyle(unit, sub);
                            return <div key={`indicator-${sub.Number}-${index}`} className={className} style={style} title={`Unit #${index + 1}: ${unit.Status} - ${unit.P.toFixed(0)} MW`} />;
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2">{totalPower.toFixed(0)} MW</TableCell>
                  </TableRow>
                )
              })
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No substations to show.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}