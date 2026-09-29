<script
	lang="ts"
	generics="T extends { id: string; name: string; value: string; userId: string; createdAt: string; updatedAt: string }"
>
	import ItemOneLiner from './ItemOneLiner.svelte';
	import ItemTeaser, { type ItemUsage } from './ItemTeaser.svelte';
	import SearchInput from './SearchInput.svelte';
	import { filterByName } from '@/utils/filterByName.js';

	let {
		items = [],
		selected = null,
		onSelect,
		label,
		kind,
		usages = {}
	}: {
		items: T[];
		selected: T | null;
		onSelect: (item: T) => void;
		label: string;
		kind: 'block' | 'variable';
		usages?: Record<string, ItemUsage>;
	} = $props();

	let query = $state('');
	let filtered = $derived(filterByName(items, query));

	function usageBadgeFor(id: string): { text: string; title: string } | null {
		const u = usages[id];
		if (!u) return null;
		if (kind === 'block') {
			const letters = u.letterCount;
			const vars = u.variableCount ?? 0;
			const total = letters + vars;
			if (total === 0) return { text: 'unused', title: 'Not used by any letter' };
			return {
				text: `${total} use${total === 1 ? '' : 's'}`,
				title: `Used in ${letters} letter(s), uses ${vars} variable(s)`
			};
		}
		const blocks = u.blockCount ?? 0;
		const total = blocks + u.letterCount;
		if (total === 0) return { text: 'unused', title: 'Not used anywhere' };
		return {
			text: `${total} use${total === 1 ? '' : 's'}`,
			title: `Used in ${blocks} block(s) and ${u.letterCount} letter(s)`
		};
	}
</script>

<div class="flex flex-col gap-2">
	<div>
		{#if selected}
			<ItemTeaser {...selected} {kind} usage={usages[selected.id] ?? null} />
		{/if}
	</div>
	<SearchInput bind:value={query} placeholder={`Search ${label}s...`} />
	{#each filtered as item (item.id)}
		<button
			onclick={() => {
				onSelect(item);
			}}
		>
			<ItemOneLiner
				name={item.name}
				lastUpdated={item.updatedAt}
				usageBadge={usageBadgeFor(item.id)}
			/>
		</button>
	{:else}
		<p class="text-sm text-muted-foreground">
			{items.length === 0 ? `No ${label}s yet.` : `No ${label}s match “${query}”.`}
		</p>
	{/each}
</div>
