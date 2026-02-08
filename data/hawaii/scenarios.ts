import { IScenario } from "@/lib/types";
import { Wind, Solar, Demand } from "@/lib/weather";
// import { SUB, LINE } from "../_out/hawaii/lookups";

const day1: IScenario = {
    info: [
        "Welcome to the Hawaii grid!",
    ],
    costs: { record: 1.0, good: 2.0, okay: 5.0 },
    weather: { 
        load: Demand.EVENING_PEAK, 
        sun: Solar.PHYSICAL, 
        wind: Wind.DIURNAL
    },
};

export const scenarios: Record<number, IScenario> = {
    1: day1,
};
