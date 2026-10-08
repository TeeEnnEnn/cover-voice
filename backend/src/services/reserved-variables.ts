/**
 * Reserved (`{{ }}`) variable names that resolve to the current date at
 * generation time instead of a user variable row. They work in direct refs
 * and inside blocks (same variable pass), take precedence over a
 * same-named user variable, and are never written to the usage junction
 * tables (there is no variable id to link).
 */

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
] as const;

const DAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
] as const;

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

/**
 * Computes the reserved `{{ }}` values for a point in time (server local
 * time). `now` is injectable so generation output stays testable.
 */
export function getReservedVariableValues(now: Date = new Date()): Map<string, string> {
	return new Map([
		['year', String(now.getFullYear())],
		['month_word', MONTH_NAMES[now.getMonth()]],
		['month_num', pad2(now.getMonth() + 1)],
		['day_word', DAY_NAMES[now.getDay()]],
		['day_num', pad2(now.getDate())]
	]);
}
