import { Badge } from "@/components/ui/badge";
import { StatsSnapshot, ResultDetails } from "@/lib/types";
import { cn, fmtMoney } from "@/lib/utils";

const STAT_VALUE = "font-numeric font-bold whitespace-nowrap";

function StatRow({ label, value: [v, u] }: { label: string; value: [string, string] }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-foreground", STAT_VALUE)}>{v}{u && <span className="text-[0.8em] opacity-50 ml-[0.15em]">{u}</span>}</span>
    </div>
  );
}

interface DayResultsProps {
  stats: StatsSnapshot;
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
        <h4 className="font-bold leading-none text-2xl">Day {day} Results</h4>
        <Badge variant={performance.variant}>{performance.title}</Badge>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          Total cost for your shift was
        </p>
        <div className={cn("text-3xl sm:text-4xl text-foreground", STAT_VALUE)}>
          ${resultDetails.costM}<span className="text-[0.6em] opacity-50 ml-[0.15em]">M</span>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-line mt-2">{resultDetails.message}</p>
      </div>

      <div className="border-t pt-3">
        <h5 className="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-bold mb-2">Additional Stats</h5>
        <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-sm">
          <StatRow label="Operating Cost" value={fmtMoney(stats.totalOpCost)} />
          <StatRow label="Fuel Cost" value={fmtMoney(stats.totalFuelCost)} />
          <StatRow label="Unserved Cost" value={fmtMoney(stats.totalUnservedCost)} />
          <StatRow label="Avg. Cost" value={[`$${stats.avgCost.toFixed(2)}`, "/MWh"]} />
        </div>
      </div>
    </div>
  );
}
