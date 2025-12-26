import { Wind, Sun, Atom, Flame, Plug, CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Home, Building2, Factory, Server } from "lucide-react";
import { AppSettings, SubstationCategory, UnitStatus, LoadCategoryType } from "./types";
import { defaultKeyBindings } from "./key-bindings";

// A mapping for generation types to their specific configurations
export const GenerationTypeConfig: Record<SubstationCategory, {
  name: string;
  color: string; // For Canvas drawing (fallback)
  chartVar: string; // CSS variable name for theme-aware colors
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
    chartVar: 'chart-1',
    tailwind: {
      text: "text-[var(--chart-1)]",
      bg: "bg-[var(--chart-1)]",
      border: "border-[var(--chart-1)]",
    },
    icon: Atom,
  },
  [SubstationCategory.Thermal]: { name: "Thermal", color: "#fb923c", chartVar: 'chart-2', tailwind: { text: "text-[var(--chart-2)]", bg: "bg-[var(--chart-2)]", border: "border-[var(--chart-2)]" }, icon: Flame },
  [SubstationCategory.GasTurbine]: { name: "Gas Turbine", color: "#fb923c", chartVar: 'chart-2', tailwind: { text: "text-[var(--chart-2)]", bg: "bg-[var(--chart-2)]", border: "border-[var(--chart-2)]" }, icon: Flame },
  [SubstationCategory.GasCombinedCycle]: { name: "Combined Cycle", color: "#fb923c", chartVar: 'chart-2', tailwind: { text: "text-[var(--chart-2)]", bg: "bg-[var(--chart-2)]", border: "border-[var(--chart-2)]" }, icon: Flame },
  [SubstationCategory.CoalFiredSteam]: { name: "Coal Steam", color: "#fb923c", chartVar: 'chart-2', tailwind: { text: "text-[var(--chart-2)]", bg: "bg-[var(--chart-2)]", border: "border-[var(--chart-2)]" }, icon: Flame },
  [SubstationCategory.Wind]: {
    name: "Wind",
    color: "#22d3ee", // cyan-400
    chartVar: 'chart-3',
    tailwind: {
      text: "text-[var(--chart-3)]",
      bg: "bg-[var(--chart-3)]",
      border: "border-[var(--chart-3)]",
    },
    icon: Wind,
  },
  [SubstationCategory.Solar]: {
    name: "Solar",
    color: "#facc15", // yellow-400
    chartVar: 'chart-4',
    tailwind: {
      text: "text-[var(--chart-4)]",
      bg: "bg-[var(--chart-4)]",
      border: "border-[var(--chart-4)]",
    },
    icon: Sun,
  },
  [SubstationCategory.Load]: {
    name: "Load",
    color: "#6b7280", // gray-500
    chartVar: 'load', // Not a chart var, but a placeholder for drawer
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
    description: "Power-hungry server farms and data facilities.",
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
  INITIAL_X0: -105,
  INITIAL_Y0: 36,
  INITIAL_SCALE: 50,
  SCALE_ADJUST: 0.25,
  ZOOM_LIMIT_MAX: 500,
  DETAIL_ZOOM_LEVEL: 200,
  // Map Bounds (Texas)
  MAP_BOUNDS: { XMAX: -93, XMIN: -107, YMAX: 37, YMIN: 25.5 },
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

// Drawing and Style Constants for Canvas
export const DrawingConfig = {
  // Animation
  POWER_FLOW_PATTERN_LENGTH: 32,
  MIN_POWER_FOR_ANIMATION: 10,
  ANIMATION_SPEED_FACTOR: 0.5,

  // Drawing Styles
  BORDER_LINE_WIDTH: 2,
  BRANCH_RADIUS_NORMAL: 2.0,
  BRANCH_RADIUS_HOVER: 4.0,
  BRANCH_RADIUS_MIN: 1.0,
  BRANCH_RADIUS_MAX: 5.0,
  BRANCH_RADIUS_HOVER_MAX: 7.0,
  SUBSTATION_BORDER_WIDTH: 3,
  GENERATOR_OUTLINE_WIDTH: 1,
  GENERATOR_OUTER_RADIUS_FACTOR: 1.2,
  // The total separation between lines will be (radius * this_factor).
  SECOND_CIRCUIT_OFFSET_FACTOR: 3.0,
  SECOND_CIRCUIT_OFFSET_FACTOR_HOVER: 4.0,
  POWER_FLOW_LINE_WIDTH_FACTOR: 1.5,

  // Line Dashes
  DISCONNECTED_LINE_DASH: [5, 5],
  POWER_FLOW_DASH_BACKGROUND: [6, 26], // Must sum to POWER_FLOW_PATTERN_LENGTH
  POWER_FLOW_DASH_FOREGROUND: [4, 28], // Must sum to POWER_FLOW_PATTERN_LENGTH

  // Overload Thresholds (for drawing)
  BRANCH_OVERLOAD_NORMAL_THRESHOLD: 1.0,
  BRANCH_OVERLOAD_CRITICAL_THRESHOLD_DRAW: 1.2,
  BRANCH_OVERLOAD_CRITICAL_THRESHOLD_LABEL: 1.5,

  // Fonts & Labels
  FONT_NORMAL: "15px 'Share Tech'",
  FONT_HOVER: "20px 'Share Tech'",
  LABEL_OFFSET_X: 15,
  LABEL_OFFSET_Y: 5,
  LABEL_OUTLINE_WIDTH: 3,
  LABEL_FADE_END_MULTIPLIER: 2.0,
};

export const defaultAppSettings: AppSettings = {
  viewMode: 'visual',
  animationsEnabled: true,
  renderCanvasText: true,
  showDetailsInSidebar: false,
  zoomSensitivity: ViewConfig.ZOOM_SENSITIVITY_DEFAULT,
  keyBindings: defaultKeyBindings,
  isHighContrast: false,
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