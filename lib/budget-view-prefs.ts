export const SHOW_HIDDEN_COOKIE = "budget_show_hidden";
export const COLLAPSED_COOKIE = "budget_collapsed";

export const serializeCollapsed = (collapsed: Record<string, boolean>) =>
	Object.keys(collapsed)
		.filter((id) => collapsed[id])
		.join(".");

export const parseCollapsed = (value?: string): Record<string, boolean> =>
	Object.fromEntries(
		(value ?? "")
			.split(".")
			.filter(Boolean)
			.map((id) => [id, true]),
	);
