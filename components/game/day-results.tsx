import { Badge } from "@/components/ui/badge";
import { GameStatistics, ResultDetails } from "@/lib/types";
import { fmtMoneyAuto } from "@/lib/utils";

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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h4 className="font-bold leading-none text-xl">Day {day} Results</h4>
        <Badge variant={performance.variant}>{performance.title}</Badge>
      </div>

      <div className="text-sm space-y-2">
        <p>
          Total cost for your shift was <span className="text-lg font-bold font-mono">${resultDetails.costM}M</span>.
        </p>
        <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: resultDetails.message }} />
      </div>

      <div className="border-t pt-3">
        <h5 className="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-bold mb-2">Additional Stats</h5>
        <div className="text-sm space-y-1 text-muted-foreground">
          <div className="flex justify-between"><span>Op. Cost</span><span className="font-mono font-bold text-foreground">{fmtMoneyAuto(stats.totalOpCost)}</span></div>
          <div className="flex justify-between"><span>Fuel Cost</span><span className="font-mono font-bold text-foreground">{fmtMoneyAuto(stats.totalFuelCost)}</span></div>
          <div className="flex justify-between"><span>Unserved Cost</span><span className="font-mono font-bold text-foreground">{fmtMoneyAuto(stats.totalUnservedCost)}</span></div>
          <div className="flex justify-between"><span>Avg. Cost</span><span className="font-mono font-bold text-foreground">${stats.avgCost.toFixed(2)}/MWh</span></div>
        </div>
      </div>
    </div>
  );
}
