import zlib from "node:zlib";

export function buildZip(
	entries: Array<{ name: string; data: Buffer; deflate?: boolean }>,
) {
	const parts: Buffer[] = [];
	const central: Buffer[] = [];
	let offset = 0;

	for (const { name, data, deflate } of entries) {
		const nameBytes = Buffer.from(name);
		const body = deflate ? zlib.deflateRawSync(data) : data;
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt16LE(deflate ? 8 : 0, 8);
		local.writeUInt32LE(zlib.crc32(data), 14);
		local.writeUInt32LE(body.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(nameBytes.length, 26);
		parts.push(local, nameBytes, body);

		const entry = Buffer.alloc(46);
		entry.writeUInt32LE(0x02014b50, 0);
		entry.writeUInt16LE(20, 4);
		entry.writeUInt16LE(20, 6);
		entry.writeUInt16LE(deflate ? 8 : 0, 10);
		entry.writeUInt32LE(zlib.crc32(data), 16);
		entry.writeUInt32LE(body.length, 20);
		entry.writeUInt32LE(data.length, 24);
		entry.writeUInt16LE(nameBytes.length, 28);
		entry.writeUInt32LE(offset, 42);
		central.push(entry, nameBytes);
		offset += local.length + nameBytes.length + body.length;
	}

	const directory = Buffer.concat(central);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(entries.length, 8);
	end.writeUInt16LE(entries.length, 10);
	end.writeUInt32LE(directory.length, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...parts, directory, end]);
}
