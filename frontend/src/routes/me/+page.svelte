<script>
	import { Button } from '@/components/ui/button/index.js';
	import { Input } from '@/components/ui/input/index.js';
	import { Textarea } from '@/components/ui/textarea/index.js';
	import { Label } from '@/components/ui/label/index.js';
	import { slide } from 'svelte/transition';

	let { data } = $props();
	let user = $derived(data.user);
	let blocks = $derived(data.blocks);
	let variables = $derived(data.variables);
	let blockError = $derived(data.blockError);
	let variableError = $derived(data.variableError);

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
				<div></div>
				<div class="mt-auto">
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
					{#if creatingNewLetter}
						<div transition:slide>
							<form action="?/new-letter" method="post">
								<Label for="letter-name">Name</Label>
								<Input type="text" id="letter-name" name="letter-name" />
								<Label for="letter-description">Description</Label>
								<Textarea name="letter-description" />
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
						<p class="text-lg font-medium text-red-400">{blockError}</p>
					{:else}
						{#each blocks?.blocks as block}
							{block}
						{/each}
					{/if}
				</div>
				<div class="mt-auto space-y-6">
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

					{#if creatingNewBlock}
						<div transition:slide>
							<form action="?/new-block" method="post" class="flex flex-col gap-4 font-light">
								<h4 class="text-xl">Add a new block</h4>
								<div>
									<Label for="block-name" class="text-lg font-light">block name</Label>
									<Input type="text" id="block-name" name="block-name" />
								</div>
								<div>
									<Label for="block-value" class="text-lg font-light">block value</Label>
									<Textarea name="block-value" />
								</div>
								<div>
				                    <Label class="text-lg font-light">Rendered Preview</Label>
<Textarea disabled value=""/>
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
						<p class="text-lg font-medium text-red-400">{variableError}</p>
					{:else}
						{#each variables?.variables as variable}
							{variable}
						{/each}
					{/if}
				</div>
				<div class="mt-auto">
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

					{#if creatingNewVariable}
						<div transition:slide>
							<form action="?/new-variable" method="post">
								<Label for="variable-name">Name</Label>
								<Input type="text" id="variable-name" name="variable-name" />
								<Label for="variable-value">Value</Label>
								<Textarea name="variable-value" />
								<Input type="submit" value="Create" />
							</form>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
