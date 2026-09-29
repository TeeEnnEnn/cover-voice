<script lang="ts">
	import { Textarea } from '@/components/ui/textarea/index.js';

	let {
		id,
		name,
		required = false,
		placeholder = 'Use {{variable}} references',
		rows = 3,
		suggestions = []
	}: {
		id: string;
		name: string;
		required?: boolean;
		placeholder?: string;
		rows?: number;
		suggestions?: Array<{ id: string; name: string; value: string }>;
	} = $props();

	// {{variable}} autocomplete (block values embed variables).
	const VAR_TRIGGER_RE = /(\{\{)\s*([\w-]*)$/;
	let menu = $state<{ query: string; index: number } | null>(null);

	let menuItems = $derived.by(() => {
		if (!menu) return [];
		const q = menu.query.toLowerCase();
		return suggestions.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
	});

	function onInput(e: Event) {
		const field = e.currentTarget as HTMLTextAreaElement;
		const caret = field.selectionStart ?? field.value.length;
		const m = field.value.slice(0, caret).match(VAR_TRIGGER_RE);
		if (!m) {
			menu = null;
			return;
		}
		menu = { query: m[2], index: 0 };
	}

	function acceptSuggestion(varName: string) {
		if (!menu) return;
		const field = document.getElementById(id) as HTMLTextAreaElement | null;
		if (!field) {
			menu = null;
			return;
		}
		const caret = field.selectionStart ?? field.value.length;
		const before = field.value.slice(0, caret);
		const m = before.match(VAR_TRIGGER_RE);
		if (!m || m.index === undefined) {
			menu = null;
			return;
		}
		const insert = `{{${varName}}}`;
		const start = m.index as number;
		field.value = before.slice(0, start) + insert + field.value.slice(caret);
		field.dispatchEvent(new Event('input', { bubbles: true }));
		menu = null;
		requestAnimationFrame(() => {
			const pos = start + insert.length;
			field.setSelectionRange(pos, pos);
			field.focus();
		});
	}

	function onKeydown(e: KeyboardEvent) {
		if (!menu) return;
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const n = menuItems.length;
			if (n === 0) return;
			menu.index = (menu.index + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			const item = menuItems[menu.index];
			if (item) {
				e.preventDefault();
				acceptSuggestion(item.name);
			}
		} else if (e.key === 'Escape') {
			menu = null;
		}
	}
</script>

<div class="relative">
	<Textarea
		{id}
		{name}
		{required}
		{placeholder}
		{rows}
		oninput={onInput}
		onkeydown={onKeydown}
		onblur={() => {
			setTimeout(() => {
				menu = null;
			}, 150);
		}}
	/>
	{#if menu && menuItems.length > 0}
		<ul
			role="listbox"
			aria-label="Variable suggestions"
			class="absolute z-20 w-56 overflow-hidden border border-border bg-popover shadow-lg"
		>
			{#each menuItems as item, i (item.id)}
				<li role="option" aria-selected={i === menu.index}>
					<button
						type="button"
						class="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm {i ===
						menu.index
							? 'bg-accent'
							: ''}"
						onmousedown={(e) => {
							e.preventDefault();
							acceptSuggestion(item.name);
						}}
						onmouseenter={() => {
							if (menu) menu.index = i;
						}}
					>
						<code>{`{{${item.name}}}`}</code>
						<span class="truncate text-xs text-muted-foreground">{item.value}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
