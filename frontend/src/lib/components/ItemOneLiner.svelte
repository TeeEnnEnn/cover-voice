<script lang="ts">
	let {
		name,
		lastUpdated,
		usageBadge = null
	}: {
		name: string;
		lastUpdated: string;
		usageBadge?: { text: string; title: string } | null;
	} = $props();
</script>

<div
	class="flex items-center justify-between gap-2 rounded-lg border border-gray-400 px-3 py-1 hover:bg-gray-200"
>
	<span class="text-start text-muted-foreground">{name}</span>
	<span class="flex shrink-0 items-center gap-2">
		{#if usageBadge}
			<span
				title={usageBadge.title}
				class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
			>
				{usageBadge.text}
			</span>
		{/if}
		<span class="text-start text-sm text-muted-foreground"
			>updated: {Intl.DateTimeFormat('en-GB').format(new Date(lastUpdated))}</span
		>
	</span>
</div>
