<script lang="ts">
  import UnitSuffix from './UnitSuffix.svelte';

  interface Props {
    value: string;
    unit?: string;
    hero?: boolean;
  }

  let { value, unit, hero }: Props = $props();
</script>

{value}{#if unit}<UnitSuffix {hero}>{unit}</UnitSuffix>{/if}
