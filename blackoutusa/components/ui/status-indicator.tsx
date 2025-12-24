"use client";

import { UnitStatus, BranchCircuitStatus, CATEGORY_LOAD, STATUS_IN, STATUS_DIS, STATUS_TRIP, STATUS_STARTUP, STATUS_SHUTDOWN } from "@/lib/game/types";

interface StatusIndicatorProps {
  status: UnitStatus | BranchCircuitStatus;
  category?: string;
  power?: number;
  pmax?: number;
  className?: string;
  title?: string;
}

export function StatusIndicator({ status, category, power = 0, pmax = 1, className = 'w-3 h-3', title: defaultTitle }: StatusIndicatorProps) {
  let indicatorClassName = '';
  let indicatorStyle: React.CSSProperties = {};
  let title = defaultTitle;

  if (category === CATEGORY_LOAD) {
    switch (status) {
      case STATUS_IN:
        indicatorClassName = 'bg-green-500';
        if (!title) title = 'In-Service';
        break;
      case STATUS_TRIP:
        indicatorClassName = 'bg-red-500';
        if (!title) title = 'Tripped';
        break;
      case STATUS_DIS:
      default:
        indicatorClassName = 'border border-muted-foreground';
        if (!title) title = 'Out-of-Service';
        break;
    }
  } else { // Generators and Branches
    switch (status) {
      case STATUS_IN:
        indicatorClassName = 'bg-green-500';
        const brightness = pmax > 0 ? power / pmax : 0;
        indicatorStyle.opacity = Math.max(0.2, brightness);
        if (!title) title = `In-Service (${power.toFixed(0)} MW)`;
        break;
      case STATUS_STARTUP:
        indicatorClassName = 'bg-green-500 animate-pulse';
        if (!title) title = 'Starting Up';
        break;
      case STATUS_SHUTDOWN:
        indicatorClassName = 'bg-gray-600';
        if (!title) title = 'Shutting Down';
        break;
      case STATUS_TRIP:
        indicatorClassName = 'bg-red-500';
        if (!title) title = 'Tripped';
        break;
      case STATUS_DIS:
      default:
        indicatorClassName = 'border border-muted-foreground';
        if (!title) title = 'Out-of-Service';
        break;
    }
  }

  return <div className={`${className} ${indicatorClassName} rounded-full transition-all`} style={indicatorStyle} title={title} />;
}