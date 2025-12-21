"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartGame: () => void;
}

export function WelcomeModal({ open, onOpenChange, onStartGame }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button onClick={onStartGame} className="w-full text-xl py-6 cursor-pointer">
            Start my first shift!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}