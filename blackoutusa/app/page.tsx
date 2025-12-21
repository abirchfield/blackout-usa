"use client";

import { useState, useEffect, useRef } from "react"
import { Play, Pause, FastForward, HelpCircle, X, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "@/components/app-sidebar"
import { GameEngine } from "@/lib/game/engine"
import { DashboardStats } from "@/lib/game/types"

export default function Page() {
  // Modal States
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false)
  const [isAlertsOpen, setIsAlertsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isQuitOpen, setIsQuitOpen] = useState(false)

  // Game States
  const [day, setDay] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isFastForward, setIsFastForward] = useState(false)
  const [alerts, setAlerts] = useState<Array<{id: number, time: string, message: string, critical: boolean}>>([])
  const [alertIdCounter, setAlertIdCounter] = useState(0)
  
  // Engine Integration
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | undefined>(undefined)

  useEffect(() => {
    setIsWelcomeOpen(true)
    
    // Initialize Engine
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new GameEngine(canvasRef.current);
      
      // Start Animation Loop
      let animationFrameId: number;
      let lastUpdate = 0;
      
      const loop = (timestamp: number) => {
        if (engineRef.current) {
          // Update Logic
          if (!isPaused) {
             engineRef.current.update();
          }
          
          // Draw
          engineRef.current.draw();
          
          // Sync UI (Throttle to ~10fps to save React renders)
          if (timestamp - lastUpdate > 100) {
            setDashboardStats(engineRef.current.getDashboardStats());
            lastUpdate = timestamp;
          }
        }
        animationFrameId = requestAnimationFrame(loop);
      };
      
      animationFrameId = requestAnimationFrame(loop);
      
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [])

  // Logic ported from script.js start_day1() and start_day()
  const handleStartGame = () => {
    setIsWelcomeOpen(false)
    setDay(1)
    
    // Reset alerts and add Day 1 hints (simulated from script.js)
    const initialAlerts = [
      { message: "Your shift has started. Click \"View all Alerts\" to see additional hints for what to do.", critical: false },
      { message: "Hint #1: The McCamey Solar PV plant in West Texas is currently disconnected. You might as well start up all 3 units at that plant to get more, low-cost energy.", critical: false },
      { message: "Hint #2: The Mission Gas Turbine plant in South Texas has very high costs. Try shutting down 1-3 of these units while you still have plenty of reserves.", critical: false },
      { message: "Hint #3: You are going to need more reserves in the evening once the solar has gone down and the load is higher.", critical: false },
      { message: "Hint #4: For the rest of the day, watch the reserves carefully. If they get below 500 MW you need to find new generation to start up.", critical: false },
    ]
    
    // Add them in reverse order so the first one appears at the top (like prepend)
    const newAlerts = initialAlerts.map((a, i) => ({
      id: i,
      time: "1:00 PM",
      message: a.message,
      critical: a.critical
    }))
    setAlerts(newAlerts)
    setAlertIdCounter(initialAlerts.length)

    setIsHelpOpen(true)
    setIsPaused(true) // pause_modal() behavior
  }

  const removeAlert = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
    if (isPaused) setIsFastForward(false) // If unpausing, go to normal speed
  }

  const toggleFastForward = () => {
    if (isFastForward) {
      setIsFastForward(false) // Go back to normal
    } else {
      setIsFastForward(true)
      setIsPaused(false) // Unpause if paused
    }
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4 h-16 z-50">
        <h2 className="text-2xl font-bold font-share-tech text-foreground mr-4">
          Blackout USA
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={togglePause}
            title={isPaused ? "Resume" : "Pause"}
            className="cursor-pointer"
          >
            {isPaused ? <Play className="h-4 w-4 text-red-500" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFastForward}
            title={isFastForward ? "Normal Speed" : "Fast Forward"}
            className="cursor-pointer"
          >
            {isFastForward ? <Play className="h-4 w-4 text-green-500" /> : <FastForward className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsHelpOpen(true)}
            title="Help"
            className="cursor-pointer"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsQuitOpen(true)}
            title="Quit"
            className="cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar stats={dashboardStats} />
        <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <div className="game-wrapper relative h-full w-full">
          <div className="main-section">
            <div className="canvas-box" id="canvas-box-obj">
              <canvas
                ref={canvasRef}
                tabIndex={1}
                id="main-canvas-id"
                className="main-canvas"
              ></canvas>
            </div>
          </div>

          {/* Modals */}
          <Dialog open={isWelcomeOpen} onOpenChange={setIsWelcomeOpen}>
            <DialogContent className="sm:max-w-[600px] font-share-tech">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Welcome to the Blackout USA Game!</DialogTitle>
                <DialogDescription className="hidden">Game Introduction</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 text-lg">
                <p>
                  Can you efficiently operate an electrical grid and keep it safe
                  from a blackout? Manage the grid for 5 different days, each one
                  a bit more challenging than the one before. Pay attention to the
                  briefing for each day, and the &quot;How to Play&quot;
                  instructions on the next screen. Click the button below to get
                  started.
                </p>
                <p className="text-sm text-muted-foreground">
                  This game was developed by the research group of Prof. Adam
                  Birchfield at Texas A&M University.{" "}
                  <a href="https://birchfield.engr.tamu.edu" className="underline hover:text-primary">
                    More Information.
                  </a>
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleStartGame} className="w-full text-xl py-6 cursor-pointer">
                  Start my first shift!
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Alerts Modal */}
          <Dialog open={isAlertsOpen} onOpenChange={setIsAlertsOpen}>
            <DialogContent className="sm:max-w-[800px] font-share-tech max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-3xl font-bold">Alerts</DialogTitle>
                <DialogDescription className="hidden">List of game alerts</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto border-t border-border mt-4">
                <div className="grid grid-cols-[90px_1fr_auto] gap-4 p-2 font-bold border-b border-border">
                  <div>Time</div>
                  <div>Message</div>
                  <div>Action</div>
                </div>
                {alerts.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">No alerts to show</div>
                )}
                {alerts.map((alert) => (
                  <div key={alert.id} className="grid grid-cols-[90px_1fr_auto] gap-4 p-2 border-b border-border items-center">
                    <div>{alert.time}</div>
                    <div className={alert.critical ? "text-red-500 font-bold" : ""}>{alert.message}</div>
                    <Button variant="secondary" size="sm" onClick={() => removeAlert(alert.id)} className="cursor-pointer">OK</Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Help Modal */}
          <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
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
                
                <Button onClick={() => setIsHelpOpen(false)} className="w-full text-xl py-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer">
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
                  <div className="flex gap-4 my-4">
                    <div className="text-center"><img src="/Figs/Load1.PNG" alt="In-service load" className="border border-white mx-auto" /><p>In-service load</p></div>
                    <div className="text-center"><img src="/Figs/Load2.PNG" alt="Out-of-service load" className="border border-white mx-auto" /><p>Out-of-service load</p></div>
                  </div>
                  <p>Click on one of the square load substations to bring up more information. Each substation contains multiple customer circuits. As the electric grid operator, you can switch loads in or out of service. Normally you want all loads in service. There is a cost of $1000/MW/hr for unserved load.</p>

                  <h4 className="text-2xl font-bold mt-6 mb-2 border-t pt-4">Generators</h4>
                  <p>Circle substations represent electric generators, the source of electric power. In the game the circles are colored based on the fuel type. The shading of the generator also represents how much power it is producing: an empty circle is not generating any power, while a full one is producing at its maximum capacity.</p>
                  <div className="flex gap-4 my-4">
                    <div className="text-center"><img src="/Figs/Gen1.PNG" alt="Solar plant" className="border border-white mx-auto" /><p>Solar plant (full capacity)</p></div>
                    <div className="text-center"><img src="/Figs/Gen2.PNG" alt="Thermal plant" className="border border-white mx-auto" /><p>Thermal plant (50% capacity)</p></div>
                  </div>
                  <p>Click on one of the circle generator substations to bring up more information. Each substation contains multiple generating units. As the electric grid operator, you have different decisions depending on the status of the unit.</p>
                  
                  <div className="my-4"><img src="/Figs/Gen-in-service.PNG" alt="In service" className="border border-white" /></div>
                  <p>In-service generators are currently producing power. This information shows how much power it is producing, which will always be between the Min and Max.</p>
                  
                  <h4 className="text-2xl font-bold mt-6 mb-2 border-t pt-4">Transmission Lines</h4>
                  <p>Substations (circles and squares) are connected to each other by transmission lines. The animated dots on the line represent the direction the power is flowing.</p>
                  <div className="my-4"><img src="/Figs/Line-1.PNG" alt="Line" className="border border-white" /></div>
                  <p>Click on one of the lines to bring up more information. Some of the lines have two circuits. As the electric grid operator, you can switch lines in and out of service.</p>

                  <h4 className="text-2xl font-bold mt-6 mb-2 border-t pt-4">Frequency Management</h4>
                  <p>Below the clock is the grid frequency. This is the most important number for avoiding a blackout! Keep it as close to 60 Hz as possible. If it turns orange, you are getting close to risk of tripping. If it turns red, you will start to see generators, loads, and lines trip offline and a blackout is likely not far off.</p>
                  <div className="my-4"><img src="/Figs/Freq.png" alt="Frequency" className="border border-white" /></div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Quit Modal */}
          <Dialog open={isQuitOpen} onOpenChange={setIsQuitOpen}>
            <DialogContent className="sm:max-w-[600px] font-share-tech">
              <DialogHeader>
                <DialogTitle className="text-3xl font-bold">Quit the game?</DialogTitle>
                <DialogDescription className="hidden">Quit options</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <Button variant="secondary" className="text-xl py-6 cursor-pointer" onClick={() => window.location.reload()}>
                  Quit and go back to beginning
                </Button>
                <Button variant="secondary" className="text-xl py-6 cursor-pointer" onClick={() => {
                  setIsQuitOpen(false)
                  // Logic to restart day would go here
                  handleStartGame()
                }}>
                  Restart this day
                </Button>
                <Button variant="secondary" className="text-xl py-6 cursor-pointer" onClick={() => {
                  setIsQuitOpen(false)
                  setDay(d => d < 5 ? d + 1 : 1)
                  // Logic to skip would go here
                }}>
                  Skip forward to the next day
                </Button>
                <Button variant="outline" className="text-xl py-6 cursor-pointer" onClick={() => setIsQuitOpen(false)}>
                  Cancel, continue the game
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="modal" id="substation-modal">
            <div className="modal-header">
              <div className="title" id="substation-title">
                Substation-Modal
              </div>
              <button data-close-modal className="close-button">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div id="sub-main-text">
                This substation has 6 Gas Turbine Units
              </div>
              {/* Unit rows would go here, simplified for initial port */}
              <div id="sub-u1">
                <hr />
                <div className="unit-box">
                  <div className="unit-box-lcol">
                    <p className="sub-txt">TBD</p>
                  </div>
                  <div className="unit-box-rcol">
                    <button className="modal-text-button sub-btn1">TBD</button>
                    <button className="modal-text-button sub-btn2">TBD</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal" id="unit-modal">
            <div className="modal-body">
              <div id="unit-title">
                Choose a new setpoint for this unit in MW
              </div>
              <input id="setpoint-input" />
              <span>MW</span>
              <br />
              <button>OK</button>
              <button>Cancel</button>
            </div>
          </div>

          <div id="overlay"></div>
        </div>
        </main>
      </div>
      <footer className="flex h-16 shrink-0 items-center justify-between border-t bg-background px-4 text-foreground shadow-sm z-10">
        <Button variant="outline" onClick={() => setIsAlertsOpen(true)} className="shrink-0 mr-4 cursor-pointer">
          View all Alerts
        </Button>
        <div className="flex flex-1 items-center gap-2 text-sm font-medium min-w-0">
          <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">
            {alerts.length > 0 ? alerts[0].message : "No alerts to show"}
          </span>
        </div>
      </footer>
    </div>
  )
}
