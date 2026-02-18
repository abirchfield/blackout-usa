<script lang="ts">
  import { Dialog } from 'bits-ui';
  import DialogContent from '$components/ui/DialogContent.svelte';
  import DialogHeader from '$components/ui/DialogHeader.svelte';
  import Button from '$components/ui/Button.svelte';
  import Badge from '$components/ui/Badge.svelte';
  import SectionLabel from '$components/ui/SectionLabel.svelte';
  import UnitSuffix from '$components/ui/UnitSuffix.svelte';
  import CardContainer from '$components/ui/CardContainer.svelte';
  import GeneratorDemo from './help/GeneratorDemo.svelte';
  import TransmissionDemo from './help/TransmissionDemo.svelte';
  import { SubstationCategory } from '$lib/types';
  import { GenerationTypeConfig, LoadTypeConfig } from '$components/theme';
  import { cn } from '$lib/utils';
  import {
    Bell,
    Lightbulb,
    ChevronLeft,
    ChevronRight,
    Target,
    Zap,
    Activity,
    Settings,
    TrendingUp,
    DollarSign,
    Clock,
    Power,
  } from 'lucide-svelte';

  const generatorTypes = [
    SubstationCategory.Nuclear,
    SubstationCategory.Thermal,
    SubstationCategory.Wind,
    SubstationCategory.Solar,
  ];

  const genDesc: Partial<Record<SubstationCategory, string>> = {
    [SubstationCategory.Nuclear]: 'Baseload. Slow startup, lowest fuel cost.',
    [SubstationCategory.Thermal]: 'Workhorse. Moderate startup, adjustable.',
    [SubstationCategory.Wind]: 'Free fuel. Output varies with conditions.',
    [SubstationCategory.Solar]: 'Free fuel. Drops to zero after sunset.',
  };

  const helpPageMeta = [
    { title: 'Welcome', icon: Target, subtitle: "You're the operator of a simulated Texas power grid. Your job: keep the lights on." },
    { title: 'The Grid', icon: Zap, subtitle: 'Substations are the building blocks of the grid. They either generate or consume power.' },
    { title: 'Generator Controls', icon: Settings, subtitle: 'Click any generator substation to open its controls. Try the interactive demo below.' },
    { title: 'Transmission Lines', icon: Activity, subtitle: 'Lines carry power between substations. Overloaded lines can trip and cause cascading failures.' },
    { title: 'Dashboard', icon: TrendingUp, subtitle: 'How to read the sidebar and know when to act.' },
    { title: 'Tips & Strategy', icon: Lightbulb, subtitle: 'Practical advice for keeping the lights on and costs down.' },
  ];

  const totalPages = helpPageMeta.length;

  const genBarExamples = [
    { type: SubstationCategory.Nuclear, output: 70, capacity: 85 },
    { type: SubstationCategory.Thermal, output: 55, capacity: 90 },
    { type: SubstationCategory.Solar, output: 30, capacity: 30 },
    { type: SubstationCategory.Wind, output: 60, capacity: 65 },
  ] as const;

  const freqThresholds = [
    { value: '60.00', color: 'text-[var(--color-status-in)]', dot: 'bg-[var(--color-status-in)]', label: 'Stable \u2014 system balanced' },
    { value: '< 59.85', color: 'text-[var(--color-warning)]', dot: 'bg-[var(--color-warning)]', label: 'Warning \u2014 start backup units' },
    { value: '< 59.70', color: 'text-destructive', dot: 'bg-destructive', label: 'Danger \u2014 loss of load imminent' },
    { value: '< 58.00', color: 'text-destructive', dot: 'bg-destructive', label: 'Blackout \u2014 grid collapses' },
  ] as const;

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open, onOpenChange }: Props = $props();

  let currentPage = $state(0);

  $effect(() => {
    if (open) currentPage = 0;
  });

  function goToNextPage() {
    currentPage = Math.min(currentPage + 1, totalPages - 1);
  }

  function goToPrevPage() {
    currentPage = Math.max(currentPage - 1, 0);
  }
</script>

