"use client"

import { useTheme } from "next-themes"
import { HelpCircle, LogOut, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppHeaderProps {
  onHelpClick: () => void;
  onQuitClick: () => void;
}

export function AppHeader({ onHelpClick, onQuitClick }: AppHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="bg-background sticky top-0 grid grid-cols-3 items-center border-b p-4 h-16 z-50">
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
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            className="cursor-pointer"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onHelpClick}
            title="Help"
            className="cursor-pointer"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onQuitClick} title="Quit" className="cursor-pointer">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}