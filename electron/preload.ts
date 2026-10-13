// Preload script - runs in a privileged context before the renderer page loads
// Use this to safely expose specific Node.js/Electron APIs to the renderer

import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
	platform: process.platform,
	isElectron: true,
	onOAuthCallback: (
		callback: (payload: {
			accessToken: string;
			refreshToken: string | null;
			expiresIn: number | null;
		}) => void,
	) => {
		const listener = (
			_event: IpcRendererEvent,
			payload: Parameters<typeof callback>[0],
		) => callback(payload);
		ipcRenderer.on("oauth-callback", listener);
		return () => {
			ipcRenderer.removeListener("oauth-callback", listener);
		};
	},
});
