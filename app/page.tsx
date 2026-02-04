"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GameEngine } from "@/lib/engine";
import { AccessibilityModal } from "@/components/modals/accessibility-modal";
import { KeyBindings, defaultKeyBindings } from "@/lib/key-bindings";
import { defaultAppSettings, FONT_SIZE_MAP } from "@/lib/config";
import { PersonStanding, ExternalLink } from "lucide-react";

// In a static export (`next export`), links to pages need to point to the
// generated .html file to work on simple static servers without URL rewriting.
// This conditional logic ensures the links work in both development (`/game`)
// and in the static export (`/game.html`).
const isStaticExport = process.env.NODE_ENV === 'production';

export default function WelcomePage() {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const { resolvedTheme } = useTheme();
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);

  const [animationsEnabled, setAnimationsEnabled] = useState(defaultAppSettings.animationsEnabled);
  const [renderMapLabels, setRenderMapLabels] = useState(false); // Default to false for home page
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(defaultKeyBindings);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [isHighContrast, setIsHighContrast] = useState(defaultAppSettings.isHighContrast);

  const gameUrl = isStaticExport ? './game.html' : '/game';
  const tutorialUrl = isStaticExport ? './game.html?tutorial=true' : '/game?tutorial=true';

  useEffect(() => {
    let animationFrameId: number;

    if (svgContainerRef.current && !engineRef.current) {
      const engine = new GameEngine(svgContainerRef.current, { interactive: false });
      engineRef.current = engine;

      engine.setKeyBindings(keyBindings);
      // Pre-calculate power flow to have something to animate
      engine.startDay(1);
      engine.update(1, false);

      const animate = () => {
        if (engineRef.current) {
          engine.setTheme((resolvedTheme as 'light' | 'dark') || 'dark');
          // isPaused is false to allow the animation cycle to run in the drawer
          engine.draw(false, false);
        }
        animationFrameId = requestAnimationFrame(animate);
      };

      const handleResize = () => {
        engineRef.current?.draw(false, false);
      };

      animate(); // Start the animation loop
      window.addEventListener('resize', handleResize);

      // Cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        engine.destroy();
        engineRef.current = null;
      };
    }
  }, [resolvedTheme, keyBindings]);

  useEffect(() => {
    const root = document.documentElement;
    if (isHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [isHighContrast]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = FONT_SIZE_MAP[fontSize] || '16px';
  }, [fontSize]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setAnimationsEnabled(animationsEnabled);
    }
  }, [animationsEnabled]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setRenderMapLabels(renderMapLabels);
    }
  }, [renderMapLabels]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setKeyBindings(keyBindings);
    }
  }, [keyBindings]);

  return (
    <main className="relative flex min-h-screen flex-col lg:flex-row items-center justify-center p-4 lg:p-8 font-share-tech gap-8">
      <div className="relative w-full lg:w-1/2 rounded-lg border bg-card p-8 text-card-foreground shadow-lg z-10">
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAccessibilityOpen(true)}
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
      <AccessibilityModal
        open={isAccessibilityOpen}
        onOpenChange={setIsAccessibilityOpen}
        animationsEnabled={animationsEnabled}
        onAnimationsEnabledChange={setAnimationsEnabled}
        renderMapLabels={renderMapLabels}
        onRenderMapLabelsChange={setRenderMapLabels}
        keyBindings={keyBindings}
        onKeyBindingsChange={setKeyBindings}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        isHighContrast={isHighContrast}
        onIsHighContrastChange={setIsHighContrast}
      />
    </main>
  );
}
