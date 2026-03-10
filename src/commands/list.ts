import { Command, Option } from "commander";
import { printSmallBanner } from "../banner.js";
import {
	hasStructuredOutput,
	renderModelResults,
	runModelQuery,
	type ModelQueryOptions,
} from "./search.js";

export const listCommand = new Command("list")
	.aliases(["ls", "models"])
	.description("List AI models, optionally filtered to a provider")
	.option("-p, --provider <id>", "filter by provider ID")
	.option(
		"-c, --capabilities <list>",
		"filter by capabilities (tools,reasoning,files,open,structured)",
	)
	.option(
		"--status <status>",
		"filter by status (alpha,beta,deprecated,stable)",
	)
	.addOption(
		new Option("--sort <sort>", "sort results")
			.choices(["latest", "name", "context", "cost"] as const),
	)
	.option("--limit <n>", "limit number of results", (value: string) => {
		const parsed = Number.parseInt(value, 10);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			throw new Error("`--limit` must be a positive integer.");
		}
		return parsed;
	})
	.option("--fields <list>", "comma-separated field list (supports dot paths)")
	.option("--table", "render results as a compact table")
	.option("--columns <list>", "comma-separated table columns (implies --table)")
	.option("--ids-only", "output only model IDs, one per line")
	.option("--ndjson", "output newline-delimited JSON")
	.option("-s, --sync", "sync the local cache before listing")
	.option("--refresh", "refresh the local cache from models.dev")
	.option("--plain", "plain ASCII output without banner, color, or spinner")
	.option("-j, --json", "output as JSON")
	.action(async (opts: ModelQueryOptions) => {
		if (!hasStructuredOutput(opts)) printSmallBanner();
		const results = await runModelQuery(opts, { defaultSort: "latest" });
		renderModelResults(results, opts);
	});
