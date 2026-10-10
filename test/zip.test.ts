import { describe, expect, it } from "vitest";
import { readZipEntry } from "@/lib/zip";
import { buildZip } from "./zip-fixture";

const text = Buffer.from("hello ".repeat(500));

describe("readZipEntry", () => {
	it("reads stored and deflated entries, including nested paths", () => {
		const zip = buildZip([
			{ name: "metadata.json", data: Buffer.from("{}") },
			{ name: "backup/db.sqlite", data: text, deflate: true },
		]);
		expect(readZipEntry(zip, "metadata.json")?.toString()).toBe("{}");
		expect(readZipEntry(zip, "db.sqlite")).toEqual(text);
	});

	it("returns null for a missing entry and throws on garbage", () => {
		const zip = buildZip([{ name: "a.txt", data: text }]);
		expect(readZipEntry(zip, "db.sqlite")).toBeNull();
		expect(() => readZipEntry(Buffer.from("PK\x03\x04nope"), "a")).toThrow();
	});
});
