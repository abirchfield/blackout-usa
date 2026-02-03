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
import { StatusIndicator } from "@/components/ui/status-indicator";
import { GeneratorUnitsTable } from "@/components/tables/unit-table";
import { Substation, UnitStatus, SubstationCategory } from "@/lib/types";
import { GenerationTypeConfig, LoadTypeConfig } from "@/lib/config";
import { TimeController } from "@/components/controls";
import { GameEngine } from "@/lib/engine"; 
import { PersonStanding, Timer, Bell, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// NOTE: The 'width' and 'height' for the <Image> components below are placeholders.
// For optimal performance and to avoid layout shift, please replace them with the
// actual dimensions of your image files. The paths also assume your 'Figs'
// directory is in the 'public' folder.
 
const mockSubBase: Substation = {
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
 
const mockSubInService: Substation = {
  ...mockSubBase,
  U: [{ Status: UnitStatus.IN, P: 65, Pset: 65, P0: 65, Status0: UnitStatus.IN, StatusCount: 0 }]
};
 
const mockSubOutOfService: Substation = {
  ...mockSubBase,
  U: [{ Status: UnitStatus.DIS, P: 0, Pset: 0, P0: 0, Status0: UnitStatus.DIS, StatusCount: 0 }]
};
 
const mockSubStartup: Substation = {
  ...mockSubBase,
  U: [{ Status: UnitStatus.STARTUP, P: 0, Pset: 0, P0: 0, Status0: UnitStatus.DIS, StatusCount: 30 }]
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
    setToyIsPaused(prevIsPaused => {
      const nextIsPaused = !prevIsPaused;
      // If the user is pausing the game, we should always turn off fast-forward
      // to ensure resuming starts at normal speed.
      if (nextIsPaused) {
        setToyIsFastForward(false);
      }
      return nextIsPaused;
    });
  };

  const handleToggleToyFastForward = () => {
    setToyIsFastForward(prev => {
      if (prev) {
        return false; // Go back to normal
      } else {
        setToyIsPaused(false); // FF implies playing
        return true;
      }
    });
  };

  const LoadExample = ({ inService }: { inService: boolean }) => {
    const radius = 24;
    const center = 28;
    const strokeWidth = 3;

    // Path for a 75% pie slice to represent a connected load
    const x = center + radius * Math.cos(-Math.PI / 2);
    const y = center + radius * Math.sin(-Math.PI / 2);
    const x2 = center + radius * Math.cos(Math.PI);
    const y2 = center + radius * Math.sin(Math.PI);
    const piePath = `M${center},${center} L${x},${y} A${radius},${radius} 0 1,1 ${x2},${y2} Z`;

    return (
      <div role="group" aria-label={inService ? "In-service load" : "Out-of-service load"} className="text-center p-4 border border-white/20 rounded-lg bg-background/50 flex flex-col items-center justify-center w-48 h-32">
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
          <circle cx={center} cy={center} r={radius} fill="var(--background)" />
          {inService && <path d={piePath} fill="var(--foreground)" />}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--foreground)" strokeWidth={strokeWidth} />
        </svg>
        <p className="mt-2 text-sm">{inService ? "In-service load" : "Out-of-service load"}</p>
      </div>
    );
  };

  const GeneratorExample = ({ category, p, pmax, capacityLabel }: { category: SubstationCategory, p: number, pmax: number, capacityLabel: string }) => {
    const [resolvedColor, setResolvedColor] = useState("");
    const outerRadius = 24;
    const innerRadius = outerRadius / 1.2; // from DrawingConfig.GENERATOR_OUTER_RADIUS_FACTOR
    const center = 28;
    const strokeWidth = 1;
    const genConfig = GenerationTypeConfig[category];
    
    useEffect(() => {
      // This effect runs on the client side to resolve the CSS variable for the generator color.
      // This ensures that the color respects the current theme (light, dark, high-contrast).
      const colorVar = getComputedStyle(document.documentElement).getPropertyValue(`--${genConfig.chartVar}`).trim();
      setResolvedColor(colorVar || genConfig.color); // Fallback to hardcoded color if var not found
    }, [genConfig.chartVar, genConfig.color]);

    const genColor = resolvedColor || genConfig.color; // Use resolved color, with initial fallback

    const ratio = Math.max(0, Math.min(1, p / pmax));
    const endAngle = -Math.PI / 2 + (Math.PI * 2 * ratio);
    const isFullCircle = ratio >= 1;

    const x = center + innerRadius * Math.cos(-Math.PI / 2);
    const y = center + innerRadius * Math.sin(-Math.PI / 2);
    const x2 = center + innerRadius * Math.cos(endAngle);
    const y2 = center + innerRadius * Math.sin(endAngle);
    const largeArcFlag = ratio > 0.5 ? 1 : 0;

    const piePath = `M${center},${center} L${x},${y} A${innerRadius},${innerRadius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;

    return (
      <div role="group" aria-label={`${genConfig.name} generator at ${capacityLabel}`} className="text-center p-4 border border-white/20 rounded-lg bg-background/50 flex flex-col items-center justify-center w-48 h-32">
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
          <circle cx={center} cy={center} r={outerRadius} fill={genColor} stroke={genColor} strokeWidth={strokeWidth} />
          <circle cx={center} cy={center} r={innerRadius} fill="var(--background)" />
          {ratio > 0 && (
            isFullCircle
              ? <circle cx={center} cy={center} r={innerRadius} fill={genColor} />
              : <path d={piePath} fill={genColor} />
          )}
          <circle cx={center} cy={center} r={innerRadius} fill="none" stroke={genColor} strokeWidth={strokeWidth} />
        </svg>
        <div className="mt-2 text-sm flex items-center justify-center gap-2 whitespace-nowrap">
          <span className="font-bold">{genConfig.name}</span>
          <Badge variant="secondary">{capacityLabel}</Badge>
        </div>
      </div>
    );
  };

  const LineExample = ({ colorClass, dashed, outOfService, label }: { colorClass: string, dashed?: boolean, outOfService?: boolean, label: string }) => (
    <div role="group" aria-label={`Example of a ${label} transmission line`} className="text-center p-4 border border-white/20 rounded-lg bg-background/50 flex flex-col items-center justify-center w-48 h-32">
      <div className="w-24 h-12 flex items-center justify-center">
        <svg width="100%" height="6" viewBox="0 0 100 6" className="overflow-visible">
          {outOfService ? (
            <>
              {/* Base solid line */}
              <line x1="0" y1="3" x2="100" y2="3" stroke="var(--foreground)" strokeWidth="4" />
              {/* Dashed line of background color on top */}
              <line x1="0" y1="3" x2="100" y2="3" stroke="var(--background)" strokeWidth="5" strokeDasharray="5, 5" />
            </>
          ) : (
            <line x1="0" y1="3" x2="100" y2="3" className={colorClass} strokeWidth="4" strokeDasharray={dashed ? "8, 4" : "none"} />
          )}
        </svg>
      </div>
      <p className="mt-2 text-sm">{label}</p>
    </div>
  );

  const LegendRow = ({ icon: Icon, name, description, colorClass }: { icon: React.ElementType, name: string, description: string, colorClass: string }) => (
    <div className="flex items-start gap-4 p-2">
        <div className="flex-shrink-0 rounded-md h-10 w-10 flex items-center justify-center bg-muted" aria-hidden="true">
            <Icon className={cn("h-6 w-6", colorClass)} />
        </div>
        <div>
            <div className="font-bold">{name}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
        </div>
    </div>
  );

  const FrequencyDisplay = ({ freq, label }: { freq: number, label: string }) => {
    const colorClass = freq < 59.7 || freq > 60.3 ? "text-destructive" : freq < 59.85 || freq > 60.15 ? "text-[var(--color-warning)]" : "text-foreground";
    return (
        <div className="text-center p-4 border border-white/20 rounded-lg bg-background/50 flex flex-col items-center justify-center" role="figure" aria-label={`Frequency: ${freq.toFixed(2)} Hz. Status: ${label}.`}>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Frequency</div>
            <div className={cn("text-2xl font-bold", colorClass)}>{freq.toFixed(2)} Hz</div>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
    );
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