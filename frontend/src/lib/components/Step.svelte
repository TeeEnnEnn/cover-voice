<script lang="ts">
	let { title, imageUrl, imageAlt } = $props();
</script>

<div class=" flex justify-between">
	<h3 class="text-xl font-semibold">{title}</h3>
	<img class=" aspect-video h-72 object-cover" src={imageUrl} alt={imageAlt} />
</div>
