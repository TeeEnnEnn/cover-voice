<script lang="ts">
	import { Button } from '@/components/ui/button/index.js';
	import { Input } from '@/components/ui/input/index.js';

	let { value = $bindable(''), placeholder = 'Search...' }: { value: string; placeholder?: string } =
		$props();
</script>

<div class="flex gap-2">
	<Input class="flex-3" type="search" bind:value {placeholder} />
	<Button
		variant="destructive"
		aria-label="Clear search"
		onclick={() => {
			value = '';
		}}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-rotate-ccw preview-icon"
			><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg
		>
	</Button>
</div>
