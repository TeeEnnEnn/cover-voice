<script lang="ts">
	import { slide } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import type { components } from '$lib/api/schema';

	type LetterGeneration = components['schemas']['LetterGenerationSchema'];
	type Align = LetterGeneration['sections']['header']['align'];

	let { data, form } = $props();

	let settingNewVariable = $state(false);
	let settingNewBlock = $state(false);

	const initialSections = data.letter.rawContent?.sections ?? {
		header: { text: '', align: 'left' as Align },
		body: { text: '', align: 'left' as Align },
		footer: { text: '', align: 'left' as Align }
	};

	let headerText = $state(initialSections.header.text ?? '');
	let bodyText = $state(initialSections.body.text ?? '');
	let footerText = $state(initialSections.footer.text ?? '');
	let headerAlign = $state<Align>(initialSections.header.align ?? 'left');
	let bodyAlign = $state<Align>(initialSections.body.align ?? 'left');
	let footerAlign = $state<Align>(initialSections.footer.align ?? 'left');

	let previewUrl = $state<string | null>(null);
	let previewLoading = $state(false);
	let previewHint = $state<string | null>('Press Update Preview to render the current sections.');
	let downloading = $state(false);
	let downloadError = $state<string | null>(null);

	// Autosave: sections persist shortly after the user stops typing.
	// Preview is strictly opt-in via Update Preview / Download.
	let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let saveError = $state<string | null>(null);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	const letterId = data.letter.id;

	const DEFAULT_CONFIG = {
		font: 'Helvetica',
		fontSize: 12,
		fontColor: '#000000',
		backgroundColor: '#ffffff',
		lineHeight: 1.5,
		textDirection: 'ltr',
		pageSize: 'A4',
		marginLeft: 36,
		marginRight: 36,
		marginTop: 36,
		marginBottom: 36
	} as const;

	function currentContent(): LetterGeneration {
		return {
			config: { ...DEFAULT_CONFIG },
			sections: {
				header: { text: headerText || null, align: headerAlign },
				body: { text: bodyText || null, align: bodyAlign },
				footer: { text: footerText || null, align: footerAlign }
			}
		};
	}

	async function fetchPreview(content: LetterGeneration) {
		if (previewLoading) return;
		previewLoading = true;
		previewHint = null;
		try {
			const response = await fetch(`/api/letters/${letterId}/preview`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(content)
			});
			if (!response.ok) {
				previewHint = 'Preview failed — check block/variable names, then update again.';
				return;
			}
			const blob = await response.blob();
			if (previewUrl) URL.revokeObjectURL(previewUrl);
			previewUrl = URL.createObjectURL(blob);
		} catch {
			previewHint = 'Preview failed. Press Update Preview to retry.';
		} finally {
			previewLoading = false;
		}
	}

	async function saveSectionsNow() {
		if (saveState === 'saving') return;
		saveState = 'saving';
		saveError = null;
		try {
			const response = await fetch(`/api/letters/${letterId}`, {
				method: 'PATCH',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rawContent: currentContent() })
			});
			if (!response.ok) {
				saveState = 'error';
				saveError = 'Save failed — will retry when you keep typing.';
				return;
			}
			savedSnap = {
				header: { text: headerText, align: headerAlign },
				body: { text: bodyText, align: bodyAlign },
				footer: { text: footerText, align: footerAlign }
			};
			saveState = 'saved';
		} catch {
			saveState = 'error';
			saveError = 'Save failed — will retry when you keep typing.';
		}
	}

	function onEditorInput() {
		// Typing only schedules a save; the preview stays untouched until asked.
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => saveSectionsNow(), 1000);
	}

	async function updatePreviewNow() {
		await fetchPreview(currentContent());
	}

	function sanitizeFilename(title: string): string {
		return `${title.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 50) || 'letter'}.pdf`;
	}

	async function downloadPdf() {
		downloading = true;
		downloadError = null;
		try {
			const response = await fetch(`/api/letters/${letterId}/generate`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(currentContent())
			});
			if (!response.ok) {
				let message = 'Download failed. Check block/variable names and try again.';
				try {
					const errBody = await response.json();
					if (errBody?.error?.message) message = errBody.error.message;
					if (errBody?.error?.details?.[0]?.path) {
						message = `${message} (${errBody.error.details[0].path})`;
					}
				} catch {
					// keep default
				}
				downloadError = message;
				return;
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = sanitizeFilename(data.letter.title);
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} finally {
			downloading = false;
		}
	}

	const sectionMeta = [
		{ key: 'header', title: 'Header', prompt: 'How will you start your cover letter off?' },
		{ key: 'body', title: 'Body', prompt: 'What will the main content of your cover letter be?' },
		{ key: 'footer', title: 'Footer', prompt: 'How will you end your cover letter?' }
	] as const;
	const aligns = ['left', 'center', 'right', 'justify'] as const;

	function textFor(key: 'header' | 'body' | 'footer'): string {
		return key === 'header' ? headerText : key === 'body' ? bodyText : footerText;
	}
	function setText(key: 'header' | 'body' | 'footer', value: string) {
		if (key === 'header') headerText = value;
		else if (key === 'body') bodyText = value;
		else footerText = value;
	}
	function alignFor(key: 'header' | 'body' | 'footer'): Align {
		return key === 'header' ? headerAlign : key === 'body' ? bodyAlign : footerAlign;
	}
	function setAlign(key: 'header' | 'body' | 'footer', value: Align) {
		if (key === 'header') headerAlign = value;
		else if (key === 'body') bodyAlign = value;
		else footerAlign = value;
	}

	type SectionKey = 'header' | 'body' | 'footer';

	// ---- Reference autocomplete (triggered by {% or {{ while typing) ----
	type MenuState = { key: SectionKey; kind: 'block' | 'variable'; query: string; index: number };
	let menu = $state<MenuState | null>(null);
	let menuPos = $state({ top: 0, left: 0 });

	const TRIGGER_RE = /(\{\{%?)\s*([\w-]*)$/;

	let menuItems = $derived.by(() => {
		if (!menu) return [];
		const pool = menu.kind === 'block' ? data.blocks : data.variables;
		const q = menu.query.toLowerCase();
		return pool.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 8);
	});

	function caretCoords(textarea: HTMLTextAreaElement, wrap: HTMLElement) {
		const mirror = document.createElement('div');
		const style = getComputedStyle(textarea);
		for (const prop of [
			'fontFamily',
			'fontSize',
			'fontWeight',
			'lineHeight',
			'letterSpacing',
			'paddingTop',
			'paddingLeft',
			'paddingRight',
			'borderTopWidth',
			'borderLeftWidth',
			'width',
			'whiteSpace',
			'wordWrap',
			'overflowWrap'
		] as const) {
			mirror.style[prop] = style[prop];
		}
		mirror.style.position = 'absolute';
		mirror.style.visibility = 'hidden';
		mirror.style.overflow = 'hidden';
		const rect = textarea.getBoundingClientRect();
		mirror.style.left = `${rect.left + window.scrollX}px`;
		mirror.style.top = `${rect.top + window.scrollY}px`;
		mirror.style.height = `${rect.height}px`;
		mirror.textContent = textarea.value.slice(0, textarea.selectionStart ?? 0);
		mirror.scrollTop = textarea.scrollTop;
		const marker = document.createElement('span');
		marker.textContent = '​';
		mirror.appendChild(marker);
		document.body.appendChild(mirror);
		const caret = marker.getBoundingClientRect();
		const wrapRect = wrap.getBoundingClientRect();
		const pos = {
			top: caret.bottom - wrapRect.top + 4,
			left: Math.min(Math.max(caret.left - wrapRect.left, 0), Math.max(wrapRect.width - 230, 0))
		};
		mirror.remove();
		return pos;
	}

	function updateMenu(textarea: HTMLTextAreaElement, key: SectionKey) {
		const caret = textarea.selectionStart ?? 0;
		const m = textarea.value.slice(0, caret).match(TRIGGER_RE);
		if (!m) {
			menu = null;
			return;
		}
		const kind = m[1] === '{{' ? 'variable' : 'block';
		const wrap = textarea.closest('[data-field-wrap]') as HTMLElement | null;
		if (wrap) menuPos = caretCoords(textarea, wrap);
		menu = { key, kind, query: m[2], index: 0 };
	}

	function acceptSuggestion(name: string) {
		if (!menu) return;
		const { key, kind } = menu;
		const textarea = document.getElementById(`${key}Text`) as HTMLTextAreaElement | null;
		if (!textarea) {
			menu = null;
			return;
		}
		const caret = textarea.selectionStart ?? textarea.value.length;
		const before = textarea.value.slice(0, caret);
		const m = before.match(TRIGGER_RE);
		if (!m || m.index === undefined) {
			menu = null;
			return;
		}
		const open = kind === 'block' ? '{%' : '{{';
		const close = kind === 'block' ? '%}' : '}}';
		const insert = `${open}${name}${close}`;
		const start = m.index as number;
		const newValue = before.slice(0, start) + insert + textarea.value.slice(caret);
		setText(key, newValue);
		menu = null;
		onEditorInput();
		requestAnimationFrame(() => {
			textarea.value = newValue;
			const pos = start + insert.length;
			textarea.setSelectionRange(pos, pos);
			textarea.focus();
		});
	}

	function onFieldKeydown(e: KeyboardEvent, textarea: HTMLTextAreaElement, key: SectionKey) {
		if (!menu || menu.key !== key) return;
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

	// ---- Reference chips + per-section dirty tracking ----
	function refsIn(
		text: string
	): Array<{ name: string; kind: 'block' | 'variable'; known: boolean }> {
		const out: Array<{ name: string; kind: 'block' | 'variable'; known: boolean }> = [];
		for (const m of text.matchAll(/\{%\s*([\w-]+)\s*%\}/g)) {
			out.push({
				name: m[1],
				kind: 'block',
				known: data.blocks.some((b) => b.name === m[1])
			});
		}
		for (const m of text.matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)) {
			out.push({
				name: m[1],
				kind: 'variable',
				known: data.variables.some((v) => v.name === m[1])
			});
		}
		return out;
	}

	let savedSnap = $state({
		header: {
			text: initialSections.header.text ?? '',
			align: initialSections.header.align ?? 'left'
		},
		body: { text: initialSections.body.text ?? '', align: initialSections.body.align ?? 'left' },
		footer: {
			text: initialSections.footer.text ?? '',
			align: initialSections.footer.align ?? 'left'
		}
	});

	function isDirty(key: SectionKey): boolean {
		return textFor(key) !== savedSnap[key].text || alignFor(key) !== savedSnap[key].align;
	}

	function jumpToPanel(kind: 'block' | 'variable') {
		document.getElementById(kind === 'block' ? 'blocks' : 'variables')?.scrollIntoView({
			behavior: 'smooth',
			block: 'start'
		});
	}

	let blocksOpen = $state(true);
	let variablesOpen = $state(true);
</script>

<div class="container mx-auto my-8 flex flex-col gap-4 px-4 lg:flex-row">
	<div id="edit-window" class="flex w-full flex-col gap-4 lg:w-1/2">
		<div>
			<h2 class="text-2xl font-thin">{data.letter.title}</h2>
			{#if data.letter.description}
				<p class="text-sm text-muted-foreground">{data.letter.description}</p>
			{/if}
		</div>

		{#if form && !form.success && form.message}
			<p class="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-600" role="alert">
				{form.message}
			</p>
		{/if}
		{#if form?.success && form.message}
			<p
				class="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-green-700"
				role="status"
			>
				{form.message}
			</p>
		{/if}

		<div class="flex items-center justify-between gap-2">
			<p class="text-sm text-muted-foreground" role="status" aria-live="polite">
				{#if saveState === 'saving'}Saving…
				{:else if saveState === 'saved'}Saved
				{:else if saveState === 'error'}{saveError}{/if}
			</p>
		</div>
		<div class="flex flex-col gap-4">
			{#each sectionMeta as section (section.key)}
				{@const refs = refsIn(textFor(section.key))}
				<div
					id="section-{section.key}"
					class="rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-sm"
				>
					<div class="flex items-center justify-between gap-2">
						<p class="font-medium">{section.prompt}</p>
						{#if isDirty(section.key)}
							<span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
								>Unsaved</span
							>
						{/if}
					</div>
					<div class="mt-2 flex flex-col gap-2">
						<Label for="{section.key}Text">{section.title} text</Label>
						<div class="relative" data-field-wrap={section.key}>
							<Textarea
								id="{section.key}Text"
								name="{section.key}Text"
								value={textFor(section.key)}
								oninput={(e) => {
									setText(section.key, e.currentTarget.value);
									onEditorInput();
									updateMenu(e.currentTarget, section.key);
								}}
								onkeydown={(e) => onFieldKeydown(e, e.currentTarget, section.key)}
								onblur={() => {
									setTimeout(() => {
										menu = null;
									}, 150);
								}}
								placeholder={'Use {%block%} and {{variable}} references'}
								rows={4}
							/>
							{#if menu && menu.key === section.key && menuItems.length > 0}
								<ul
									role="listbox"
									aria-label="{menu.kind === 'block' ? 'Block' : 'Variable'} suggestions"
									class="absolute z-20 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
									style="top: {menuPos.top}px; left: {menuPos.left}px;"
								>
									{#each menuItems as item, i (item.id)}
										<li role="option" aria-selected={i === menu.index}>
											<button
												type="button"
												class="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm {i ===
												menu.index
													? 'bg-gray-100'
													: ''}"
												onmousedown={(e) => {
													e.preventDefault();
													acceptSuggestion(item.name);
												}}
												onmouseenter={() => {
													if (menu) menu.index = i;
												}}
											>
												<code
													>{menu.kind === 'block' ? `{%${item.name}%}` : `{{${item.name}}}`}</code
												>
												<span class="truncate text-xs text-muted-foreground">{item.value}</span>
											</button>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
						{#if refs.length > 0}
							<div class="flex flex-wrap gap-1.5" aria-label="References used in this section">
								{#each refs as ref (ref.kind + ref.name)}
									<button
										type="button"
										title={ref.known
											? `Jump to ${ref.kind} "${ref.name}"`
											: `"${ref.name}" does not exist yet — preview will fail`}
										onclick={() => jumpToPanel(ref.kind)}
										class="rounded-full border px-2 py-0.5 text-xs {ref.known
											? 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
											: 'border-red-300 bg-red-50 text-red-700'}"
									>
										{ref.kind === 'block' ? `{%${ref.name}%}` : `{{${ref.name}}}`}
									</button>
								{/each}
							</div>
						{/if}
						<Label for="{section.key}Align">{section.title} alignment</Label>
						<select
							id="{section.key}Align"
							name="{section.key}Align"
							value={alignFor(section.key)}
							onchange={(e) => {
								setAlign(section.key, e.currentTarget.value as Align);
								onEditorInput();
							}}
							class="rounded-md border border-gray-300 px-2 py-1"
						>
							{#each aligns as align (align)}
								<option value={align}>{align}</option>
							{/each}
						</select>
					</div>
				</div>
			{/each}
		</div>

		<div id="variables" class="rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-sm">
			<div class="flex items-center justify-between gap-2">
				<h3 class="text-lg font-semibold">Variables</h3>
				<Button
					variant="outline"
					type="button"
					aria-expanded={variablesOpen}
					aria-controls="variables-body"
					onclick={() => {
						variablesOpen = !variablesOpen;
					}}
				>
					{variablesOpen ? 'Hide' : 'Show'}
				</Button>
			</div>
			{#if variablesOpen}
				<div id="variables-body" transition:slide>
					{#if data.variableError}
						<p class="text-sm text-red-600">{data.variableError}</p>
					{:else}
						<ul class="mb-2 flex flex-col gap-1">
							{#each data.variables as variable (variable.id)}
								<li class="text-sm">
									<code>{`{{${variable.name}}}`}</code>
									<span class="text-muted-foreground">= {variable.value}</span>
								</li>
							{:else}
								<li class="text-sm text-muted-foreground">
									No variables yet.
									<button
										type="button"
										class="underline"
										onclick={() => {
											settingNewVariable = true;
										}}>Create one</button
									>.
								</li>
							{/each}
						</ul>
					{/if}
					<Button
						variant={settingNewVariable ? 'destructive' : 'outline'}
						onclick={() => {
							settingNewVariable = !settingNewVariable;
						}}
					>
						{settingNewVariable ? 'Cancel' : 'New Variable'}
					</Button>
					{#if settingNewVariable}
						<form
							method="POST"
							action="?/newVariable"
							transition:slide
							class="mt-2 flex flex-col gap-4"
							use:enhance
						>
							<div>
								<Label for="variableName">Variable Name</Label>
								<Input
									id="variableName"
									name="variableName"
									type="text"
									placeholder="name"
									required
								/>
							</div>
							<div>
								<Label for="variableValue">Variable Value</Label>
								<Input
									id="variableValue"
									name="variableValue"
									type="text"
									placeholder="value"
									required
								/>
							</div>
							<Input type="submit" value="Add" />
						</form>
					{/if}
				</div>
			{/if}
		</div>

		<div id="blocks" class="rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-sm">
			<div class="flex items-center justify-between gap-2">
				<h3 class="text-lg font-semibold">Blocks</h3>
				<Button
					variant="outline"
					type="button"
					aria-expanded={blocksOpen}
					aria-controls="blocks-body"
					onclick={() => {
						blocksOpen = !blocksOpen;
					}}
				>
					{blocksOpen ? 'Hide' : 'Show'}
				</Button>
			</div>
			{#if blocksOpen}
				<div id="blocks-body" transition:slide>
					{#if data.blockError}
						<p class="text-sm text-red-600">{data.blockError}</p>
					{:else}
						<ul class="mb-2 flex flex-col gap-1">
							{#each data.blocks as block (block.id)}
								<li class="text-sm">
									<code>{`{%${block.name}%}`}</code>
									<span class="text-muted-foreground">= {block.value}</span>
								</li>
							{:else}
								<li class="text-sm text-muted-foreground">
									No blocks yet.
									<button
										type="button"
										class="underline"
										onclick={() => {
											settingNewBlock = true;
										}}>Create one</button
									>.
								</li>
							{/each}
						</ul>
					{/if}
					<Button
						variant={settingNewBlock ? 'destructive' : 'outline'}
						onclick={() => {
							settingNewBlock = !settingNewBlock;
						}}
					>
						{settingNewBlock ? 'Cancel' : 'New Block'}
					</Button>
					{#if settingNewBlock}
						<form
							method="POST"
							action="?/newBlock"
							transition:slide
							class="mt-2 flex flex-col gap-4"
							use:enhance
						>
							<div>
								<Label for="blockName">Block Name</Label>
								<Input id="blockName" name="blockName" type="text" placeholder="name" required />
							</div>
							<div>
								<Label for="blockValue">Block Value</Label>
								<Input id="blockValue" name="blockValue" type="text" placeholder="value" required />
							</div>
							<Input type="submit" value="Add" />
						</form>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div
		id="preview"
		class="w-full rounded-lg border border-gray-200 bg-[#eceae4] p-4 shadow-sm lg:sticky lg:top-4 lg:w-1/2 lg:self-start"
		aria-busy={previewLoading}
	>
		<div class="mb-3 flex items-center justify-between gap-2">
			<h3 class="text-lg font-semibold">Preview</h3>
			<div class="flex gap-2">
				<Button
					variant="outline"
					type="button"
					disabled={previewLoading}
					onclick={updatePreviewNow}
				>
					{previewLoading ? 'Rendering…' : 'Update Preview'}
				</Button>
				<Button type="button" disabled={downloading} onclick={downloadPdf}>
					{downloading ? 'Generating…' : 'Download'}
				</Button>
			</div>
		</div>
		{#if downloadError}
			<p
				class="mb-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600"
				role="alert"
			>
				{downloadError}
			</p>
		{/if}
		{#if previewHint}
			<p class="mb-2 text-sm text-muted-foreground" role="status">{previewHint}</p>
		{/if}
		{#if previewUrl}
			<iframe src={previewUrl} title="Letter PDF preview" class="h-[70vh] w-full rounded bg-white"
			></iframe>
		{:else}
			<p class="text-sm text-muted-foreground">
				Nothing rendered yet. Write your sections, then press Update Preview.
			</p>
		{/if}
	</div>
</div>
