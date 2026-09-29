<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>Something went wrong · Cover Voice</title></svelte:head>

<div class="container mx-auto my-24 max-w-lg space-y-4 px-4 text-center">
	<h1 class="text-3xl font-semibold">{page.status}: {page.error?.message ?? 'Unknown error'}</h1>
	<p class="text-muted-foreground">
		{#if page.status === 404}
			That page does not exist.
		{:else if page.status === 503}
			The backend is unreachable. Check back in a moment.
		{:else}
			Something went wrong on our side. Try again, or head back home.
		{/if}
	</p>
	<div class="flex justify-center gap-4">
		<a href="/" class="underline">Home</a>
		<a href="/me" class="underline">Account</a>
	</div>
</div>
