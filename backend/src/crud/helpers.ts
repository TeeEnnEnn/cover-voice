type SerializedDates<T> = {
	[K in keyof T]: T[K] extends Date ? string : T[K];
};

export function serializeTimestamps<T extends Record<string, unknown>>(row: T): SerializedDates<T> {
	const result = {} as SerializedDates<T>;
	for (const key in row) {
		const value = row[key];
		result[key] = (
			value instanceof Date ? value.toISOString() : value
		) as SerializedDates<T>[typeof key];
	}
	return result;
}

/** Postgres unique-violation code, possibly wrapped by drizzle. */
export function isUniqueViolation(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const code = (error as { code?: unknown }).code;
	if (code === '23505') return true;
	return isUniqueViolation((error as { cause?: unknown }).cause);
}

/** Drops `undefined` values so PATCH only touches provided fields (`null` passes through). */
export function stripUndefined<T extends Record<string, unknown>>(patch: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(patch).filter(([, value]) => value !== undefined)
	) as Partial<T>;
}
