import { type ChildProcess, spawn } from "node:child_process";
import crypto from "node:crypto";
import type { EventEmitter } from "node:events";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import {
	app,
	BrowserWindow,
	dialog,
	nativeTheme,
	safeStorage,
	shell,
	type UtilityProcess,
	utilityProcess,
} from "electron";

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | UtilityProcess | null = null;
const PREFERRED_PORT = 3123;
let serverPort = PREFERRED_PORT;

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

function syncDockIcon(): void {
	const theme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
	app.dock?.setIcon(
		path.join(app.getAppPath(), "resources", `dock-${theme}.png`),
	);
}

function listenOnce(port: number): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on("error", reject);
		server.listen(port, "127.0.0.1", () => {
			const address = server.address() as net.AddressInfo;
			server.close(() => resolve(address.port));
		});
	});
}

function appOrigin(): string {
	return `http://127.0.0.1:${serverPort}`;
}

function isAppUrl(url: string): boolean {
	try {
		return new URL(url).origin === appOrigin();
	} catch {
		return false;
	}
}

function openExternalIfWeb(url: string): void {
	try {
		const { protocol } = new URL(url);
		if (protocol === "http:" || protocol === "https:") {
			shell.openExternal(url);
		}
	} catch {}
}

function getNextServerPath(): string {
	if (isDev) {
		return "";
	}
	return path.join(process.resourcesPath, "standalone", "server.js");
}

function loadAppSecretKey(): string | undefined {
	if (process.env.APP_SECRET_KEY) return process.env.APP_SECRET_KEY;
	if (!safeStorage.isEncryptionAvailable()) return undefined;
	if (
		process.platform === "linux" &&
		safeStorage.getSelectedStorageBackend() === "basic_text"
	) {
		return undefined;
	}

	const file = path.join(app.getPath("userData"), "secret.key");
	if (fs.existsSync(file)) {
		try {
			return safeStorage.decryptString(fs.readFileSync(file));
		} catch (err) {
			console.error("[Secrets] Could not decrypt secret.key:", err);
			return undefined;
		}
	}

	const key = crypto.randomBytes(32).toString("hex");
	fs.writeFileSync(file, safeStorage.encryptString(key), { mode: 0o600 });
	return key;
}

// Packaged builds leave out .env files, so settings such as the Google OAuth
// client are read from app.env in the user-data folder (KEY=VALUE lines).
function loadAppEnvFile(env: Record<string, string | undefined>): void {
	const file = path.join(app.getPath("userData"), "app.env");
	if (!fs.existsSync(file)) return;
	for (const line of fs.readFileSync(file, "utf8").split("\n")) {
		const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
		if (match && env[match[1]] === undefined) {
			env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
		}
	}
}

function startNextServer(): Promise<void> {
	return new Promise((resolve, reject) => {
		let serverFile = "";
		const env: Record<string, string | undefined> = { ...process.env };

		if (isDev) {
			env.ELECTRON_RUN_AS_NODE = undefined;
		} else {
			serverFile = getNextServerPath();
			if (!fs.existsSync(serverFile)) {
				reject(new Error(`Next.js server not found at ${serverFile}`));
				return;
			}
			loadAppEnvFile(env);
			env.NEXT_PUBLIC_APP_URL = appOrigin();
			env.HOSTNAME = "127.0.0.1";
			env.NODE_ENV = "production";
			env.APP_DB_PATH = path.join(app.getPath("userData"), "db.sqlite");
			env.APP_MIGRATIONS_PATH = path.join(
				process.resourcesPath,
				"standalone",
				"drizzle",
			);
		}
		env.PORT = String(serverPort);
		env.APP_SECRET_KEY = loadAppSecretKey();

		let settled = false;
		let stderr = "";
		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			if (error) reject(error);
			else resolve();
		};

		// utilityProcess runs the server without a visible app-switcher entry;
		// a spawned Electron child would appear as its own app.
		const child: ChildProcess | UtilityProcess = isDev
			? spawn(
					process.platform === "win32" ? "next.cmd" : "next",
					["dev", "--port", String(serverPort)],
					{
						env: env as NodeJS.ProcessEnv,
						cwd: app.getAppPath(),
						stdio: ["pipe", "pipe", "pipe"],
						shell: process.platform === "win32",
					},
				)
			: utilityProcess.fork(serverFile, [], {
					env: env as NodeJS.ProcessEnv,
					cwd: path.dirname(serverFile),
					stdio: "pipe",
					serviceName: "Next.js server",
				});
		nextServer = child;

		child.stdout?.on("data", (data: Buffer) => {
			console.log("[Next.js]", data.toString());
		});

		child.stderr?.on("data", (data: Buffer) => {
			const text = data.toString();
			stderr += text;
			console.error("[Next.js Error]", text);
		});

		const events: EventEmitter = child;

		events.on("error", (err: Error) => {
			console.error("Failed to start Next.js server:", err);
			finish(err);
		});

		events.on("exit", (code: number) => {
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
			const req = http.get(appOrigin(), (res) => {
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
		show: false,
	});

	mainWindow.once("ready-to-show", () => {
		mainWindow?.show();
	});

	const url = appOrigin();
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

	mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
		// Google sign-in runs in the system browser; it returns via the deep link.
		if (targetUrl.startsWith(`${appOrigin()}/api/auth/google/login`)) {
			event.preventDefault();
			shell.openExternal(targetUrl);
			return;
		}
		if (isAppUrl(targetUrl)) return;
		event.preventDefault();
		openExternalIfWeb(targetUrl);
	});

	mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
		if (!isAppUrl(targetUrl)) openExternalIfWeb(targetUrl);
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

	if (process.platform === "darwin") {
		syncDockIcon();
		nativeTheme.on("updated", syncDockIcon);
	}

	try {
		// Fixed port: the Google OAuth redirect URI must match exactly.
		serverPort = await listenOnce(PREFERRED_PORT);
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

let quitting = false;

app.on("before-quit", (event) => {
	if (quitting || !nextServer) return;
	quitting = true;
	event.preventDefault();

	const server = nextServer;
	nextServer = null;

	// Give the server a chance to checkpoint its WAL and close the sqlite
	// handle (see lib/db/shutdown.ts) before the process is torn down.
	const forceKillTimer = setTimeout(() => {
		if (server.pid) process.kill(server.pid, "SIGKILL");
	}, 3000);

	const events: EventEmitter = server;
	events.once("exit", () => {
		clearTimeout(forceKillTimer);
		app.quit();
	});
	server.kill();
});
