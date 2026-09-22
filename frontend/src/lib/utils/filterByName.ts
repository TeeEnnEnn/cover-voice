export function filterByName<T extends { name: string }>(
	items: T[] | undefined,
	query: string
): T[] {
	const q = query.trim().toLowerCase();
	if (!q) return items ?? [];
	return (items ?? []).filter((i) => i.name.toLowerCase().includes(q));
}
