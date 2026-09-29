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
		label = 'letter',
		onCreateNew,
		onDeleted
	}: {
		letters: Letter[];
		selected: Letter | null;
		onSelect: (letter: Letter) => void;
		label?: string;
		onCreateNew?: () => void;
		onDeleted?: () => void;
	} = $props();

	let query = $state('');
	let filtered = $derived(filterByTitle(letters, query));
</script>

<div class="flex flex-col gap-2">
	<div>
		{#if selected}
			<LetterTeaser
				letter={selected}
				onDeleted={() => {
					onDeleted?.();
					document.getElementById('search-letters')?.focus();
				}}
			/>
		{/if}
	</div>
	<SearchInput bind:value={query} inputId="search-letters" placeholder={`Search ${label}s...`} />
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
			{#if letters.length === 0 && onCreateNew}
				<button type="button" class="underline" onclick={onCreateNew}>Create one</button>
			{/if}
		</p>
	{/each}
</div>
