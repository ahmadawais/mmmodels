import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchModels, clearCache } from "../api.js";

describe("fetchModels", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearCache();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should fetch models successfully", async () => {
		const mockData = {
			anthropic: {
				name: "Anthropic",
				models: {
					"claude-opus-4-5": {
						id: "claude-opus-4-5",
						name: "Claude 3.5 Opus",
						provider: "Anthropic",
						cost: { input: 0.003, output: 0.015 },
						limit: { context: 200000 },
						tool_call: true,
						reasoning: true,
						attachment: true,
						open_weights: false,
						structured_output: true,
						status: "stable",
					},
				},
			},
		};

		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockData),
			}),
		) as unknown as typeof fetch;

		const result = await fetchModels();
		expect(result).toEqual(mockData);
		expect(global.fetch).toHaveBeenCalledWith("https://models.dev/api.json");
	});

	it("should throw error on fetch failure", async () => {
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: false,
				status: 404,
				statusText: "Not Found",
			}),
		) as unknown as typeof fetch;

		await expect(fetchModels()).rejects.toThrow(
			"Failed to fetch models: 404 Not Found",
		);
	});

	it("should throw error on network failure", async () => {
		global.fetch = vi.fn(() =>
			Promise.reject(new Error("Network error")),
		) as unknown as typeof fetch;

		await expect(fetchModels()).rejects.toThrow("Network error");
	});
});
