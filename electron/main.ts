import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { app, BrowserWindow, dialog, shell } from "electron";

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === "development";
const PORT = process.env.PORT || 6300;

function getNextServerPath(): string {
	if (isDev) {
		return "";
	}
	return path.join(process.resourcesPath, "standalone", "server.js");
}

function startNextServer(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (isDev) {
			resolve();
			return;
		}

		const serverPath = getNextServerPath();
		if (!fs.existsSync(serverPath)) {
			reject(new Error(`Next.js server not found at ${serverPath}`));
			return;
		}

		const env: NodeJS.ProcessEnv = {
			...process.env,
			PORT: String(PORT),
			HOSTNAME: "127.0.0.1",
			NODE_ENV: "production",
			ELECTRON_RUN_AS_NODE: "1",
			APP_DB_PATH: path.join(app.getPath("userData"), "db.sqlite"),
		};

		let settled = false;
		let stderr = "";

		nextServer = spawn(process.execPath, [serverPath], {
			env,
			cwd: path.join(process.resourcesPath, "standalone"),
			stdio: ["pipe", "pipe", "pipe"],
		});

		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			if (error) reject(error);
			else resolve();
		};

		nextServer.stdout?.on("data", (data: Buffer) => {
			console.log("[Next.js]", data.toString());
		});

		nextServer.stderr?.on("data", (data: Buffer) => {
			const text = data.toString();
			stderr += text;
			console.error("[Next.js Error]", text);
		});

		nextServer.on("error", (err) => {
			console.error("Failed to start Next.js server:", err);
			finish(err);
		});

		nextServer.on("exit", (code) => {
			console.log(`Next.js server exited with code ${code}`);
			nextServer = null;
			finish(
				new Error(
					`Next.js server exited with code ${code}${stderr ? `\n${stderr}` : ""}`,
				),
			);
		});

		const startedAt = Date.now();
		const poll = () => {
			if (settled) return;
			const req = http.get(`http://127.0.0.1:${PORT}`, (res) => {
				res.resume();
				finish();
			});
			req.on("error", () => {
				if (settled) return;
				if (Date.now() - startedAt > 30_000) {
					nextServer?.kill();
					finish(new Error("Next.js server did not become ready in time"));
					return;
				}
				setTimeout(poll, 250);
			});
		};

		poll();
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
		titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
		trafficLightPosition: { x: 16, y: 16 },
		show: false,
	});

	mainWindow.once("ready-to-show", () => {
		mainWindow?.show();
	});

	const url = `http://127.0.0.1:${PORT}`;
	let loadAttempts = 0;
	mainWindow.loadURL(url);
	mainWindow.webContents.on("did-fail-load", (_event, errorCode) => {
		if (!mainWindow || mainWindow.isDestroyed() || errorCode === -3) return;
		loadAttempts += 1;
		if (loadAttempts > 10) return;
		setTimeout(() => {
			if (mainWindow && !mainWindow.isDestroyed()) {
				mainWindow.loadURL(url);
			}
		}, 500);
	});

	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (url.startsWith("http")) {
			shell.openExternal(url);
		}
		return { action: "deny" };
	});

	if (isDev) {
		mainWindow.webContents.openDevTools();
	}

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
	app.quit();
} else {
	app.on("second-instance", () => {
		if (!mainWindow) return;
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.focus();
	});
}

app.whenReady().then(async () => {
	try {
		await startNextServer();
		createWindow();
	} catch (err) {
		console.error("Failed to start application:", err);
		dialog.showErrorBox(
			"Failed to start",
			err instanceof Error ? err.message : String(err),
		);
		app.quit();
	}
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

app.on("before-quit", () => {
	if (nextServer) {
		nextServer.kill();
		nextServer = null;
	}
});
