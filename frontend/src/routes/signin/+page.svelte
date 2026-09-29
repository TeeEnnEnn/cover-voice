<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { FieldGroup, Field, FieldLabel } from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { authClient } from '$lib/auth-client';

	let email = $state('');
	let password = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let needsVerification = $state(false);
	let resending = $state(false);
	let resent = $state(false);

	function isUnverifiedError(authError: { code?: string; message?: string | null }): boolean {
		return (
			authError.code === 'EMAIL_NOT_VERIFIED' ||
			(authError.message ?? '').toLowerCase().includes('not verified')
		);
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		needsVerification = false;
		resent = false;
		submitting = true;
		try {
			const { error: authError } = await authClient.signIn.email({
				email: email.trim(),
				password
			});
			if (authError) {
				if (isUnverifiedError(authError)) {
					needsVerification = true;
					error = 'Email not verified. Check your inbox for the verification link.';
				} else {
					error = authError.message ?? 'Something went wrong';
				}
				return;
			}
			await invalidateAll();
			await goto('/me');
		} finally {
			submitting = false;
		}
	}

	async function resendVerification() {
		resending = true;
		error = null;
		try {
			const { error: authError } = await authClient.sendVerificationEmail({
				email: email.trim(),
				callbackURL: '/verify'
			});
			if (authError) {
				error = authError.message ?? 'Failed to resend. Try again.';
				return;
			}
			resent = true;
		} finally {
			resending = false;
		}
	}
</script>

<AuthCard title="Sign In" description="Enter your email and password to sign in to Cover voice.">
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
			<Field>
				<div class="flex items-center">
					<FieldLabel for="password">Password</FieldLabel>
				</div>
				<Input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					bind:value={password}
					required
				/>
			</Field>
			{#if error}
				<p class="text-sm text-red-600" role="alert">{error}</p>
			{/if}
			{#if needsVerification}
				<Button
					type="button"
					variant="outline"
					class="w-full"
					disabled={resending}
					onclick={resendVerification}
				>
					{resending ? 'Sending…' : 'Resend verification email'}
				</Button>
			{/if}
			{#if resent}
				<p class="text-sm text-green-600" role="status">Verification email sent.</p>
			{/if}
			<Field>
				<Button type="submit" class="w-full" disabled={submitting}>
					{submitting ? 'Signing in…' : 'Sign In'}
				</Button>
			</Field>
		</FieldGroup>
	</form>
	<p class="mt-4 text-sm text-gray-600">
		No account? <a href="/signup" class="underline">Sign up</a>.
	</p>
	<p class="mt-2 text-sm text-gray-600">
		Forgot your password? <a href="/forgot-password" class="underline">Reset it</a>.
	</p>
</AuthCard>
