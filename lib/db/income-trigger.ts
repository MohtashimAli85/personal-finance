export const DROP_INCOME_GROUP_TRIGGER =
	"DROP TRIGGER IF EXISTS prevent_income_group_delete";

export const CREATE_INCOME_GROUP_TRIGGER = `
	CREATE TRIGGER IF NOT EXISTS prevent_income_group_delete
	BEFORE DELETE ON category_group
	WHEN OLD.is_income = 1
	BEGIN
		SELECT RAISE(ABORT, 'Income group cannot be deleted');
	END;
`;
