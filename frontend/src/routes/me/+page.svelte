<script lang="ts">
	import { Input } from '@/components/ui/input/index.js';
	import { Textarea } from '@/components/ui/textarea/index.js';
	import { Label } from '@/components/ui/label/index.js';
	import { slide } from 'svelte/transition';
	import ItemSearch from '@/components/ItemSearch.svelte';
	import LetterSearch from '@/components/LetterSearch.svelte';
	import CreateToggle from '@/components/CreateToggle.svelte';
	import type { components } from '@/api/schema.js';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte';

	type Block = components['schemas']['Block'];
	type Variable = components['schemas']['Variable'];
	type Letter = components['schemas']['Letter'];

	let { data, form } = $props();
	let user = $derived(data.user);
	let blocks = $derived(data.blocks);
	let variables = $derived(data.variables);
	let blockError = $derived(data.blockError);
	let variableError = $derived(data.variableError);
	let letters = $derived(data.letters);
	let letterError = $derived(data.letterError);
	let blockUsages = $derived(data.blockUsages ?? {});
	let variableUsages = $derived(data.variableUsages ?? {});

	let selectedBlock: Block | null = $state(null);
	let selectedVariable: Variable | null = $state(null);
	let selectedLetter: Letter | null = $state(null);

	let blockItems = $derived(blocks?.blocks ?? []);
	let variableItems = $derived(variables?.variables ?? []);
	let letterItems = $derived(letters?.letters ?? []);

	let creatingNewLetter = $state(false);
	let creatingNewBlock = $state(false);
	let creatingNewVariable = $state(false);
	let letterSubmitting = $state(false);
	let blockSubmitting = $state(false);
	let variableSubmitting = $state(false);

	function formToast(
		f: Record<string, unknown>
	): { kind: 'success' | 'error'; message: string } | null {
		if (f.success === true) {
			if (f.action === 'newLetter')
				return { kind: 'success', message: 'Letter created — opening editor…' };
			if (f.action === 'newBlock') return { kind: 'success', message: 'Block created.' };
			if (f.action === 'newVariable') return { kind: 'success', message: 'Variable created.' };
			if (f.action === 'deleteBlock' || 'deleteBlock' in f)
				return { kind: 'success', message: 'Block deleted.' };
			if (f.action === 'deleteVariable' || 'deleteVariable' in f)
				return { kind: 'success', message: 'Variable deleted.' };
			if (f.action === 'deleteLetter') return { kind: 'success', message: 'Letter deleted.' };
			if ('updateBlock' in f || 'updateVariable' in f || f.action === 'updateLetter')
				return { kind: 'success', message: 'Saved.' };
			return null;
		}
		if (typeof f.message === 'string' && f.message) return { kind: 'error', message: f.message };
		return null;
	}

	let lastForm: unknown = null;
	$effect(() => {
		if (!form || form === lastForm) return;
		lastForm = form;
		const toast = formToast(form as Record<string, unknown>);
		if (toast) pushToast(toast.kind, toast.message);
	});

	$effect(() => {
		if (form?.action === 'newLetter' && form?.success) {
			creatingNewLetter = false;
			goto(`/letters/${form?.letter.id}`);
		}
		if (form?.action === 'newBlock' && form?.success) {
			creatingNewBlock = false;
		}
		if (form?.action === 'newVariable' && form?.success) {
			creatingNewVariable = false;
		}
	});

	const greeting_choices = [
		'Welcome',
		'Missed you',
		'Hi there',
		'Howdy',
		"Didn't see you there",
		'Heyy',
		'Yo',
		'Hi Hi',
		'Hi',
		"Where've you been"
	];
	const second_greeting_choices = [
		'What will you do today?',
		'What interview will you land today?',
		'Knock that cover letter out the park!',
		'All the best today!',
		'Give it a hundred and ten percent!'
	];

	const greeting = greeting_choices[Math.floor((Math.random() * 100) % greeting_choices.length)];
	const second_greeting =
		second_greeting_choices[Math.floor((Math.random() * 100) % second_greeting_choices.length)];
</script>

