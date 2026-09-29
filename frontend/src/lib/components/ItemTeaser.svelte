<script lang="ts">
	import { enhance } from '$app/forms';
	import { Input } from '@/components/ui/input/index.js';
	import { Textarea } from '@/components/ui/textarea/index.js';
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
		onDeleted,
		onUpdated,
		suggestions = []
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
		onUpdated?: () => void;
		suggestions?: Array<{ id: string; name: string; value: string }>;
	} = $props();

	let isEditing = $state(false);
	let confirmingDelete = $state(false);
	let updating = $state(false);

	let updateAction = $derived(kind === 'block' ? '?/updateBlock' : '?/updateVariable');
	let deleteAction = $derived(kind === 'block' ? '?/deleteBlock' : '?/deleteVariable');
	let nameField = $derived(kind === 'block' ? 'blockName' : 'variableName');
	let valueField = $derived(kind === 'block' ? 'blockValue' : 'variableValue');
	let idField = $derived(kind === 'block' ? 'blockId' : 'variableId');

	// ---- {{variable}} autocomplete for block values (blocks embed variables) ----
	const VAR_TRIGGER_RE = /(\{\{)\s*([\w-]*)$/;
	let varMenu = $state<{ query: string; index: number } | null>(null);

	let varMenuItems = $derived.by(() => {
		if (!varMenu || kind !== 'block') return [];
		const q = varMenu.query.toLowerCase();
		return suggestions.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
	});

	function onValueInput(e: Event) {
		if (kind !== 'block') return;
		const input = e.currentTarget as HTMLTextAreaElement;
		const caret = input.selectionStart ?? input.value.length;
		const m = input.value.slice(0, caret).match(VAR_TRIGGER_RE);
		if (!m) {
			varMenu = null;
			return;
		}
		varMenu = { query: m[2], index: 0 };
	}

	function acceptVarSuggestion(varName: string) {
		if (!varMenu) return;
		const input = document.getElementById(`blockValue-${id}`) as HTMLTextAreaElement | null;
		if (!input) {
			varMenu = null;
			return;
		}
		const caret = input.selectionStart ?? input.value.length;
		const before = input.value.slice(0, caret);
		const m = before.match(VAR_TRIGGER_RE);
		if (!m || m.index === undefined) {
			varMenu = null;
			return;
		}
		const insert = `{{${varName}}}`;
		const start = m.index as number;
		const newValue = before.slice(0, start) + insert + input.value.slice(caret);
		input.value = newValue;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		varMenu = null;
		requestAnimationFrame(() => {
			const pos = start + insert.length;
			input.setSelectionRange(pos, pos);
			input.focus();
		});
	}

	function onValueKeydown(e: KeyboardEvent) {
		if (!varMenu) return;
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const n = varMenuItems.length;
			if (n === 0) return;
			varMenu.index = (varMenu.index + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			const item = varMenuItems[varMenu.index];
			if (item) {
				e.preventDefault();
				acceptVarSuggestion(item.name);
			}
		} else if (e.key === 'Escape') {
			varMenu = null;
		}
	}

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

<div class=" border border-border bg-card p-4 shadow-sm">
	<form
		method="post"
		action={updateAction}
		class="flex flex-col gap-4"
		use:enhance={() => {
			updating = true;
			return async ({ result, update }) => {
				updating = false;
				await update();
				if (result.type === 'success') {
					isEditing = false;
					varMenu = null;
					onUpdated?.();
				}
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
				{#if kind === 'block'}
					<div class="relative">
						<Textarea
							{value}
							required
							name={valueField}
							id="blockValue-{id}"
							rows={3}
							oninput={onValueInput}
							onkeydown={onValueKeydown}
							onblur={() => {
								setTimeout(() => {
									varMenu = null;
								}, 150);
							}}
							placeholder={'Use {{variable}} references'}
						/>
						{#if varMenu && varMenuItems.length > 0}
							<ul
								role="listbox"
								aria-label="Variable suggestions"
								class="absolute z-20 w-56 overflow-hidden border border-border bg-popover shadow-lg"
							>
								{#each varMenuItems as item, i (item.id)}
									<li role="option" aria-selected={i === varMenu.index}>
										<button
											type="button"
											class="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm {i ===
											varMenu.index
												? 'bg-accent'
												: ''}"
											onmousedown={(e) => {
												e.preventDefault();
												acceptVarSuggestion(item.name);
											}}
											onmouseenter={() => {
												if (varMenu) varMenu.index = i;
											}}
										>
											<code>{`{{${item.name}}}`}</code>
											<span class="truncate text-xs text-muted-foreground">{item.value}</span>
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{:else}
					<Textarea {value} required name={valueField} id="blockValue-{id}" rows={3} />
				{/if}
			{:else}
				<Input {value} disabled />
			{/if}
		</div>
		<input type="hidden" value={id} name={idField} />
		{#if usageSubtitle}
			<small class="text-muted-foreground">{usageSubtitle}</small>
		{/if}
		<div class="flex gap-2 text-muted-foreground">
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
						varMenu = null;
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
