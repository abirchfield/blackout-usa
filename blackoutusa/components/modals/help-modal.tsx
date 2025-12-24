"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { GeneratorUnitDetails } from "@/components/controls/unit-controls";
import { Substation, UnitStatus, SubstationCategory } from "@/lib/game/types";
import { TimeController } from "@/components/controls/time-controls";
import { GameEngine } from "@/lib/game/engine";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// NOTE: The 'width' and 'height' for the <Image> components below are placeholders.
// For optimal performance and to avoid layout shift, please replace them with the
// actual dimensions of your image files. The paths also assume your 'Figs'
// directory is in the 'public' folder.

const mockSub: Substation = {
  Name: "Help Substation",
  Number: "0",
  Latitude: 0,
  Longitude: 0,
  Units: 1,
  Category: SubstationCategory.Thermal,
  Pmax: 100,
  Pmin: 20,
  FixedCost: 500,
  FuelCost: 50,
  StartTime: 60,
  Ramp: 5,
  U: []
};

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // State for the toy time controller
  const [toyIsPaused, setToyIsPaused] = useState(true);
  const [toyIsFastForward, setToyIsFastForward] = useState(false);
  const [toyTimeStep, setToyTimeStep] = useState(Math.floor(0.25 * GameEngine.GAME_DURATION)); // Start at 25%

  // Calculate progress for the UI from the time step
  const toyProgress = (toyTimeStep / GameEngine.GAME_DURATION) * 100;

  // Calculate a fake time string based on the toy time step
  const h = Math.floor(toyTimeStep / 60) + 1;
  const m = toyTimeStep % 60;
  const toyTimeStr = `${h}:${m < 10 ? "0" + m : m} PM`;

  const handleToggleToyPause = () => {
    setToyIsPaused(prev => {
      if (prev) { // if paused, now play
        setToyIsFastForward(false); // unpausing resets fast-forward
        return false;
      }
      return true; // if playing, now pause
    });
  };

  const handleToggleToyFastForward = () => {
    setToyIsFastForward(prev => {
      if (!prev) { // if not FF, now FF
        setToyIsPaused(false); // FF implies playing
      }
      return !prev;
    });
  };

  const helpPages = [
    {
      title: "Objective & Alerts",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">My Objective</h4>
          <p>Your objective is to finish the shift with the lowest possible total cost. The highest cost component is unserved load -- so avoiding a blackout and keeping all customers online should keep your costs pretty low! For additional challenge, consider prioritizing cheaper generators and not having unnecessary generators online to bring the average cost of power down.</p>
          <h4 className="text-2xl font-bold mt-6 mb-2">What should I do?</h4>
          <p>Click on the &quot;View all Alerts&quot; button in the top right to bring up the list of alerts. This list includes hints and notifications to help you find your priorities for managing the grid. You can delete any alert by clicking &quot;OK&quot; on the alerts window. The most recent alert will be displayed at the top of the screen.</p>
        </>
      )
    },
    {
      title: "Navigation",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">The Map</h4>
          <p>Navigate the Texas electric grid by clicking and dragging to move around (or use arrow keys). Zoom in and out with the scroll wheel (or PageUp/PageDown).</p>
        </>
      )
    },
    {
      title: "Loads",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">Loads</h4>
          <p>Square substations represent electric customers: homes and businesses that use electric power. These are also called electrical &quot;loads&quot;. In the game they are marked with solid squares if they are &quot;connected,&quot; meaning the customers have electricity, and empty squares if they are &quot;disconnected,&quot; if the customers are in blackout.</p>
          <div className="flex gap-4 my-4 flex-wrap justify-center">
            <div className="text-center"><Image src="Figs/Load1.PNG" alt="Diagram of an in-service load substation represented by a solid filled square, indicating that electricity is being delivered to customers." width={248} height={118} className="border border-white mx-auto max-w-full h-auto" /><p>In-service load</p></div>
            <div className="text-center"><Image src="Figs/Load2.PNG" alt="Diagram of an out-of-service load substation represented by an empty square outline, indicating that customers are currently in a blackout." width={248} height={118} className="border border-white mx-auto max-w-full h-auto" /><p>Out-of-service load</p></div>
          </div>
          <p>Click on one of the square load substations to bring up more information. Each substation contains multiple customer circuits. As the electric grid operator, you can switch loads in or out of service. Normally you want all loads in service. There is a cost of $1000/MW/hr for unserved load.</p>
        </>
      )
    },
    {
      title: "Generators",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">Generators</h4>
          <p>Circle substations represent electric generators, the source of electric power. In the game the circles are colored based on the fuel type. The shading of the generator also represents how much power it is producing: an empty circle is not generating any power, while a full one is producing at its maximum capacity.</p>
          <div className="flex gap-4 my-4 flex-wrap justify-center">
            <div className="text-center"><Image src="Figs/Gen1.PNG" alt="Icon of a solar power plant shown as a circle completely filled with color, representing operation at maximum generation capacity." width={248} height={118} className="border border-white mx-auto max-w-full h-auto" /><p>Solar plant (full capacity)</p></div>
            <div className="text-center"><Image src="Figs/Gen2.PNG" alt="Icon of a thermal power plant shown as a circle half-filled with color, representing operation at 50% of its maximum generation capacity." width={248} height={118} className="border border-white mx-auto max-w-full h-auto" /><p>Thermal plant (50% capacity)</p></div>
          </div>
          <p>Click on one of the circle generator substations to bring up more information. Each substation contains multiple generating units. As the electric grid operator, you have different decisions depending on the status of the unit.</p>
        </>
      )
    },
    {
      title: "Generator Controls",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">Generator Controls</h4>
          <div className="my-4 border border-white/20 rounded-lg px-4 pb-4 bg-background/50">
            <GeneratorUnitDetails
              sub={mockSub}
              unit={{ Status: UnitStatus.IN, P: 65, Pset: 65, P0: 65, Status0: UnitStatus.IN, StatusCount: 0 }}
              index={0}
              onUnitAction={() => {}}
              onSetSetpoint={() => {}}
              setpointValue={65}
              onSetpointChange={() => {}}
              isPaused={true}
            />
          </div>
          <p>In-service generators are currently producing power. This information shows how much power it is producing, which will always be between the Min and Max. If desired, an in-service unit can be shut down.</p>
          <div className="my-4 border border-white/20 rounded-lg px-4 pb-4 bg-background/50">
            <GeneratorUnitDetails
              sub={mockSub}
              unit={{ Status: UnitStatus.DIS, P: 0, Pset: 0, P0: 0, Status0: UnitStatus.DIS, StatusCount: 0 }}
              index={0}
              onUnitAction={() => {}}
              onSetSetpoint={() => {}}
              setpointValue={20}
              onSetpointChange={() => {}}
              isPaused={true}
            />
          </div>
          <p>Out of service generators do not add any cost to the system operation. They can be started up if more generation capability is needed. Once start-up begins, the operating cost comes into effect.</p>
          <div className="my-4 border border-white/20 rounded-lg px-4 pb-4 bg-background/50">
            <GeneratorUnitDetails
              sub={mockSub}
              unit={{ Status: UnitStatus.STARTUP, P: 0, Pset: 0, P0: 0, Status0: UnitStatus.DIS, StatusCount: 30 }}
              index={0}
              onUnitAction={() => {}}
              onSetSetpoint={() => {}}
              setpointValue={20}
              onSetpointChange={() => {}}
              isPaused={true}
            />
          </div>
          <p>Once a generator has begun starting up, it may take some time before it begins generating power. For steam units (coal and nuclear), the start up time is very long. Once started, the unit will increase power output to its minimum value, then begin operating as normal.</p>
        </>
      )
    },
    {
      title: "Transmission Lines",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">Transmission Lines</h4>
          <p>Substations (circles and squares) are connected to each other by transmission lines. The animated dots on the line represent the direction the power is flowing. Click on one of the lines to bring up more information.</p>
          <p className="mt-2">If a line is overloaded, it will turn yellow. If it becomes very overloaded, it will turn orange. If a line remains orange, it is at risk of tripping due to overload. Tripped lines (red dash) cannot be reclosed.</p>
          <div className="flex gap-4 my-4 flex-wrap justify-center">
            <Image src="Figs/Line-2.PNG" alt="Map view of a transmission line colored yellow, which signifies that the line is carrying more power than its normal rating." width={248} height={118} className="border border-white max-w-full h-auto" />
            <Image src="Figs/Line-3.PNG" alt="Map view of a transmission line colored orange, signifying a critical overload that puts the line at high risk of automatically tripping offline." width={248} height={118} className="border border-white max-w-full h-auto" />
            <Image src="Figs/Line-4.PNG" alt="Map view of a transmission line shown as a red dashed line, indicating that the line has tripped due to an overload and is no longer carrying power." width={248} height={118} className="border border-white max-w-full h-auto" />
          </div>
          <p>Keep in mind that when a line is removed from service or tripped, the power previously flowing on it will have to find a new path through other lines. If those other lines become overloaded, this can cause cascading outages.</p>
        </>
      )
    },
    {
      title: "Time & Frequency",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">Time & Frequency Management</h4>
          <p>The dashboard is on the left. The clock will run at 1 minute every 1/2 second by default. Use the controls to pause or fast forward. When it gets to 11pm, the shift is over!</p>
          <div className="my-4 max-w-md mx-auto p-4 border border-white/20 rounded-lg bg-background/50">
            <div className="flex items-center justify-center gap-x-4">
              <span className="w-[10ch] text-center text-xl font-bold text-foreground tabular-nums tracking-wider">{toyTimeStr}</span>
              <div className="h-6 w-px bg-border" />
              <div className="w-full max-w-xs sm:w-64">
                <TimeController
                  progress={toyProgress}
                  isPaused={toyIsPaused}
                  isFastForward={toyIsFastForward}
                  onTogglePause={handleToggleToyPause}
                  onToggleFastForward={handleToggleToyFastForward}
                />
              </div>
            </div>
          </div>
          <p>Below the clock is the grid frequency. This is the most important number for avoiding a blackout! Keep it as close to 60 Hz as possible. If it turns orange, you are getting close to risk of tripping. If it turns red, you will start to see generators, loads, and lines trip offline and a blackout is likely not far off.</p>
          <div className="my-4"><Image src="Figs/Freq.png" alt="The grid frequency monitor, showing the current system frequency in Hertz. Maintaining this near 60 Hertz is critical for grid stability." width={248} height={118} className="border border-white max-w-full h-auto" /></div>
        </>
      )
    }
  ];
  const totalPages = helpPages.length;

  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 0));

  // Effect to manage the toy progress bar
  useEffect(() => {
    if (!open || toyIsPaused) return;

    const gameSpeed = toyIsFastForward ? 50 : 500; // ms per game minute, matches page.tsx
    const interval = setInterval(() => {
      setToyTimeStep(prev => (prev >= GameEngine.GAME_DURATION ? 0 : prev + 1));
    }, gameSpeed);

    return () => clearInterval(interval);
  }, [open, toyIsPaused, toyIsFastForward]);

  // Reset toy state when modal closes or page changes away from the time page
  useEffect(() => {
    if (!open || helpPages[currentPage].title !== "Time & Frequency") {
      setToyTimeStep(Math.floor(0.25 * GameEngine.GAME_DURATION));
      setToyIsPaused(true);
      setToyIsFastForward(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentPage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] font-share-tech h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">How to Play</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 text-lg pr-6 overflow-y-auto flex-1">
          {helpPages[currentPage].content}
        </div>
        <DialogFooter className="pt-4 sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goToPrevPage} disabled={currentPage === 0} className="cursor-pointer">
              Previous
            </Button>
            {currentPage < totalPages - 1 ? (
              <Button onClick={goToNextPage} className="cursor-pointer">
                Next
              </Button>
            ) : (
              <Button onClick={() => onOpenChange(false)} className="cursor-pointer">
                Finish
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}