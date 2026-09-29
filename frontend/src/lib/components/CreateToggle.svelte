<script lang="ts">
	import { Button } from '@/components/ui/button/index.js';

	let { creating = $bindable(false), label }: { creating: boolean; label: string } = $props();
</script>

<div>
	{#if creating}
		<Button
			variant="destructive"
			onclick={() => {
				creating = false;
			}}>Cancel</Button
		>
	{:else}
		<Button
			variant="default"
			onclick={() => {
				creating = true;
			}}>New {label}</Button
		>
	{/if}
</div>
