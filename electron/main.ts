import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { app, BrowserWindow, dialog, shell } from "electron";

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;
let serverPort = 6300;

const isDev = process.env.NODE_ENV === "development";

const deepLinkScheme = process.env.ELECTRON_DEEP_LINK_SCHEME || "myfinanceapp";

function handleDeepLink(url: string): void {
	console.log("[DeepLink]", url);
	const parsed = new URL(url);
	if (parsed.pathname !== "/oauth-callback") return;

	const accessToken = parsed.searchParams.get("access_token");
	const refreshToken = parsed.searchParams.get("refresh_token");
	const expiresIn = parsed.searchParams.get("expires_in");
	if (!accessToken) return;

	mainWindow?.webContents.send("oauth-callback", {
		accessToken,
		refreshToken: refreshToken ?? null,
		expiresIn: expiresIn ? Number(expiresIn) : null,
	});
}

function getFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address() as net.AddressInfo;
			server.close(() => resolve(address.port));
		});
	});
}

function getNextServerPath(): string {
	if (isDev) {
		return "";
	}
	return path.join(process.resourcesPath, "standalone", "server.js");
}

function startNextServer(): Promise<void> {
	return new Promise((resolve, reject) => {
		let command: string;
		let args: string[];
		let serverFile = "";
		const env: Record<string, string | undefined> = { ...process.env };

		if (isDev) {
			command = process.platform === "win32" ? "next.cmd" : "next";
			args = ["dev", "--port"];
			env.ELECTRON_RUN_AS_NODE = undefined;
		} else {
			serverFile = getNextServerPath();
			if (!fs.existsSync(serverFile)) {
				reject(new Error(`Next.js server not found at ${serverFile}`));
				return;
			}
			command = process.execPath;
			args = [serverFile];
			env.HOSTNAME = "127.0.0.1";
			env.NODE_ENV = "production";
			env.ELECTRON_RUN_AS_NODE = "1";
			env.APP_DB_PATH = path.join(app.getPath("userData"), "db.sqlite");
		}
		env.PORT = String(serverPort);

		let settled = false;
		let stderr = "";
		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			if (error) reject(error);
			else resolve();
		};

		nextServer = spawn(command, args, {
			env: env as NodeJS.ProcessEnv,
			cwd: isDev ? app.getAppPath() : path.dirname(serverFile),
			stdio: ["pipe", "pipe", "pipe"],
			shell: process.platform === "win32",
		});
		const child = nextServer;
		if (!child) return;

		child.stdout?.on("data", (data: Buffer) => {
			console.log("[Next.js]", data.toString());
		});

		child.stderr?.on("data", (data: Buffer) => {
			const text = data.toString();
			stderr += text;
			console.error("[Next.js Error]", text);
		});

		child.on("error", (err) => {
			console.error("Failed to start Next.js server:", err);
			finish(err);
		});

		child.on("exit", (code) => {
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
			const req = http.get(`http://127.0.0.1:${serverPort}`, (res) => {
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

	const url = `http://127.0.0.1:${serverPort}`;
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
	app.on("second-instance", (_event, argv) => {
		const url = argv.find((arg) => arg.startsWith(`${deepLinkScheme}://`));
		if (url) handleDeepLink(url);

		if (!mainWindow) return;
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.focus();
	});

	app.on("open-url", (event, url) => {
		event.preventDefault();
		handleDeepLink(url);
	});
}

app.whenReady().then(async () => {
	app.setAsDefaultProtocolClient(deepLinkScheme);

	try {
		serverPort = await getFreePort();
		console.log(`Starting Next.js server on port ${serverPort}`);
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
