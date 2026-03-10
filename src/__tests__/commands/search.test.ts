import { describe, it, expect, vi } from "vitest";
import {
	formatCost,
	formatContext,
	formatCapabilities,
	formatStatus,
	matchesCapabilityFilter,
	getModelLatestDate,
	compareModelsByLatestDateDesc,
	getModelBaseCost,
	compareModelsByNameAsc,
	compareModelsByContextDesc,
	compareModelsByCostDesc,
} from "../../format.js";
import {
	selectModelFields,
	sortModelResults,
	type ModelResult,
} from "../../commands/search.js";
import type { Model } from "../../types.js";

// Mock picocolors to simplify testing
vi.mock("picocolors", () => ({
	default: {
		gray: (s: string) => `[gray:${s}]`,
		white: (s: string) => `[white:${s}]`,
	},
	createColors: (enabled: boolean = true) => ({
		gray: (s: string) => (enabled ? `[gray:${s}]` : s),
		white: (s: string) => (enabled ? `[white:${s}]` : s),
	}),
}));

const mockModel: Model = {
	id: "claude-opus-4-5",
	name: "Claude 3.5 Opus",
	attachment: true,
	reasoning: true,
	tool_call: true,
	release_date: "2024-05-01",
	last_updated: "2024-12-01",
	modalities: {
		input: ["text", "image"],
		output: ["text"],
	},
	open_weights: false,
	cost: { input: 0.01, output: 0.02 },
	limit: { context: 200000, output: 4096 },
	structured_output: true,
};

describe("formatCost", () => {
	it("should format cost with input and output prices", () => {
		const result = formatCost(mockModel);
		expect(result).toContain("0.01");
		expect(result).toContain("0.02");
	});

	it("should return 'free' when model has no cost", () => {
		const freeModel: Model = { ...mockModel, cost: undefined };
		const result = formatCost(freeModel);
		expect(result).toContain("free");
	});

	it("should format prices with 2 decimal places", () => {
		const model: Model = {
			...mockModel,
			cost: { input: 0.1234, output: 0.5678 },
		};
		const result = formatCost(model);
		expect(result).toContain("0.12");
		expect(result).toContain("0.57");
	});
});

describe("provider recency sorting", () => {
	it("should score models by the most recent release or update date", () => {
		expect(getModelLatestDate(mockModel)).toBe(Date.parse("2024-12-01"));
		expect(
			getModelLatestDate({
				...mockModel,
				release_date: "2025-01-15",
				last_updated: "2024-12-01",
			}),
		).toBe(Date.parse("2025-01-15"));
	});

	it("should sort models from newest to oldest", () => {
		const newest: Model = {
			...mockModel,
			id: "newest",
			release_date: "2025-02-01",
			last_updated: "2025-02-15",
		};
		const older: Model = {
			...mockModel,
			id: "older",
			release_date: "2024-07-01",
			last_updated: "2024-07-10",
		};
		const oldest: Model = {
			...mockModel,
			id: "oldest",
			release_date: "2024-03-01",
			last_updated: "2024-03-01",
		};

		const sorted = [older, oldest, newest].sort(compareModelsByLatestDateDesc);

		expect(sorted.map((model) => model.id)).toEqual([
			"newest",
			"older",
			"oldest",
		]);
	});
});

describe("model sort helpers", () => {
	it("should compute base cost from input plus output", () => {
		expect(getModelBaseCost(mockModel)).toBe(0.03);
		expect(getModelBaseCost({ ...mockModel, cost: undefined })).toBe(
			Number.NEGATIVE_INFINITY,
		);
	});

	it("should sort models by name ascending", () => {
		const a = { ...mockModel, id: "b", name: "Alpha" };
		const b = { ...mockModel, id: "a", name: "Bravo" };
		expect(compareModelsByNameAsc(a, b)).toBeLessThan(0);
	});

	it("should sort models by context descending", () => {
		const larger = {
			...mockModel,
			id: "larger",
			limit: { context: 400000, output: 4096 },
		};
		const smaller = {
			...mockModel,
			id: "smaller",
			limit: { context: 100000, output: 4096 },
		};
		expect(compareModelsByContextDesc(larger, smaller)).toBeLessThan(0);
	});

	it("should sort models by cost descending", () => {
		const expensive = {
			...mockModel,
			id: "expensive",
			cost: { input: 0.4, output: 0.5 },
		};
		const cheap = {
			...mockModel,
			id: "cheap",
			cost: { input: 0.01, output: 0.02 },
		};
		expect(compareModelsByCostDesc(expensive, cheap)).toBeLessThan(0);
	});

	it("should project selected fields including dot paths", () => {
		const result: ModelResult = {
			provider: "anthropic",
			model: mockModel,
		};

		expect(
			selectModelFields(result, ["id", "provider_id", "limit.context", "cost.input"]),
		).toEqual({
			id: "claude-opus-4-5",
			provider_id: "anthropic",
			"limit.context": 200000,
			"cost.input": 0.01,
		});
	});

	it("should sort model results by the requested mode", () => {
		const alpha: ModelResult = {
			provider: "anthropic",
			model: { ...mockModel, id: "alpha", name: "Alpha" },
		};
		const zulu: ModelResult = {
			provider: "anthropic",
			model: { ...mockModel, id: "zulu", name: "Zulu" },
		};

		const sorted = sortModelResults([zulu, alpha], "name");
		expect(sorted.map((result) => result.model.name)).toEqual(["Alpha", "Zulu"]);
	});
});

