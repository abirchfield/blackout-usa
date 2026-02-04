import type { GridData } from "../cases";
import { scenarios } from "./scenarios";
import { scenario_data } from "./grid";

export const texasCase = {
    name: "Texas",
    scenarios,
    gridData: scenario_data as unknown as GridData,
    mapConfig: {
        bounds: { xMax: -93, xMin: -107, yMax: 37, yMin: 25.5 },
        initialView: { x0: -105, y0: 36, scale: 50 },
    },
};
