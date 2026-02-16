<script lang="ts">
  import Button from '$components/ui/Button.svelte';
  import PowerSlider from '$components/game/PowerSlider.svelte';
  import { Timer, Power, X } from 'lucide-svelte';
  import { cn, hcVariant } from '$lib/utils';
  import type { Substation, Unit } from '$lib/types';
  import { UnitStatus } from '$lib/types';
  import { StatusConfig } from '$components/theme';
  import type { ColumnConfig } from './UnitTable.svelte';

  interface Props {
    sub: Substation;
    unit: Unit;
    index: number;
    onUnitAction: (subId: string, unitIndex: number) => void;
    onAbortTransition?: (subId: string, unitIndex: number) => void;
    onSetSetpoint: (subId: string, unitIndex: number, newSetpoint: number) => void;
    setpointValue: number;
    onSetpointChange: (index: number, value: number) => void;
    isPaused?: boolean;
    isHighContrast?: boolean;
    columnConfig?: ColumnConfig;
  }

  let {
    sub,
    unit,
    index,
    onUnitAction,
    onAbortTransition,
    onSetSetpoint,
    setpointValue,
    onSetpointChange,
    isPaused,
    isHighContrast,
    columnConfig: rawColumnConfig,
  }: Props = $props();

  const defaultColumnConfig: Required<ColumnConfig> = {
    unit: true,
    status: true,
    output: true,
    setpoint: false,
    actual: true,
    time: true,
    action: true,
  };

  let cols = $derived({ ...defaultColumnConfig, ...rawColumnConfig });

  let pmax_unit = $derived(unit.Pmax);
  let pmin_unit = $derived(unit.Pmin);

  // Coerce the setpoint from props to a number and clamp it to be safe for the UI.
  let numericSetpoint = $derived(Math.max(pmin_unit, Math.min(pmax_unit, Number(setpointValue) || 0)));

  function handleSliderChange(newValue: number) {
    const clampedValue = Math.max(pmin_unit, Math.min(pmax_unit, newValue));
    onSetpointChange(index, clampedValue);
  }

  function handleSliderCommit(newValue: number) {
    onSetSetpoint(sub.Number, index, newValue);
  }

  let config = $derived(StatusConfig[unit.Status]);

  const MINUTES_IN_HOUR = 60;
  function formatTimeRemaining(minutes: number): string {
    if (minutes > MINUTES_IN_HOUR) {
      const hours = minutes / MINUTES_IN_HOUR;
      return `${hours.toFixed(1)}h`;
    }
    return `${minutes.toFixed(0)}m`;
  }
</script>

