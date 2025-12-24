"use client";

import { UnitStatus, BranchStatus, SubstationCategory } from "@/lib/game/types";

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
    switch (status) {
      case UnitStatus.IN:
        indicatorClassName = 'bg-green-500';
        const brightness = pmax > 0 ? power / pmax : 0;
        indicatorStyle.opacity = Math.max(0.2, brightness);
        if (!title) title = `In-Service (${power.toFixed(0)} MW)`;
        break;
      case UnitStatus.STARTUP:
        indicatorClassName = 'bg-green-500 animate-pulse';
        if (!title) title = 'Starting Up';
        break;
      case UnitStatus.SHUTDOWN:
        indicatorClassName = 'bg-gray-600';
        if (!title) title = 'Shutting Down';
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
  }

  return <div className={`${className} ${indicatorClassName} rounded-full transition-all`} style={indicatorStyle} title={title} />;
}