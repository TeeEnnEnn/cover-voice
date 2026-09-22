<script lang="ts">
	import { Input } from '@/components/ui/input/index.js';
	import { Label } from '@/components/ui/label/index.js';
	import Button from './ui/button/button.svelte';

	let {
		id,
		name,
		value,
		userId,
		createdAt,
		updatedAt
	}: {
		id: string;
		name: string;
		value: string;
		userId: string;
		createdAt: string;
		updatedAt: string;
	} = $props();

	let isEditing = $state(false);
</script>

<div class="rounded-lg border border-gray-300 p-4">
	<form method="post" action="?/updateBlock" class="flex flex-col gap-4">
		<div class="flex flex-col gap-2">
			<Label for="blockName-{id}">Name</Label>
			{#if isEditing}
				<Input value={name} required name="blockName" id="blockName-{id}" />
			{:else}
				<Input value={name} disabled />
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<Label for="blockValue-{id}">Value</Label>
			{#if isEditing}
				<Input {value} required name="blockValue" id="blockValue-{id}" />
			{:else}
				<Input {value} disabled />
			{/if}
		</div>
		<input type="hidden" value={id} name="blockId" />
		<small>last updated: {Intl.DateTimeFormat('en-GB').format(new Date(updatedAt))}</small>
		<div class="flex gap-2">
			{#if isEditing}
				<Button
					class="flex-1"
					variant="destructive"
					type="button"
					onclick={() => {
						isEditing = false;
					}}>Cancel</Button
				>
				<Input class="flex-2" type="submit" value="Update" />
				<Button
					class="flex-1"
					variant="destructive"
					type="submit"
					formaction="?/deleteBlock"
					><svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.25"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-trash"
						><path d="M10 11v6" /><path d="M14 11v6" /><path
							d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
						/><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg
					></Button
				>
			{:else}
				<Button
				type="button"
					variant="outline"
					onclick={() => {
						isEditing = true;
					}}>Edit</Button
				>
			{/if}
		</div>
	</form>
</div>
