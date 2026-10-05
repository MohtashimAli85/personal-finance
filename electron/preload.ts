// Preload script - runs in a privileged context before the renderer page loads
// Use this to safely expose specific Node.js/Electron APIs to the renderer

import { contextBridge, ipcRenderer } from "electron";

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
		ipcRenderer.on("oauth-callback", (_event, payload) => callback(payload));
	},
});
