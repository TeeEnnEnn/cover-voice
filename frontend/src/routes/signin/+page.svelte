<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { FieldGroup, Field, FieldLabel } from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { authClient } from '$lib/auth-client';

	let email = $state('');
	let password = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		submitting = true;
		try {
			const { error: authError } = await authClient.signIn.email({
				email: email.trim(),
				password
			});
			if (authError) {
				error = authError.message ?? 'Something went wrong';
				return;
			}
			await invalidateAll();
			await goto('/me');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Sign in</title></svelte:head>
<div class="flex min-h-screen flex-col">
	<Card.Root class="mx-auto my-36 w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Sign In</Card.Title>
			<Card.Description>Enter your email and password to sign in to Cover voice.</Card.Description>
		</Card.Header>
		<Card.Content>
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
		</Card.Content>
	</Card.Root>
</div>
