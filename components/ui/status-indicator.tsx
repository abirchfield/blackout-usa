"use client";

import { UnitStatus, BranchStatus, SubstationCategory } from "@/lib/game/types";
import { StatusConfig } from "@/lib/game/config";

interface StatusIndicatorProps {
  status: UnitStatus | BranchStatus;
  category?: SubstationCategory | string; // Allow string for flexibility, but use enum for comparisons
  power?: number;
  pmax?: number;
  className?: string;
  title?: string;
}

export function StatusIndicator({ status, category, power = 0, pmax = 1, className = 'w-3 h-3', title: defaultTitle }: StatusIndicatorProps) {
  let indicatorClassName = '';
  const indicatorStyle: React.CSSProperties = {};
  let title = defaultTitle;

  if (category === SubstationCategory.Load) {
    switch (status) {
      case UnitStatus.IN:
        indicatorClassName = 'bg-green-500';
        if (!title) title = 'In-Service';
        break;
      case UnitStatus.TRIP:
        indicatorClassName = 'bg-red-500';
        if (!title) title = 'Tripped';
        break;
      case UnitStatus.DIS:
      default:
        indicatorClassName = 'border border-muted-foreground';
        if (!title) title = 'Out-of-Service';
        break;
    }
  } else { // Generators and Branches
    // Map BranchStatus to UnitStatus for config lookup if needed, or just use the key
    // Since BranchStatus keys (IN, DIS, TRIP) exist in UnitStatus, this works.
    const config = StatusConfig[status as UnitStatus] || StatusConfig[UnitStatus.DIS];
    indicatorClassName = config.tailwind.bg;
    if (!title) title = config.label;
    if (status === UnitStatus.IN) {
      const brightness = pmax > 0 ? power / pmax : 0;
      indicatorStyle.opacity = Math.max(0.2, brightness);
      if (!title || title === 'In-Service') title = `In-Service (${power.toFixed(0)} MW)`;
    }
  }

  return <div className={`${className} ${indicatorClassName} rounded-full transition-all`} style={indicatorStyle} title={title} />;
}