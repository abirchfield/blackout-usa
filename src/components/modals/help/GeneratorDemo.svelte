<script lang="ts">
  import UnitTable from '$components/tables/UnitTable.svelte';
  import SectionLabel from '$components/ui/SectionLabel.svelte';
  import { cn } from '$lib/utils';
  import type { Substation, Unit } from '$lib/types';
  import { SubstationCategory, UnitStatus } from '$lib/types';
  import { StatusConfig } from '$components/theme';

  const DEMO_START_TIME = 5;
  const DEMO_TICK_MS = 600;

  const mockSubBase: Substation = {
    Name: 'Example',
    Number: '0',
    idx: 0,
    Latitude: 0,
    Longitude: 0,
    Units: 1,
    Category: SubstationCategory.Thermal,
    Pmax: 100,
    Pmin: 20,
    pmax: 100,
    pmin: 20,
    isLoad: false,
    isRenewable: false,
    FixedCost: 500,
    FuelCost: 50,
    StartTime: DEMO_START_TIME,
    Ramp: 5,
    U: [],
  };

  const initialUnit: Unit = {
    Status: UnitStatus.DIS, P: 0, Pset: 0, P0: 0,
    Status0: UnitStatus.DIS, StatusCount: 0,
    Pmax: 100, Pmin: 20, Ramp: 5, StartTime: DEMO_START_TIME,
    FixedCost: 500, FuelCost: 50,
  };

  const unitStatuses = [UnitStatus.IN, UnitStatus.DIS, UnitStatus.STARTUP, UnitStatus.SHUTDOWN, UnitStatus.TRIP] as UnitStatus[];

  const statusDescriptions: Record<UnitStatus, string> = {
    [UnitStatus.IN]: 'Generating power',
    [UnitStatus.DIS]: 'Offline \u2014 click to start',
    [UnitStatus.STARTUP]: 'Warming up',
    [UnitStatus.SHUTDOWN]: 'Powering down',
    [UnitStatus.TRIP]: 'Faulted \u2014 cannot restart',
  };

  let genUnit: Unit = $state({ ...initialUnit });
  let genSetpointVal = $state(0);

  // Transition countdown (startup / shutdown)
  $effect(() => {
    if (genUnit.Status !== UnitStatus.STARTUP && genUnit.Status !== UnitStatus.SHUTDOWN) return;
    const id = setInterval(() => {
      const next = genUnit.StatusCount + 1;
      if (next >= genUnit.StartTime) {
        if (genUnit.Status === UnitStatus.STARTUP) {
          genUnit = { ...genUnit, Status: UnitStatus.IN, StatusCount: 0, P: genUnit.Pmin, Pset: genUnit.Pmin };
          genSetpointVal = genUnit.Pmin;
        } else {
          genUnit = { ...genUnit, Status: UnitStatus.DIS, StatusCount: 0, P: 0, Pset: 0 };
          genSetpointVal = 0;
        }
      } else {
        genUnit = { ...genUnit, StatusCount: next };
      }
    }, DEMO_TICK_MS);
    return () => clearInterval(id);
  });

  // Ramp output toward setpoint
  $effect(() => {
    if (genUnit.Status !== UnitStatus.IN) return;
    const id = setInterval(() => {
      if (genUnit.Status !== UnitStatus.IN || Math.abs(genUnit.P - genUnit.Pset) < 0.5) return;
      const step = Math.min(Math.abs(genUnit.Pset - genUnit.P), genUnit.Ramp);
      genUnit = { ...genUnit, P: +(genUnit.P + Math.sign(genUnit.Pset - genUnit.P) * step).toFixed(1) };
    }, 150);
    return () => clearInterval(id);
  });

  let demoSub: Substation = $derived({ ...mockSubBase, U: [genUnit] });

  function handleUnitAction(_subId: string, _unitIndex: number) {
    if (genUnit.Status === UnitStatus.DIS) {
      genUnit = { ...genUnit, Status: UnitStatus.STARTUP, StatusCount: 0 };
    } else if (genUnit.Status === UnitStatus.IN) {
      genUnit = { ...genUnit, Status: UnitStatus.SHUTDOWN, StatusCount: 0 };
    }
  }

  function handleAbortTransition(_subId: string, _unitIndex: number) {
    if (genUnit.Status === UnitStatus.STARTUP) {
      genUnit = { ...genUnit, Status: UnitStatus.DIS, StatusCount: 0, P: 0, Pset: 0 };
    } else if (genUnit.Status === UnitStatus.SHUTDOWN) {
      genUnit = { ...genUnit, Status: UnitStatus.IN, StatusCount: 0 };
    }
  }

  function handleSetSetpoint(_sid: string, _idx: number, val: number) {
    genSetpointVal = val;
    genUnit = { ...genUnit, Pset: val };
  }

  function handleSetpointChange(_idx: number, val: number) {
    genSetpointVal = val;
  }
</script>

<div class="space-y-3">
  <div>
    <SectionLabel>Unit Status</SectionLabel>
    <div class="grid grid-cols-2 gap-x-4 gap-y-0.5">
      {#each unitStatuses as status}
        {@const config = StatusConfig[status]}
        <div class="flex items-center gap-2 py-1">
          <config.icon class={cn('h-4 w-4 flex-shrink-0', config.tailwind.text)} aria-hidden="true" />
          <span class="text-xs"><span class="font-semibold">{config.label}</span> <span class="text-muted-foreground">&mdash; {statusDescriptions[status]}</span></span>
        </div>
      {/each}
    </div>
  </div>

  <div class="border-t pt-3">
    <SectionLabel>Interactive Demo</SectionLabel>
    <p class="text-xs text-muted-foreground mb-2">
      Click the power button to start the unit. Once online, drag the slider to set output. Click power again to shut down.
    </p>
    <div class="border rounded-lg overflow-hidden bg-background/50">
      <UnitTable
        sub={demoSub}
        onUnitAction={handleUnitAction}
        onAbortTransition={handleAbortTransition}
        onSetSetpoint={handleSetSetpoint}
        setpoints={{ 0: genSetpointVal }}
        onSetpointChange={handleSetpointChange}
        isPaused={false}
      />
    </div>
  </div>
</div>
