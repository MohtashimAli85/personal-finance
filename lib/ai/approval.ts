import crypto from "node:crypto";

const processSecret = crypto.randomBytes(32);

/** Signs tool approval requests so a crafted request body can't approve a
 * write on the user's behalf. Derived from APP_SECRET_KEY so pending
 * approvals survive a restart; otherwise per-process. */
export function toolApprovalSecret(): Uint8Array {
	const appSecret = process.env.APP_SECRET_KEY;
	if (!appSecret) return processSecret;
	return crypto
		.createHmac("sha256", appSecret)
		.update("tool-approval")
		.digest();
}
