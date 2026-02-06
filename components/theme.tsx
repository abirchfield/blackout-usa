import { Wind, Sun, Atom, Flame, Plug, CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Home, Building2, Factory, Server } from "lucide-react";
import { SubstationCategory, UnitStatus, LoadCategoryType } from "@/lib/types";

// A mapping for generation types to their specific configurations.
// CSS variables in globals.css are the source of truth for colors.
// The `cssVar` field references the CSS variable name for programmatic access.
// The `tailwind` field provides ready-to-use Tailwind classes.
export const GenerationTypeConfig: Record<SubstationCategory, {
  name: string;
  cssVar: string;
  tailwind: {
    text: string;
    bg: string;
    border: string;
  };
  icon: React.ElementType;
}> = {
  [SubstationCategory.Nuclear]: {
    name: "Nuclear",
    cssVar: "--color-gen-nuclear",
    tailwind: {
      text: "text-[var(--color-gen-nuclear)]",
      bg: "bg-[var(--color-gen-nuclear)]",
      border: "border-[var(--color-gen-nuclear)]",
    },
    icon: Atom,
  },
  [SubstationCategory.Thermal]: { name: "Thermal", cssVar: "--color-gen-thermal", tailwind: { text: "text-[var(--color-gen-thermal)]", bg: "bg-[var(--color-gen-thermal)]", border: "border-[var(--color-gen-thermal)]" }, icon: Flame },
  [SubstationCategory.GasTurbine]: { name: "Gas Turbine", cssVar: "--color-gen-thermal", tailwind: { text: "text-[var(--color-gen-thermal)]", bg: "bg-[var(--color-gen-thermal)]", border: "border-[var(--color-gen-thermal)]" }, icon: Flame },
  [SubstationCategory.GasCombinedCycle]: { name: "Combined Cycle", cssVar: "--color-gen-thermal", tailwind: { text: "text-[var(--color-gen-thermal)]", bg: "bg-[var(--color-gen-thermal)]", border: "border-[var(--color-gen-thermal)]" }, icon: Flame },
  [SubstationCategory.CoalFiredSteam]: { name: "Coal Steam", cssVar: "--color-gen-thermal", tailwind: { text: "text-[var(--color-gen-thermal)]", bg: "bg-[var(--color-gen-thermal)]", border: "border-[var(--color-gen-thermal)]" }, icon: Flame },
  [SubstationCategory.Wind]: {
    name: "Wind",
    cssVar: "--color-gen-wind",
    tailwind: {
      text: "text-[var(--color-gen-wind)]",
      bg: "bg-[var(--color-gen-wind)]",
      border: "border-[var(--color-gen-wind)]",
    },
    icon: Wind,
  },
  [SubstationCategory.Solar]: {
    name: "Solar",
    cssVar: "--color-gen-solar",
    tailwind: {
      text: "text-[var(--color-gen-solar)]",
      bg: "bg-[var(--color-gen-solar)]",
      border: "border-[var(--color-gen-solar)]",
    },
    icon: Sun,
  },
  [SubstationCategory.Load]: {
    name: "Load",
    cssVar: "--color-gen-load",
    tailwind: {
      text: "text-[var(--color-gen-load)]",
      bg: "bg-[var(--color-gen-load)]",
      border: "border-[var(--color-gen-load)]",
    },
    icon: Plug,
  }
};

export const StatusConfig: Record<UnitStatus, {
  label: string;
  tailwind: {
    text: string;
    bg: string;
  };
  icon: React.ElementType;
}> = {
  [UnitStatus.IN]: {
    label: 'In-Service',
    tailwind: { text: 'text-[var(--color-status-in)]', bg: 'bg-[var(--color-status-in)]' },
    icon: CheckCircle2
  },
  [UnitStatus.DIS]: {
    label: 'Out-of-Service',
    tailwind: { text: 'text-[var(--color-status-dis)]', bg: 'bg-[var(--color-status-dis)]' },
    icon: XCircle
  },
  [UnitStatus.STARTUP]: {
    label: 'Starting Up',
    tailwind: { text: 'text-[var(--color-status-startup)] animate-pulse', bg: 'bg-[var(--color-status-startup)] animate-pulse' },
    icon: ArrowUpCircle
  },
  [UnitStatus.SHUTDOWN]: {
    label: 'Shutting Down',
    tailwind: { text: 'text-[var(--color-status-dis)]', bg: 'bg-[var(--color-status-dis)]' },
    icon: ArrowDownCircle
  },
  [UnitStatus.TRIP]: {
    label: 'Tripped',
    tailwind: { text: 'text-[var(--color-status-trip)]', bg: 'bg-[var(--color-status-trip)]' },
    icon: AlertTriangle
  },
};

export const LoadTypeConfig: Record<LoadCategoryType, {
  name: string;
  description: string;
  icon: React.ElementType;
  tailwind: {
    text: string;
    bg: string;
  };
}> = {
  [LoadCategoryType.Residential]: {
    name: "Residential",
    description: "Homes and small apartments.",
    icon: Home,
    tailwind: { text: "text-[var(--color-load-1)]", bg: "bg-[var(--color-load-1)]" }
  },
  [LoadCategoryType.Commercial]: {
    name: "Commercial",
    description: "Businesses, offices, and retail stores.",
    icon: Building2,
    tailwind: { text: "text-[var(--color-load-2)]", bg: "bg-[var(--color-load-2)]" }
  },
  [LoadCategoryType.Industrial]: {
    name: "Industrial",
    description: "Large factories and manufacturing plants.",
    icon: Factory,
    tailwind: { text: "text-[var(--color-load-3)]", bg: "bg-[var(--color-load-3)]" }
  },
  [LoadCategoryType.Datacenter]: {
    name: "Datacenter",
    description: "Server farms and data processing facilities.",
    icon: Server,
    tailwind: { text: "text-[var(--color-load-4)]", bg: "bg-[var(--color-load-4)]" }
  }
};

// UI Display Thresholds
export const UIThresholds = {
  FREQUENCY_WARNING_LOW: 59.7,
  FREQUENCY_WARNING_HIGH: 60.3,
  RESERVES_CRITICAL_MW: 50,
  RESERVES_WARNING_MW: 500,
};
