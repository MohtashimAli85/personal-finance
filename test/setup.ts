import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";

// Any module that imports lib/db before createTestDb() runs would otherwise
// open the real project database.
process.env.APP_DB_PATH = path.join(
	os.tmpdir(),
	`pf-guard-${randomUUID()}.sqlite`,
);
