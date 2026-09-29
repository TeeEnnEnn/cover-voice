<script lang="ts">
	import { enhance } from '$app/forms';
	import { Input } from '@/components/ui/input/index.js';
	import { Label } from '@/components/ui/label/index.js';
	import Button from './ui/button/button.svelte';
	import DeleteConfirmDialog from './DeleteConfirmDialog.svelte';

	type NamedRef = { id: string; name: string };

	export type ItemUsage = {
		letters: NamedRef[];
		letterCount: number;
		variables?: NamedRef[];
		variableCount?: number;
		blocks?: NamedRef[];
		blockCount?: number;
	};

	let {
		id,
		name,
		value,
		userId,
		createdAt,
		updatedAt,
		kind = 'block',
		usage = null,
		onDeleted
	}: {
		id: string;
		name: string;
		value: string;
		userId: string;
		createdAt: string;
		updatedAt: string;
		kind?: 'block' | 'variable';
		usage?: ItemUsage | null;
		onDeleted?: () => void;
	} = $props();

	let isEditing = $state(false);
	let confirmingDelete = $state(false);
	let updating = $state(false);

	let updateAction = $derived(kind === 'block' ? '?/updateBlock' : '?/updateVariable');
	let deleteAction = $derived(kind === 'block' ? '?/deleteBlock' : '?/deleteVariable');
	let nameField = $derived(kind === 'block' ? 'blockName' : 'variableName');
	let valueField = $derived(kind === 'block' ? 'blockValue' : 'variableValue');
	let idField = $derived(kind === 'block' ? 'blockId' : 'variableId');

	function refNames(refs: NamedRef[] | undefined): string {
		if (!refs || refs.length === 0) return '';
		return refs.map((ref) => `"${ref.name}"`).join(', ');
	}

	let usageSubtitle = $derived.by(() => {
		if (!usage) return null;
		if (kind === 'block') {
			const parts: string[] = [];
			if (usage.letterCount > 0) parts.push(`Used in ${usage.letterCount} letter(s)`);
			if ((usage.variableCount ?? 0) > 0) parts.push(`Uses ${usage.variableCount} variable(s)`);
			return parts.length > 0 ? parts.join(' · ') : 'Not used anywhere';
		}
		const parts: string[] = [];
		if ((usage.blockCount ?? 0) > 0) parts.push(`Used in ${usage.blockCount} block(s)`);
		if (usage.letterCount > 0) parts.push(`Used in ${usage.letterCount} letter(s)`);
		return parts.length > 0 ? parts.join(' · ') : 'Not used anywhere';
	});

	let dialogLines = $derived.by(() => {
		if (!usage) return [];
		const lines: string[] = [];
		if (kind === 'block') {
			if (usage.letterCount > 0)
				lines.push(`Used in ${usage.letterCount} letter(s): ${refNames(usage.letters)}`);
			if ((usage.variableCount ?? 0) > 0)
				lines.push(`Uses ${usage.variableCount} variable(s): ${refNames(usage.variables)}`);
		} else {
			if ((usage.blockCount ?? 0) > 0)
				lines.push(`Used in ${usage.blockCount} block(s): ${refNames(usage.blocks)}`);
			if (usage.letterCount > 0)
				lines.push(`Used in ${usage.letterCount} letter(s): ${refNames(usage.letters)}`);
		}
		if (lines.length === 0) lines.push('Nothing references it.');
		return lines;
	});
</script>

<div class="rounded-lg border border-border bg-card p-4 shadow-sm">
	<form
		method="post"
		action={updateAction}
		class="flex flex-col gap-4"
		use:enhance={() => {
			updating = true;
			return async ({ update }) => {
				updating = false;
				isEditing = false;
				await update();
			};
		}}
	>
		<div class="flex flex-col gap-2">
			<Label for="blockName-{id}">Name</Label>
			{#if isEditing}
				<Input value={name} required name={nameField} id="blockName-{id}" />
			{:else}
				<Input value={name} disabled />
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<Label for="blockValue-{id}">Value</Label>
			{#if isEditing}
				<Input {value} required name={valueField} id="blockValue-{id}" />
			{:else}
				<Input {value} disabled />
			{/if}
		</div>
		<input type="hidden" value={id} name={idField} />
		{#if usageSubtitle}
			<small class="text-muted-foreground">{usageSubtitle}</small>
		{/if}
		<div class="flex flex-col gap-1 text-muted-foreground">
			<small>created: {Intl.DateTimeFormat('en-GB').format(new Date(createdAt))}</small>
			<small>updated: {Intl.DateTimeFormat('en-GB').format(new Date(updatedAt))}</small>
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
				<Button class="flex-3" type="submit" disabled={updating}>
					{updating ? 'Updating…' : 'Update'}
				</Button>
				<Button
					class="flex-1"
					variant="destructive"
					type="button"
					aria-label="Delete {kind}"
					title="Delete {kind}"
					onclick={() => {
						confirmingDelete = true;
					}}
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
					variant="secondary"
					onclick={() => {
						isEditing = true;
					}}>Edit</Button
				>
			{/if}
		</div>
	</form>
	<DeleteConfirmDialog
		open={confirmingDelete}
		heading={`Delete ${kind} "${name}"?`}
		lines={dialogLines}
		{deleteAction}
		{idField}
		idValue={id}
		onCancel={() => {
			confirmingDelete = false;
		}}
		onDeleted={() => {
			confirmingDelete = false;
			onDeleted?.();
		}}
	/>
</div>
