<script lang="ts">
  import { Dialog } from 'bits-ui';
  import DialogContent from '$components/ui/DialogContent.svelte';
  import DialogHeader from '$components/ui/DialogHeader.svelte';
  import { Cable } from 'lucide-svelte';
  import { untrack } from 'svelte';
  import type { Substation, Branch, Unit } from '$lib/types';
  import { SubstationCategory, LoadCategoryType, UnitStatus } from '$lib/types';
  import GeneratorUnitsTable from '$components/tables/UnitTable.svelte';
  import LoadUnitsTable from '$components/tables/LoadTable.svelte';
  import CircuitTable from '$components/tables/CircuitTable.svelte';
  import { GenerationTypeConfig, LoadTypeConfig } from '$components/theme';
  import { cn, branchLoading, isBranchActive } from '$lib/utils';
  import { getEngineStores, getEngine } from '$lib/stores/engine';

  interface Props {
    open: boolean;
    substationId?: string;
    branchId?: string;
    onClose: () => void;
  }

  let { open, substationId, branchId, onClose }: Props = $props();

  const { subs: subsStore, branches: branchesStore, stats: statsStore, userPaused: userPausedStore } = getEngineStores();
  const engine = getEngine();

  // Derived entity lookups
  let sub = $derived(substationId ? $subsStore[substationId] : undefined);
  let branch = $derived(branchId ? $branchesStore[branchId] : undefined);
  let siblingBranch = $derived(branch?.sibling ? $branchesStore[branch.sibling] : undefined);
  let windAvail = $derived($statsStore.windAvail);
  let sunAvail = $derived($statsStore.sunAvail);

  // Setpoints state for SubstationContent
  let setpoints: Record<number, number> = $state({});

  // Only re-initialize setpoints when the substation ID changes (e.g. opening a
  // different modal), NOT every tick.  snapRecord() gives `sub` a new reference
  // each tick, so reading it inside the effect body would reset sliders mid-drag.
  $effect(() => {
    const id = substationId;
    if (id) {
      untrack(() => {
        const s = $subsStore[id];
        if (s) {
          const initial: Record<number, number> = {};
          s.U.forEach((unit: Unit, index: number) => {
            initial[index] = unit.Pset;
          });
          setpoints = initial;
        }
      });
    }
  });

  function handleSetpointChange(index: number, value: number) {
    setpoints = { ...setpoints, [index]: value };
  }

  function onUnitAction(sid: string, unitIndex: number) {
    engine.toggleUnit(sid, unitIndex);
  }

  function onLoadUnitAction(sid: string, unitIndex: number) {
    engine.toggleLoadUnit(sid, unitIndex);
  }

  function onAbortTransition(sid: string, unitIndex: number) {
    engine.abortTransition(sid, unitIndex);
  }

  function onSetSetpoint(sid: string, unitIndex: number, value: number) {
    engine.setSetpoint(sid, unitIndex, value);
  }

  function onBranchAction(bid: string) {
    engine.toggleBranch(bid);
  }
</script>

