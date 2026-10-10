import zlib from "node:zlib";

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const MAX_COMMENT_LENGTH = 0xffff;
const ZIP64_MARKER = 0xffffffff;

export class ZipError extends Error {}

export const isZip = (bytes: Buffer) =>
	bytes.length >= 4 && bytes.readUInt32LE(0) === LOCAL_FILE_HEADER;

function findEndOfCentralDirectory(zip: Buffer) {
	const lowest = Math.max(0, zip.length - 22 - MAX_COMMENT_LENGTH);
	for (let offset = zip.length - 22; offset >= lowest; offset--) {
		if (zip.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) return offset;
	}
	throw new ZipError("Not a valid zip file.");
}

export function readZipEntry(zip: Buffer, fileName: string): Buffer | null {
	const end = findEndOfCentralDirectory(zip);
	const entryCount = zip.readUInt16LE(end + 10);
	let offset = zip.readUInt32LE(end + 16);

	for (let index = 0; index < entryCount; index++) {
		if (zip.readUInt32LE(offset) !== CENTRAL_DIRECTORY_ENTRY) {
			throw new ZipError("Zip directory is corrupt.");
		}
		const method = zip.readUInt16LE(offset + 10);
		const compressedSize = zip.readUInt32LE(offset + 20);
		const size = zip.readUInt32LE(offset + 24);
		const nameLength = zip.readUInt16LE(offset + 28);
		const extraLength = zip.readUInt16LE(offset + 30);
		const commentLength = zip.readUInt16LE(offset + 32);
		const localOffset = zip.readUInt32LE(offset + 42);
		const name = zip.toString("utf8", offset + 46, offset + 46 + nameLength);
		offset += 46 + nameLength + extraLength + commentLength;

		if (name !== fileName && !name.endsWith(`/${fileName}`)) continue;
		if (compressedSize === ZIP64_MARKER || size === ZIP64_MARKER) {
			throw new ZipError("Zip64 archives are not supported.");
		}
		if (zip.readUInt32LE(localOffset) !== LOCAL_FILE_HEADER) {
			throw new ZipError("Zip entry is corrupt.");
		}
		const dataStart =
			localOffset +
			30 +
			zip.readUInt16LE(localOffset + 26) +
			zip.readUInt16LE(localOffset + 28);
		const data = zip.subarray(dataStart, dataStart + compressedSize);

		if (method === 0) return Buffer.from(data);
		if (method === 8) {
			if (size === 0) return Buffer.alloc(0);
			return zlib.inflateRawSync(data, { maxOutputLength: size });
		}
		throw new ZipError("Unsupported zip compression.");
	}
	return null;
}
