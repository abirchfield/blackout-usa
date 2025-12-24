import { Wind, Sun, Atom, Flame, Plug } from "lucide-react";
import { SubstationCategory } from "./types";

const thermalConfig = {
  name: "Thermal",
  color: "#fb923c", // Hex for Tailwind's orange-400
  tailwind: {
    text: "text-orange-400",
    bg: "bg-orange-400",
    border: "border-orange-400",
  },
  icon: Flame,
};

// A mapping for generation types to their specific configurations
export const GenerationTypeConfig: Record<SubstationCategory, {
  name: string;
  color: string; // For Canvas drawing
  tailwind: {
    text: string;
    bg: string;
    border: string;
  };
  icon: React.ElementType;
}> = {
  [SubstationCategory.Nuclear]: {
    name: "Nuclear",
    color: "#c084fc", // Hex for Tailwind's purple-400
    tailwind: {
      text: "text-purple-400",
      bg: "bg-purple-400",
      border: "border-purple-400",
    },
    icon: Atom,
  },
  [SubstationCategory.Thermal]: thermalConfig,
  [SubstationCategory.GasTurbine]: thermalConfig,
  [SubstationCategory.GasCombinedCycle]: thermalConfig,
  [SubstationCategory.CoalFiredSteam]: thermalConfig,
  [SubstationCategory.Wind]: {
    name: "Wind",
    color: "#22d3ee", // Hex for Tailwind's cyan-400
    tailwind: {
      text: "text-cyan-400",
      bg: "bg-cyan-400",
      border: "border-cyan-400",
    },
    icon: Wind,
  },
  [SubstationCategory.Solar]: {
    name: "Solar",
    color: "#facc15", // Hex for Tailwind's yellow-400
    tailwind: {
      text: "text-yellow-400",
      bg: "bg-yellow-400",
      border: "border-yellow-400",
    },
    icon: Sun,
  },
  [SubstationCategory.Load]: {
    name: "Load",
    color: "#6b7280", // Hex for Tailwind's gray-500
    tailwind: {
      text: "text-gray-500",
      bg: "bg-gray-500",
      border: "border-gray-500",
    },
    icon: Plug,
  }
};

// Centralized colors for UI and Canvas elements
export const AppColors = {
  TRIPPED: "#ef4444", // red-500
  OVERLOAD_CRITICAL: "#f97316", // orange-500
  OVERLOAD_NORMAL: "#eab308", // yellow-500
  POWER_FLOW: "#84cc16", // lime-500
  DEBUG: "#22d3ee", // cyan-400
};

// Centralized theme colors for the canvas to match globals.css
export const ThemeCanvasColors = {
  light: {
    primary: 'black',
    background: '#ffffff', // Corresponds to --background: oklch(1 0 0)
  },
  dark: {
    primary: 'white',
    background: 'rgb(37, 37, 37)', // Corresponds to --background: oklch(0.145 0 0)
  }
};