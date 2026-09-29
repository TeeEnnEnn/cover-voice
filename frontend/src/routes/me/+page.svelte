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
	{#if form && !form.success && form.message}
		<p class="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-600" role="alert">
			{form.message}
		</p>
	{/if}

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
								use:enhance
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
								<Input type="submit" value="Create" />
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
									use:enhance
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
									<Input type="submit" value="Create" />
								</form>
							</div>
						{/if}
						{#if form?.action === 'newBlock' && form?.success}
							<p class="text-sm text-green-700" role="status">Block created.</p>
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
									use:enhance
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
									<Input type="submit" value="Create" />
								</form>
							</div>
						{/if}
						{#if form?.action === 'newVariable' && form?.success}
							<p class="text-sm text-green-700" role="status">Variable created.</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
