import type { GridCase } from "@/lib/types";
import { scenarios } from "./texas/scenarios";
import { gridData } from "./texas/grid";

// --- Texas Case ---

const texasCase: GridCase = {
    name: "Texas",
    referenceBus: "6",
    scenarios,
    gridData,
    mapConfig: {
        bounds: { xMax: -93, xMin: -107, yMax: 37, yMin: 25.5 },
        initialView: { x0: -105, y0: 36, scale: 50 },
    },
};

// --- Active Case ---
// Change this assignment to switch cases
export const activeCase: GridCase = texasCase;
