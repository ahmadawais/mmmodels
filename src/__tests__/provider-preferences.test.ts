import { describe, expect, it } from "vitest";
import {
	getPreferredProvidersForModel,
	getPreferredProviderRank,
	pickPreferredProviderMatch,
} from "../provider-preferences.js";
import type { Model } from "../types.js";

const createMockModel = (id: string, name: string, family?: string): Model => ({
	id,
	name,
	family,
	attachment: true,
	reasoning: true,
	tool_call: true,
	release_date: "2025-01-01",
	last_updated: "2025-02-01",
	modalities: { input: ["text"], output: ["text"] },
	open_weights: false,
	limit: { context: 200000, output: 8192 },
});

describe("provider preferences", () => {
	it("should return preferred providers with fallbacks for known model families", () => {
		expect(
			getPreferredProvidersForModel(
				createMockModel("claude-opus-4-5", "Claude Opus 4.5", "claude"),
			),
		).toEqual(["dropik", "anthropic"]);
		expect(
			getPreferredProvidersForModel(createMockModel("gpt-5.4", "GPT-5.4", "gpt")),
		).toEqual(["openai"]);
		expect(
			getPreferredProvidersForModel(
				createMockModel("gemini-2.5-pro", "Gemini 2.5 Pro", "gemini"),
			),
		).toEqual(["google"]);
		expect(
			getPreferredProvidersForModel(
				createMockModel("llama-3.3-70b", "Llama 3.3 70B", "llama"),
			),
		).toEqual(["meta", "llama"]);
	});

	it("should rank the preferred provider ahead of fallbacks", () => {
		const model = createMockModel("claude-opus-4-5", "Claude Opus 4.5", "claude");

		expect(getPreferredProviderRank(model, "dropik")).toBeGreaterThan(
			getPreferredProviderRank(model, "anthropic"),
		);
		expect(getPreferredProviderRank(model, "anthropic")).toBeGreaterThan(0);
		expect(getPreferredProviderRank(model, "opencode")).toBe(0);
	});

	it("should pick the preferred provider match for duplicated model IDs", () => {
		const model = createMockModel("gpt-5.4", "GPT-5.4", "gpt");

		const match = pickPreferredProviderMatch([
			{
				providerId: "opencode",
				model,
			},
			{
				providerId: "openai",
				model: { ...model, last_updated: "2025-01-15" },
			},
		]);

		expect(match?.providerId).toBe("openai");
	});
});
