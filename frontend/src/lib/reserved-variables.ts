// Client-side mirror of the backend reserved variables
// (backend/src/services/reserved-variables.ts). Used so the editor treats
// reserved {{ }} refs as known: reference chips, autocomplete, and the
// "used variables" computation. Values are computed locally for display;
// the backend is the source of truth at generation time.

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

export const RESERVED_VARIABLE_NAMES = new Set([
	'year',
	'month_word',
	'month_num',
	'day_word',
	'day_num'
]);

export function isReservedVariableName(name: string): boolean {
	return RESERVED_VARIABLE_NAMES.has(name);
}

export function getReservedVariableValues(now: Date = new Date()): Map<string, string> {
	return new Map([
		['year', String(now.getFullYear())],
		['month_word', MONTH_NAMES[now.getMonth()]],
		['month_num', pad2(now.getMonth() + 1)],
		['day_word', DAY_NAMES[now.getDay()]],
		['day_num', pad2(now.getDate())]
	]);
}

/** Suggestion rows for autocomplete pools (display values are today's). */
export function reservedVariableSuggestions(
	now: Date = new Date()
): Array<{ id: string; name: string; value: string }> {
	return Array.from(getReservedVariableValues(now), ([name, value]) => ({
		id: `reserved:${name}`,
		name,
		value
	}));
}
