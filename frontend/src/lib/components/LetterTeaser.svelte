<script lang="ts">
	import { Input } from '@/components/ui/input/index.js';
	import { Textarea } from '@/components/ui/textarea/index.js';
	import { Label } from '@/components/ui/label/index.js';
	import Button from './ui/button/button.svelte';
	import { enhance } from '$app/forms';
	import type { components } from '@/api/schema.js';

	type Letter = components['schemas']['Letter'];

	let { letter }: { letter: Letter } = $props();

	let isEditing = $state(false);
</script>

<div class="rounded-lg border border-gray-300 p-4">
	<form method="post" action="?/updateLetter" class="flex flex-col gap-4" use:enhance>
		<div class="flex flex-col gap-2">
			<Label for="letterTitle-{letter.id}">Title</Label>
			{#if isEditing}
				<Input value={letter.title} required name="letterTitle" id="letterTitle-{letter.id}" />
			{:else}
				<Input value={letter.title} disabled />
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<Label for="letterDescription-{letter.id}">Description</Label>
			{#if isEditing}
				<Textarea
					value={letter.description ?? ''}
					name="letterDescription"
					id="letterDescription-{letter.id}"
				/>
			{:else}
				<Textarea value={letter.description ?? ''} disabled />
			{/if}
		</div>
		<input type="hidden" value={letter.id} name="letterId" />
		<div class="flex flex-col gap-1 text-muted-foreground">
			<small>created: {Intl.DateTimeFormat('en-GB').format(new Date(letter.createdAt))}</small>
			<small>updated: {Intl.DateTimeFormat('en-GB').format(new Date(letter.updatedAt))}</small>
		</div>
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
				<Input class="flex-3" type="submit" value="Update" />
				<Button class="flex-1" variant="destructive" type="submit" formaction="?/deleteLetter">
					<svg
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
					>
				</Button>
			{:else}
				<Button
					type="button"
					variant="outline"
					onclick={() => {
						isEditing = true;
					}}>Edit</Button
				>
				<Button href={`/letters/${letter.id}`} variant="outline" class="flex-1">
					View letter
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-arrow-right"
						><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
					>
				</Button>
			{/if}
		</div>
	</form>
</div>
