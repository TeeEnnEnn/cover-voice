<script lang="ts">
	import './layout.css';
	import type { LayoutProps } from './$types';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Toaster from '$lib/components/Toaster.svelte';

	let { data, children }: LayoutProps = $props();

	let swNeedRefresh = $state(false);
	let updateSW: (() => Promise<void>) | null = $state(null);

	onMount(async () => {
		if (!browser || !('serviceWorker' in navigator)) return;
		const { useRegisterSW } = await import('virtual:pwa-register/svelte');
		const registration = useRegisterSW({ immediate: true });
		updateSW = registration.updateServiceWorker;
		// `needRefresh` is a Svelte store in the virtual module.
		registration.needRefresh.subscribe((value: boolean) => {
			swNeedRefresh = value;
		});
	});
</script>

<svelte:head><link rel="icon" href="/Cover-Voice_192x192.svg" type="image/svg+xml" /></svelte:head>

<header class="border-b border-cover-voice-main">
	<nav class="container mx-auto flex items-center justify-between gap-6 px-4 py-4">
		<div>
			<a href="/" class="flex items-center gap-2 font-semibold">
				<img
					src="/Cover-Voice_192x192.svg"
					alt=""
					width="32"
					height="32"
					class="h-8 w-8 rounded-md"
				/>
				Cover Voice
			</a>
		</div>
		<ul class="flex items-center gap-6">
			{#if data.user}
				<li>
					<a
						href="/me"
						aria-label="Account"
						title="Account"
						class="flex h-9 w-9 items-center justify-center rounded-full bg-cover-voice-main text-sm font-semibold text-white hover:bg-cover-voice-main/90"
					>
						{(data.user.name.trim().charAt(0) || '?').toUpperCase()}
					</a>
				</li>
			{:else}
				<li>
					<a href="/signin" class="text-sm font-medium text-muted-foreground hover:text-foreground"
						>Sign In</a
					>
				</li>
				<li>
					<a href="/signup" class="text-sm font-medium text-muted-foreground hover:text-foreground"
						>Sign up</a
					>
				</li>
			{/if}
		</ul>
	</nav>
	{#if data.backendDown}
		<p class="bg-amber-100 px-4 py-1 text-center text-sm text-amber-800" role="alert">
			Backend unreachable — showing a signed-out view. Your session may still be valid.
		</p>
	{/if}
	{#if swNeedRefresh}
		<p class="bg-sky-100 px-4 py-1 text-center text-sm text-sky-800" role="status">
			A new version is available.
			<button
				class="underline"
				onclick={() => {
					updateSW?.();
				}}>Reload to update</button
			>
		</p>
	{/if}
</header>

<main class="">
	{@render children()}
	<Toaster />
</main>

<footer class="border-t border-border py-4">
	<p class="text-center">
		Made by <a
			class="underline"
			href="https://github.com/TeeEnnEnn"
			target="_blank"
			rel="noopener noreferrer">TeeEnnEnn</a
		>
	</p>
</footer>
