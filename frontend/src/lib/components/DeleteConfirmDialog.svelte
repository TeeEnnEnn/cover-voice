<script lang="ts">
	import Button from './ui/button/button.svelte';

	let {
		open,
		heading,
		lines = [],
		deleteAction,
		idField,
		idValue,
		onCancel
	}: {
		open: boolean;
		heading: string;
		lines: string[];
		deleteAction: string;
		idField: string;
		idValue: string;
		onCancel: () => void;
	} = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="presentation"
		onclick={onCancel}
		onkeydown={(event) => {
			if (event.key === 'Escape') onCancel();
		}}
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-6"
			role="alertdialog"
			tabindex="-1"
			aria-modal="true"
			aria-label={heading}
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<h4 class="text-lg font-semibold">{heading}</h4>
			<ul class="mt-3 flex max-h-48 flex-col gap-1 overflow-y-auto text-sm text-gray-700">
				{#each lines as line (line)}
					<li>{line}</li>
				{/each}
			</ul>
			<div class="mt-5 flex gap-2">
				<Button class="flex-1" variant="outline" type="button" onclick={onCancel}>Cancel</Button>
				<form method="post" action={deleteAction} class="flex-1">
					<input type="hidden" name={idField} value={idValue} />
					<input type="hidden" name="force" value="true" />
					<Button class="w-full" variant="destructive" type="submit">Delete anyway</Button>
				</form>
			</div>
		</div>
	</div>
{/if}
