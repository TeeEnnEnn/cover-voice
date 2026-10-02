<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { page } from '$app/state';
	import AuthCard from '$lib/components/AuthCard.svelte';

	let errorParam = $derived(page.url.searchParams.get('error'));
</script>

<Seo
	title="Verify email — Cover Voice"
	description="Verify your email address to activate your Cover Voice account."
	noindex
/>
<AuthCard title="Email verification">
	{#if errorParam}
		<p class="text-sm text-red-600" role="alert">
			This verification link is invalid or expired. Request a new one from the
			<a href="/signin" class="underline">sign in</a> page.
		</p>
	{:else}
		<p class="text-sm text-green-700" role="status">
			Your email is verified. <a href="/me" class="underline">Continue to your account</a>.
		</p>
	{/if}
</AuthCard>
