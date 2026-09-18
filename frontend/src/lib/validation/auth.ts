export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const USERNAME_MIN_LENGTH = 3;

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** Returns an error message when invalid, otherwise null. */
export function validatePassword(password: string): string | null {
	if (!password) return 'Password is required.';
	if (password.length < PASSWORD_MIN_LENGTH)
		return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
	if (password.length > PASSWORD_MAX_LENGTH)
		return `Password must be at most ${PASSWORD_MAX_LENGTH} characters long.`;
	if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
		return 'Password must contain at least one letter and one number.';
	return null;
}

export interface SignupValues {
	username: string;
	email: string;
}

/** Validates the full signup payload. Returns { message } on failure. */
export function validateSignup(input: {
	username: string;
	email: string;
	password: string;
	confirmation: string;
}): { message: string } | null {
	if (!input.username || input.username.length < USERNAME_MIN_LENGTH)
		return { message: `Username must be at least ${USERNAME_MIN_LENGTH} characters long.` };
	if (!input.email || !EMAIL_RE.test(input.email))
		return { message: 'Please enter a valid email address.' };
	const passwordError = validatePassword(input.password);
	if (passwordError) return { message: passwordError };
	if (input.password !== input.confirmation)
		return { message: 'Password and password confirmation do not match.' };
	return null;
}
