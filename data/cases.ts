import { IScenario } from "@/lib/types";
import { texasCase } from "./texas/case";

// --- Case Definition Types ---

export interface MapConfig {
    bounds: { xMax: number; xMin: number; yMax: number; yMin: number };
    initialView: { x0: number; y0: number; scale: number };
}

export interface GridData {
    subs: Record<string, Record<string, unknown>>;
    branches: Record<string, Record<string, unknown>>;
    borders: number[][];
    nsubs: number;
}

export interface CaseDefinition {
    name: string;
    scenarios: Record<number, IScenario>;
    gridData: GridData;
    mapConfig: MapConfig;
}

// --- Active Case ---
// Change this single import to switch cases
export const activeCase: CaseDefinition = texasCase;
