"use client";

import { memo } from "react";
import { useStats, useForecast } from "@/lib/hooks/use-store";
import { GAME_DURATION_S } from "@/lib/grid/constants";
import { ForecastChart } from "./forecast-chart";

/** Standalone forecast panel — shows the chart only, no day/time. */
export const ForecastPanel = memo(function ForecastPanel() {
  const stats = useStats();
  const forecast = useForecast();

  if (!forecast) return null;

  const progress = stats.timeStep / GAME_DURATION_S;

  return (
    <div className="px-2.5 py-1.5">
      <ForecastChart forecast={forecast} progress={progress} />
    </div>
  );
});
