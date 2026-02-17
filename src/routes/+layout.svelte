<script lang="ts">
	import '../app.css';
	import { theme } from '$lib/stores/theme.svelte';
	import { settings, FONT_SIZE_MAP } from '$lib/stores/settings.svelte';

	let { children } = $props();

	// Sync theme class to <html>
	$effect(() => {
		document.documentElement.classList.toggle('dark', theme.resolved === 'dark');
	});

	// Sync high-contrast class to <html>
	$effect(() => {
		document.documentElement.classList.toggle('high-contrast', settings.current.isHighContrast);
	});

	// Sync font size to <html>
	$effect(() => {
		document.documentElement.style.fontSize = FONT_SIZE_MAP[settings.current.fontSize] || '16px';
	});
</script>

{@render children()}
