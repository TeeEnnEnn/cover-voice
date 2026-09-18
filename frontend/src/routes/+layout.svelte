<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { authClient } from '@/auth-client';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<header class="border-b border-cover-voice-main">
	<nav class="container mx-auto flex items-center justify-between gap-6 px-4 py-4">
		<div>
			<a href="/" class="font-light">Cover Voice</a>
		</div>
		<ul class="flex gap-6">
			{#if data.user}
				<li>
					<a href="/me" class="text-sm text-gray-600 hover:text-black font-light">Account</a>
				</li>
				<li>
					<button class="text-sm text-gray-600 hover:text-black font-light" onclick={async () => {await authClient.signOut(); location.reload()}}>Sign out</button>
				</li>
			{:else}
				<li>
					<a href="/signin" class="text-sm text-gray-600 hover:text-black font-light">Sign In</a>
				</li>
				<li>
					<a href="/signup" class="text-sm text-gray-600 hover:text-black font-light">Sign up</a>
				</li>
			{/if}
		</ul>
	</nav>
</header>

<main class="">
	{@render children()}
</main>

<footer class="border-t border-gray-600 py-4">
	<p class="text-center">
		Made by <a
			class="underline"
			href="https://github.com/TeeEnnEnn"
			target="_blank"
			rel="noopener noreferrer">TeeEnnEnn</a
		>
	</p>
</footer>
