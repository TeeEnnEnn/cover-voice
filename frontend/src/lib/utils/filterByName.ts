export function filterBy<T>(
	items: T[] | undefined,
	query: string,
	getText: (item: T) => string
): T[] {
	const q = query.trim().toLowerCase();
	if (!q) return items ?? [];
	return (items ?? []).filter((i) => getText(i).toLowerCase().includes(q));
}

export function filterByName<T extends { name: string }>(
	items: T[] | undefined,
	query: string
): T[] {
	return filterBy(items, query, (i) => i.name);
}

export function filterByTitle<T extends { title: string }>(
	items: T[] | undefined,
	query: string
): T[] {
	return filterBy(items, query, (i) => i.title);
}
