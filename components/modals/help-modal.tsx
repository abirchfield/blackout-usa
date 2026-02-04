"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { GeneratorUnitsTable } from "@/components/tables/unit-table";
import { SubstationCategory } from "@/lib/types";
import { GenerationTypeConfig, LoadTypeConfig } from "@/lib/config";
import { TimeController } from "@/components/controls";
import { GameEngine } from "@/lib/engine";
import { PersonStanding, Bell, Lightbulb } from "lucide-react";
import {
  LoadExample,
  GeneratorExample,
  LineExample,
  LegendRow,
  FrequencyDisplay,
  mockSubInService,
  mockSubOutOfService,
  mockSubStartup,
} from "@/components/modals/help-examples";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // State for the toy time controller
  const [toyIsPaused, setToyIsPaused] = useState(true);
  const [toyIsFastForward, setToyIsFastForward] = useState(false);
  const [toyTimeStep, setToyTimeStep] = useState(Math.floor(0.25 * GameEngine.GAME_DURATION));

  const toyProgress = (toyTimeStep / GameEngine.GAME_DURATION) * 100;

  const h = Math.floor(toyTimeStep / 60) + 1;
  const m = toyTimeStep % 60;
  const toyTimeStr = `${h}:${m < 10 ? "0" + m : m} PM`;

  const handleToggleToyPause = () => {
    setToyIsPaused(prevIsPaused => {
      const nextIsPaused = !prevIsPaused;
      if (nextIsPaused) {
        setToyIsFastForward(false);
      }
      return nextIsPaused;
    });
  };

  const handleToggleToyFastForward = () => {
    setToyIsFastForward(prev => {
      if (prev) {
        return false;
      } else {
        setToyIsPaused(false);
        return true;
      }
    });
  };

  const helpPages = [
    {
      title: "Objective & Alerts",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">My Objective</h4>
          <p>Your objective is to finish the shift with the lowest possible total cost. The highest cost component is unserved load, so avoiding a blackout and keeping all customers online should keep your costs low. For an additional challenge, consider prioritizing cheaper generators and not having unnecessary generators online to bring the average cost of power down.</p>
          <h4 className="text-2xl font-bold mt-6 mb-2">What should I do?</h4>
          <p>Click on the Alerts button (<Bell className="inline-block h-5 w-5" aria-hidden="true"/>) in the header to bring up the list of alerts. Similarly, the Hints button (<Lightbulb className="inline-block h-5 w-5" aria-hidden="true"/>) provides suggestions and guidance. These lists will help you find your priorities for managing the grid. You can dismiss any item by clicking &quot;OK&quot; on its respective window.</p>
        </>
      )
    },
    {
      title: "Navigation",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">The Map</h4>
          <p>Navigate the Texas electric grid by clicking and dragging to move around. Zoom in and out with the scroll wheel.</p>
          <h4 className="text-2xl font-bold mt-6 mb-2">Keyboard Shortcuts</h4>
          <p>For easier access, you can use keyboard shortcuts for most common actions. You can view and customize these in the Accessibility Settings menu, accessible via the <PersonStanding className="inline-block h-5 w-5" aria-hidden="true" /> icon in the header.</p>
        </>
      )
    },
    {
      title: "Loads",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">Loads</h4>
          <p>Circle substations represent electric customers: homes and businesses that use electric power. These are also called electrical &quot;loads&quot;. In the game, their fill level represents how much power they are consuming. An empty circle is disconnected (in a blackout), while a partially or fully filled circle is connected and receiving power.</p>
          <div className="flex gap-4 my-4 flex-wrap justify-center" aria-label="Examples of load substation states">
            <LoadExample inService={true} />
            <LoadExample inService={false} />
          </div>
          <p>Click on one of the load substations to bring up more information. Each substation contains multiple customer circuits. As the electric grid operator, you can switch loads in or out of service. Normally you want all loads in service. There is a cost of $1000/MW/hr for unserved load.</p>
        </>
      )
    },
    {
      title: "Generators",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">Generators</h4>
          <p>Circle substations represent electric generators, the source of electric power. In the game the circles are colored based on the fuel type. The shading of the generator also represents how much power it is producing: an empty circle is not generating any power, while a full one is producing at its maximum capacity.</p>
          <div className="flex gap-4 my-4 flex-wrap justify-center" aria-label="Examples of generator states">
            <GeneratorExample category={SubstationCategory.Solar} p={100} pmax={100} capacityLabel="100% capacity" />
            <GeneratorExample category={SubstationCategory.Thermal} p={50} pmax={100} capacityLabel="50% capacity" />
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
          <div className="my-4 border border-white/20 rounded-lg overflow-x-auto bg-background/50">
            <GeneratorUnitsTable
              sub={mockSubInService}
              onUnitAction={() => {}}
              onSetSetpoint={() => {}}
              setpoints={{ 0: 65 }}
              onSetpointChange={() => {}}
              isPaused={true}
            />
          </div>
          <p>In-service generators are currently producing power. This information shows how much power it is producing, which will always be between the Min and Max. If desired, an in-service unit can be shut down.</p>
          <div className="my-4 border border-white/20 rounded-lg overflow-x-auto bg-background/50">
            <GeneratorUnitsTable
              sub={mockSubOutOfService}
              onUnitAction={() => {}}
              onSetSetpoint={() => {}}
              setpoints={{ 0: 20 }}
              onSetpointChange={() => {}}
              isPaused={true}
            />
          </div>
          <p>Out of service generators do not add any cost to the system operation. They can be started up if more generation capability is needed. Once start-up begins, the operating cost comes into effect.</p>
          <div className="my-4 border border-white/20 rounded-lg overflow-x-auto bg-background/50">
            <GeneratorUnitsTable
              sub={mockSubStartup}
              onUnitAction={() => {}}
              onSetSetpoint={() => {}}
              setpoints={{ 0: 20 }}
              onSetpointChange={() => {}}
              isPaused={true}
            />
          </div>
          <p>Once a generator has begun starting up, it may take some time before it begins generating power. For steam units (coal and nuclear), the start up time is very long. Once started, the unit will increase power output to its minimum value, then begin operating as normal.</p>
        </>
      )
    },
    {
      title: "Icon Legend",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-4">Energy Categories</h4>
          <div className="space-y-8">
            <div>
              <h5 className="text-xl font-semibold mb-3 border-b pb-2">Generator Types</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                <LegendRow icon={GenerationTypeConfig[SubstationCategory.Nuclear].icon} name="Nuclear" description="High-capacity, slow-ramping baseload power." colorClass={GenerationTypeConfig[SubstationCategory.Nuclear].tailwind.text} />
                <LegendRow icon={GenerationTypeConfig[SubstationCategory.Thermal].icon} name="Thermal" description="Fossil-fuel plants like natural gas and coal." colorClass={GenerationTypeConfig[SubstationCategory.Thermal].tailwind.text} />
                <LegendRow icon={GenerationTypeConfig[SubstationCategory.Wind].icon} name="Wind" description="Variable renewable energy, dependent on wind speed." colorClass={GenerationTypeConfig[SubstationCategory.Wind].tailwind.text} />
                <LegendRow icon={GenerationTypeConfig[SubstationCategory.Solar].icon} name="Solar" description="Variable renewable energy, dependent on sunlight." colorClass={GenerationTypeConfig[SubstationCategory.Solar].tailwind.text} />
              </div>
            </div>
            <div>
              <h5 className="text-xl font-semibold mb-3 border-b pb-2">Load Customer Types</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {Object.values(LoadTypeConfig).map(config => (
                  <LegendRow key={config.name} icon={config.icon} name={config.name} description={config.description} colorClass={config.tailwind.text} />
                ))}
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Transmission Lines",
      content: (
        <>
          <h4 className="text-2xl font-bold mb-2">Transmission Lines</h4>
          <p>Substations (the circles) are connected to each other by transmission lines. The animated dots on the line represent the direction the power is flowing. Click on one of the lines to bring up more information.</p>
          <p className="mt-2">If a line is overloaded, it will turn yellow. If it becomes very overloaded, it will turn orange. If a line remains orange, it is at risk of tripping due to overload. Tripped lines (red dashed) cannot be reclosed.</p>
          <div className="flex gap-4 my-4 flex-wrap justify-center" aria-label="Examples of transmission line states">
            <LineExample colorClass="stroke-foreground" label="In-Service" />
            <LineExample colorClass="stroke-foreground" outOfService label="Out-of-Service" />
            <LineExample colorClass="stroke-[var(--color-warning)]" label="Overloaded" />
            <LineExample colorClass="stroke-[var(--color-overload-critical)]" label="Critically Overloaded" />
            <LineExample colorClass="stroke-destructive" dashed label="Tripped" />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4" aria-label="Examples of grid frequency states">
            <FrequencyDisplay freq={60.00} label="Stable" />
            <FrequencyDisplay freq={59.80} label="Warning" />
            <FrequencyDisplay freq={59.65} label="Danger" />
          </div>
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

    const gameSpeed = toyIsFastForward ? 50 : 500;
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
          <DialogDescription className="sr-only">A multi-page guide on how to play the game.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 text-lg pr-6 overflow-y-auto flex-1">
          {helpPages[currentPage].content}
        </div>
        <DialogFooter className="pt-4 sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goToPrevPage} disabled={currentPage === 0}>
              Previous
            </Button>
            {currentPage < totalPages - 1 ? (
              <Button onClick={goToNextPage}>
                Next
              </Button>
            ) : (
              <Button onClick={() => onOpenChange(false)}>
                Finish
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
