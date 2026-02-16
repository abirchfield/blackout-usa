<script lang="ts">
  import { page } from '$app/stores';
  import Button from '$components/ui/Button.svelte';
</script>

<div class="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
  <h1 class="text-2xl font-bold">Something went wrong</h1>
  <p class="text-muted-foreground max-w-md">
    The game encountered an unexpected error. Try refreshing the page.
  </p>
  {#if $page.error?.message}
    <pre role="alert" class="text-sm text-destructive max-w-lg overflow-auto p-4 bg-muted rounded">
      {$page.error.message}
    </pre>
  {/if}
  <Button onclick={() => window.location.reload()}>
    Reload Page
  </Button>
</div>
