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

	let previewLoading = $state(false);
	let previewHint = $state<string | null>('Press Update Preview to render the current sections.');
	let downloading = $state(false);
	let downloadError = $state<string | null>(null);

	// Double-buffered preview: the new PDF loads in the hidden iframe and only
	// becomes visible on its `load` event, so the viewer never flashes white
	// mid-swap. Raw blob URLs are stored (fragment appended at render time so
	// revocation stays straightforward).
	let urlA = $state<string | null>(null);
	let urlB = $state<string | null>(null);
	let topIsA = $state(true);
	let staging: { slot: 'A' | 'B'; seq: number } | null = null;
	const PDF_VIEWER_FRAGMENT = '#toolbar=0&navpanes=0';
	const CROSSFADE_MS = 200;

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let activeController: AbortController | null = null;
	let fetchSeq = 0;
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
		activeController?.abort();
		const controller = new AbortController();
		activeController = controller;
		const seq = ++fetchSeq;
		previewLoading = true;
		previewHint = null;
		try {
			const response = await fetch(`/api/letters/${letterId}/preview`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(content),
				signal: controller.signal
			});
			if (!response.ok) {
				// Transient failure (e.g. half-typed {% %}%}): keep the last good
				// PDF and show a non-blocking hint instead of an error state.
				previewHint = 'Preview paused — check block/variable names, then update again.';
				return;
			}
			if (controller.signal.aborted || seq !== fetchSeq) return;
			const blob = await response.blob();
			if (controller.signal.aborted || seq !== fetchSeq) return;
			stagePreview(URL.createObjectURL(blob), seq);
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			previewHint = 'Preview failed. Press Update Preview to retry.';
		} finally {
			if (activeController === controller) activeController = null;
			previewLoading = false;
		}
	}

	/**
	 * Parks a fresh blob URL in the background iframe. It is promoted to
	 * visible only from that iframe's `load` event (see onFrameLoad), so a
	 * slow render never shows a half-loaded viewer.
	 */
	function stagePreview(rawUrl: string, seq: number) {
		if (seq !== fetchSeq) {
			URL.revokeObjectURL(rawUrl);
			return;
		}
		const slot = topIsA ? 'B' : 'A';
		const prev = slot === 'A' ? urlA : urlB;
		if (prev) URL.revokeObjectURL(prev);
		if (slot === 'A') urlA = rawUrl;
		else urlB = rawUrl;
		staging = { slot, seq };
	}

	function onFrameLoad(slot: 'A' | 'B') {
		if (!staging || staging.slot !== slot || staging.seq !== fetchSeq) return;
		staging = null;
		topIsA = slot === 'A';
		// Both documents stay alive through the CSS crossfade; retire the old
		// background URL afterwards. The equality guard protects against a
		// newer preview having claimed the slot mid-fade.
		const bgSlot = topIsA ? 'B' : 'A';
		const bgUrl = bgSlot === 'A' ? urlA : urlB;
		setTimeout(() => {
			const current = bgSlot === 'A' ? urlA : urlB;
			if (current && current === bgUrl) {
				URL.revokeObjectURL(current);
				if (bgSlot === 'A') urlA = null;
				else urlB = null;
			}
		}, CROSSFADE_MS + 50);
	}

	function onEditorInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchPreview(currentContent()), 1000);
	}

	async function updatePreviewNow() {
		if (debounceTimer) clearTimeout(debounceTimer);
		await fetchPreview(currentContent());
	}

	function sanitizeFilename(title: string): string {
		return `${title.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 50) || 'letter'}.pdf`;
	}

	async function downloadPdf() {
		downloading = true;
		downloadError = null;
		if (debounceTimer) clearTimeout(debounceTimer);
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

		<form method="post" action="?/saveSections" class="flex flex-col gap-4" use:enhance>
			{#each sectionMeta as section (section.key)}
				<div id="section-{section.key}" class="rounded-lg border border-gray-200 px-3 py-3">
					<p class="font-medium">{section.prompt}</p>
					<div class="mt-2 flex flex-col gap-2">
						<Label for="{section.key}Text">{section.title} text</Label>
						<Textarea
							id="{section.key}Text"
							name="{section.key}Text"
							value={textFor(section.key)}
							oninput={(e) => {
								setText(section.key, e.currentTarget.value);
								onEditorInput();
							}}
							placeholder={'Use {%block%} and {{variable}} references'}
							rows={4}
						/>
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
			<div class="flex gap-2">
				<Input class="flex-1" type="submit" value="Save sections" />
			</div>
		</form>

		<div id="variables" class="rounded-lg bg-gray-300 px-3 py-3">
			<h3 class="text-lg font-semibold">Variables</h3>
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
						<li class="text-sm text-muted-foreground">No variables yet.</li>
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
						<Input id="variableName" name="variableName" type="text" placeholder="name" required />
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

		<div id="blocks" class="rounded-lg bg-gray-300 px-3 py-3">
			<h3 class="text-lg font-semibold">Blocks</h3>
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
						<li class="text-sm text-muted-foreground">No blocks yet.</li>
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
	</div>

	<div id="preview" class="w-full rounded-lg bg-gray-200 p-4 lg:w-1/2">
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
		{#if urlA || urlB}
			<div class="relative h-[70vh] overflow-hidden rounded bg-[#e8e6e1]">
				<iframe
					src={urlA ? urlA + PDF_VIEWER_FRAGMENT : undefined}
					title="Letter PDF preview"
					class="absolute inset-0 h-full w-full rounded bg-white transition-opacity duration-200 {topIsA
						? 'z-10 opacity-100'
						: 'z-0 opacity-0'}"
					aria-hidden={!topIsA}
					onload={() => onFrameLoad('A')}
				></iframe>
				<iframe
					src={urlB ? urlB + PDF_VIEWER_FRAGMENT : undefined}
					title="Letter PDF preview"
					class="absolute inset-0 h-full w-full rounded bg-white transition-opacity duration-200 {!topIsA
						? 'z-10 opacity-100'
						: 'z-0 opacity-0'}"
					aria-hidden={topIsA}
					onload={() => onFrameLoad('B')}
				></iframe>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">
				Nothing rendered yet. Write your sections, then press Update Preview.
			</p>
		{/if}
	</div>
</div>
