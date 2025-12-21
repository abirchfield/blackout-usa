"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Substation, Unit } from "@/lib/game/types"

// --- Substation Modal Component ---
interface SubstationModalProps {
  sub: Substation | null;
  onClose: () => void;
  onUnitAction: (subId: string, unitIndex: number) => void;
}

export function SubstationModal({ sub, onClose, onUnitAction }: SubstationModalProps) {
  if (!sub) return null;

  const mainText = sub.Category === "Load"
    ? `This substation has ${sub.Units} load circuits`
    : `This substation has ${sub.Units} ${sub.Category} generating units`;

  return (
    <Dialog open={!!sub} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] font-share-tech max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">{sub.Name} Substation</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <p className="mb-4">{mainText}</p>
          {sub.U.map((unit, index) => (
            <UnitDisplay key={index} sub={sub} unit={unit} index={index} onAction={onUnitAction} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UnitDisplayProps {
  sub: Substation;
  unit: Unit;
  index: number;
  onAction: (subId: string, unitIndex: number) => void;
}

function UnitDisplay({ sub, unit, index, onAction }: UnitDisplayProps) {
  let text, btn1Text, btn1Disabled = false, btn2Text, btn2Disabled = true;

  if (sub.Category === "Load") {
    if (unit.Status === "IN") {
      text = `Circuit #${index + 1} (IN-SERVICE)<br/>Power consumed: ${unit.P.toFixed(0)} MW`;
      btn1Text = "Open (Disconnect)";
    } else if (unit.Status === "DIS") {
      text = `Circuit #${index + 1} (OUT-OF-SERVICE)`;
      btn1Text = "Close (Connect)";
    } else { // TRIP
      text = `Circuit #${index + 1} (TRIPPED - CANNOT RECLOSE)`;
      btn1Disabled = true;
    }
  } else { // Generator
    const pMaxUnit = (sub.Pmax / sub.Units).toFixed(0);
    const pMinUnit = (sub.Pmin / sub.Units).toFixed(0);
    const cost = sub.FixedCost + unit.P * sub.FuelCost;

    switch (unit.Status) {
      case "IN":
        text = `Unit #${index + 1} (IN-SERVICE)<br/>Power output: ${unit.P.toFixed(0)} MW<br/>Set point: ${unit.Pset.toFixed(0)} MW<br/>Max: ${pMaxUnit} MW, Min: ${pMinUnit} MW<br/>Cost: $${cost.toFixed(0)}/hr`;
        btn1Text = "Shut Down";
        btn2Text = "Change Set Point";
        btn2Disabled = false;
        break;
      case "DIS":
        text = `Unit #${index + 1} (OUT-OF-SERVICE)<br/>Max: ${pMaxUnit} MW, Min: ${pMinUnit} MW<br/>Start up time: < 1 hr`;
        btn1Text = "Start Up";
        break;
      case "STARTUP":
        text = `Unit #${index + 1} (STARTING UP)<br/>Power output: ${unit.P.toFixed(0)} MW<br/>Hours since startup: ${(unit.StatusCount / 60).toFixed(1)}`;
        btn1Text = "Shut Down";
        break;
      case "SHUTDOWN":
        text = `Unit #${index + 1} (SHUTTING DOWN)<br/>Power output: ${unit.P.toFixed(0)} MW`;
        btn1Disabled = true;
        break;
      default: // TRIP
        text = `Unit #${index + 1} (TRIPPED - CANNOT RECLOSE)`;
        btn1Disabled = true;
        break;
    }
  }

  return (
    <div className="border-t py-2">
      <div className="flex items-center justify-between">
        <div className="text-sm" dangerouslySetInnerHTML={{ __html: text || '' }} />
        <div className="flex flex-col gap-2">
          {btn1Text && <Button size="sm" onClick={() => onAction(sub.Number, index)} disabled={btn1Disabled}>{btn1Text}</Button>}
          {btn2Text && <Button size="sm" variant="secondary" disabled={btn2Disabled}> {btn2Text}</Button>}
        </div>
      </div>
    </div>
  );
}