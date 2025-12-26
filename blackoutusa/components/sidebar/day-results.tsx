import { Badge } from "@/components/ui/badge";
import { GameStatistics, ResultDetails } from "@/lib/game/types";

interface DayResultsProps {
  stats: GameStatistics;
  day: number;
  resultDetails: ResultDetails;
}

export function DayResults({ stats, day, resultDetails }: DayResultsProps) {
  const performanceMap = {
    record: { title: "Record Breaker", variant: 'default' as const },
    good: { title: "Great Job", variant: 'secondary' as const },
    okay: { title: "Not Bad", variant: 'outline' as const },
    bad: { title: "Blackout", variant: 'destructive' as const },
  };
  const performance = performanceMap[resultDetails.performance];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h4 className="font-bold leading-none text-base">Day {day} Results</h4>
        <Badge variant={performance.variant}>{performance.title}</Badge>
      </div>

      <div className="flex flex-col gap-3 text-sm">
        <p>
          Total cost for your shift was <strong className="text-base font-mono">${resultDetails.costM}M</strong>.
        </p>
        <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: resultDetails.message }} />
      </div>

      <div className="border-t pt-4">
        <h4 className="text-base font-bold mb-2">Additional Stats</h4>
        <div className="text-xs space-y-1.5 text-muted-foreground">
          <div className="flex justify-between items-center"><span>Op. Cost:</span> <span className="font-mono text-foreground">${(stats.totalOpCost / 1000).toFixed(0)}k</span></div>
          <div className="flex justify-between items-center"><span>Fuel Cost:</span> <span className="font-mono text-foreground">${(stats.totalFuelCost / 1000).toFixed(0)}k</span></div>
          <div className="flex justify-between items-center"><span>Unserved Cost:</span> <span className="font-mono text-foreground">${(stats.totalUnservedCost / 1000).toFixed(0)}k</span></div>
          <div className="flex justify-between items-center"><span>Avg. Cost:</span> <span className="font-mono text-foreground">${stats.avgCost.toFixed(2)}/MWh</span></div>
        </div>
      </div>
    </div>
  );
}