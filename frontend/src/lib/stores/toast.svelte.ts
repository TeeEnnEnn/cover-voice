export type ToastKind = 'success' | 'error';

export type Toast = {
	id: number;
	kind: ToastKind;
	message: string;
};

let nextId = 1;
export const toasts = $state<Toast[]>([]);

export function pushToast(kind: ToastKind, message: string, timeoutMs = 5000): void {
	const id = nextId++;
	toasts.push({ id, kind, message });
	setTimeout(() => dismissToast(id), timeoutMs);
}

export function dismissToast(id: number): void {
	const index = toasts.findIndex((toast) => toast.id === id);
	if (index >= 0) toasts.splice(index, 1);
}
