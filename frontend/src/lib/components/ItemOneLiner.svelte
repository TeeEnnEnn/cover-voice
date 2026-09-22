<script lang="ts">
	let { name, lastUpdated }: { name: string, lastUpdated: string } = $props();
</script>

<div class="flex justify-between rounded-lg border border-gray-400 px-3 py-1 items-center hover:bg-gray-200">
	<span class="text-start text-muted-foreground">{name}</span>
	<span class="text-start text-muted-foreground text-sm">updated: {Intl.DateTimeFormat('en-GB').format(new Date(lastUpdated))}</span>
</div>
