"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Substation, Unit, STATUS_IN, STATUS_DIS, STATUS_STARTUP, STATUS_SHUTDOWN, STATUS_TRIP, CATEGORY_LOAD, CATEGORY_WIND, CATEGORY_SOLAR, CATEGORY_NUCLEAR } from "@/lib/game/types"
import { Wind, Sun, Atom, Flame, Plug } from "lucide-react"

interface SubstationsListProps {
  subs?: Record<string, Substation>;
  onSubstationSelect: (sub: Substation) => void;
}

const getGenIndicatorStyle = (unit: Unit, sub: Substation) => {
  // Deactivated state: unfilled circle
  if (unit.Status === STATUS_DIS) {
    return { className: 'border border-muted-foreground w-2 h-2 rounded-full', style: {} };
  }

  const pmax_unit = sub.Pmax / sub.Units;
  const brightness = pmax_unit > 0 ? unit.P / pmax_unit : 0;
  let colorClass = '';
  let animationClass = '';

  switch (unit.Status) {
    case STATUS_IN:
    case STATUS_STARTUP:
      colorClass = 'bg-green-500';
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
  // Deactivated state: unfilled circle
  if (unit.Status === STATUS_DIS) {
    return { className: 'border border-muted-foreground w-2 h-2 rounded-full' };
  }
  let colorClass = '';
  switch (unit.Status) {
    case STATUS_IN:
      colorClass = 'bg-green-500';
      break;
    case STATUS_TRIP:
      colorClass = 'bg-red-500';
      break;
  }
  return { className: `${colorClass} w-2 h-2 rounded-full` };
};

const GenerationTypeIcon = ({ category }: { category: string }) => {
  const iconProps = { className: "w-3.5 h-3.5" };
  switch (category) {
    case CATEGORY_WIND:
      return <Wind {...iconProps} className="w-3.5 h-3.5 text-blue-500" />;
    case CATEGORY_SOLAR:
      return <Sun {...iconProps} className="w-3.5 h-3.5 text-yellow-500" />;
    case CATEGORY_NUCLEAR:
      return <Atom {...iconProps} className="w-3.5 h-3.5 text-pink-500" />;
    case CATEGORY_LOAD:
      return <Plug {...iconProps} className="w-3.5 h-3.5 text-gray-500" />;
    default: // Assuming other types are thermal
      return <Flame {...iconProps} className="w-3.5 h-3.5 text-red-500" />;
  }
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
                      {sub.Category === CATEGORY_LOAD && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {sub.U.map((unit, index) => {
                            const { className } = getLoadIndicatorStyle(unit);
                            return <div key={`indicator-${sub.Number}-${index}`} className={className} title={`Circuit #${index + 1}: ${unit.Status}`} />;
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {sub.Category !== CATEGORY_LOAD && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {sub.U.map((unit, index) => {
                            const { className, style } = getGenIndicatorStyle(unit, sub);
                            return <div key={`indicator-${sub.Number}-${index}`} className={className} style={style} title={`Unit #${index + 1}: ${unit.Status} - ${unit.P.toFixed(0)} MW`} />;
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>{totalPower.toFixed(0)} MW</span>
                        <GenerationTypeIcon category={sub.Category} />
                      </div>
                    </TableCell>
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