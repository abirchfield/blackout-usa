import { Wind, Sun, Atom, Flame, Plug, CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Home, Building2, Factory, Server } from "lucide-react";
import { AppSettings, SubstationCategory, UnitStatus, LoadCategoryType } from "./types";
import { defaultKeyBindings } from "./key-bindings";

// A mapping for generation types to their specific configurations.
// The `color` field is the single source of truth for each category's color,
// used by both the canvas renderer and Tailwind utility classes.
export const GenerationTypeConfig: Record<SubstationCategory, {
  name: string;
  color: string;
  tailwind: {
    text: string;
    bg: string;
    border: string;
  };
  icon: React.ElementType;
}> = {
  [SubstationCategory.Nuclear]: {
    name: "Nuclear",
    color: "#c084fc", // purple-400
    tailwind: {
      text: "text-[#c084fc]",
      bg: "bg-[#c084fc]",
      border: "border-[#c084fc]",
    },
    icon: Atom,
  },
  [SubstationCategory.Thermal]: { name: "Thermal", color: "#A08060", tailwind: { text: "text-[#A08060]", bg: "bg-[#A08060]", border: "border-[#A08060]" }, icon: Flame },
  [SubstationCategory.GasTurbine]: { name: "Gas Turbine", color: "#A08060", tailwind: { text: "text-[#A08060]", bg: "bg-[#A08060]", border: "border-[#A08060]" }, icon: Flame },
  [SubstationCategory.GasCombinedCycle]: { name: "Combined Cycle", color: "#A08060", tailwind: { text: "text-[#A08060]", bg: "bg-[#A08060]", border: "border-[#A08060]" }, icon: Flame },
  [SubstationCategory.CoalFiredSteam]: { name: "Coal Steam", color: "#A08060", tailwind: { text: "text-[#A08060]", bg: "bg-[#A08060]", border: "border-[#A08060]" }, icon: Flame },
  [SubstationCategory.Wind]: {
    name: "Wind",
    color: "#22d3ee", // cyan-400
    tailwind: {
      text: "text-[#22d3ee]",
      bg: "bg-[#22d3ee]",
      border: "border-[#22d3ee]",
    },
    icon: Wind,
  },
  [SubstationCategory.Solar]: {
    name: "Solar",
    color: "#facc15", // yellow-400
    tailwind: {
      text: "text-[#facc15]",
      bg: "bg-[#facc15]",
      border: "border-[#facc15]",
    },
    icon: Sun,
  },
  [SubstationCategory.Load]: {
    name: "Load",
    color: "#6b7280", // gray-500
    tailwind: {
      text: "text-muted-foreground",
      bg: "bg-muted-foreground",
      border: "border-muted-foreground",
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

// Physics and Simulation Constants
export const PhysicsConfig = {
  BASE_FREQUENCY: 60.0,
  FREQUENCY_BLACKOUT_THRESHOLD: 40.0,
};

// View and Map Constants
export const ViewConfig = {
  ZOOM_LIMIT_MAX: 500,
  DETAIL_ZOOM_LEVEL: 200,
  // Dynamic Substation Radius Parameters
  BASE_SUBSTATION_RADIUS_NORMAL: 10,
  BASE_SUBSTATION_RADIUS_HOVER: 13,
  MIN_SUBSTATION_RADIUS: 5,
  MAX_SUBSTATION_RADIUS: 20,
  MAX_SUBSTATION_RADIUS_HOVER: 25,
  // Interaction thresholds
  BRANCH_HOVER_RADIUS: 8, // pixels
  CLICK_DRAG_THRESHOLD: 10, // pixels
  KEYBOARD_PAN_AMOUNT: 20, // pixels
  // Zoom Sensitivity
  ZOOM_SENSITIVITY_DEFAULT: 1.0,
  ZOOM_SENSITIVITY_MIN: 0.1,
  ZOOM_SENSITIVITY_MAX: 2.0,
  ZOOM_SENSITIVITY_STEP: 0.1,
};

// Shared radius calculation used by both canvas drawer and event handler.
// Keeps hover detection and visual rendering perfectly in sync.
export function getDynamicSubstationRadius(scaleX: number, referenceScale: number, isHover: boolean): number {
  const baseRadius = isHover ? ViewConfig.BASE_SUBSTATION_RADIUS_HOVER : ViewConfig.BASE_SUBSTATION_RADIUS_NORMAL;
  const maxRadius = isHover ? ViewConfig.MAX_SUBSTATION_RADIUS_HOVER : ViewConfig.MAX_SUBSTATION_RADIUS;
  const scaleFactor = Math.sqrt(scaleX / referenceScale);
  const radius = baseRadius * scaleFactor;
  return Math.max(ViewConfig.MIN_SUBSTATION_RADIUS, Math.min(radius, maxRadius));
}

// Drawing and Style Constants for SVG Renderer
export const DrawingConfig = {
  // Animation
  MIN_POWER_FOR_ANIMATION: 10,

  // Drawing Styles
  BORDER_LINE_WIDTH: 2,
  BRANCH_RADIUS_NORMAL: 3.0,
  BRANCH_RADIUS_HOVER: 4.5,
  BRANCH_RADIUS_MIN: 1.5,
  BRANCH_RADIUS_MAX: 6.0,
  BRANCH_RADIUS_HOVER_MAX: 7.0,
  SUBSTATION_BORDER_WIDTH: 3,
  GENERATOR_OUTLINE_WIDTH: 2,
  GENERATOR_OUTER_RADIUS_FACTOR: 1.2,
  SECOND_CIRCUIT_OFFSET_FACTOR: 3.0,
  POWER_FLOW_LINE_WIDTH_FACTOR: 2.0,

  // Overload Thresholds (for drawing)
  BRANCH_OVERLOAD_NORMAL_THRESHOLD: 1.0,
  BRANCH_OVERLOAD_CRITICAL_THRESHOLD_DRAW: 1.2,
  BRANCH_OVERLOAD_CRITICAL_THRESHOLD_LABEL: 1.5,

  // Labels
  LABEL_DISTANCE: 15,
  LABEL_OFFSET_X: 15,
  LABEL_OFFSET_Y: 5,
  LABEL_OUTLINE_WIDTH: 3,
};

export const defaultAppSettings: AppSettings = {
  viewMode: 'map',
  animationsEnabled: true,
  renderMapLabels: true,
  showDetailsInSidebar: false,
  zoomSensitivity: ViewConfig.ZOOM_SENSITIVITY_DEFAULT,
  keyBindings: defaultKeyBindings,
  isHighContrast: false,
};

