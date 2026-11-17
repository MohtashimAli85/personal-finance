import { normalizeCategoryGroupState } from "./bootstrap";
import { sqlite } from "./client";
import { replaceAllRows } from "./restore";

export function eraseDatabase() {
	sqlite.transaction(() => {
		replaceAllRows(sqlite);
		normalizeCategoryGroupState();
	})();
}