<div class="container mx-auto my-24 space-y-16">
	<hgroup>
		<h2 class="text-4xl font-thin">{greeting}, <span class="">{user.name}</span></h2>
		<small class="text-lg font-light text-gray-600">{second_greeting}</small>
	</hgroup>

	<div>
		<div class="grid w-full grid-cols-1 gap-10 lg:grid-cols-3">
			<div
				class="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm lg:col-span-2"
			>
				<h3 class="text-2xl font-thin">Letters</h3>
				<div>
					{#if letterError}
						<p class="text-lg font-medium text-red-400">{letterError.error.message}</p>
					{:else}
						<LetterSearch
							letters={letterItems}
							selected={selectedLetter}
							onSelect={(letter) => {
								selectedLetter = letter;
							}}
							label="letter"
							onCreateNew={() => {
								creatingNewLetter = true;
							}}
							onDeleted={() => {
								selectedLetter = null;
							}}
						/>
					{/if}
				</div>
				<CreateToggle bind:creating={creatingNewLetter} label="Letter" />
				<div class="mt-auto">
					{#if creatingNewLetter}
						<div transition:slide>
							<form
								action="?/newLetter"
								method="post"
								class="flex flex-col gap-4 font-light"
								use:enhance={() => {
									letterSubmitting = true;
									return async ({ update }) => {
										letterSubmitting = false;
										await update();
									};
								}}
							>
								<h4 class="text-xl">Add a new letter</h4>
								<div>
									<Label for="letterName" class="text-lg font-light">Title</Label>
									<Input type="text" id="letterName" name="letterName" />
								</div>
								<div>
									<Label for="letterDescription" class="text-lg font-light">Description</Label>
									<Textarea name="letterDescription" id="letterDescription" />
								</div>
								<Input
									type="submit"
									value={letterSubmitting ? 'Creating…' : 'Create'}
									disabled={letterSubmitting}
								/>
							</form>
						</div>
					{/if}
				</div>
			</div>
			<div class="flex flex-col gap-10">
				<div
					class="flex flex-1 flex-col gap-6 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm"
				>
					<h3 class="text-2xl font-thin">Blocks</h3>
					<div>
						{#if blockError}
							<p class="text-lg font-medium text-red-400">{blockError.error.message}</p>
						{:else}
							<ItemSearch
								items={blockItems}
								selected={selectedBlock}
								onSelect={(block) => {
									selectedBlock = block;
								}}
								label="block"
								kind="block"
								usages={blockUsages}
								onCreateNew={() => {
									creatingNewBlock = true;
								}}
								onDeleted={() => {
									selectedBlock = null;
								}}
							/>
						{/if}
					</div>
					<CreateToggle bind:creating={creatingNewBlock} label="Block" />
					<div class="mt-auto space-y-6">
						{#if creatingNewBlock}
							<div transition:slide>
								<form
									action="?/newBlock"
									method="post"
									class="flex flex-col gap-4 font-light"
									use:enhance={() => {
										blockSubmitting = true;
										return async ({ update }) => {
											blockSubmitting = false;
											await update();
										};
									}}
								>
									<h4 class="text-xl">Add a new block</h4>
									<div>
										<Label for="blockName" class="text-lg font-light">block name</Label>
										<Input type="text" id="blockName" name="blockName" required />
									</div>
									<div>
										<Label for="blockValue" class="text-lg font-light">block value</Label>
										<Textarea name="blockValue" id="blockValue" required />
									</div>
									<Input
										type="submit"
										value={blockSubmitting ? 'Creating…' : 'Create'}
										disabled={blockSubmitting}
									/>
								</form>
							</div>
						{/if}
					</div>
				</div>
				<div
					class="flex flex-1 flex-col gap-6 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm"
				>
					<h3 class="text-2xl font-thin">Variables</h3>
					<div>
						{#if variableError}
							<p class="text-lg font-medium text-red-400">{variableError.error.message}</p>
						{:else}
							<ItemSearch
								items={variableItems}
								selected={selectedVariable}
								onSelect={(variable) => {
									selectedVariable = variable;
								}}
								label="variable"
								kind="variable"
								usages={variableUsages}
								onCreateNew={() => {
									creatingNewVariable = true;
								}}
								onDeleted={() => {
									selectedVariable = null;
								}}
							/>
						{/if}
					</div>
					<CreateToggle bind:creating={creatingNewVariable} label="Variable" />
					<div class="mt-auto">
						{#if creatingNewVariable}
							<div transition:slide>
								<form
									action="?/newVariable"
									method="post"
									class="flex flex-col gap-4 font-light"
									use:enhance={() => {
										variableSubmitting = true;
										return async ({ update }) => {
											variableSubmitting = false;
											await update();
										};
									}}
								>
									<h4 class="text-xl">Add a new Variable</h4>
									<div>
										<Label for="variableName" class="text-lg font-light">Name</Label>
										<Input type="text" id="variableName" name="variableName" required />
									</div>
									<div>
										<Label for="variableValue" class="text-lg font-light">Value</Label>
										<Textarea name="variableValue" id="variableValue" required />
									</div>
									<Input
										type="submit"
										value={variableSubmitting ? 'Creating…' : 'Create'}
										disabled={variableSubmitting}
									/>
								</form>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
