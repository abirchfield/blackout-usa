"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: number;
}

export function HelpModal({ open, onOpenChange, day }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] font-share-tech max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">Day {day} Briefing</DialogTitle>
          <DialogDescription className="hidden">Scenario Instructions</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 text-lg">
          <div className="bg-muted/20 p-4 rounded-lg border border-border">
            {day === 1 && (
              <ul className="list-disc pl-5 space-y-2">
                <li>Your goal is to avoid a blackout and keep operating costs as low as possible</li>
                <li>Your shift runs from 1pm to 11pm.</li>
                <li>Load (electrical demand from customers) is expected to rise, peak around 7pm, and then decline later in the night.</li>
                <li>There is a steady, moderate wind predicted for whole afternoon and evening.</li>
                <li>Keep in mind the solar generation will go down later in the afternoon!</li>
              </ul>
            )}
            {day !== 1 && <p>Scenario description for Day {day} TBD</p>}
          </div>
          
          <Button onClick={() => onOpenChange(false)} className="w-full text-xl py-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer">
            Got it! Let&apos;s go to the game!
          </Button>
          
          
          <div>
            <h3 className="text-3xl font-bold mb-4">How to Play</h3>
            <p className="mb-4">Scroll down for more. You can return here any time by clicking the help button.</p>

            <h4 className="text-2xl font-bold mt-6 mb-2 border-t pt-4">My Objective</h4>
            <p>Your objective is to finish the shift with the lowest possible total cost. The highest cost component is unserved load -- so avoiding a blackout and keeping all customers online should keep your costs pretty low! For additional challenge, consider prioritizing cheaper generators and not having unnecessary generators online to bring the average cost of power down.</p>

            <h4 className="text-2xl font-bold mt-6 mb-2 border-t pt-4">What should I do?</h4>
            <p>Click on the &quot;View all Alerts&quot; button in the bottom right to bring up the list of alerts. This list includes hints and notifications to help you find your priorities for managing the grid. You can delete any alert by clicking &quot;OK&quot; on the alerts window. The most recent alert will be displayed at the bottom of the screen.</p>

            <h4 className="text-2xl font-bold mt-6 mb-2 border-t pt-4">The Map</h4>
            <p>Navigate the Texas electric grid by clicking and dragging to move around (or use arrow keys). Zoom in and out with the scroll wheel (or PageUp/PageDown).</p>

            <h4 className="text-2xl font-bold mt-6 mb-2 border-t pt-4">Loads</h4>
            <p>Square substations represent electric customers: homes and businesses that use electric power. These are also called electrical &quot;loads&quot;. In the game they are marked with solid squares if they are &quot;connected,&quot; meaning the customers have electricity, and empty squares if they are &quot;disconnected,&quot; if the customers are in blackout.</p>
            <div className="flex gap-4 my-4 flex-wrap">
              <div className="text-center"><img src="/Figs/Load1.PNG" alt="In-service load" className="border border-white mx-auto max-w-full" /><p>In-service load</p></div>
              <div className="text-center"><img src="/Figs/Load2.PNG" alt="Out-of-service load" className="border border-white mx-auto max-w-full" /><p>Out-of-service load</p></div>
            </div>
            <p>Click on one of the square load substations to bring up more information. Each substation contains multiple customer circuits. As the electric grid operator, you can switch loads in or out of service. Normally you want all loads in service. There is a cost of $1000/MW/hr for unserved load.</p>

            <h4 className="text-2xl font-bold mt-6 mb-2 border-t pt-4">Generators</h4>
            <p>Circle substations represent electric generators, the source of electric power. In the game the circles are colored based on the fuel type. The shading of the generator also represents how much power it is producing: an empty circle is not generating any power, while a full one is producing at its maximum capacity.</p>
            <div className="flex gap-4 my-4 flex-wrap">
              <div className="text-center"><img src="/Figs/Gen1.PNG" alt="Solar plant" className="border border-white mx-auto max-w-full" /><p>Solar plant (full capacity)</p></div>
              <div className="text-center"><img src="/Figs/Gen2.PNG" alt="Thermal plant" className="border border-white mx-auto max-w-full" /><p>Thermal plant (50% capacity)</p></div>
            </div>
            <p>Click on one of the circle generator substations to bring up more information. Each substation contains multiple generating units. As the electric grid operator, you have different decisions depending on the status of the unit.</p>
            
            <div className="my-4"><img src="/Figs/Gen-in-service.PNG" alt="In service" className="border border-white max-w-full" /></div>
            <p>In-service generators are currently producing power. This information shows how much power it is producing, which will always be between the Min and Max.</p>
            
            <p className="mt-2">If desired, an in-service unit can be shut down. This will cause the power output to reduce to zero and, once the generator is fully shut down, there will no longer be an operating or fuel cost.</p>
            <div className="my-4"><img src="/Figs/Gen-shut-down.PNG" alt="Shut down" className="border border-white max-w-full" /></div>
            <p>Once a generator has started shutting down, no controls are available. You must wait until it fully shuts down before starting it back up.</p>
            
            <div className="my-4"><img src="/Figs/Gen-out-of-service.PNG" alt="Out of service" className="border border-white max-w-full" /></div>
            <p>Out of service generators do not add any cost to the system operation. They can be started up if more generation capability is needed. Once start-up begins, the operating cost comes into effect.</p>
            
            <div className="my-4"><img src="/Figs/Gen-start-up.PNG" alt="Start up" className="border border-white max-w-full" /></div>
            <p>Once a generator has begun starting up, it may take some time before it begins generating power. For steam units (coal and nuclear), the start up time is very long. Once started, the unit will increase power output to its minimum value, then begin operating as normal.</p>
            
            <div className="my-4"><img src="/Figs/Gen-trip.PNG" alt="Trip" className="border border-white max-w-full" /></div>
            <p>A generator that has tripped offline (due to frequency or separation from the grid) cannot be restarted.</p>

            <h4 className="text-2xl font-bold mt-6 mb-2 border-t pt-4">Transmission Lines</h4>
            <p>Substations (circles and squares) are connected to each other by transmission lines. The animated dots on the line represent the direction the power is flowing.</p>
            <div className="my-4"><img src="/Figs/Line-1.PNG" alt="Line" className="border border-white max-w-full" /></div>
            <p>Click on one of the lines to bring up more information. Some of the lines have two circuits. As the electric grid operator, you can switch lines in and out of service.</p>

            <p className="mt-2">If a line is overloaded, it will turn yellow. If it becomes very overloaded, it will turn orange. If a line remains orange, it is at risk of tripping due to overload. Tripped lines (red dash) cannot be reclosed.</p>
            <div className="flex gap-4 my-4 flex-wrap">
              <img src="/Figs/Line-2.PNG" alt="Line yellow" className="border border-white max-w-full" />
              <img src="/Figs/Line-3.PNG" alt="Line orange" className="border border-white max-w-full" />
              <img src="/Figs/Line-4.PNG" alt="Line trip" className="border border-white max-w-full" />
            </div>
            <p>Keep in mind that when a line is removed from service or tripped, the power previously flowing on it will have to find a new path through other lines. If those other lines become overloaded, this can cause cascading outages.</p>

            <h4 className="text-2xl font-bold mt-6 mb-2 border-t pt-4">Time Management</h4>
            <p>The dashboard is shown on the left. It shows overview grid data.</p>
            <p>The clock will run at 1 minute every 1/2 second by default. Use the controls in the top right to pause or fast forward the clock. When it gets to 11pm, the shift is over!</p>
            <div className="flex gap-4 my-4 flex-wrap">
              <img src="/Figs/Clock.PNG" alt="Clock" className="border border-white max-w-full" />
              <img src="/Figs/Navigation.png" alt="Navigation" className="border border-white max-w-full" />
            </div>

            <h4 className="text-2xl font-bold mt-6 mb-2 border-t pt-4">Frequency Management</h4>
            <p>Below the clock is the grid frequency. This is the most important number for avoiding a blackout! Keep it as close to 60 Hz as possible. If it turns orange, you are getting close to risk of tripping. If it turns red, you will start to see generators, loads, and lines trip offline and a blackout is likely not far off.</p>
            <div className="my-4"><img src="/Figs/Freq.png" alt="Frequency" className="border border-white max-w-full" /></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}