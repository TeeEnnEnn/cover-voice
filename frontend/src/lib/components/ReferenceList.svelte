<script lang="ts">
	let {
		kind,
		items = [],
		error = null,
		onCreate,
		markedIds
	}: {
		kind: 'block' | 'variable';
		items: Array<{ id: string; name: string; value: string }>;
		error?: string | null;
		onCreate?: () => void;
		markedIds?: Set<string> | Array<string>;
	} = $props();

	function tokenFor(name: string): string {
		return kind === 'block' ? `{% ${name} %}` : `{{ ${name} }}`;
	}

	function isMarked(id: string): boolean {
		if (!markedIds) return false;
		return markedIds instanceof Set ? markedIds.has(id) : markedIds.includes(id);
	}

	let emptyMessage = $derived(kind === 'block' ? 'No blocks yet.' : 'No variables yet.');
</script>

{#if error}
	<p class="text-sm text-red-600">{error}</p>
{:else}
	<ul class="mb-6 grid grid-cols-[auto_auto_minmax(0,1fr)] items-baseline gap-x-2 gap-y-4">
		{#each items as item (item.id)}
			<li class="col-span-full grid grid-cols-subgrid text-sm">
				<code class="justify-self-start py-0.5 whitespace-nowrap"
					>{tokenFor(item.name)}{#if isMarked(item.id)}<span
							class="text-pink-500"
							title="Has an override"
							aria-label="has an override">*</span
						>{/if}</code
				>
				<span class="text-muted-foreground" aria-hidden="true">=</span>
				<span class="min-w-0 wrap-break-word text-muted-foreground">{item.value}</span>
			</li>
		{:else}
			<li class="col-span-full text-sm text-muted-foreground">
				{emptyMessage}
				<button type="button" class="underline" onclick={onCreate}>Create one</button>.
			</li>
		{/each}
	</ul>
{/if}
