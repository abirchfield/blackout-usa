export function DayTimeDisplay({ day, timeStr, idPrefix, size }: {
  day: number; timeStr: string; idPrefix: string; size: 'sm' | 'lg';
}) {
  const textClass = size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-lg';
  return (
    <div className="flex items-center gap-4" role="timer" aria-labelledby={`${idPrefix}-day-label ${idPrefix}-day-value ${idPrefix}-time-value`}>
      <div className="flex items-center gap-2">
        <span id={`${idPrefix}-day-label`} className={`${textClass} font-semibold text-muted-foreground uppercase`}>Day</span>
        <span id={`${idPrefix}-day-value`} className={`${textClass} font-semibold text-muted-foreground font-numeric`}>{day ?? 1}</span>
      </div>
      <time id={`${idPrefix}-time-value`} dateTime={`D${day}T${timeStr.replace(/ /g, '')}`} className={`${textClass} font-bold text-foreground font-numeric tracking-wider`}>{timeStr}</time>
    </div>
  );
}
