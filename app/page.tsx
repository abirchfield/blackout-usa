"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GameEngine } from "@/lib/engine";
import { AccessibilityModal } from "@/components/modals/accessibility-modal";
import { useAppSettings } from "@/lib/hooks/use-app-settings";
import { useModalManager } from "@/lib/hooks/use-modal-manager";
import { PersonStanding, ExternalLink } from "lucide-react";

const isStaticExport = process.env.NODE_ENV === 'production';

export default function WelcomePage() {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const { resolvedTheme } = useTheme();
  const modals = useModalManager();
  const { settings, updateSettings } = useAppSettings({ renderMapLabels: false });

  const gameUrl = isStaticExport ? './game.html' : '/game';
  const tutorialUrl = isStaticExport ? './game.html?tutorial=true' : '/game?tutorial=true';

  useEffect(() => {
    let animationFrameId: number;

    if (svgContainerRef.current && !engineRef.current) {
      const engine = new GameEngine(svgContainerRef.current, { interactive: false });
      engineRef.current = engine;

      engine.setKeyBindings(settings.keyBindings);
      engine.startDay(1);
      engine.update(1, false);

      const animate = () => {
        if (engineRef.current) {
          engine.setTheme((resolvedTheme as 'light' | 'dark') || 'dark');
          engine.draw(false, false);
        }
        animationFrameId = requestAnimationFrame(animate);
      };

      const handleResize = () => {
        engineRef.current?.draw(false, false);
      };

      animate();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        engine.destroy();
        engineRef.current = null;
      };
    }
  }, [resolvedTheme, settings.keyBindings]);

  // Sync settings to engine
  useEffect(() => {
    engineRef.current?.setAnimationsEnabled(settings.animationsEnabled);
  }, [settings.animationsEnabled]);

  useEffect(() => {
    engineRef.current?.setRenderMapLabels(settings.renderMapLabels);
  }, [settings.renderMapLabels]);

  useEffect(() => {
    engineRef.current?.setKeyBindings(settings.keyBindings);
  }, [settings.keyBindings]);

  return (
    <main className="relative flex min-h-screen flex-col lg:flex-row items-center justify-center p-4 lg:p-8 font-share-tech gap-8">
      <div className="relative w-full lg:w-1/2 rounded-lg border bg-card p-8 text-card-foreground shadow-lg z-10">
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => modals.openModal('accessibility')}
            aria-label="Accessibility Settings"
          >
            <PersonStanding className="h-6 w-6" />
          </Button>
        </div>
        <div className="grid gap-4 py-4 text-lg">
          <h1 className="text-3xl font-bold">Welcome to the Blackout USA Game!</h1>
          <p>
            Can you efficiently operate an electrical grid and keep it safe
            from a blackout? Manage the grid for 5 different days, each one
            a bit more challenging than the one before. Pay attention to the
            briefing for each day, and read the &quot;How to Play&quot;
            instructions. Click the buttons below to get
            started.
          </p>
          <p className="text-sm text-muted-foreground">
            This game was developed by the research group of Prof. Adam
            Birchfield at Texas A&M University.{" "}
            <a
              href="https://birchfield.engr.tamu.edu"
              className="underline hover:text-primary inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              More Information
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            .
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button variant="secondary" asChild className="text-xl py-6 cursor-pointer">
            <Link href={tutorialUrl}>How to Play</Link>
          </Button>
          <Button asChild className="text-xl py-6 cursor-pointer">
            <Link href={gameUrl}>Start my first shift!</Link>
          </Button>
        </div>
      </div>
      <div className="w-full lg:w-1/2 h-[50vh] lg:h-[70vh] rounded-lg bg-background overflow-hidden">
        <div
          ref={svgContainerRef}
          aria-label="A static visual of the Texas electrical grid map"
          role="img"
          className="h-full w-full"
        />
      </div>
      {modals.isOpen('accessibility') && (
        <AccessibilityModal
          open={true}
          onOpenChange={(open) => modals.onOpenChange('accessibility', open)}
          settings={settings}
          onSettingsChange={updateSettings}
        />
      )}
    </main>
  );
}
