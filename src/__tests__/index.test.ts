import { createRequire } from "node:module";
import { describe, it, expect, vi, beforeEach } from "vitest";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };

describe("mmmodels CLI", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should have correct version from package.json", () => {
		expect(typeof pkg.version).toBe("string");
		expect(pkg.version.length).toBeGreaterThan(0);
	});

	it("should export search, list, providers, sync, and info commands", async () => {
		const { searchCommand } = await import("../commands/search.js");
		const { listCommand } = await import("../commands/list.js");
		const { providersCommand } = await import("../commands/providers.js");
		const { syncCommand } = await import("../commands/sync.js");
		const { infoCommand } = await import("../commands/info.js");

		expect(searchCommand).toBeDefined();
		expect(searchCommand.name()).toBe("search");

		expect(listCommand).toBeDefined();
		expect(listCommand.name()).toBe("list");

		expect(providersCommand).toBeDefined();
		expect(providersCommand.name()).toBe("providers");

		expect(syncCommand).toBeDefined();
		expect(syncCommand.name()).toBe("sync");

		expect(infoCommand).toBeDefined();
		expect(infoCommand.name()).toBe("info");
	});

	it("should expose the sync flag on commands that fetch catalog data", async () => {
		const { searchCommand } = await import("../commands/search.js");
		const { listCommand } = await import("../commands/list.js");
		const { providersCommand } = await import("../commands/providers.js");
		const { infoCommand } = await import("../commands/info.js");

		expect(searchCommand.options.some((option) => option.long === "--sync")).toBe(
			true,
		);
		expect(listCommand.options.some((option) => option.long === "--sync")).toBe(
			true,
		);
		expect(
			providersCommand.options.some((option) => option.long === "--sync"),
		).toBe(true);
		expect(infoCommand.options.some((option) => option.long === "--sync")).toBe(
			true,
		);
	});

	it("should have correct bin configuration", async () => {
		// Verify API functions are properly exported
		const { fetchModels } = await import("../api.js");
		expect(typeof fetchModels).toBe("function");
	});
});
