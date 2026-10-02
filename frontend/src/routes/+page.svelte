<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Button from '$lib/components/ui/button/button.svelte';

	let { data } = $props();

	const steps = [
		{
			n: '1',
			title: 'Save your building blocks',
			body: 'Write reusable blocks for greetings, experience blurbs, and sign-offs, plus variables for names, companies, and links. Write once, reuse forever.'
		},
		{
			n: '2',
			title: 'Compose with references',
			body: 'Drop {%block%} and {{variable}} references into your header, body, and footer. Autocomplete, live validation, and autosave keep you in flow.'
		},
		{
			n: '3',
			title: 'Preview and download',
			body: 'Render a live PDF preview whenever you want it, then download the final letter. Usage tracking warns you before deleting shared pieces.'
		}
	];

	const faqs = [
		{
			q: 'Does Cover Voice make CVs?',
			a: "No vover voice does not make CVs but check out <a href='https://rendercv.com/' style='text-decoration: underline' target='_blank' rel='noopener'>RenderCV<a/>. They might just have exactly what you are looking for.",
			hasMarkup: true
		},
		{
			q: 'What are blocks and variables?',
			a: 'Blocks are reusable chunks of text, like an opening paragraph or a sign-off. Variables are single values, like a company name or a link. Reference them from any letter instead of retyping them every time.',
			hasMarkup: false
		},
		{
			q: 'How do {% %} and {{ }} references work?',
			a: 'Write {%intro%} to pull in the block named "intro", and {{company}} to pull in the variable named "company". The editor suggests names as you type and flags anything it cannot resolve before you preview.',
			hasMarkup: false
		},
		{
			q: 'Is my data private?',
			a: 'Yes. Blocks, variables, and letters belong to your account only — other users can never see or reference them.',
			hasMarkup: false
		}
	];
</script>

<div class="mx-auto w-full max-w-5xl px-4">
	<Seo
		title="Cover Voice — Cover letters in your own voice"
		description="Turn your best paragraphs and details into reusable building blocks, so every job application starts halfway done — and still sounds like you."
		canonical={`${data.origin}/`}
		image={`${data.origin}/Cover-Voice_512x512.png`}
		jsonLd={{
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: 'Cover Voice',
			description:
				'Turn your best paragraphs and details into reusable building blocks for tailored cover letters.',
			url: `${data.origin}/`,
			applicationCategory: 'BusinessApplication',
			operatingSystem: 'Web',
			offers: { '@type': 'Offer', price: '0' }
		}}
	/>
	<!-- Hero + top CTA -->
	<section class="flex flex-col items-center gap-6 py-20 text-center md:py-28">
		<img
			src="/Cover-Voice_192x192.svg"
			alt="Cover Voice logo"
			width="96"
			height="96"
			class="h-24 w-24 shadow-lg"
		/>
		<p
			class="border border-cover-voice-main/30 bg-cover-voice-main/10 px-4 py-1 text-sm font-medium text-cover-voice-main"
		>
			Cover letters in your own voice
		</p>
		<h1 class="max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
			Write it once.<br />Reuse it everywhere.
		</h1>
		<p class="max-w-2xl text-lg text-muted-foreground">
			Cover Voice turns your best paragraphs and details into reusable building blocks, so every new
			application starts halfway done — and still sounds like you.
		</p>
		<div class="flex flex-col gap-3 sm:flex-row">
			{#if data.user}
				<Button
					href="/me"
					class="bg-cover-voice-main px-8 py-3 text-base text-white hover:bg-cover-voice-main/90"
				>
					Open your dashboard
				</Button>
				<Button href="#how-it-works" variant="outline" class="px-8 py-3 text-base">
					How it works
				</Button>
			{:else}
				<Button
					href="/signup"
					class="bg-cover-voice-main px-8 py-3 text-base text-white hover:bg-cover-voice-main/90"
				>
					Get started
				</Button>
				<Button href="/signin" variant="outline" class="px-8 py-3 text-base">Sign in</Button>
			{/if}
		</div>
	</section>

	<!-- Steps -->
	<section id="how-it-works" class="scroll-mt-8 py-12">
		<h2 class="text-center text-3xl font-semibold">How it works</h2>
		<p class="mt-2 text-center text-muted-foreground">
			Three steps from blank page to finished PDF.
		</p>
		<div class="mt-8 grid gap-4 md:grid-cols-3">
			{#each steps as step (step.n)}
				<div class="flex flex-col gap-3 border border-border bg-card p-6 shadow-sm">
					<span
						class="flex h-10 w-10 items-center justify-center bg-cover-voice-main text-lg font-semibold text-white"
						>{step.n}</span
					>
					<h3 class="text-lg font-semibold">{step.title}</h3>
					<p class="text-sm text-muted-foreground">{step.body}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- FAQ -->
	<section class="mx-auto max-w-3xl py-12">
		<h2 class="text-center text-3xl font-semibold">Frequently asked questions</h2>
		<div class="mt-8 flex flex-col gap-3">
			{#each faqs as faq (faq.q)}
				<details class="group border border-border bg-card px-5 py-4 shadow-sm">
					<summary
						class="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden"
					>
						{faq.q}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="shrink-0 transition-transform group-open:rotate-180"
							aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg
						>
					</summary>
					{#if faq.hasMarkup}
						<p class="mt-2 text-sm text-muted-foreground">{@html faq.a}</p>
					{:else}
						<p class="mt-2 text-sm text-muted-foreground">{faq.a}</p>
					{/if}
				</details>
			{/each}
		</div>
	</section>

	<!-- Bottom CTA -->
	<section class="py-12">
		<div
			class="flex flex-col items-center gap-4 bg-cover-voice-main px-6 py-12 text-center text-white"
		>
			<h2 class="max-w-2xl text-3xl font-semibold">Ready to write your next cover letter?</h2>
			<p class="max-w-xl text-xl font-bold">
				Set up your blocks once, then generate tailored letters in minutes.
			</p>
			{#if data.user}
				<Button href="/me" variant="secondary" class="px-8 py-3 text-base"
					>Open your dashboard</Button
				>
			{:else}
				<Button href="/signup" variant="secondary" class="px-8 py-3 text-base">Get started</Button>
			{/if}
		</div>
	</section>
</div>
