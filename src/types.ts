export interface Cost {
	readonly input: number;
	readonly output: number;
	readonly reasoning?: number;
	readonly cache_read?: number;
	readonly cache_write?: number;
	readonly input_audio?: number;
	readonly output_audio?: number;
	readonly context_over_200k?: Omit<Cost, "context_over_200k">;
}

export interface ModelLimit {
	readonly context: number;
	readonly input?: number;
	readonly output: number;
}

export interface ModelModalities {
	readonly input: ReadonlyArray<"text" | "audio" | "image" | "video" | "pdf">;
	readonly output: ReadonlyArray<"text" | "audio" | "image" | "video" | "pdf">;
}

export interface Model {
	readonly id: string;
	readonly name: string;
	readonly family?: string;
	readonly attachment: boolean;
	readonly reasoning: boolean;
	readonly tool_call: boolean;
	readonly structured_output?: boolean;
	readonly temperature?: boolean;
	readonly knowledge?: string;
	readonly release_date: string;
	readonly last_updated: string;
	readonly modalities: ModelModalities;
	readonly open_weights: boolean;
	readonly cost?: Cost;
	readonly limit: ModelLimit;
	readonly status?: "alpha" | "beta" | "deprecated";
	readonly provider?: {
		readonly npm?: string;
		readonly api?: string;
	};
}

export interface Provider {
	readonly id: string;
	readonly name: string;
	readonly npm: string;
	readonly api?: string;
	readonly env: ReadonlyArray<string>;
	readonly doc: string;
	readonly models: Record<string, Model>;
}

export type ApiResponse = Record<string, Provider>;
