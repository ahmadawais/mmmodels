import { describe, expect, it } from "vitest";
import { renderModelTable, resolveTableColumns } from "../table.js";
import type { Model } from "../types.js";

const createMockModel = (id: string, name: string): Model => ({
	id,
	name,
	family: "gpt",
	attachment: true,
	reasoning: true,
	tool_call: true,
	release_date: "2025-01-01",
	last_updated: "2025-02-01",
	modalities: { input: ["text"], output: ["text"] },
	open_weights: false,
	cost: {
		input: 1.25,
		output: 10,
		cache_read: 0.125,
		cache_write: 1.25,
	},
	limit: { context: 400000, output: 16000 },
});

describe("resolveTableColumns", () => {
	it("should use the compact default column set", () => {
		expect(resolveTableColumns()).toEqual([
			"model_id",
			"provider_id",
			"tokens",
			"input_cost",
			"output_cost",
			"cache_cost",
		]);
	});

	it("should resolve friendly aliases", () => {
		expect(resolveTableColumns("model_id,provider_id,context,cache")).toEqual([
			"model_id",
			"provider_id",
			"tokens",
			"cache_cost",
		]);
	});

	it("should reject unknown columns", () => {
		expect(() => resolveTableColumns("model_id,unknown_column")).toThrow(
			/Unknown table column/,
		);
	});
});

describe("renderModelTable", () => {
	it("should render a compact table that fits the requested width", () => {
		const table = renderModelTable(
			[
				{
					provider: "openai",
					model: createMockModel("gpt-5.4", "GPT-5.4"),
				},
				{
					provider: "anthropic",
					model: createMockModel("claude-opus-4.5-long-name", "Claude Opus 4.5"),
				},
			],
			{ terminalWidth: 72 },
		);

		const lines = table.split("\n");
		expect(lines[0]).toContain("MODEL ID");
		expect(lines[0]).toContain("CACHE R/W");
		expect(lines.some((line) => line.includes("gpt-5.4"))).toBe(true);
		expect(lines.some((line) => line.includes("400K"))).toBe(true);
		expect(lines.every((line) => line.length <= 72)).toBe(true);
	});

	it("should fail when the requested columns cannot fit", () => {
		expect(() =>
			renderModelTable(
				[
					{
						provider: "openai",
						model: createMockModel("gpt-5.4", "GPT-5.4"),
					},
				],
				{
					columns:
						"provider,model,family,provider_id,model_id,input,output,input_cost,output_cost,cache_cost,tokens,knowledge,release_date,last_updated",
					terminalWidth: 40,
				},
			),
		).toThrow(/do not fit/);
	});
});
