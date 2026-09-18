<script>
	import { Button } from '@/components/ui/button/index.js';
	import { Input } from '@/components/ui/input/index.js';
	import { Textarea } from '@/components/ui/textarea/index.js';
	import { Label } from '@/components/ui/label/index.js';
	import { slide } from 'svelte/transition';
	import VariableTeaser from '@/components/VariableTeaser.svelte';
	import BlockTeaser from '@/components/BlockTeaser.svelte';

	let { data } = $props();
	let user = $derived(data.user);
	let blocks = $derived(data.blocks);
	let variables = $derived(data.variables);
	let blockError = $derived(data.blockError);
	let variableError = $derived(data.variableError);

	$effect(() => {
		console.log({ blocks });
		console.log({ variables });
	});

	let creatingNewLetter = $state(false);
	let creatingNewBlock = $state(false);
	let creatingNewVariable = $state(false);

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
	const greeting = greeting_choices[Math.floor((Math.random() * 100) % greeting_choices.length)];
</script>

<div class="container mx-auto my-24 space-y-16">
	<hgroup>
		<h2 class="text-4xl font-thin">{greeting}, <span class="">{user.name}</span></h2>
		<small class="text-lg font-light text-gray-600">What will you do today?</small>
	</hgroup>

	<div>
		<div class="flex w-full gap-12">
			<div class="flex flex-1 flex-col gap-6 rounded-lg border border-gray-200 px-4 py-4">
				<h3 class="text-xl font-light">Letters</h3>
				<div>
					{#if creatingNewLetter}
						<Button
							variant="destructive"
							onclick={() => {
								creatingNewLetter = false;
							}}>Cancel</Button
						>
					{:else}
						<Button
							variant="outline"
							onclick={() => {
								creatingNewLetter = true;
							}}>New Letter</Button
						>
					{/if}
				</div>
				<div class="mt-auto">
					{#if creatingNewLetter}
						<div transition:slide>
							<form action="?/newLetter" method="post" class="flex flex-col gap-4 font-light">
								<h4 class="text-xl">Add a new letter</h4>
								<div>
									<Label for="letterName" class="text-lg font-light">Name</Label>
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
			<div class="flex flex-1 flex-col gap-6 rounded-lg border border-gray-200 px-4 py-4">
				<h3 class="text-2xl font-light">Blocks</h3>
				<div>
					{#if blockError}
						<p class="text-lg font-medium text-red-400">{blockError.message}</p>
					{:else}
						<div class="flex flex-col gap-2">
							{#each blocks?.blocks as block}
								<BlockTeaser {...block} />
							{/each}
						</div>
					{/if}
				</div>
				<div>
					{#if creatingNewBlock}
						<Button
							variant="destructive"
							onclick={() => {
								creatingNewBlock = false;
							}}>Cancel</Button
						>
					{:else}
						<Button
							variant="outline"
							onclick={() => {
								creatingNewBlock = true;
							}}>New Block</Button
						>
					{/if}
				</div>
				<div class="mt-auto space-y-6">
					{#if creatingNewBlock}
						<div transition:slide>
							<form action="?/newBlock" method="post" class="flex flex-col gap-4 font-light">
								<h4 class="text-xl">Add a new block</h4>
								<div>
									<Label for="blockName" class="text-lg font-light">block name</Label>
									<Input type="text" id="blockName" name="blockName" required />
								</div>
								<div>
									<Label for="blockValue" class="text-lg font-light">block value</Label>
									<Textarea name="blockValue" id="blockValue" required />
								</div>
								<div>
									<Label class="text-lg font-light">Rendered Preview</Label>
									<Textarea disabled value="" />
								</div>
								<Input type="submit" value="Create" />
							</form>
						</div>
					{/if}
				</div>
			</div>
			<div class="flex flex-1 flex-col gap-6 rounded-lg border border-gray-200 px-4 py-4">
				<h3 class="text-xl font-light">Variables</h3>
				<div>
					{#if variableError}
						<p class="text-lg font-medium text-red-400">{variableError.message}</p>
					{:else}
						<div class="flex flex-col gap-2">
							{#each variables?.variables as variable}
								<VariableTeaser {...variable} />
							{/each}
						</div>
					{/if}
				</div>
				<div>
					{#if creatingNewVariable}
						<Button
							variant="destructive"
							onclick={() => {
								creatingNewVariable = false;
							}}>Cancel</Button
						>
					{:else}
						<Button
							variant="outline"
							onclick={() => {
								creatingNewVariable = true;
							}}>New Variable</Button
						>
					{/if}
				</div>
				<div class="mt-auto">
					{#if creatingNewVariable}
						<div transition:slide>
							<form action="?/newVariable" method="post" class="flex flex-col gap-4 font-light">
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
				</div>
			</div>
		</div>
	</div>
</div>