{#snippet substationExample(category: SubstationCategory, fillPercent: number, label: string, sublabel?: string)}
  {@const isLoad = category === SubstationCategory.Load}
  {@const config = GenerationTypeConfig[category]}
  {@const color = isLoad ? 'var(--foreground)' : `var(${config.cssVar})`}
  {@const center = 24}
  {@const strokeWidth = 2}
  {@const ratio = Math.max(0, Math.min(1, fillPercent / 100))}
  <div class="flex flex-col items-center gap-1.5 min-w-[80px]">
    {#if isLoad}
      {@const size = 30}
      {@const half = size / 2}
      {@const x = center - half}
      {@const y = center - half}
      {@const fillHeight = size * ratio}
      {@const fillY = y + size - fillHeight}
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <rect {x} {y} width={size} height={size} fill="var(--background)" />
        {#if ratio > 0}
          <rect x={x} y={fillY} width={size} height={fillHeight} fill={color} />
        {/if}
        <rect {x} {y} width={size} height={size} fill="none" stroke={color} stroke-width={strokeWidth} />
      </svg>
    {:else}
      {@const outerRadius = 20}
      {@const innerRadius = outerRadius / 1.2}
      {@const endAngle = -Math.PI / 2 + (Math.PI * 2 * ratio)}
      {@const isFullCircle = ratio >= 1}
      {@const sx = center + innerRadius * Math.cos(-Math.PI / 2)}
      {@const sy = center + innerRadius * Math.sin(-Math.PI / 2)}
      {@const x2 = center + innerRadius * Math.cos(endAngle)}
      {@const y2 = center + innerRadius * Math.sin(endAngle)}
      {@const largeArcFlag = ratio > 0.5 ? 1 : 0}
      {@const piePath = `M${center},${center} L${sx},${sy} A${innerRadius},${innerRadius} 0 ${largeArcFlag},1 ${x2},${y2} Z`}
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx={center} cy={center} r={outerRadius} fill={color} stroke={color} stroke-width={strokeWidth} />
        <circle cx={center} cy={center} r={innerRadius} fill="var(--background)" />
        {#if ratio > 0}
          {#if isFullCircle}
            <circle cx={center} cy={center} r={innerRadius} fill={color} />
          {:else}
            <path d={piePath} fill={color} />
          {/if}
        {/if}
        <circle cx={center} cy={center} r={innerRadius} fill="none" stroke={color} stroke-width={strokeWidth} />
      </svg>
    {/if}
    <div class="text-center">
      <p class="text-xs font-medium">{label}</p>
      {#if sublabel}
        <p class="text-[10px] text-muted-foreground">{sublabel}</p>
      {/if}
    </div>
  </div>
{/snippet}

{#snippet pageDot(active: boolean, onclick: () => void, label: string)}
  <button
    {onclick}
    class={cn(
      'w-2.5 h-2.5 rounded-full transition-all',
      active
        ? 'bg-primary scale-110'
        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
    )}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
  ></button>
{/snippet}

<Dialog.Root {open} {onOpenChange}>
  <DialogContent id="help-modal" class="sm:max-w-3xl font-sans max-h-[85vh] flex flex-col">
    <DialogHeader class="flex-shrink-0" titleClass="text-xl font-bold flex items-center gap-2" description={helpPageMeta[currentPage].subtitle}>
      {#snippet titleContent()}
        {@const PageIcon = helpPageMeta[currentPage].icon}
        <PageIcon class="h-5 w-5 text-primary" aria-hidden="true" />
        {helpPageMeta[currentPage].title}
      {/snippet}
    </DialogHeader>

    <div class="flex-1 modal-scroll py-1">
      <!-- Page 0: Welcome -->
      {#if currentPage === 0}
        <div class="space-y-4">
          <p class="text-sm leading-relaxed">
            In this simulation, you manage <strong>power plants</strong> that produce electricity
            and <strong>transmission lines</strong> that deliver it across Texas. You decide which
            generators to run, how much power each should produce, and how to respond when equipment
            fails or demand changes.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            <div>
              <SectionLabel>Your Two Goals</SectionLabel>
              <div class="space-y-2 text-sm">
                <div class="flex items-start gap-2.5">
                  <Zap class="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p class="text-sm"><span class="font-semibold">Keep customers powered</span> <span class="text-muted-foreground">&mdash; If generation falls short, frequency drops and blackouts follow.</span></p>
                </div>
                <div class="flex items-start gap-2.5">
                  <DollarSign class="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p class="text-sm"><span class="font-semibold">Keep costs low</span> <span class="text-muted-foreground">&mdash; Only start expensive plants when you need them.</span></p>
                </div>
              </div>
            </div>

            <div>
              <SectionLabel>Help Along the Way</SectionLabel>
              <div class="space-y-2 text-sm">
                <div class="flex items-start gap-2.5">
                  <Bell class="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p class="text-sm"><span class="font-semibold">Alerts</span> <span class="text-muted-foreground">&mdash; Warn about problems: overloaded lines, low reserves, trips.</span></p>
                </div>
                <div class="flex items-start gap-2.5">
                  <Lightbulb class="h-4 w-4 text-[var(--color-hint)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p class="text-sm"><span class="font-semibold">Hints</span> <span class="text-muted-foreground">&mdash; Suggest actions you can take to improve the situation.</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

      <!-- Page 1: The Grid -->
      {:else if currentPage === 1}
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 items-start">
            <div>
              <SectionLabel>Generators (Circles)</SectionLabel>
              <p class="text-xs text-muted-foreground mb-2">
                Produce electricity. Colored ring = fuel type. Pie fill = output level.
              </p>
              <div class="grid grid-cols-4 gap-1 justify-items-center">
                {#each generatorTypes as cat}
                  {@render substationExample(cat, 65, GenerationTypeConfig[cat].name)}
                {/each}
              </div>
            </div>
            <div>
              <SectionLabel>Loads (Squares)</SectionLabel>
              <p class="text-xs text-muted-foreground mb-2">
                Consume electricity. Fill level = how much demand is being served.
              </p>
              <div class="flex gap-3 justify-center">
                {@render substationExample(SubstationCategory.Load, 85, 'Served', 'Receiving power')}
                {@render substationExample(SubstationCategory.Load, 0, 'Blacked Out', 'No power')}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div class="space-y-1">
              {#each generatorTypes as cat}
                {@const config = GenerationTypeConfig[cat]}
                <div class="flex items-start gap-2 py-0.5">
                  <config.icon class={cn('h-4 w-4 flex-shrink-0 mt-0.5', config.tailwind.text)} aria-hidden="true" />
                  <p class="text-xs">
                    <span class="font-semibold">{config.name}</span>
                    <span class="text-muted-foreground"> &mdash; {genDesc[cat]}</span>
                  </p>
                </div>
              {/each}
            </div>
            <div class="space-y-1">
              {#each Object.values(LoadTypeConfig) as config}
                <div class="flex items-start gap-2 py-0.5">
                  <config.icon class={cn('h-4 w-4 flex-shrink-0 mt-0.5', config.tailwind.text)} aria-hidden="true" />
                  <p class="text-xs">
                    <span class="font-semibold">{config.name}</span>
                    <span class="text-muted-foreground"> &mdash; {config.description}</span>
                  </p>
                </div>
              {/each}
            </div>
          </div>

          <CardContainer class="p-3 text-sm">
            <span class="font-semibold">Tip</span> <span class="text-muted-foreground">&mdash; Click any substation on the map to open its control panel.
            For generators, you can start/stop units and adjust output.
            For loads, you can see demand and shed load in emergencies.</span>
          </CardContainer>
        </div>

      <!-- Page 2: Generator Controls -->
      {:else if currentPage === 2}
        <GeneratorDemo />

      <!-- Page 3: Transmission Lines -->
      {:else if currentPage === 3}
        <TransmissionDemo />

      <!-- Page 4: Dashboard -->
      {:else if currentPage === 4}
        <div class="space-y-4">
          <div>
            <SectionLabel>Key Indicators</SectionLabel>
            <p class="text-xs text-muted-foreground mb-2">
              These three numbers sit at the top of the sidebar. They tell you the health of the grid at a glance.
            </p>
            <CardContainer class="grid grid-cols-3 gap-3 p-3">
              <div>
                <SectionLabel variant="compact">Frequency</SectionLabel>
                <div class="text-lg sm:text-xl font-numeric font-bold text-foreground">60.00<UnitSuffix hero>Hz</UnitSuffix></div>
              </div>
              <div>
                <SectionLabel variant="compact">Total Gen.</SectionLabel>
                <div class="text-lg sm:text-xl font-numeric font-bold text-foreground">6.97<UnitSuffix hero>GW</UnitSuffix></div>
              </div>
              <div>
                <SectionLabel variant="compact">Reserves</SectionLabel>
                <div class="text-lg sm:text-xl font-numeric font-bold text-foreground">938<UnitSuffix hero>MW</UnitSuffix></div>
              </div>
            </CardContainer>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 items-start">
            <div>
              <SectionLabel>Frequency Thresholds</SectionLabel>
              <p class="text-xs text-muted-foreground mb-2">
                Frequency reflects supply vs. demand balance. When generation falls short, frequency drops.
              </p>
              <div class="space-y-1 text-xs">
                {#each freqThresholds as t}
                  <div class="flex items-center gap-2">
                    <span class={cn('w-1.5 h-1.5 rounded-full shrink-0', t.dot)}></span>
                    <span class={cn('font-numeric font-bold w-14 text-right shrink-0', t.color)}>{t.value}</span>
                    <span class="text-muted-foreground">{t.label}</span>
                  </div>
                {/each}
              </div>
              <CardContainer class="p-2.5 text-xs mt-3">
                <span class="font-semibold">Reserves</span> <span class="text-muted-foreground">&mdash; Keep at least <strong class="text-foreground font-numeric">500 MW</strong> of spare capacity to absorb sudden trips or demand spikes.</span>
              </CardContainer>
            </div>

            <div class="space-y-3">
              <div>
                <SectionLabel>Generation Bars</SectionLabel>
                <p class="text-xs text-muted-foreground mb-2">
                  Each fuel type shows current output (solid) and available capacity (faded).
                </p>
                <div class="space-y-1.5">
                  {#each genBarExamples as { type, output, capacity }}
                    {@const config = GenerationTypeConfig[type]}
                    <div class="flex items-center gap-2">
                      <config.icon class={cn('h-3.5 w-3.5 shrink-0', config.tailwind.text)} aria-hidden="true" />
                      <span class="text-[11px] text-muted-foreground/60 w-14 shrink-0">{config.name}</span>
                      <div class="h-2.5 flex-1 rounded-full bg-foreground/10">
                        <div class="h-2.5 flex rounded-full overflow-hidden" style="width: {capacity}%">
                          <div class={cn('h-full', config.tailwind.bg)} style="width: {(output / capacity) * 100}%"></div>
                          <div class={cn('h-full opacity-30', config.tailwind.bg)} style="width: {((capacity - output) / capacity) * 100}%"></div>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <CardContainer class="p-2.5 text-xs mt-2">
                <span class="font-semibold">Costs</span> <span class="text-muted-foreground">&mdash; Each running unit charges a <strong class="text-foreground">fixed cost</strong> per hour plus a <strong class="text-foreground">fuel cost</strong> per MW. Unserved load incurs a steep <strong class="text-foreground">penalty</strong>. Your goal is to minimize total cost while keeping the lights on.</span>
              </CardContainer>
            </div>
          </div>
        </div>

      <!-- Page 5: Tips & Strategy -->
      {:else if currentPage === 5}
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div class="flex items-start gap-2.5">
              <Clock class="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p class="text-sm font-semibold leading-tight">Start units early</p>
                <p class="text-xs text-muted-foreground mt-0.5">Thermal units take minutes to warm up. Begin startup before demand peaks.</p>
              </div>
            </div>
            <div class="flex items-start gap-2.5">
              <Power class="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p class="text-sm font-semibold leading-tight">Shut down idle units</p>
                <p class="text-xs text-muted-foreground mt-0.5">Every running generator has a fixed cost. Turn off what you don't need.</p>
              </div>
            </div>
          </div>

          <CardContainer class="p-3">
            <SectionLabel>Keyboard Shortcuts</SectionLabel>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
              <div><Badge variant="secondary" class="mr-1.5 font-mono text-[10px]">Space</Badge> Pause / Resume</div>
              <div><Badge variant="secondary" class="mr-1.5 font-mono text-[10px]">F</Badge> Fast forward (10x)</div>
              <div><Badge variant="secondary" class="mr-1.5 font-mono text-[10px]">E</Badge> Emergency load shed</div>
              <div><Badge variant="secondary" class="mr-1.5 font-mono text-[10px]">L</Badge> Trip overloaded line</div>
              <div><Badge variant="secondary" class="mr-1.5 font-mono text-[10px]">K</Badge> Shed smallest load</div>
              <div><Badge variant="secondary" class="mr-1.5 font-mono text-[10px]">R</Badge> Ramp up generation</div>
              <div><Badge variant="secondary" class="mr-1.5 font-mono text-[10px]">C</Badge> Center on selection</div>
              <div><Badge variant="outline" class="mr-1.5 text-[10px]">Click + Drag</Badge> Pan</div>
              <div><Badge variant="outline" class="mr-1.5 text-[10px]">Scroll</Badge> Zoom</div>
            </div>
          </CardContainer>
        </div>
      {/if}
    </div>

    <!-- Navigation footer -->
    <div class="flex-shrink-0 pt-3 border-t">
      <div class="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onclick={goToPrevPage}
          disabled={currentPage === 0}
          class="gap-1"
        >
          <ChevronLeft class="h-4 w-4" />
          Previous
        </Button>

        <div class="flex items-center gap-1.5" role="navigation" aria-label="Help pages">
          {#each helpPageMeta as page, idx}
            {@render pageDot(idx === currentPage, () => { currentPage = idx; }, `Go to ${page.title}`)}
          {/each}
        </div>

        {#if currentPage < totalPages - 1}
          <Button size="sm" onclick={goToNextPage} class="gap-1">
            Next
            <ChevronRight class="h-4 w-4" />
          </Button>
        {:else}
          <Button size="sm" onclick={() => onOpenChange(false)}>
            Get Started
          </Button>
        {/if}
      </div>
    </div>
  </DialogContent>
</Dialog.Root>
