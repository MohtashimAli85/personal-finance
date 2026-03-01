import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow, shell } from "electron";

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === "development";
const PORT = process.env.PORT || 3000;

function getNextServerPath(): string {
	if (isDev) {
		return ""; // In dev, Next.js dev server is started separately
	}
	// In production, the standalone server.js is copied into the app
	return path.join(process.resourcesPath, "standalone", "server.js");
}

function startNextServer(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (isDev) {
			// In dev mode, we expect the Next.js dev server to already be running
			resolve();
			return;
		}

		const serverPath = getNextServerPath();
		if (!fs.existsSync(serverPath)) {
			reject(new Error(`Next.js server not found at ${serverPath}`));
			return;
		}

		// Set environment variables for the Next.js server
		const env = {
			...process.env,
			PORT: String(PORT),
			HOSTNAME: "127.0.0.1",
			NODE_ENV: "production",
		};

		nextServer = spawn(process.execPath, [serverPath], {
			env,
			cwd: path.join(process.resourcesPath, "standalone"),
			stdio: ["pipe", "pipe", "pipe"],
		});

		nextServer.stdout?.on("data", (data: Buffer) => {
			const output = data.toString();
			console.log("[Next.js]", output);
			// Resolve when server is ready
			if (output.includes("Ready") || output.includes("started server")) {
				resolve();
			}
		});

		nextServer.stderr?.on("data", (data: Buffer) => {
			console.error("[Next.js Error]", data.toString());
		});

		nextServer.on("error", (err) => {
			console.error("Failed to start Next.js server:", err);
			reject(err);
		});

		nextServer.on("exit", (code) => {
			console.log(`Next.js server exited with code ${code}`);
			nextServer = null;
		});

		// Timeout fallback - resolve after 5 seconds even if no "Ready" message
		setTimeout(() => resolve(), 5000);
	});
}

function createWindow(): void {
	mainWindow = new BrowserWindow({
		width: 1280,
		height: 800,
		minWidth: 900,
		minHeight: 600,
		title: "Personal Finance",
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js"),
		},
		// macOS specific
		titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
		trafficLightPosition: { x: 16, y: 16 },
		show: false,
	});

	// Show window when ready to avoid flash
	mainWindow.once("ready-to-show", () => {
		mainWindow?.show();
	});

	// Load the Next.js app
	const url = `http://127.0.0.1:${PORT}`;
	mainWindow.loadURL(url);

	// Open external links in default browser
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (url.startsWith("http")) {
			shell.openExternal(url);
		}
		return { action: "deny" };
	});

	// Open DevTools in dev mode
	if (isDev) {
		mainWindow.webContents.openDevTools();
	}

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

// App lifecycle
app.whenReady().then(async () => {
	try {
		await startNextServer();
		createWindow();
	} catch (err) {
		console.error("Failed to start application:", err);
		app.quit();
	}
});

app.on("window-all-closed", () => {
	// On macOS, apps typically stay active until Cmd+Q
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	// On macOS, re-create window when dock icon is clicked
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

app.on("before-quit", () => {
	// Kill the Next.js server when quitting
	if (nextServer) {
		nextServer.kill();
		nextServer = null;
	}
});
