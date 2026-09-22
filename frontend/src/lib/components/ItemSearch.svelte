<script lang="ts" generics="T extends { id: string; name: string; value: string; userId: string; createdAt: string; updatedAt: string }">
	import ItemOneLiner from './ItemOneLiner.svelte';
	import ItemTeaser from './ItemTeaser.svelte';
	import SearchInput from './SearchInput.svelte';
	import { filterByName } from '@/utils/filterByName.js';

	let {
		items = [],
		selected = null,
		onSelect,
		label,
		kind
	}: {
		items: T[];
		selected: T | null;
		onSelect: (item: T) => void;
		label: string;
		kind: 'block' | 'variable';
	} = $props();

	let query = $state('');
	let filtered = $derived(filterByName(items, query));
</script>

<div class="flex flex-col gap-2">
	<div>
		{#if selected}
			<ItemTeaser {...selected} {kind} />
		{/if}
	</div>
	<SearchInput bind:value={query} placeholder={`Search ${label}s...`} />
	{#each filtered as item (item.id)}
		<button
			onclick={() => {
				onSelect(item);
			}}
		>
			<ItemOneLiner name={item.name} lastUpdated={item.updatedAt} />
		</button>
	{/each}
</div>
