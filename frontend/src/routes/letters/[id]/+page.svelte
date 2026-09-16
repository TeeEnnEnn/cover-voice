<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	let { form } = $props();
	let settingNewVariable = $state(false);
	let settingNewBlock = $state(false);
	let editingRaw = $state(false);
</script>

<div class="m-4 flex gap-2 overflow-hidden">
	<div id="edit-window" class="flex h-screen w-1/2 flex-col gap-2 bg-gray-100">
		<div id="variables" class="rounded-lg bg-gray-300 px-3 py-3">
			<h3 class="text-lg font-semibold">Variables</h3>

			<Button
				variant={settingNewVariable ? 'destructive' : 'outline'}
				onclick={() => {
					settingNewVariable = !settingNewVariable;
				}}
			>
				{#if settingNewVariable}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
					>
					<span>Cancel</span>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-plus"><path d="M5 12h14" /><path d="M12 5v14" /></svg
					>
					<span> New Variable </span>
				{/if}
			</Button>

			{#if settingNewVariable}
				<form method="POST" action="?/newVariable" transition:slide class="flex flex-col gap-4">
					<div>
						<Label for="variableName">Variable Name</Label>
						<Input id="variableName" name="variableName" type="text" placeholder="name" />
					</div>
					<div>
						<Label for="variableValue">Variable Value</Label>
						<Input id="variableValue" name="variableValue" type="text" placeholder="value" />
					</div>
					{#if form?.action === 'newVariable' && form?.message}
						<p class="text-sm text-red-600">{form.message}</p>
					{/if}
					<Input
						type="submit"
						value="Add"
						onclick={() => {
							settingNewVariable = false;
						}}
					/>
				</form>
			{/if}
		</div>
		<div id="blocks" class="rounded-lg bg-gray-300 px-3 py-3">
			<h3 class="text-lg font-semibold">Blocks</h3>

			<Button
				variant={settingNewBlock ? 'destructive' : 'outline'}
				onclick={() => {
					settingNewBlock = !settingNewBlock;
				}}
			>
				{#if settingNewBlock}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
					>
					<span>Cancel</span>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-plus"><path d="M5 12h14" /><path d="M12 5v14" /></svg
					>
					<span> New Block </span>
				{/if}
			</Button>

			{#if settingNewBlock}
				<form method="POST" action="?/newBlock" transition:slide class="flex flex-col gap-4">
					<div>
						<Label for="blockName">Block Name</Label>
						<Input id="blockName" name="blockName" type="text" placeholder="name" />
					</div>
					<div>
						<Label for="blockValue">Block Value</Label>
						<Input id="blockValue" name="blockValue" type="text" placeholder="value" />
					</div>
					{#if form?.action === 'newBlock' && form?.message}
						<p class="text-sm text-red-600">{form.message}</p>
					{/if}
					<Input
						type="submit"
						value="Add"
						onclick={() => {
							settingNewBlock = false;
						}}
					/>
				</form>
			{/if}
		</div>
		<div id="sections" class="rounded-lg bg-gray-300 px-3 py-3">
			<div class="" id="header">
				<p>How will you start your cover letter off?</p>
				<label for="position-select">Header Content Position</label>
				<select name="position-select" id="position-select">
					<option value="left">Left</option>
					<option value="center">Center</option>
					<option value="right" selected>Right</option>
					<option value="full">Full</option>
				</select>
			</div>
			<div class="" id="body">
				<p>What will the main content of yuour cover letter be?</p>
				<label for="position-select">Body Content Position</label>
				<select name="position-select" id="position-select">
					<option value="left">Left</option>
					<option value="center">Center</option>
					<option value="right">Right</option>
					<option value="full" selected>Full</option>
				</select>
			</div>
			<div class="" id="footer">
				<p>How will you end your cover letter?</p>
				<label for="position-select">Footer Content Position</label>
				<select name="position-select" id="position-select">
					<option value="left" selected>Left</option>
					<option value="center">Center</option>
					<option value="right">Right</option>
					<option value="full">Full</option>
				</select>
			</div>
		</div>
	</div>
	<div id="preview" class="h-screen w-1/2 rounded-lg bg-gray-200 p-1">
		{#if editingRaw}
			<form action="">
			<div>
                <Label>Header Section</Label>
				<Textarea />
			</div>

			<div>
			<Label>Body Section</Label>
			<Textarea/>
			</div>
			<div >
   <Label>Footer Section</Label>
   <Textarea/>
			</div>
			<Input type="submit" value="Save"/>
			</form>
		{:else}
			<p>client side rendered preview</p>
		{/if}
	</div>
</div>
