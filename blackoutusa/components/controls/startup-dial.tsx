"use client";

interface StartupDialProps {
  startTime: number;
  statusCount: number;
}

/**
 * Renders a circular progress dial for generator startup.
 */
export const StartupDial = ({ startTime, statusCount }: StartupDialProps) => {
  const startupProgress = startTime > 0 ? (statusCount / startTime) * 100 : 0;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (startupProgress / 100) * circumference;
  const timeRemaining = Math.max(0, startTime - statusCount);
  const timeRemainingLabel = timeRemaining > 60 ? `${(timeRemaining / 60).toFixed(1)}h` : `${timeRemaining.toFixed(0)}m`;

  return (
    <div className="relative w-10 h-10" title={`Time until online: ${timeRemainingLabel}`}>
      <svg className="w-full h-full" viewBox="0 0 40 40">
        <circle className="text-primary/20" strokeWidth="4" stroke="currentColor" fill="transparent" r={radius} cx="20" cy="20" />
        <circle
          className="text-primary"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="20"
          cy="20"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-primary-foreground">
        {timeRemainingLabel}
      </span>
    </div>
  );
};