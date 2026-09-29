<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from './ui/button/button.svelte';

	let {
		open,
		heading,
		lines = [],
		deleteAction,
		idField,
		idValue,
		onCancel,
		onDeleted
	}: {
		open: boolean;
		heading: string;
		lines: string[];
		deleteAction: string;
		idField: string;
		idValue: string;
		onCancel: () => void;
		onDeleted?: () => void;
	} = $props();

	let deleting = $state(false);
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
			class="w-full max-w-md rounded-lg bg-card p-6"
			role="alertdialog"
			tabindex="-1"
			aria-modal="true"
			aria-label={heading}
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<h4 class="text-lg font-semibold">{heading}</h4>
			<ul class="mt-3 flex max-h-48 flex-col gap-1 overflow-y-auto text-sm text-muted-foreground">
				{#each lines as line (line)}
					<li>{line}</li>
				{/each}
			</ul>
			<div class="mt-5 flex gap-2">
				<Button
					class="flex-1"
					variant="outline"
					type="button"
					disabled={deleting}
					onclick={onCancel}>Cancel</Button
				>
				<form
					method="post"
					action={deleteAction}
					class="flex-1"
					use:enhance={() => {
						deleting = true;
						return async ({ result, update }) => {
							await update();
							deleting = false;
							if (result.type === 'success') {
								onCancel();
								onDeleted?.();
							}
						};
					}}
				>
					<input type="hidden" name={idField} value={idValue} />
					<input type="hidden" name="force" value="true" />
					<Button class="w-full" variant="destructive" type="submit" disabled={deleting}>
						{deleting ? 'Deleting…' : 'Delete anyway'}
					</Button>
				</form>
			</div>
		</div>
	</div>
{/if}
