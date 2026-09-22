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
	<form method="post" action="?/updateVariable" class="flex flex-col gap-4">
		<div class="flex flex-col gap-2">
			<Label for="variableName-{id}">Name</Label>
			{#if isEditing}
				<Input value={name} required name="variableName" id="variableName-{id}" />
			{:else}
				<Input value={name} disabled />
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<Label for="variableValue-{id}">Value</Label>
			{#if isEditing}
				<Input {value} required name="variableValue" id="variableValue-{id}" />
			{:else}
				<Input {value} disabled />
			{/if}
		</div>
		<input type="hidden" value={id} name="variableId" />
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
					formaction="?/deleteVariable"
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
					variant="outline"
					type="button"
					onclick={() => {
						isEditing = true;
					}}>Edit</Button
				>
			{/if}
		</div>
	</form>
</div>
