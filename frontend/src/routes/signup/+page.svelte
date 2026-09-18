<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card/index.js';
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
				password
			});
			if (authError) {
				error = authError.message ?? 'Failed to sign up. Please try again.';
				return;
			}
			await goto('/me');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Sign up</title></svelte:head>
<div class="flex min-h-screen flex-col">
	<Card.Root class="mx-auto my-36 w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Sign Up</Card.Title>
			<Card.Description
				>Enter your email, password and username to get started with Cover voice.</Card.Description
			>
		</Card.Header>
		<Card.Content>
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
			<p class="mt-4 text-sm text-gray-600">
				Have an account? <a href="/signin" class="underline">Sign in</a>.
			</p>
		</Card.Content>
	</Card.Root>
</div>
