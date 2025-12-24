"use client"

import { HelpCircle, LogOut, PersonStanding } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppHeaderProps {
  onAccessibilityClick: () => void;
  onHelpClick: () => void;
  onQuitClick: () => void;
}

export function AppHeader({ onAccessibilityClick, onHelpClick, onQuitClick }: AppHeaderProps) {

  return (
    <header className="bg-background sticky top-0 grid grid-cols-3 items-center border-b p-4 h-16 z-50" role="banner" aria-label="Main application header">
      <div className="justify-self-start">
        <h2 className="text-2xl font-bold font-share-tech text-foreground">
          Blackout USA
        </h2>
      </div>

      <div />

      <div className="justify-self-end flex items-center gap-4">
        <div className="flex items-center gap-1 border-l pl-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onAccessibilityClick}
            aria-label="Accessibility Settings"
            className="cursor-pointer"
          >
            <PersonStanding className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onHelpClick}
            aria-label="How To Play"
            className="cursor-pointer"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onQuitClick}
            aria-label="Quit game"
            className="cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}