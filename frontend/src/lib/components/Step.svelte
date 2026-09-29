<script lang="ts">
	let { title, imageUrl, imageAlt } = $props();
</script>

<div class=" flex justify-between">
	<h3 class="text-xl font-semibold">{title}</h3>
	<img
		class=" h-72 aspect-video object-cover"
		src={imageUrl}
		alt={imageAlt}
	/>
</div>
