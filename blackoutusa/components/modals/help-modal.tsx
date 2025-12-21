"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const helpPages = [
  {
    title: "Objective",
    content: (
      <>
        <h4 className="text-2xl font-bold mt-6 mb-2">My Objective</h4>
        <p>Your objective is to finish the shift with the lowest possible total cost. The highest cost component is unserved load -- so avoiding a blackout and keeping all customers online should keep your costs pretty low! For additional challenge, consider prioritizing cheaper generators and not having unnecessary generators online to bring the average cost of power down.</p>
      </>
    )
  },
  {
    title: "Alerts",
    content: (
      <>
        <h4 className="text-2xl font-bold mt-6 mb-2">What should I do?</h4>
        <p>Click on the &quot;View all Alerts&quot; button in the top right to bring up the list of alerts. This list includes hints and notifications to help you find your priorities for managing the grid. You can delete any alert by clicking &quot;OK&quot; on the alerts window. The most recent alert will be displayed at the top of the screen.</p>
      </>
    )
  },
  {
    title: "Navigation",
    content: (
      <>
        <h4 className="text-2xl font-bold mt-6 mb-2">The Map</h4>
        <p>Navigate the Texas electric grid by clicking and dragging to move around (or use arrow keys). Zoom in and out with the scroll wheel (or PageUp/PageDown).</p>
      </>
    )
  },
  {
    title: "Loads",
    content: (
      <>
        <h4 className="text-2xl font-bold mt-6 mb-2">Loads</h4>
        <p>Square substations represent electric customers: homes and businesses that use electric power. These are also called electrical &quot;loads&quot;. In the game they are marked with solid squares if they are &quot;connected,&quot; meaning the customers have electricity, and empty squares if they are &quot;disconnected,&quot; if the customers are in blackout.</p>
        <div className="flex gap-4 my-4 flex-wrap">
          <div className="text-center"><img src="Figs/Load1.PNG" alt="In-service load" className="border border-white mx-auto max-w-full" /><p>In-service load</p></div>
          <div className="text-center"><img src="Figs/Load2.PNG" alt="Out-of-service load" className="border border-white mx-auto max-w-full" /><p>Out-of-service load</p></div>
        </div>
        <p>Click on one of the square load substations to bring up more information. Each substation contains multiple customer circuits. As the electric grid operator, you can switch loads in or out of service. Normally you want all loads in service. There is a cost of $1000/MW/hr for unserved load.</p>
      </>
    )
  },
  {
    title: "Generators",
    content: (
      <>
        <h4 className="text-2xl font-bold mt-6 mb-2">Generators</h4>
        <p>Circle substations represent electric generators, the source of electric power. In the game the circles are colored based on the fuel type. The shading of the generator also represents how much power it is producing: an empty circle is not generating any power, while a full one is producing at its maximum capacity.</p>
        <div className="flex gap-4 my-4 flex-wrap">
          <div className="text-center"><img src="Figs/Gen1.PNG" alt="Solar plant" className="border border-white mx-auto max-w-full" /><p>Solar plant (full capacity)</p></div>
          <div className="text-center"><img src="Figs/Gen2.PNG" alt="Thermal plant" className="border border-white mx-auto max-w-full" /><p>Thermal plant (50% capacity)</p></div>
        </div>
        <p>Click on one of the circle generator substations to bring up more information. Each substation contains multiple generating units. As the electric grid operator, you have different decisions depending on the status of the unit.</p>
      </>
    )
  },
  {
    title: "Generator Controls",
    content: (
      <>
        <h4 className="text-2xl font-bold mt-6 mb-2">Generator Controls</h4>
        <div className="my-4"><img src="Figs/Gen-in-service.PNG" alt="In service" className="border border-white max-w-full" /></div>
        <p>In-service generators are currently producing power. This information shows how much power it is producing, which will always be between the Min and Max. If desired, an in-service unit can be shut down.</p>
        <div className="my-4"><img src="Figs/Gen-out-of-service.PNG" alt="Out of service" className="border border-white max-w-full" /></div>
        <p>Out of service generators do not add any cost to the system operation. They can be started up if more generation capability is needed. Once start-up begins, the operating cost comes into effect.</p>
        <div className="my-4"><img src="Figs/Gen-start-up.PNG" alt="Start up" className="border border-white max-w-full" /></div>
        <p>Once a generator has begun starting up, it may take some time before it begins generating power. For steam units (coal and nuclear), the start up time is very long. Once started, the unit will increase power output to its minimum value, then begin operating as normal.</p>
      </>
    )
  },
  {
    title: "Transmission Lines",
    content: (
      <>
        <h4 className="text-2xl font-bold mt-6 mb-2">Transmission Lines</h4>
        <p>Substations (circles and squares) are connected to each other by transmission lines. The animated dots on the line represent the direction the power is flowing. Click on one of the lines to bring up more information.</p>
        <p className="mt-2">If a line is overloaded, it will turn yellow. If it becomes very overloaded, it will turn orange. If a line remains orange, it is at risk of tripping due to overload. Tripped lines (red dash) cannot be reclosed.</p>
        <div className="flex gap-4 my-4 flex-wrap">
          <img src="Figs/Line-2.PNG" alt="Line yellow" className="border border-white max-w-full" />
          <img src="Figs/Line-3.PNG" alt="Line orange" className="border border-white max-w-full" />
          <img src="Figs/Line-4.PNG" alt="Line trip" className="border border-white max-w-full" />
        </div>
        <p>Keep in mind that when a line is removed from service or tripped, the power previously flowing on it will have to find a new path through other lines. If those other lines become overloaded, this can cause cascading outages.</p>
      </>
    )
  },
  {
    title: "Time & Frequency",
    content: (
      <>
        <h4 className="text-2xl font-bold mt-6 mb-2">Time & Frequency Management</h4>
        <p>The dashboard is on the left. The clock will run at 1 minute every 1/2 second by default. Use the controls to pause or fast forward. When it gets to 11pm, the shift is over!</p>
        <div className="my-4"><img src="Figs/Clock.PNG" alt="Clock" className="border border-white max-w-full" /></div>
        <p>Below the clock is the grid frequency. This is the most important number for avoiding a blackout! Keep it as close to 60 Hz as possible. If it turns orange, you are getting close to risk of tripping. If it turns red, you will start to see generators, loads, and lines trip offline and a blackout is likely not far off.</p>
        <div className="my-4"><img src="Figs/Freq.png" alt="Frequency" className="border border-white max-w-full" /></div>
      </>
    )
  }
];

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = helpPages.length;

  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 0));

  return (
    <Dialog open={open} onOpenChange={() => {
      // Do nothing. This prevents dismissal via overlay click, Esc, or the 'X' button.
      // The modal must be closed via an explicit action inside it.
    }}>
      <DialogContent className="sm:max-w-[800px] font-share-tech h-[85vh] flex flex-col [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">How to Play</DialogTitle>
          <DialogDescription>{helpPages[currentPage].title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 text-lg pt-4 pr-6 overflow-y-auto flex-1">
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