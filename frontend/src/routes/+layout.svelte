<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<header class="border-b border-cover-voice-main">
	<nav class="container mx-auto flex items-center gap-6 px-4 py-3 justify-between">
		<div>
			<a href="/" class="font-semibold text-gray-900">Cover Voice</a>
		</div>
		<ul class="flex gap-6">
			<li>
				<a href="/signin" class="text-sm text-gray-600 hover:text-gray-900">Sign In</a>
			</li>
			<li>
				<a href="/signup" class="text-sm text-gray-600 hover:text-gray-900">Sign up</a>
			</li>
		</ul>
	</nav>
</header>

<main class="">
	{@render children()}
</main>

<footer class="border-t border-cover-voice-main py-3">
	<p class="text-center">Made with ❤️ by <a class="underline" href="https://github.com/TeeEnnEnn" target="_blank" rel="noopener noreferrer">TeeEnnEnn</a></p>
</footer>
