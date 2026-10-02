<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { FieldGroup, Field, FieldLabel } from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { authClient } from '$lib/auth-client';

	let email = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let sent = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		submitting = true;
		try {
			const { error: authError } = await authClient.requestPasswordReset({
				email: email.trim(),
				redirectTo: `${window.location.origin}/reset-password`
			});
			if (authError) {
				error = authError.message ?? 'Something went wrong';
				return;
			}
			sent = true;
		} finally {
			submitting = false;
		}
	}
</script>

<Seo
	title="Forgot password — Cover Voice"
	description="Request a password reset link for your Cover Voice account."
	noindex
/>
<AuthCard
	title="Forgot password"
	description="Enter your email and we will send you a reset link if an account exists."
>
	{#if sent}
		<p class="text-sm text-green-700" role="status">
			If an account exists for {email.trim()}, a reset link is on its way.
		</p>
	{:else}
		<form onsubmit={handleSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel for="email">Email</FieldLabel>
					<Input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						bind:value={email}
						required
					/>
				</Field>
				{#if error}
					<p class="text-sm text-red-600" role="alert">{error}</p>
				{/if}
				<Field>
					<Button type="submit" class="w-full" disabled={submitting}>
						{submitting ? 'Sending…' : 'Send reset link'}
					</Button>
				</Field>
			</FieldGroup>
		</form>
	{/if}
	<p class="mt-4 text-sm text-muted-foreground">
		Remembered it? <a href="/signin" class="underline">Sign in</a>.
	</p>
</AuthCard>
