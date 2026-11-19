export const LOCAL_MODELS = [
	{
		id: "qwen3-0.6b",
		name: "Small · Qwen3 0.6B",
		description:
			"Quick download and fast on any computer. Gets amounts and dates right but often misses the merchant or person's name on banks it hasn't seen.",
		file: "Qwen3-0.6B-Q4_K_M.gguf",
		url: "https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf",
		size: 396_705_472,
		sha256: "ac2d97712095a558e31573f62f466a3f9d93990898b0ec79d7c974c1780d524a",
	},
	{
		id: "qwen3-1.7b",
		name: "Accurate · Qwen3 1.7B",
		description:
			"Larger download, about 1 second per email. Reads unfamiliar banks much better and names the merchant or person correctly far more often.",
		file: "Qwen3-1.7B-Q4_K_M.gguf",
		url: "https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf",
		size: 1_107_409_472,
		sha256: "b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897",
	},
] as const;

export type LocalModel = (typeof LOCAL_MODELS)[number];
export type LocalModelId = LocalModel["id"];

export const LOCAL_MODEL_IDS = LOCAL_MODELS.map((m) => m.id) as [
	LocalModelId,
	...LocalModelId[],
];

export const findLocalModel = (id: LocalModelId) =>
	LOCAL_MODELS.find((m) => m.id === id) ?? LOCAL_MODELS[0];