{#snippet generationTypeIcon(category: string, className?: string)}
  {@const config = GenerationTypeConfig[category as SubstationCategory] || GenerationTypeConfig[SubstationCategory.Thermal]}
  <config.icon class={cn('w-5 h-5', config.tailwind.text, className)} />
{/snippet}

{#snippet subDescription(substation: Substation)}
  {#if substation.Category === SubstationCategory.Load}
    {substation.Units} load circuit{substation.Units !== 1 ? 's' : ''}
  {:else}
    {@const isRenewable = substation.Category === SubstationCategory.Wind || substation.Category === SubstationCategory.Solar}
    <span>{substation.Units} {substation.Category} unit{substation.Units !== 1 ? 's' : ''}</span>
    {#if !isRenewable && substation.U[0]}
      <span class="mx-1.5 opacity-40">&middot;</span>
      <span>Op <span class="font-mono">${substation.U[0].FixedCost}/hr</span> &middot; Fuel <span class="font-mono">${substation.U[0].FuelCost.toFixed(0)}/MW/hr</span></span>
    {/if}
    {#if substation.Category === SubstationCategory.Wind && windAvail !== undefined}
      <span class="mx-1.5 opacity-40">&middot;</span>
      <span><span class="font-mono">{(windAvail * 100).toFixed(0)}%</span> avail ({(windAvail * substation.pmax).toFixed(0)} MW/unit)</span>
    {/if}
    {#if substation.Category === SubstationCategory.Solar && sunAvail !== undefined}
      <span class="mx-1.5 opacity-40">&middot;</span>
      <span><span class="font-mono">{(sunAvail * 100).toFixed(0)}%</span> avail ({(sunAvail * substation.pmax).toFixed(0)} MW/unit)</span>
    {/if}
    {#if substation.Loads}
      <span class="mx-1.5 opacity-40">&middot;</span>
      <span>+ {substation.Loads.Units} load circuit{substation.Loads.Units !== 1 ? 's' : ''}</span>
    {/if}
  {/if}
{/snippet}

{#snippet loadSummaryBar(units: Unit[])}
  {@const activeUnits = units.filter((u: Unit) => u.Status === UnitStatus.IN)}
  {@const totalServed = activeUnits.reduce((sum: number, u: Unit) => sum + u.P, 0)}
  {@const totalCapacity = units.reduce((sum: number, u: Unit) => sum + u.Pmax, 0)}
  {@const byCategory = Object.values(LoadCategoryType).map(cat => {
    const catUnits = activeUnits.filter((u: Unit) => (u.LoadCategory ?? LoadCategoryType.Residential) === cat);
    const served = catUnits.reduce((sum: number, u: Unit) => sum + u.P, 0);
    return { cat, served, config: LoadTypeConfig[cat] };
  }).filter(g => g.served > 0)}
  {#if totalCapacity > 0}
    <div class="mb-3 space-y-1.5">
      <div class="flex items-baseline justify-between text-sm">
        <span class="text-muted-foreground">Served Load</span>
        <span class="font-mono font-bold tabular-nums">{totalServed.toFixed(0)} <span class="text-xs text-muted-foreground font-normal">/ {totalCapacity.toFixed(0)} MW</span></span>
      </div>
      <div class="flex h-2.5 w-full rounded-full overflow-hidden bg-muted">
        {#each byCategory as { cat, served, config }}
          <div
            class={cn('h-full transition-all', config.tailwind.bg)}
            style="width: {(served / totalCapacity) * 100}%"
            title="{config.name}: {served.toFixed(0)} MW"
          ></div>
        {/each}
      </div>
      <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {#each byCategory as { cat, config }}
          <span class="flex items-center gap-1">
            <config.icon class={cn('h-3 w-3', config.tailwind.text)} aria-hidden="true" />
            {config.name}
          </span>
        {/each}
      </div>
    </div>
  {/if}
{/snippet}

{#snippet substationContent(substation: Substation)}
  <div class="text-sm text-muted-foreground mb-2">{@render subDescription(substation)}</div>
  {#if substation.isLoad}
    <LoadUnitsTable sub={substation} {onUnitAction} isPaused={$userPausedStore} stickyHeader={true} />
  {:else}
    <GeneratorUnitsTable
      sub={substation}
      {onUnitAction}
      {onAbortTransition}
      {onSetSetpoint}
      {setpoints}
      onSetpointChange={handleSetpointChange}
      isPaused={$userPausedStore}
      stickyHeader={true}
    />
    {#if substation.Loads}
      <h3 class="text-sm font-semibold mt-4 mb-2">Load Circuits</h3>
      <LoadUnitsTable sub={substation} units={substation.Loads.U} onUnitAction={onLoadUnitAction} isPaused={$userPausedStore} stickyHeader={true} />
    {/if}
  {/if}
{/snippet}

{#snippet branchContent(br: Branch, sibling?: Branch)}
  {@const fromSub = br.sub1?.Name || br.FromSub}
  {@const toSub = br.sub2?.Name || br.ToSub}
  {@const flowDirection = br.P >= 0 ? `${fromSub} \u2192 ${toSub}` : `${toSub} \u2192 ${fromSub}`}
  {@const branchActive = isBranchActive(br)}
  {@const siblingActive = sibling ? isBranchActive(sibling) : false}
  {@const totalCapacity = (branchActive ? br.Pmax : 0) + (siblingActive ? sibling!.Pmax : 0)}
  {@const circuitCount = sibling ? 2 : 1}
  {@const loading = branchLoading(br)}
  <div class="text-sm text-muted-foreground mb-2">
    <span>{circuitCount} circuit{circuitCount !== 1 ? 's' : ''}</span>
    <span class="mx-1.5 opacity-40">&middot;</span>
    <span><span class="font-mono">{Math.abs(br.P).toFixed(0)} MW</span> {flowDirection}</span>
    <span class="mx-1.5 opacity-40">&middot;</span>
    <span>Loading <span class={cn('font-mono', loading > 100 ? 'text-destructive' : '')}>{loading.toFixed(0)}%</span> of {totalCapacity.toFixed(0)} MW</span>
  </div>
  <CircuitTable branch={br} {sibling} {onBranchAction} isPaused={$userPausedStore} />
{/snippet}

{#if open && sub}
  <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
    <DialogContent id="grid-modal" class="sm:max-w-3xl canvas-center">
      <DialogHeader titleClass="flex items-center gap-2" description="Controls and details for {sub.Name}." descriptionClass="sr-only">
        {#snippet titleContent()}
          {@render generationTypeIcon(sub.Category)}
          <span class="text-lg font-semibold leading-none tracking-tight">{sub.Name} Substation</span>
        {/snippet}
      </DialogHeader>
      <div role="region" aria-label="{sub.Name} Controls" class="max-h-[70vh] overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 relative">
        {#if sub.isLoad}
          {@render loadSummaryBar(sub.U)}
        {/if}
        {@render substationContent(sub)}
      </div>
    </DialogContent>
  </Dialog.Root>
{:else if open && branch}
  {@const fromSub = branch.sub1?.Name || branch.FromSub}
  {@const toSub = branch.sub2?.Name || branch.ToSub}
  <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
    <DialogContent id="grid-modal" class="sm:max-w-3xl canvas-center">
      <DialogHeader titleClass="flex items-center gap-2" description="Controls and details for this transmission line." descriptionClass="sr-only">
        {#snippet titleContent()}
          <Cable class="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          <span class="text-lg font-semibold leading-none tracking-tight">{fromSub} &mdash; {toSub}</span>
        {/snippet}
      </DialogHeader>
      <div role="region" aria-label="Line Controls" class="max-h-[70vh] overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 relative">
        {@render branchContent(branch, siblingBranch)}
      </div>
    </DialogContent>
  </Dialog.Root>
{/if}
