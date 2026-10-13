import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useElectronOAuth(onError: (message: string) => void) {
	const router = useRouter();

	useEffect(() => {
		if (typeof window === "undefined" || !window.electronAPI?.onOAuthCallback) {
			return;
		}
		const unsubscribe = window.electronAPI.onOAuthCallback(async (payload) => {
			try {
				await fetch("/api/auth/store-token", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						accessToken: payload.accessToken,
						refreshToken: payload.refreshToken ?? undefined,
						expiresIn: payload.expiresIn ?? undefined,
					}),
				});
				router.refresh();
			} catch {
				onError("Failed to finish Gmail sign-in. Please try again.");
			}
		});
		return unsubscribe;
	}, [router, onError]);
}
