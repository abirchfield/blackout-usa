<script lang="ts">
  import { Dialog } from 'bits-ui';
  import DialogContent from '$components/ui/DialogContent.svelte';
  import DialogHeader from '$components/ui/DialogHeader.svelte';
  import SettingRow from '$components/ui/SettingRow.svelte';
  import Switch from '$components/ui/Switch.svelte';
  import Slider from '$components/ui/Slider.svelte';
  import { Select } from 'bits-ui';
  import SelectTrigger from '$components/ui/SelectTrigger.svelte';
  import SelectContent from '$components/ui/SelectContent.svelte';
  import SelectItem from '$components/ui/SelectItem.svelte';
  import Button from '$components/ui/Button.svelte';
  import KeybindSettings from '$components/modals/KeybindSettings.svelte';
  import { ViewConfig, defaultKeyBindings } from '$lib/view/constants';
  import type { FontSize } from '$lib/stores/settings.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { RotateCcw } from 'lucide-svelte';
  import { theme } from '$lib/stores/theme.svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open, onOpenChange }: Props = $props();

  let isTabular = $derived(settings.current.viewMode === 'tabular');
</script>

<Dialog.Root {open} {onOpenChange}>
  <DialogContent id="accessibility-modal" class="sm:max-w-lg">
    <DialogHeader title="Settings" description="Customize your experience with display and accessibility options." />
    <div class="space-y-6 py-4 max-h-[65vh] modal-scroll">
      <!-- Display Section -->
      <section class="space-y-1">
        <div class="mb-3">
          <h3 class="text-sm font-semibold text-foreground">Display</h3>
          <p class="text-xs text-muted-foreground">Customize colors, contrast, and text size</p>
        </div>
        <div class="space-y-0.5">
          <SettingRow label="Color Theme" description="Light, dark, or match system" htmlFor="theme-select-modal" class="hover:bg-accent/50">{@render themeSelect()}</SettingRow>
          <SettingRow label="Font Size" description="Adjust text size across the app" htmlFor="font-size-select-modal" class="hover:bg-accent/50">{@render fontSizeSelect()}</SettingRow>
          <SettingRow label="High Contrast" description="Increase visual distinction" htmlFor="high-contrast-toggle-modal" class="hover:bg-accent/50">{@render highContrastToggle()}</SettingRow>
        </div>
      </section>

      <!-- Grid View Section -->
      <section class="space-y-1">
        <div class="mb-3">
          <h3 class="text-sm font-semibold text-foreground">Grid View</h3>
          <p class="text-xs text-muted-foreground">Configure how the power grid is displayed</p>
        </div>
        <div class="space-y-0.5">
          <SettingRow label="Display Mode" description="Interactive map or data tables" htmlFor="view-mode-select" class="hover:bg-accent/50">{@render viewModeSelect()}</SettingRow>
          <SettingRow label="Animations" description="Animated power flow on lines" htmlFor="animations-toggle-modal" disabled={isTabular} class="hover:bg-accent/50">{@render animationsToggle()}</SettingRow>
          <SettingRow label="Map Labels" description="Show substation names on map" htmlFor="map-labels-toggle-modal" disabled={isTabular} class="hover:bg-accent/50">{@render mapLabelsToggle()}</SettingRow>
          <SettingRow label="Zoom Speed" description="Mouse wheel sensitivity" htmlFor="zoom-sensitivity-slider" disabled={isTabular} class="hover:bg-accent/50">{@render zoomSlider()}</SettingRow>
        </div>
      </section>

      <!-- Keyboard Shortcuts Section -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Keyboard Shortcuts</h3>
          <Button
            variant="ghost"
            size="sm"
            onclick={() => settings.update({ keyBindings: defaultKeyBindings })}
            class="h-7 px-2 text-xs"
          >
            <RotateCcw class="h-3 w-3 mr-1.5" />
            Reset
          </Button>
        </div>
        <KeybindSettings
          bindings={settings.current.keyBindings}
          onBindingsChange={(bindings) => settings.update({ keyBindings: bindings })}
        />
      </section>
    </div>
  </DialogContent>
</Dialog.Root>

{#snippet themeSelect()}
  <Select.Root type="single" value={theme.current} onValueChange={(value) => { if (value) theme.current = value as any; }}>
    <SelectTrigger id="theme-select-modal" class="w-auto min-w-32">
      <span data-slot="select-value">{theme.current === 'light' ? 'Light' : theme.current === 'dark' ? 'Dark' : 'System'}</span>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="light">Light</SelectItem>
      <SelectItem value="dark">Dark</SelectItem>
      <SelectItem value="system">System</SelectItem>
    </SelectContent>
  </Select.Root>
{/snippet}

{#snippet fontSizeSelect()}
  <Select.Root type="single" value={settings.current.fontSize} onValueChange={(value) => { if (value) settings.update({ fontSize: value as FontSize }); }}>
    <SelectTrigger id="font-size-select-modal" class="w-auto min-w-32">
      <span data-slot="select-value">{settings.current.fontSize === 'sm' ? 'Small' : settings.current.fontSize === 'base' ? 'Default' : settings.current.fontSize === 'lg' ? 'Large' : 'Extra Large'}</span>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="sm">Small</SelectItem>
      <SelectItem value="base">Default</SelectItem>
      <SelectItem value="lg">Large</SelectItem>
      <SelectItem value="xl">Extra Large</SelectItem>
    </SelectContent>
  </Select.Root>
{/snippet}

{#snippet highContrastToggle()}
  <Switch
    id="high-contrast-toggle-modal"
    checked={settings.current.isHighContrast}
    onCheckedChange={(checked) => settings.update({ isHighContrast: checked })}
  />
{/snippet}

{#snippet viewModeSelect()}
  <Select.Root type="single" value={settings.current.viewMode} onValueChange={(value) => { if (value) settings.update({ viewMode: value as 'map' | 'tabular' }); }}>
    <SelectTrigger id="view-mode-select" class="w-auto min-w-32">
      <span data-slot="select-value">{settings.current.viewMode === 'map' ? 'Map' : 'Tabular'}</span>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="map">Map</SelectItem>
      <SelectItem value="tabular">Tabular</SelectItem>
    </SelectContent>
  </Select.Root>
{/snippet}

{#snippet animationsToggle()}
  <Switch
    id="animations-toggle-modal"
    checked={settings.current.animationsEnabled}
    onCheckedChange={(checked) => settings.update({ animationsEnabled: checked })}
    disabled={isTabular}
  />
{/snippet}

{#snippet mapLabelsToggle()}
  <Switch
    id="map-labels-toggle-modal"
    checked={settings.current.renderMapLabels}
    onCheckedChange={(checked) => settings.update({ renderMapLabels: checked })}
    disabled={isTabular}
  />
{/snippet}

{#snippet zoomSlider()}
  <div class="flex items-center gap-2 w-auto min-w-32">
    <Slider
      id="zoom-sensitivity-slider"
      min={ViewConfig.ZOOM_SENSITIVITY_MIN}
      max={ViewConfig.ZOOM_SENSITIVITY_MAX}
      step={ViewConfig.ZOOM_SENSITIVITY_STEP}
      value={settings.current.zoomSensitivity}
      onValueChange={(value) => settings.update({ zoomSensitivity: value })}
      disabled={isTabular}
      aria-label="Zoom speed"
      class="flex-1"
    />
    <span class="text-xs text-muted-foreground w-6 text-right tabular-nums font-mono">
      {settings.current.zoomSensitivity.toFixed(1)}
    </span>
  </div>
{/snippet}
