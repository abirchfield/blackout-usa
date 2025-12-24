import { Wind, Sun, Atom, Flame, Plug } from "lucide-react";
import { SubstationCategory } from "./types";

const thermalConfig = {
  name: "Thermal",
  color: "Gray",
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
    color: "Magenta",
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
    color: "#06b6d4", // Hex for Tailwind's cyan-400
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
    color: "Gray",
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
  TRIPPED: "Red",
  OVERLOAD_CRITICAL: "Orange",
  OVERLOAD_NORMAL: "Yellow",
  POWER_FLOW: "Lime",
};