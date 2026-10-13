const TOKENS = /\d+\.?\d*|\.\d+|[-+*/()]/g;

export function evaluateExpression(input: string): number | null {
	if (input.replace(TOKENS, "").trim()) return null;
	const tokens = input.match(TOKENS) ?? [];
	let pos = 0;

	const expression = (): number => {
		let value = term();
		while (tokens[pos] === "+" || tokens[pos] === "-") {
			value = tokens[pos++] === "+" ? value + term() : value - term();
		}
		return value;
	};

	const term = (): number => {
		let value = factor();
		while (tokens[pos] === "*" || tokens[pos] === "/") {
			value = tokens[pos++] === "*" ? value * factor() : value / factor();
		}
		return value;
	};

	const factor = (): number => {
		const token = tokens[pos++];
		if (token === "-") return -factor();
		if (token === "(") {
			const value = expression();
			if (tokens[pos++] !== ")") throw new SyntaxError();
			return value;
		}
		const value = Number(token);
		if (Number.isNaN(value)) throw new SyntaxError();
		return value;
	};

	try {
		const result = expression();
		return pos === tokens.length && Number.isFinite(result) ? result : null;
	} catch {
		return null;
	}
}
