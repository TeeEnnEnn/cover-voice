<script lang="ts">
	import { toasts, dismissToast } from '$lib/stores/toast.svelte';
</script>

<div
	class="pointer-events-none fixed right-4 bottom-4 z-60 flex w-80 flex-col gap-2"
	aria-live="polite"
>
	{#each toasts as toast (toast.id)}
		<div
			role={toast.kind === 'error' ? 'alert' : 'status'}
			class="pointer-events-auto flex items-start justify-between gap-3 border px-4 py-2 shadow-lg {toast.kind ===
			'error'
				? 'border-red-300 bg-red-50 text-red-700'
				: 'border-green-300 bg-green-50 text-green-700'}"
		>
			<p class="text-sm">{toast.message}</p>
			<button
				type="button"
				aria-label="Dismiss notification"
				class="shrink-0 underline"
				onclick={() => dismissToast(toast.id)}>×</button
			>
		</div>
	{/each}
</div>
