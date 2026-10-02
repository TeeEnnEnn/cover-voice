<script lang="ts">
	let {
		title,
		description,
		canonical,
		image,
		type = 'website',
		noindex = false,
		jsonLd
	}: {
		title: string;
		description: string;
		canonical?: string;
		image?: string;
		type?: string;
		noindex?: boolean;
		jsonLd?: Record<string, unknown>;
	} = $props();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
	{#if canonical}
		<link rel="canonical" href={canonical} />
	{/if}
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	{#if canonical}
		<meta property="og:url" content={canonical} />
	{/if}
	{#if image}
		<meta property="og:image" content={image} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={image} />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if jsonLd}
		{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
	{/if}
</svelte:head>
