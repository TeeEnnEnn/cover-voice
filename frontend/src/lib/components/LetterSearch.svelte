<script lang="ts">
	import ItemOneLiner from './ItemOneLiner.svelte';
	import LetterTeaser from './LetterTeaser.svelte';
	import SearchInput from './SearchInput.svelte';
	import { filterByTitle } from '@/utils/filterByName.js';
	import type { components } from '@/api/schema.js';

	type Letter = components['schemas']['Letter'];

	let {
		letters = [],
		selected = null,
		onSelect,
		label = 'letter'
	}: {
		letters: Letter[];
		selected: Letter | null;
		onSelect: (letter: Letter) => void;
		label?: string;
	} = $props();

	let query = $state('');
	let filtered = $derived(filterByTitle(letters, query));
</script>

<div class="flex flex-col gap-2">
	<div>
		{#if selected}
			<LetterTeaser letter={selected} />
		{/if}
	</div>
	<SearchInput bind:value={query} placeholder={`Search ${label}s...`} />
	{#each filtered as letter (letter.id)}
		<button
			onclick={() => {
				onSelect(letter);
			}}
		>
			<ItemOneLiner name={letter.title} lastUpdated={letter.updatedAt} />
		</button>
	{:else}
		<p class="text-sm text-muted-foreground">
			{letters.length === 0 ? `No ${label}s yet.` : `No ${label}s match “${query}”.`}
		</p>
	{/each}
</div>
