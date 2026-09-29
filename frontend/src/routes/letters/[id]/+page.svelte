<script lang="ts">
	import { slide } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	let { data, form } = $props();

	let settingNewVariable = $state(false);
	let settingNewBlock = $state(false);

	let rawSections = $derived(
		data.letter.rawContent?.sections ?? {
			header: { text: '', align: 'left' },
			body: { text: '', align: 'left' },
			footer: { text: '', align: 'left' }
		}
	);
	let generatedSections = $derived(data.letter.generatedContent?.sections ?? null);

	const sectionMeta = [
		{ key: 'header', title: 'Header', prompt: 'How will you start your cover letter off?' },
		{ key: 'body', title: 'Body', prompt: 'What will the main content of your cover letter be?' },
		{ key: 'footer', title: 'Footer', prompt: 'How will you end your cover letter?' }
	] as const;
	const aligns = ['left', 'center', 'right', 'justify'] as const;
</script>

<div class="container mx-auto my-8 flex flex-col gap-4 px-4 lg:flex-row">
	<div id="edit-window" class="flex w-full flex-col gap-4 lg:w-1/2">
		<div>
			<h2 class="text-2xl font-thin">{data.letter.title}</h2>
			{#if data.letter.description}
				<p class="text-sm text-muted-foreground">{data.letter.description}</p>
			{/if}
		</div>

		{#if form && !form.success && form.message}
			<p class="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-600" role="alert">
				{form.message}
			</p>
		{/if}
		{#if form?.success && form.message}
			<p
				class="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-green-700"
				role="status"
			>
				{form.message}
			</p>
		{/if}

		<form method="post" class="flex flex-col gap-4" use:enhance>
			{#each sectionMeta as section (section.key)}
				{@const current = rawSections[section.key]}
				<div id="section-{section.key}" class="rounded-lg border border-gray-200 px-3 py-3">
					<p class="font-medium">{section.prompt}</p>
					<div class="mt-2 flex flex-col gap-2">
						<Label for="{section.key}Text">{section.title} text</Label>
						<Textarea
							id="{section.key}Text"
							name="{section.key}Text"
							value={current.text ?? ''}
							placeholder={'Use {%block%} and {{variable}} references'}
							rows={4}
						/>
						<Label for="{section.key}Align">{section.title} alignment</Label>
						<select
							id="{section.key}Align"
							name="{section.key}Align"
							value={current.align ?? 'left'}
							class="rounded-md border border-gray-300 px-2 py-1"
						>
							{#each aligns as align (align)}
								<option value={align}>{align}</option>
							{/each}
						</select>
					</div>
				</div>
			{/each}
			<div class="flex gap-2">
				<Button class="flex-1" variant="outline" type="submit" formaction="?/saveSections">
					Save sections
				</Button>
				<Button class="flex-1" type="submit" formaction="?/generate">Generate letter</Button>
			</div>
		</form>

		<div id="variables" class="rounded-lg bg-gray-300 px-3 py-3">
			<h3 class="text-lg font-semibold">Variables</h3>
			{#if data.variableError}
				<p class="text-sm text-red-600">{data.variableError}</p>
			{:else}
				<ul class="mb-2 flex flex-col gap-1">
					{#each data.variables as variable (variable.id)}
						<li class="text-sm">
							<code>{`{{${variable.name}}}`}</code>
							<span class="text-muted-foreground">= {variable.value}</span>
						</li>
					{:else}
						<li class="text-sm text-muted-foreground">No variables yet.</li>
					{/each}
				</ul>
			{/if}
			<Button
				variant={settingNewVariable ? 'destructive' : 'outline'}
				onclick={() => {
					settingNewVariable = !settingNewVariable;
				}}
			>
				{settingNewVariable ? 'Cancel' : 'New Variable'}
			</Button>
			{#if settingNewVariable}
				<form
					method="POST"
					action="?/newVariable"
					transition:slide
					class="mt-2 flex flex-col gap-4"
					use:enhance
				>
					<div>
						<Label for="variableName">Variable Name</Label>
						<Input id="variableName" name="variableName" type="text" placeholder="name" required />
					</div>
					<div>
						<Label for="variableValue">Variable Value</Label>
						<Input
							id="variableValue"
							name="variableValue"
							type="text"
							placeholder="value"
							required
						/>
					</div>
					<Input type="submit" value="Add" />
				</form>
			{/if}
		</div>

		<div id="blocks" class="rounded-lg bg-gray-300 px-3 py-3">
			<h3 class="text-lg font-semibold">Blocks</h3>
			{#if data.blockError}
				<p class="text-sm text-red-600">{data.blockError}</p>
			{:else}
				<ul class="mb-2 flex flex-col gap-1">
					{#each data.blocks as block (block.id)}
						<li class="text-sm">
							<code>{`{%${block.name}%}`}</code>
							<span class="text-muted-foreground">= {block.value}</span>
						</li>
					{:else}
						<li class="text-sm text-muted-foreground">No blocks yet.</li>
					{/each}
				</ul>
			{/if}
			<Button
				variant={settingNewBlock ? 'destructive' : 'outline'}
				onclick={() => {
					settingNewBlock = !settingNewBlock;
				}}
			>
				{settingNewBlock ? 'Cancel' : 'New Block'}
			</Button>
			{#if settingNewBlock}
				<form
					method="POST"
					action="?/newBlock"
					transition:slide
					class="mt-2 flex flex-col gap-4"
					use:enhance
				>
					<div>
						<Label for="blockName">Block Name</Label>
						<Input id="blockName" name="blockName" type="text" placeholder="name" required />
					</div>
					<div>
						<Label for="blockValue">Block Value</Label>
						<Input id="blockValue" name="blockValue" type="text" placeholder="value" required />
					</div>
					<Input type="submit" value="Add" />
				</form>
			{/if}
		</div>
	</div>

	<div id="preview" class="w-full rounded-lg bg-gray-200 p-4 lg:w-1/2">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-lg font-semibold">Preview</h3>
			{#if generatedSections}
				<Button href={`/api/letters/${data.letter.id}/export`} variant="outline"
					>Download PDF</Button
				>
			{/if}
		</div>
		{#if generatedSections}
			{#each sectionMeta as section (section.key)}
				{@const text = generatedSections[section.key].text}
				{#if text}
					<div
						class="mb-4 rounded bg-white p-3"
						style="text-align: {generatedSections[section.key].align}"
					>
						<p class="text-xs text-muted-foreground">{section.title}</p>
						<p class="whitespace-pre-wrap">{text}</p>
					</div>
				{/if}
			{/each}
		{:else}
			<p class="text-sm text-muted-foreground">
				Nothing generated yet. Write your sections, then press Generate letter.
			</p>
		{/if}
	</div>
</div>
