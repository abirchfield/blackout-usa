<script lang="ts">
	import '../app.css';
	import { resolvedTheme } from '$lib/stores/theme';
	import { settings, FONT_SIZE_MAP } from '$lib/stores/settings';

	let { children } = $props();

	// Sync theme class to <html>
	$effect(() => {
		document.documentElement.classList.toggle('dark', $resolvedTheme === 'dark');
	});

	// Sync high-contrast class to <html>
	$effect(() => {
		document.documentElement.classList.toggle('high-contrast', $settings.isHighContrast);
	});

	// Sync font size to <html>
	$effect(() => {
		document.documentElement.style.fontSize = FONT_SIZE_MAP[$settings.fontSize] || '16px';
	});
</script>

{@render children()}