<tr class="border-t border-border/50 align-middle" aria-labelledby={`unit-row-header-${sub.Number}-${index}`}>
  {#if cols.unit}
    <th scope="row" id={`unit-row-header-${sub.Number}-${index}`} class="p-2 align-middle font-bold text-center">{index + 1}</th>
  {/if}
  {#if cols.status}
    <td class="p-2 align-middle text-center">
      {#if config}
        <span title={config.label}><config.icon role="img" aria-label={config.label} class={cn("h-5 w-5 mx-auto", config.tailwind.text)} /></span>
      {/if}
    </td>
  {/if}
  {#if cols.output}
    <td class="p-2 align-middle">
      {#if unit.Status === UnitStatus.TRIP}
        <!-- No control for tripped units -->
      {:else if unit.Status === UnitStatus.IN}
        <PowerSlider
          setpoint={numericSetpoint}
          actual={unit.P}
          pmax={pmax_unit}
          disabled={!!isPaused}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
        />
      {:else if unit.Status === UnitStatus.DIS}
        <PowerSlider
          setpoint={numericSetpoint}
          actual={0}
          pmax={pmax_unit}
          disabled={true}
        />
      {:else if unit.Status === UnitStatus.STARTUP}
        <PowerSlider
          setpoint={numericSetpoint}
          actual={unit.P}
          pmax={pmax_unit}
          disabled={true}
        />
      {:else if unit.Status === UnitStatus.SHUTDOWN}
        <PowerSlider
          setpoint={numericSetpoint}
          actual={unit.P}
          pmax={pmax_unit}
          disabled={true}
        />
      {/if}
    </td>
  {/if}
  {#if cols.actual}
    <td class="p-2 font-mono align-middle text-right">
      {#if unit.Status === UnitStatus.TRIP}
        ---
      {:else if unit.Status === UnitStatus.DIS}
        {(0).toFixed(0)}<span class="text-xs text-muted-foreground ml-1">MW</span>
      {:else}
        {unit.P.toFixed(0)}<span class="text-xs text-muted-foreground ml-1">MW</span>
      {/if}
    </td>
  {/if}
  {#if cols.time}
    <td class="p-2 align-middle text-right">
      {#if unit.Status === UnitStatus.IN}
        {@const rampTimeHours = (unit.StartTime / 60).toFixed(1)}
        <time
          class="text-xs text-muted-foreground"
          dateTime={`PT${unit.StartTime}M`}
          title={`Characteristic ramp time: ${rampTimeHours} hr`}
          aria-label={`Characteristic ramp time: ${rampTimeHours} hours`}
        >
          {rampTimeHours} hr
        </time>
      {:else if unit.Status === UnitStatus.DIS}
        {@const startupTimeHours = (unit.StartTime / 60).toFixed(1)}
        <time
          class="text-xs text-muted-foreground"
          dateTime={`PT${unit.StartTime}M`}
          title={`Startup Time: ${startupTimeHours} hr`}
          aria-label={`Startup time: ${startupTimeHours} hours`}
        >
          {startupTimeHours} hr
        </time>
      {:else if unit.Status === UnitStatus.STARTUP}
        {@const startupTimeRemaining = Math.max(0, unit.StartTime - unit.StatusCount)}
        {@const formattedStartupTime = formatTimeRemaining(startupTimeRemaining)}
        <time
          class="text-xs text-[var(--color-status-startup)]"
          dateTime={`PT${startupTimeRemaining}M`}
          title={`Time until online: ${formattedStartupTime}`}
          aria-label={`Time until online: ${formattedStartupTime}`}
        >
          {formattedStartupTime}
        </time>
      {:else if unit.Status === UnitStatus.SHUTDOWN}
        {@const shutdownTimeRemaining = Math.max(0, unit.StartTime - unit.StatusCount)}
        {@const formattedShutdownTime = formatTimeRemaining(shutdownTimeRemaining)}
        <time
          class="text-xs text-muted-foreground"
          dateTime={`PT${shutdownTimeRemaining}M`}
          title={`Time until offline: ${formattedShutdownTime}`}
          aria-label={`Time until offline: ${formattedShutdownTime}`}
        >
          {formattedShutdownTime}
        </time>
      {/if}
    </td>
  {/if}
  {#if cols.action}
    <td class="p-2 align-middle text-center">
      {#if unit.Status === UnitStatus.IN}
        <Button variant="destructive" size="icon" onclick={() => onUnitAction(sub.Number, index)} disabled={isPaused} aria-label={`Shut Down Unit ${index + 1}`}>
          <Power class="h-5 w-5" aria-hidden="true" />
        </Button>
      {:else if unit.Status === UnitStatus.DIS}
        <Button variant={hcVariant(isHighContrast ?? false)} size="icon" onclick={() => onUnitAction(sub.Number, index)} disabled={isPaused} aria-label={`Start Up Unit ${index + 1}`}>
          <Power class="h-5 w-5" aria-hidden="true" />
        </Button>
      {:else if unit.Status === UnitStatus.STARTUP}
        {#if onAbortTransition}
          <Button variant="outline" size="icon" onclick={() => onAbortTransition(sub.Number, index)} disabled={isPaused} aria-label={`Abort startup of Unit ${index + 1}`} class="border-[var(--color-status-startup)] text-[var(--color-status-startup)] hover:bg-[var(--color-status-startup)]/10">
            <X class="h-4 w-4" aria-hidden="true" />
          </Button>
        {:else}
          <Button variant="secondary" size="icon" disabled={true} aria-label={`Unit ${index + 1} is starting up`} class="animate-pulse">
            <Power class="h-5 w-5" aria-hidden="true" />
          </Button>
        {/if}
      {:else if unit.Status === UnitStatus.SHUTDOWN}
        {#if onAbortTransition}
          <Button variant="outline" size="icon" onclick={() => onAbortTransition(sub.Number, index)} disabled={isPaused} aria-label={`Abort shutdown of Unit ${index + 1}`} class="border-destructive text-destructive hover:bg-destructive/10">
            <X class="h-4 w-4" aria-hidden="true" />
          </Button>
        {:else}
          <Button variant="destructive" size="icon" disabled={true} aria-label={`Unit ${index + 1} is shutting down`} class="animate-pulse">
            <Power class="h-5 w-5" aria-hidden="true" />
          </Button>
        {/if}
      {/if}
    </td>
  {/if}
</tr>
