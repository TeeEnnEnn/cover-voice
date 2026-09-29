<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription
	} from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { authClient } from '$lib/auth-client';
	import { PASSWORD_MIN_LENGTH, validateSignup } from '$lib/validation/auth.js';

	let token = $derived(page.url.searchParams.get('token'));
	let errorParam = $derived(page.url.searchParams.get('error'));
	let password = $state('');
	let confirmation = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		const invalid = validateSignup({
			username: 'reset-user',
			email: 'reset@example.com',
			password,
			confirmation
		});
		if (invalid) {
			error = invalid.message;
			return;
		}
		if (!token) {
			error = 'This reset link is missing its token. Request a new one.';
			return;
		}
		submitting = true;
		try {
			const { error: authError } = await authClient.resetPassword({ newPassword: password, token });
			if (authError) {
				error = authError.message ?? 'Something went wrong';
				return;
			}
			await goto('/signin');
		} finally {
			submitting = false;
		}
	}
</script>

<AuthCard title="Reset password" description="Choose a new password for your account.">
	{#if errorParam}
		<p class="text-sm text-red-600" role="alert">
			This reset link is invalid or expired.
			<a href="/forgot-password" class="underline">Request a new one</a>.
		</p>
	{:else}
		<form onsubmit={handleSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel for="password">New password</FieldLabel>
					<Input
						id="password"
						name="password"
						type="password"
						minlength={PASSWORD_MIN_LENGTH}
						autocomplete="new-password"
						bind:value={password}
						required
					/>
					<FieldDescription>
						At least {PASSWORD_MIN_LENGTH} characters, with at least one letter and one number.
					</FieldDescription>
					<FieldLabel for="confirmation">Confirm new password</FieldLabel>
					<Input
						id="confirmation"
						name="confirmation"
						type="password"
						minlength={PASSWORD_MIN_LENGTH}
						autocomplete="new-password"
						bind:value={confirmation}
						required
					/>
				</Field>
				{#if error}
					<p class="text-sm text-red-600" role="alert">{error}</p>
				{/if}
				<Field>
					<Button type="submit" class="w-full" disabled={submitting}>
						{submitting ? 'Saving…' : 'Set new password'}
					</Button>
				</Field>
			</FieldGroup>
		</form>
	{/if}
</AuthCard>
