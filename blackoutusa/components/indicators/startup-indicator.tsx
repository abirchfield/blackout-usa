"use client";

interface StartupDialProps {
  /** Total time in minutes for startup. */
  startTime: number;
  /** Current progress in minutes. */
  statusCount: number;
}

// --- Constants for SVG geometry and time formatting ---
const VIEWBOX_SIZE = 40;
const RADIUS = 16;
const STROKE_WIDTH = 4;
const CENTER = VIEWBOX_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MINUTES_IN_HOUR = 60;

/**
 * Formats the remaining time into a human-readable string (e.g., "1.5h" or "30m").
 * @param minutes - The time remaining in minutes.
 * @returns A formatted string.
 */
const formatTimeRemaining = (minutes: number): string => {
  if (minutes > MINUTES_IN_HOUR) {
    const hours = minutes / MINUTES_IN_HOUR;
    return `${hours.toFixed(1)}h`;
  }
  return `${minutes.toFixed(0)}m`;
};

/**
 * Renders a circular progress dial for generator startup.
 */
export const StartupDial = ({ startTime, statusCount }: StartupDialProps) => {
  // Calculate the progress percentage, ensuring no division by zero.
  const progressPercentage = startTime > 0 ? (statusCount / startTime) * 100 : 0;

  // Calculate the SVG stroke offset for the progress circle.
  const strokeDashoffset = CIRCUMFERENCE - (progressPercentage / 100) * CIRCUMFERENCE;

  // Calculate and format the time remaining.
  const timeRemaining = Math.max(0, startTime - statusCount);
  const timeRemainingLabel = formatTimeRemaining(timeRemaining);

  const commonCircleProps = {
    r: RADIUS,
    cx: CENTER,
    cy: CENTER,
    strokeWidth: STROKE_WIDTH,
    fill: "transparent",
    stroke: "currentColor",
  };

  return (
    <div className="relative w-10 h-10" title={`Time until online: ${timeRemainingLabel}`}>
      <svg className="w-full h-full" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        {/* Background Circle */}
        <circle className="text-primary/20" {...commonCircleProps} />
        {/* Progress Circle */}
        <circle className="text-primary" {...commonCircleProps} strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-primary-foreground">
        {timeRemainingLabel}
      </span>
    </div>
  );
};