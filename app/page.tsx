"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GameEngine } from "@/lib/engine";
import { loadCase, DEFAULT_CASE, CASE_NAMES } from "@/data/_out/registry";
import { AccessibilityModal } from "@/components/modals/accessibility-modal";
import { useAppSettings } from "@/lib/hooks/use-app-settings";
import { useModals } from "@/lib/hooks/use-modals";
import { PersonStanding, ExternalLink } from "lucide-react";

const isStaticExport = process.env.NODE_ENV === 'production';

export default function WelcomePage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const { resolvedTheme } = useTheme();
  const modals = useModals();
  const { settings, updateSettings } = useAppSettings({ renderMapLabels: false });
  const [selectedCase, setSelectedCase] = useState(DEFAULT_CASE);

  const gameUrl = isStaticExport
    ? `./game.html?case=${selectedCase}`
    : `/game?case=${selectedCase}`;
  const tutorialUrl = isStaticExport
    ? `./game.html?tutorial=true&case=${selectedCase}`
    : `/game?tutorial=true&case=${selectedCase}`;

  // Create a non-interactive preview engine for the background map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    engineRef.current?.destroy();
    engineRef.current = null;

    let cancelled = false;
    let animationFrameId: number;

    loadCase(selectedCase).then(gridCase => {
      if (cancelled || !mapContainerRef.current) return;

      const engine = new GameEngine(mapContainerRef.current, gridCase, { interactive: false });
      engineRef.current = engine;
      engine.applySettings({
        theme: (resolvedTheme as 'light' | 'dark') || 'dark',
        animationsEnabled: settings.animationsEnabled,
        renderMapLabels: false,
        keyBindings: settings.keyBindings,
      });
      engine.userPaused = false;
      engine.startDay();

      const animate = () => {
        engine.draw();
        animationFrameId = requestAnimationFrame(animate);
      };
      animationFrameId = requestAnimationFrame(animate);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- settings are synced separately below; only recreate engine on case change
  }, [selectedCase]);

  // Sync settings (including theme) to engine
  useEffect(() => {
    engineRef.current?.applySettings({
      theme: (resolvedTheme as 'light' | 'dark') || 'dark',
      animationsEnabled: settings.animationsEnabled,
      renderMapLabels: settings.renderMapLabels,
      keyBindings: settings.keyBindings,
    });
  }, [resolvedTheme, settings.animationsEnabled, settings.renderMapLabels, settings.keyBindings]);

  const openAccessibility = useCallback(() => {
    modals.openModal('accessibility');
  }, [modals]);

  return (
    <main className="font-sans relative flex min-h-screen flex-col lg:flex-row items-center justify-center p-4 lg:p-8 gap-8">
      <div className="relative w-full lg:w-1/2 rounded-lg border bg-card p-8 text-card-foreground shadow-lg z-10">
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={openAccessibility}
            aria-label="Accessibility Settings"
          >
            <PersonStanding className="h-6 w-6" />
          </Button>
        </div>
        <div className="grid gap-4 py-4 text-lg">
          <h1 className="text-3xl font-bold">Welcome to the Blackout USA Game!</h1>
          <p>
            Can you efficiently operate an electrical grid and keep it safe
            from a blackout? Choose a map to play.
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
        {CASE_NAMES.length > 1 && (
          <div className="mt-4">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Select Grid</label>
            <div className="mt-2 flex gap-2 flex-wrap">
              {CASE_NAMES.map(name => (
                <button
                  key={name}
                  onClick={() => setSelectedCase(name)}
                  className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors cursor-pointer ${
                    selectedCase === name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
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
          ref={mapContainerRef}
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
