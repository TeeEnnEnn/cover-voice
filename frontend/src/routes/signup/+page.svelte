<script lang="ts">
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
	import {
		PASSWORD_MIN_LENGTH,
		USERNAME_MIN_LENGTH,
		validateSignup
	} from '$lib/validation/auth.js';

	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmation = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);
	let signedUp = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;

		const invalid = validateSignup({
			username: username.trim(),
			email: email.trim(),
			password,
			confirmation
		});
		if (invalid) {
			error = invalid.message;
			return;
		}

		submitting = true;
		try {
			const { error: authError } = await authClient.signUp.email({
				name: username.trim(),
				email: email.trim(),
				password,
				callbackURL: '/verify'
			});
			if (authError) {
				error = authError.message ?? 'Failed to sign up. Please try again.';
				return;
			}
			signedUp = true;
		} finally {
			submitting = false;
		}
	}
</script>

<AuthCard
	title="Sign Up"
	description="Enter your email, password and username to get started with Cover voice."
>
	{#if signedUp}
		<p class="text-sm text-green-700" role="status">
			Account created for {email.trim()}. Check your inbox for the verification link, then
			<a href="/signin" class="underline">sign in</a>.
		</p>
	{:else}
		<form onsubmit={handleSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel for="username">Name</FieldLabel>
					<Input
						id="username"
						name="username"
						type="text"
						minlength={USERNAME_MIN_LENGTH}
						autocomplete="username"
						bind:value={username}
						required
					/>
				</Field>
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
						minlength={PASSWORD_MIN_LENGTH}
						autocomplete="new-password"
						bind:value={password}
						required
					/>
					<FieldDescription>
						At least {PASSWORD_MIN_LENGTH} characters, with at least one letter and one number.
					</FieldDescription>
					<div class="flex items-center">
						<FieldLabel for="confirmation">Password Confirmation</FieldLabel>
					</div>
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
						{submitting ? 'Signing up…' : 'Sign Up'}
					</Button>
				</Field>
			</FieldGroup>
		</form>
		<p class="mt-4 text-sm text-muted-foreground">
			Have an account? <a href="/signin" class="underline">Sign in</a>.
		</p>
	{/if}
</AuthCard>
