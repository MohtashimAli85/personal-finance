// Preload script - runs in a privileged context before the renderer page loads
// Use this to safely expose specific Node.js/Electron APIs to the renderer

import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
	platform: process.platform,
	isElectron: true,
});
