<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import VariableAutocompleteTextarea from '$lib/components/VariableAutocompleteTextarea.svelte';
	import ReferenceList from '$lib/components/ReferenceList.svelte';
	import { isReservedVariableName, reservedVariableSuggestions } from '$lib/reserved-variables';
	import type { components } from '$lib/api/schema';

	type LetterGeneration = components['schemas']['LetterGenerationSchema'];
	type Align = LetterGeneration['sections']['header']['align'];

	let { data, form } = $props();

	let settingNewVariable = $state(false);
	let settingNewBlock = $state(false);

	let lastForm: unknown = null;
	$effect(() => {
		if (!form || form === lastForm) return;
		lastForm = form;
		const f = form as Record<string, unknown>;
		if (f.success === true) {
			if (f.action === 'newBlock') pushToast('success', 'Block created.');
			else if (f.action === 'newVariable') pushToast('success', 'Variable created.');
		} else if (typeof f.message === 'string' && f.message) {
			pushToast('error', f.message);
		}
	});

	// One-time snapshot: this page never invalidates `data` (saves go through
	// direct fetch, not form actions), so snapshotting once per mount is correct.
	const storedContent = $derived(data.letter.rawContent);

	const initialSections = $derived(
		storedContent?.sections ?? {
			header: { text: '', align: 'left' as Align },
			body: { text: '', align: 'left' as Align },
			footer: { text: '', align: 'left' as Align }
		}
	);

	let headerText = $derived(initialSections.header.text ?? '');
	let bodyText = $derived(initialSections.body.text ?? '');
	let footerText = $derived(initialSections.footer.text ?? '');
	let headerAlign = $derived<Align>(initialSections.header.align ?? 'left');
	let bodyAlign = $derived<Align>(initialSections.body.align ?? 'left');
	let footerAlign = $derived<Align>(initialSections.footer.align ?? 'left');

	let previewUrl = $state<string | null>(null);
	let previewLoading = $state(false);
	let previewHint = $state<string | null>('Press Update Preview to render the current sections.');

	// firefox on android does not have a pdf previewer - so we need to fallback to preview in new tab
	let isAndroidFirefox = $state(false);

	onMount(() => {
		isAndroidFirefox = /Android.+Firefox\//.test(navigator.userAgent);
	});
	let lastPreviewAt = $state<string | null>(null);
	let mobileTab = $state<'write' | 'preview'>('write');
	let downloading = $state(false);
	let downloadError = $state<string | null>(null);

	// Autosave: sections persist shortly after the user stops typing.
	// Preview is strictly opt-in via Update Preview / Download.
	let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let saveError = $state<string | null>(null);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let letterId = $derived(data.letter.id);

	type PageConfig = LetterGeneration['config'];
	type PageFont = PageConfig['font'];
	type PageSizeOption = PageConfig['pageSize'];
	type NumberConfigKey =
		'fontSize' | 'lineHeight' | 'marginLeft' | 'marginRight' | 'marginTop' | 'marginBottom';

	const DEFAULT_CONFIG: PageConfig = {
		font: 'Helvetica',
		fontSize: 12,
		fontColor: '#000000',
		backgroundColor: '#ffffff',
		lineHeight: 1.5,
		pageSize: 'A4',
		marginLeft: 36,
		marginRight: 36,
		marginTop: 36,
		marginBottom: 36
	};

	function normalizeConfig(stored: unknown): PageConfig {
		const c = (stored ?? {}) as Partial<Record<keyof PageConfig, unknown>>;
		const num = (v: unknown, min: number, max: number, fallback: number) =>
			typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
		const hex = (v: unknown, fallback: string) =>
			typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v) ? v : fallback;
		return {
			font: c.font === 'Courier' || c.font === 'Times-Roman' ? c.font : 'Helvetica',
			fontSize: num(c.fontSize, 1, 100, 12),
			fontColor: hex(c.fontColor, '#000000'),
			backgroundColor: hex(c.backgroundColor, '#ffffff'),
			lineHeight: num(c.lineHeight, 0.5, 10, 1.5),
			pageSize: c.pageSize === 'LETTER' ? 'LETTER' : 'A4',
			marginLeft: num(c.marginLeft, 0, 200, 36),
			marginRight: num(c.marginRight, 0, 200, 36),
			marginTop: num(c.marginTop, 0, 200, 36),
			marginBottom: num(c.marginBottom, 0, 200, 36)
		};
	}

	let pageConfig = $derived<PageConfig>(normalizeConfig(storedContent?.config));
	let styleOpen = $state(true);

	let configDirty = $derived.by(() => {
		const a = pageConfig;
		const b = savedSnap.config;
		return (Object.keys(a) as Array<keyof PageConfig>).some((k) => a[k] !== b[k]);
	});

	function setConfigNumber(
		key: NumberConfigKey,
		raw: number,
		min: number,
		max: number,
		decimals: number
	) {
		const fallback = pageConfig[key];
		let next = Number.isFinite(raw) ? raw : fallback;
		next = Math.min(max, Math.max(min, next));
		const factor = 10 ** decimals;
		(pageConfig as Record<NumberConfigKey, number>)[key] = Math.round(next * factor) / factor;
		onEditorInput();
	}

	function currentContent(): LetterGeneration {
		return {
			config: { ...pageConfig },
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
			lastPreviewAt = new Date().toLocaleTimeString('en-GB', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
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
				footer: { text: footerText, align: footerAlign },
				config: { ...pageConfig }
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
	const pageFonts = ['Courier', 'Helvetica', 'Times-Roman'] as const;
	const pageSizes = ['A4', 'LETTER'] as const;
	const marginFields = [
		{ key: 'marginTop', label: 'Top' },
		{ key: 'marginRight', label: 'Right' },
		{ key: 'marginBottom', label: 'Bottom' },
		{ key: 'marginLeft', label: 'Left' }
	] as const;

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

	const TRIGGER_RE = /(\{\{|\{%)\s*([\w-]*)$/;

	let menuItems = $derived.by(() => {
		if (!menu) return [];
		const pool =
			menu.kind === 'block' ? data.blocks : [...data.variables, ...reservedVariableSuggestions()];
		const q = menu.query.toLowerCase();
		return pool.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 8);
	});

	let variableSuggestions = $derived([...data.variables, ...reservedVariableSuggestions()]);

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
				known: data.variables.some((v) => v.name === m[1]) || isReservedVariableName(m[1])
			});
		}
		return out;
	}

	let savedSnap = $derived({
		header: {
			text: initialSections.header.text ?? '',
			align: initialSections.header.align ?? 'left'
		},
		body: { text: initialSections.body.text ?? '', align: initialSections.body.align ?? 'left' },
		footer: {
			text: initialSections.footer.text ?? '',
			align: initialSections.footer.align ?? 'left'
		},
		config: normalizeConfig(storedContent?.config)
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

<div class="container mx-auto my-8 flex flex-col gap-8 px-4 md:px-0">
	<Seo
		title={`${data.letter.title} — Cover Voice`}
		description={data.letter.description ??
			'Edit your cover letter with reusable blocks and variables.'}
		noindex
	/>
	<header class="flex flex-col gap-4 px-4">
		<div class="flex gap-2 lg:hidden" role="tablist" aria-label="Editor view">
			<Button
				variant={mobileTab === 'write' ? 'default' : 'outline'}
				class="flex-1"
				role="tab"
				aria-selected={mobileTab === 'write'}
				onclick={() => {
					mobileTab = 'write';
				}}>Write</Button
			>
			<Button
				variant={mobileTab === 'preview' ? 'default' : 'outline'}
				class="flex-1"
				role="tab"
				aria-selected={mobileTab === 'preview'}
				onclick={() => {
					mobileTab = 'preview';
				}}>Preview</Button
			>
		</div>
		<div>
			<h2 class="text-2xl font-semibold">{data.letter.title}</h2>
			{#if data.letter.description}
				<p class="text-sm text-muted-foreground">{data.letter.description}</p>
			{/if}
		</div>

		<div class="flex items-center justify-between gap-2">
			<p class="text-sm text-muted-foreground" role="status" aria-live="polite">
				{#if saveState === 'saving'}Saving…
				{:else if saveState === 'saved'}Saved
				{:else if saveState === 'error'}{saveError}{/if}
			</p>
		</div>
	</header>

	<div class="flex flex-col gap-4 px-4 lg:flex-row">
		<div
			id="edit-window"
			class="w-full flex-col gap-4 {mobileTab === 'write' ? 'flex' : 'hidden'} lg:flex lg:w-1/2"
			role="tabpanel"
			aria-label="Write"
		>
			<div class="flex flex-col gap-4">
				{#each sectionMeta as section (section.key)}
					{@const refs = refsIn(textFor(section.key))}
					<div id="section-{section.key}" class=" border border-border bg-card px-3 py-3 shadow-sm">
						<div class="flex items-center justify-between gap-2">
							<p class="font-medium">{section.prompt}</p>
							{#if isDirty(section.key)}
								<span class="shrink-0 bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Unsaved</span
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
										class="absolute z-20 w-56 overflow-hidden border border-border bg-popover shadow-lg"
										style="top: {menuPos.top}px; left: {menuPos.left}px;"
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
												? 'border-border bg-muted text-muted-foreground hover:bg-accent'
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
								class=" border border-border bg-card px-2 py-1"
							>
								{#each aligns as align (align)}
									<option value={align}>{align}</option>
								{/each}
							</select>
						</div>
					</div>
				{/each}
			</div>

			<div id="page-style" class=" border border-border bg-card px-3 py-3 shadow-sm">
				<div class="flex items-center justify-between gap-2">
					<h3 class="text-lg font-semibold">Page style</h3>
					<div class="flex items-center gap-2">
						{#if configDirty}
							<span class="shrink-0 bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Unsaved</span>
						{/if}
						<Button
							variant="outline"
							type="button"
							aria-expanded={styleOpen}
							aria-controls="page-style-body"
							onclick={() => {
								styleOpen = !styleOpen;
							}}
						>
							{styleOpen ? 'Hide' : 'Show'}
						</Button>
					</div>
				</div>
				{#if styleOpen}
					<div id="page-style-body" transition:slide class="mt-2 flex flex-col gap-3">
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div class="flex flex-col gap-1">
								<Label for="pageFont">Font</Label>
								<select
									id="pageFont"
									value={pageConfig.font}
									onchange={(e) => {
										pageConfig.font = e.currentTarget.value as PageFont;
										onEditorInput();
									}}
									class=" border border-border bg-card px-2 py-1"
								>
									{#each pageFonts as font (font)}
										<option value={font}>{font}</option>
									{/each}
								</select>
							</div>
							<div class="flex flex-col gap-1">
								<Label for="pageSize">Page size</Label>
								<select
									id="pageSize"
									value={pageConfig.pageSize}
									onchange={(e) => {
										pageConfig.pageSize = e.currentTarget.value as PageSizeOption;
										onEditorInput();
									}}
									class=" border border-border bg-card px-2 py-1"
								>
									{#each pageSizes as size (size)}
										<option value={size}>{size}</option>
									{/each}
								</select>
							</div>
							<div class="flex flex-col gap-1">
								<Label for="pageFontSize">Font size (pt)</Label>
								<Input
									id="pageFontSize"
									type="number"
									min={1}
									max={100}
									step={1}
									value={pageConfig.fontSize}
									oninput={(e) =>
										setConfigNumber('fontSize', e.currentTarget.valueAsNumber, 1, 100, 0)}
								/>
							</div>
							<div class="flex flex-col gap-1">
								<Label for="pageLineHeight">Line height (×)</Label>
								<Input
									id="pageLineHeight"
									type="number"
									min={0.5}
									max={10}
									step={0.1}
									value={pageConfig.lineHeight}
									oninput={(e) =>
										setConfigNumber('lineHeight', e.currentTarget.valueAsNumber, 0.5, 10, 1)}
								/>
							</div>
							<div class="flex flex-col gap-1">
								<Label for="pageFontColor">Text color</Label>
								<div class="flex gap-2">
									<input
										id="pageFontColor"
										type="color"
										value={pageConfig.fontColor}
										aria-label="Text color picker"
										oninput={(e) => {
											pageConfig.fontColor = e.currentTarget.value;
											onEditorInput();
										}}
										class="h-9 w-12 shrink-0 cursor-pointer border border-input bg-transparent p-1 shadow-xs"
									/>
									<Input
										id="pageFontColorHex"
										type="text"
										value={pageConfig.fontColor}
										pattern="#[0-9A-Fa-f]{6}"
										maxlength={7}
										spellcheck={false}
										aria-label="Text color hex value"
										oninput={(e) => {
											const v = e.currentTarget.value;
											if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
												pageConfig.fontColor = v;
												onEditorInput();
											}
										}}
									/>
								</div>
							</div>
							<div class="flex flex-col gap-1">
								<Label for="pageBackgroundColor">Background color</Label>
								<div class="flex gap-2">
									<input
										id="pageBackgroundColor"
										type="color"
										value={pageConfig.backgroundColor}
										aria-label="Background color picker"
										oninput={(e) => {
											pageConfig.backgroundColor = e.currentTarget.value;
											onEditorInput();
										}}
										class="h-9 w-12 shrink-0 cursor-pointer border border-input bg-transparent p-1 shadow-xs"
									/>
									<Input
										id="pageBackgroundColorHex"
										type="text"
										value={pageConfig.backgroundColor}
										pattern="#[0-9A-Fa-f]{6}"
										maxlength={7}
										spellcheck={false}
										aria-label="Background color hex value"
										oninput={(e) => {
											const v = e.currentTarget.value;
											if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
												pageConfig.backgroundColor = v;
												onEditorInput();
											}
										}}
									/>
								</div>
							</div>
						</div>
						<div class="flex flex-col gap-1">
							<p class="text-sm font-medium">Margins (pt)</p>
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
								{#each marginFields as field (field.key)}
									<div class="flex flex-col gap-1">
										<Label for="pageMargin-{field.key}">{field.label}</Label>
										<Input
											id="pageMargin-{field.key}"
											type="number"
											min={0}
											max={200}
											step={1}
											value={pageConfig[field.key]}
											oninput={(e) =>
												setConfigNumber(field.key, e.currentTarget.valueAsNumber, 0, 200, 0)}
										/>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div id="variables" class=" border border-border bg-card px-3 py-3 shadow-sm">
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
						<ReferenceList
							kind="variable"
							items={data.variables}
							error={data.variableError}
							onCreate={() => {
								settingNewVariable = true;
							}}
						/>
						<Button
							variant={settingNewVariable ? 'destructive' : 'default'}
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
								<Button type="submit" class="w-full">Add</Button>
							</form>
						{/if}
					</div>
				{/if}
			</div>

			<div id="blocks" class=" border border-border bg-card px-3 py-3 shadow-sm">
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
						<ReferenceList
							kind="block"
							items={data.blocks}
							error={data.blockError}
							onCreate={() => {
								settingNewBlock = true;
							}}
						/>
						<Button
							variant={settingNewBlock ? 'destructive' : 'default'}
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
									<VariableAutocompleteTextarea
										id="blockValue"
										name="blockValue"
										placeholder="value"
										required
										suggestions={variableSuggestions}
									/>
								</div>
								<Button type="submit" class="w-full">Add</Button>
							</form>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<div
			id="preview"
			class="w-full border border-border bg-card p-4 shadow-sm {mobileTab === 'preview'
				? 'block'
				: 'hidden'} lg:sticky lg:top-4 lg:block lg:w-1/2 lg:self-start"
			aria-busy={previewLoading}
			role="tabpanel"
			aria-label="Preview"
		>
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<h3 class="text-lg font-semibold">Preview</h3>
				<div class="flex flex-wrap gap-2">
					<Button
						variant="secondary"
						type="button"
						disabled={previewLoading}
						onclick={updatePreviewNow}
					>
						{previewLoading ? 'Rendering…' : 'Update Preview'}
					</Button>
					<Button
						href={previewUrl ?? undefined}
						target="_blank"
						rel="noopener noreferrer"
						variant="outline"
						disabled={!previewUrl}
					>
						Open
					</Button>
					<Button
						type="button"
						disabled={downloading}
						aria-describedby={downloadError ? 'download-error' : undefined}
						onclick={downloadPdf}
					>
						{downloading ? 'Generating…' : 'Download'}
					</Button>
				</div>
			</div>
			{#if downloadError}
				<p
					id="download-error"
					class="mb-2 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600"
					role="alert"
				>
					{downloadError}
				</p>
			{/if}
			{#if previewHint}
				<p class="mb-2 text-sm text-muted-foreground" role="status">{previewHint}</p>
			{/if}
			{#if lastPreviewAt && previewUrl}
				<p class="mb-2 text-xs text-muted-foreground" role="status" aria-live="polite">
					Preview updated at {lastPreviewAt}.
				</p>
			{/if}
			{#if previewUrl}
				{#if isAndroidFirefox}
					<div class="border border-border bg-muted/50 p-4 text-sm" role="note">
						<p>Inline PDF preview isn't supported in this browser.</p>
						<p class="mt-1 text-muted-foreground">
							Use Open to view it in a new tab, or Download to save it.
						</p>
					</div>
				{:else}
					<iframe src={previewUrl} title="Letter PDF preview" class="h-[70vh] w-full bg-white"
					></iframe>
				{/if}
			{:else}
				<p class="text-sm text-muted-foreground">
					Nothing rendered yet. Write your sections, then press Update Preview.
				</p>
			{/if}
		</div>
	</div>
</div>
