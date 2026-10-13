import { InvalidToolApprovalSignatureError } from "ai";
import { describe, expect, it } from "vitest";
import { describeChatError } from "@/lib/ai/fallback";

describe("describeChatError", () => {
	it("tells the user an approval expired when its signature no longer verifies", () => {
		const error = new InvalidToolApprovalSignatureError({
			approvalId: "approval-1",
			toolCallId: "call-1",
			reason: "invalid signature",
		});

		expect(describeChatError(error)).toBe("This approval has expired. Ask again.");
	});
});
