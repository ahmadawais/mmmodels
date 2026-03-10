import { describe, it, expect } from "vitest";
import { fuzzySearchModels } from "../search.js";
import type { Model } from "../types.js";

const createMockModel = (id: string, name: string): Model => ({
	id,
	name,
	attachment: true,
	reasoning: true,
	tool_call: true,
	release_date: "2024-05-01",
	last_updated: "2024-12-01",
	modalities: { input: ["text"], output: ["text"] },
	open_weights: false,
	limit: { context: 4096, output: 2048 },
});

describe("fuzzySearchModels", () => {
	const models = [
		{ id: "claude-opus-4-5", model: createMockModel("claude-opus-4-5", "Claude 3.5 Opus"), provider: "anthropic", providerName: "Anthropic" },
		{ id: "gpt-4o", model: createMockModel("gpt-4o", "GPT-4 Omni"), provider: "openai", providerName: "OpenAI" },
		{ id: "gpt-4-turbo", model: createMockModel("gpt-4-turbo", "GPT-4 Turbo"), provider: "openai", providerName: "OpenAI" },
		{ id: "llama-3.1", model: createMockModel("llama-3.1", "Llama 3.1"), provider: "meta", providerName: "Meta" },
		{ id: "gemini-pro", model: createMockModel("gemini-pro", "Gemini Pro"), provider: "google", providerName: "Google" },
	];

	it("should return all models when query is empty", () => {
		const results = fuzzySearchModels(models, "");
		expect(results).toHaveLength(5);
	});

	it("should find exact matches by ID", () => {
		const results = fuzzySearchModels(models, "claude-opus-4-5");
		expect(results).toHaveLength(1);
		expect(results[0]?.id).toBe("claude-opus-4-5");
	});

	it("should find exact matches by name", () => {
		const results = fuzzySearchModels(models, "GPT-4 Omni");
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.id === "gpt-4o")).toBe(true);
	});

	it("should support fuzzy matching", () => {
		const results = fuzzySearchModels(models, "gpt4");
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.id === "gpt-4o")).toBe(true);
	});

	it("should support partial matches", () => {
		const results = fuzzySearchModels(models, "gpt");
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.id === "gpt-4o")).toBe(true);
		expect(results.some((r) => r.id === "gpt-4-turbo")).toBe(true);
	});

	it("should support case-insensitive search", () => {
		const resultLower = fuzzySearchModels(models, "claude");
		const resultUpper = fuzzySearchModels(models, "CLAUDE");
		expect(resultLower.length).toBeGreaterThan(0);
		expect(resultUpper.length).toBeGreaterThan(0);
	});

	it("should search both ID and name fields", () => {
		const results = fuzzySearchModels(models, "llama");
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.id === "llama-3.1")).toBe(true);
	});

	it("should allow one-digit version tokens in multi-token queries", () => {
		const results = fuzzySearchModels(models, "llama 3");
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.id === "llama-3.1")).toBe(true);
	});

	it("should allow spaced version queries even when a provider name contains the family token", () => {
		const gptModel = {
			id: "gpt-5.4",
			model: createMockModel("gpt-5.4", "GPT-5.4"),
			provider: "openai",
			providerName: "OpenAI",
		};
		const unrelatedProvider = {
			id: "custom-model",
			model: createMockModel("custom-model", "Custom Model"),
			provider: "nano-gpt",
			providerName: "NanoGPT",
		};

		const results = fuzzySearchModels([gptModel, unrelatedProvider], "gpt 5.4");

		expect(results).toHaveLength(1);
		expect(results[0]?.id).toBe("gpt-5.4");
	});

	it("should not match unrelated providers for family queries", () => {
		const llamaModel = {
			id: "llama-3.1",
			model: createMockModel("llama-3.1", "Llama 3.1"),
			provider: "meta",
			providerName: "Meta",
		};
		const unrelatedProvider = {
			id: "qwen3-coder",
			model: createMockModel("qwen3-coder", "Qwen 3 Coder"),
			provider: "ollama-cloud",
			providerName: "Ollama Cloud",
		};

		const results = fuzzySearchModels([llamaModel, unrelatedProvider], "llama 3");

		expect(results).toHaveLength(1);
		expect(results[0]?.id).toBe("llama-3.1");
	});

	it("should search provider names", () => {
		const results = fuzzySearchModels(models, "anthropic");
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.id === "claude-opus-4-5")).toBe(true);
	});

	it("should prefer newer models when relevance ties", () => {
		const older = {
			id: "claude-older",
			model: {
				...createMockModel("claude-older", "Claude Older"),
				release_date: "2024-01-01",
				last_updated: "2024-01-02",
			},
			provider: "anthropic",
			providerName: "Anthropic",
		};
		const newer = {
			id: "claude-newer",
			model: {
				...createMockModel("claude-newer", "Claude Newer"),
				release_date: "2025-02-01",
				last_updated: "2025-02-03",
			},
			provider: "anthropic",
			providerName: "Anthropic",
		};

		const results = fuzzySearchModels([older, newer], "anthropic");

		expect(results[0]?.id).toBe("claude-newer");
		expect(results[1]?.id).toBe("claude-older");
	});

	it("should prefer the default provider over newer third-party providers for gpt models", () => {
		const openAiResult = {
			id: "gpt-5.4",
			model: {
				...createMockModel("gpt-5.4", "GPT-5.4"),
				last_updated: "2025-01-01",
			},
			provider: "openai",
			providerName: "OpenAI",
		};
		const thirdPartyResult = {
			id: "gpt-5.4",
			model: {
				...createMockModel("gpt-5.4", "GPT-5.4"),
				last_updated: "2025-03-01",
			},
			provider: "opencode",
			providerName: "OpenCode Zen",
		};

		const results = fuzzySearchModels([thirdPartyResult, openAiResult], "gpt 5.4");

		expect(results[0]?.provider).toBe("openai");
		expect(results[1]?.provider).toBe("opencode");
	});

	it("should prefer the anthropic fallback for claude models", () => {
		const anthropicResult = {
			id: "claude-sonnet-4",
			model: {
				...createMockModel("claude-sonnet-4", "Claude Sonnet 4"),
				last_updated: "2025-01-01",
			},
			provider: "anthropic",
			providerName: "Anthropic",
		};
		const thirdPartyResult = {
			id: "claude-sonnet-4",
			model: {
				...createMockModel("claude-sonnet-4", "Claude Sonnet 4"),
				last_updated: "2025-03-01",
			},
			provider: "opencode",
			providerName: "OpenCode Zen",
		};

		const results = fuzzySearchModels([thirdPartyResult, anthropicResult], "claude");

		expect(results[0]?.provider).toBe("anthropic");
		expect(results[1]?.provider).toBe("opencode");
	});

	it("should return empty array for no matches", () => {
		const results = fuzzySearchModels(models, "xyz123notexist");
		expect(results).toHaveLength(0);
	});

	it("should require minimum match length of 2", () => {
		const results = fuzzySearchModels(models, "g");
		expect(results).toHaveLength(0);
	});
});
