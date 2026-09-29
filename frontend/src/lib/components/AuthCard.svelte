<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import type { Snippet } from 'svelte';

	let {
		title,
		description = null,
		children
	}: {
		title: string;
		description?: string | null;
		children: Snippet;
	} = $props();
</script>

<svelte:head><title>{title}</title></svelte:head>
<div class="flex min-h-screen flex-col">
	<Card.Root class="mx-auto my-36 w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">{title}</Card.Title>
			{#if description}
				<Card.Description>{description}</Card.Description>
			{/if}
		</Card.Header>
		<Card.Content>
			{@render children()}
		</Card.Content>
	</Card.Root>
</div>
