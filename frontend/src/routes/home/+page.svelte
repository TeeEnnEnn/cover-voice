<script lang="ts">
	import Step from '$lib/components/Step.svelte';
</script>

<article class="container mx-auto my-24 space-y-24">
	<div class="rounded-lg bg-cover-voice-main/50 p-6">
		<hgroup class="mt-12 mb-16 flex flex-col gap-4">
			<h2 class="text-7xl font-semibold text-gray-700">
				Cover letters streamlined,<br /> with your voice
			</h2>
			<small class="text-lg text-gray-400"
				>Simplifying cover letter writing without handing everything over to AI</small
			>
		</hgroup>
		<img
			class="mx-auto h-140"
			src="https://images.ctfassets.net/lpvian6u6i39/CSBVIjGzg7XuBBCCk6kzO/1d2ac042a7c32ba1c4b60683a1938d64/Frame_5563.png"
			alt="app dashboard"
		/>
	</div>

	<div class="flex flex-col gap-12 rounded-lg bg-cover-voice-secondary/50 p-6">
		<Step
			title="Add your variables"
			imageUrl="https://cdn.stocksnap.io/img-thumbs/280h/tree-lake_VGBUM8QAAF.jpg"
			imageAlt="tree lake"
		/>
		<Step
			title="Create your blocks"
			imageUrl="https://www.stocksy.com/cms/assets/1b47add8-d602-48cd-9c13-235fb4bfb923.jpg"
			imageAlt="landscape rock"
		/>
		<Step
			title="Compose your cover letter with blocks and variables"
			imageUrl="https://cdn.stocksnap.io/img-thumbs/280h/landscape-rock_4EZIPYRDH0.jpg"
			imageAlt="landscape rock"
		/>
		<Step
			title="Generate a pdf of your cover letter"
			imageUrl="https://iso.500px.com/wp-content/uploads/2015/03/business_cover.jpeg"
			imageAlt="business cover"
		/>
	</div>

	<div class="rounded-lg bg-cover-voice-main/50 p-6">
		<h2 class="text-4xl font-semibold">Get Started</h2>
		<div class="flex gap-6">
			<p class="flex-1 text-xl">
				Make an account or sign in with your existing account to get started streamlining your cover
				letter writing and land that dream job.
			</p>
			<div class="flex flex-1 flex-col gap-8">
				<a href="/signup" class="inline-block"
					><span>Sign Up</span> <span class="align-text-bottom">→</span></a
				>
				<a href="/signin" class="inline-block"
					><span>Sign In</span> <span class="align-text-bottom">→</span></a
				>
			</div>
		</div>
	</div>
</article>
