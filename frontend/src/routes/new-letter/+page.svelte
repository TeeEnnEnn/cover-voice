<script lang="ts">
	import { slide } from 'svelte/transition';
    let settingNewVariable = $state(false);
    let editingRaw = $state(false);
</script>

<h1 class="text-2xl font-bold text-gray-900">Cover Voice</h1>
<p class="mt-2 text-gray-600">Cover letters written in your voice.</p>

<div class="mx-4 flex gap-2 border-2 border-gray-400">
	<div id="edit-window" class="flex h-screen w-1/2 flex-col gap-2 bg-gray-100">
		<div id="variables" class="rounded-lg bg-gray-300 px-3 py-3">
			<h3>Variables</h3>

			<button
				class="flex rounded-full border px-3 py-1"
				onclick={() => {
					settingNewVariable = !settingNewVariable;
				}}
			>
			{#if settingNewVariable}
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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
			</button>

			{#if settingNewVariable}
				<form action="" transition:slide>
					<label for="variable-name">Variable Name</label>
					<input type="text" id="variable-name" />
					<label for="variable-value">Variable Value</label>
					<input type="text" id="variable-value" />
					<input
					class="rounded-full border px-3 py-1"
						type="submit"
						onclick={() => {
							settingNewVariable = false;
						}}
						value="Add"
					/>
				</form>
			{/if}
		</div>
		<div id="blocks" class="rounded-lg bg-gray-300 px-3 py-3">
			<h3>Blocks</h3>

			<button class="flex rounded-full border px-3 py-1">
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
			</button>
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
	<div id="preview" class="h-screen w-1/2 bg-gray-200">
	    {#if editingRaw}
					<p>Help: </p>
					<p>&#123;&#123; block_name &#125;&#125; - to insert a block </p>
					<p>$&#123; variable_name &#125; - to insert a variable</p>
					{:else}
					<p>client side rendered preview</p>
					{/if}
	</div>
</div>
