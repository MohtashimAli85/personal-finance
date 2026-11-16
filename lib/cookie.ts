const ONE_YEAR = 60 * 60 * 24 * 365;

export function setCookie(name: string, value: string) {
	// biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is async and not needed for a plain preference write
	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}