describe("formatContext", () => {
	it("should format large context as millions", () => {
		const model: Model = { ...mockModel, limit: { context: 2_000_000, output: 4096 } };
		const result = formatContext(model);
		expect(result).toBe("2M");
	});

	it("should format medium context as thousands", () => {
		const model: Model = { ...mockModel, limit: { context: 100_000, output: 4096 } };
		const result = formatContext(model);
		expect(result).toBe("100K");
	});

	it("should format small context as regular number", () => {
		const model: Model = { ...mockModel, limit: { context: 5000, output: 4096 } };
		const result = formatContext(model);
		expect(result).toBe("5K");
	});

	it("should handle exact boundaries", () => {
		let result = formatContext({ ...mockModel, limit: { context: 1_000_000, output: 4096 } });
		expect(result).toBe("1M");

		result = formatContext({ ...mockModel, limit: { context: 1000, output: 4096 } });
		expect(result).toBe("1K");
	});
});

describe("formatCapabilities", () => {
	it("should list all enabled capabilities", () => {
		const model: Model = {
			...mockModel,
			tool_call: true,
			reasoning: true,
			attachment: true,
			open_weights: true,
		};
		const result = formatCapabilities(model);
		expect(result).toContain("tools");
		expect(result).toContain("reasoning");
		expect(result).toContain("files");
		expect(result).toContain("open");
	});

	it("should return empty string when no capabilities", () => {
		const model: Model = {
			...mockModel,
			tool_call: false,
			reasoning: false,
			attachment: false,
			open_weights: false,
		};
		const result = formatCapabilities(model);
		expect(result).toBe("");
	});

	it("should list only enabled capabilities", () => {
		const model: Model = {
			...mockModel,
			tool_call: true,
			reasoning: false,
			attachment: true,
			open_weights: false,
		};
		const result = formatCapabilities(model);
		expect(result).toContain("tools");
		expect(result).toContain("files");
		expect(result).not.toContain("reasoning");
		expect(result).not.toContain("open");
	});
});

describe("formatStatus", () => {
	it("should mark deprecated models", () => {
		const result = formatStatus({ ...mockModel, status: "deprecated" });
		expect(result).toContain("deprecated");
	});

	it("should mark alpha models", () => {
		const result = formatStatus({ ...mockModel, status: "alpha" });
		expect(result).toContain("alpha");
	});

	it("should mark beta models", () => {
		const result = formatStatus({ ...mockModel, status: "beta" });
		expect(result).toContain("beta");
	});

	it("should return empty string for stable models", () => {
		const result = formatStatus({ ...mockModel, status: undefined });
		expect(result).toBe("");
	});

	it("should return empty string when status is undefined", () => {
		const result = formatStatus({ ...mockModel, status: undefined });
		expect(result).toBe("");
	});
});

describe("matchesCapabilityFilter", () => {
	it("should match all required capabilities", () => {
		const model: Model = {
			...mockModel,
			tool_call: true,
			reasoning: true,
		};
		expect(matchesCapabilityFilter(model, "tools,reasoning")).toBe(true);
	});

	it("should fail if any required capability is missing", () => {
		const model: Model = {
			...mockModel,
			tool_call: true,
			reasoning: false,
		};
		expect(matchesCapabilityFilter(model, "tools,reasoning")).toBe(false);
	});

	it("should handle case-insensitive filter", () => {
		const model: Model = { ...mockModel, tool_call: true };
		expect(matchesCapabilityFilter(model, "TOOLS")).toBe(true);
		expect(matchesCapabilityFilter(model, "ToOlS")).toBe(true);
	});

	it("should handle whitespace in filter", () => {
		const model: Model = {
			...mockModel,
			tool_call: true,
			reasoning: true,
		};
		expect(matchesCapabilityFilter(model, "tools, reasoning")).toBe(true);
		expect(matchesCapabilityFilter(model, "  tools  ,  reasoning  ")).toBe(true);
	});

	it("should accept alias names for capabilities", () => {
		const model: Model = {
			...mockModel,
			tool_call: true,
			reasoning: true,
			attachment: true,
			open_weights: true,
			structured_output: true,
		};
		expect(matchesCapabilityFilter(model, "tool_call")).toBe(true);
		expect(matchesCapabilityFilter(model, "files")).toBe(true);
		expect(matchesCapabilityFilter(model, "open")).toBe(true);
		expect(matchesCapabilityFilter(model, "structured")).toBe(true);
	});

	it("should require all listed capabilities", () => {
		const model: Model = {
			...mockModel,
			tool_call: true,
			reasoning: false,
			attachment: true,
		};
		expect(matchesCapabilityFilter(model, "tools,attachment")).toBe(true);
		expect(matchesCapabilityFilter(model, "tools,reasoning,attachment")).toBe(
			false,
		);
	});
});
