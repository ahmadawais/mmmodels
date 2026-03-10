import { Command, Option } from "commander";
import { fetchModels } from "../api.js";
import { fuzzySearchModels } from "../search.js";
import {
	treeJoin,
	formatCost,
	formatContext,
	formatCapabilities,
	formatStatus,
	matchesCapabilityFilter,
	compareModelsByLatestDateDesc,
	compareModelsByNameAsc,
	compareModelsByContextDesc,
	compareModelsByCostDesc,
} from "../format.js";
import { printSmallBanner } from "../banner.js";
import { consumeBannerPrinted, pc } from "../output.js";
import { ConditionalSpinner } from "../spinner.js";
import { renderModelTable } from "../table.js";
import type { Model } from "../types.js";

export type ModelSort = "relevance" | "latest" | "name" | "context" | "cost";

export interface ModelQueryOptions {
	readonly provider?: string;
	readonly json?: boolean;
	readonly ndjson?: boolean;
	readonly idsOnly?: boolean;
	readonly fields?: string;
	readonly table?: boolean;
	readonly columns?: string;
	readonly limit?: number;
	readonly sort?: ModelSort;
	readonly sync?: boolean;
	readonly refresh?: boolean;
	readonly capabilities?: string;
	readonly status?: string;
	readonly plain?: boolean;
}

export interface ModelResult {
	readonly provider: string;
	readonly providerName?: string;
	readonly model: Model;
}

interface RunModelQueryConfig {
	readonly query?: string;
	readonly defaultSort?: ModelSort;
}

export function hasStructuredOutput(opts: ModelQueryOptions): boolean {
	return Boolean(opts.json || opts.ndjson || opts.idsOnly || opts.fields);
}

function wantsTableOutput(opts: ModelQueryOptions): boolean {
	return Boolean(opts.table || opts.columns);
}

function parsePositiveInteger(value: string): number {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error("`--limit` must be a positive integer.");
	}
	return parsed;
}

function parseFieldList(fields: string | undefined): string[] {
	return (fields ?? "")
		.split(",")
		.map((field) => field.trim())
		.filter(Boolean);
}

function serializeModelResult(result: ModelResult): Record<string, unknown> {
	return {
		...result.model,
		provider_id: result.provider,
		provider_name: result.providerName,
	};
}

function getPathValue(value: unknown, path: string): unknown {
	let current: unknown = value;
	for (const segment of path.split(".")) {
		if (!current || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
}

function formatFieldValue(value: unknown): string {
	if (value === undefined || value === null) return "";
	if (Array.isArray(value)) return value.join(",");
	if (typeof value === "object") return JSON.stringify(value);
	return String(value).replaceAll("\n", " ");
}

export function selectModelFields(
	result: ModelResult,
	fields: string[],
): Record<string, unknown> {
	const source = serializeModelResult(result);
	return Object.fromEntries(
		fields.map((field) => [field, getPathValue(source, field)]),
	);
}

export function sortModelResults(
	results: ModelResult[],
	sort: ModelSort,
): ModelResult[] {
	if (sort === "relevance") return results;

	const sorted = [...results];
	switch (sort) {
		case "latest":
			return sorted.sort((a, b) =>
				compareModelsByLatestDateDesc(a.model, b.model),
			);
		case "name":
			return sorted.sort((a, b) =>
				compareModelsByNameAsc(a.model, b.model),
			);
		case "context":
			return sorted.sort((a, b) =>
				compareModelsByContextDesc(a.model, b.model),
			);
		case "cost":
			return sorted.sort((a, b) =>
				compareModelsByCostDesc(a.model, b.model),
			);
	}
}

function validateQueryOptions(opts: ModelQueryOptions): void {
	if (opts.json && opts.ndjson) {
		throw new Error("Use either `--json` or `--ndjson`, not both.");
	}
	if (
		wantsTableOutput(opts) &&
		(opts.json || opts.ndjson || opts.idsOnly || opts.fields)
	) {
		throw new Error(
			"`--table` cannot be combined with `--json`, `--ndjson`, `--ids-only`, or `--fields`.",
		);
	}
	if (opts.idsOnly && (opts.json || opts.ndjson || opts.fields)) {
		throw new Error(
			"`--ids-only` cannot be combined with `--json`, `--ndjson`, or `--fields`.",
		);
	}
	if (opts.fields && parseFieldList(opts.fields).length === 0) {
		throw new Error("`--fields` must include at least one field.");
	}
}

function filterModelResults(
	results: ModelResult[],
	opts: ModelQueryOptions,
): ModelResult[] {
	return results.filter((result) => {
		if (
			opts.capabilities &&
			!matchesCapabilityFilter(result.model, opts.capabilities)
		) {
			return false;
		}

		if (opts.status) {
			const wantedStatus = opts.status.toLowerCase();
			const modelStatus = result.model.status ?? "stable";
			if (modelStatus !== wantedStatus) return false;
		}

		return true;
	});
}

export async function runModelQuery(
	opts: ModelQueryOptions,
	config: RunModelQueryConfig = {},
): Promise<ModelResult[]> {
	validateQueryOptions(opts);
	const spinner = new ConditionalSpinner(
		"Fetching models…",
		hasStructuredOutput(opts),
	);
	let data;
	try {
		data = await fetchModels({ refresh: opts.refresh || opts.sync });
		spinner.stop();
	} catch (err) {
		spinner.fail("Failed to fetch models");
		if (err instanceof Error) console.error(pc.gray(err.message));
		process.exit(1);
	}

	let results: ModelResult[] = [];

	for (const [providerId, provider] of Object.entries(data)) {
		if (opts.provider && providerId !== opts.provider) continue;

		for (const [_modelId, model] of Object.entries(provider.models)) {
			results.push({ provider: providerId, providerName: provider.name, model });
		}
	}

	if (config.query) {
		const allModels = Object.entries(data).flatMap(([providerId, provider]) =>
			Object.entries(provider.models).map(([_modelId, model]) => ({
				id: model.id,
				model,
				provider: providerId,
				providerName: provider.name,
			})),
		);
		const searchScope = opts.provider
			? allModels.filter((entry) => entry.provider === opts.provider)
			: allModels;
		results = fuzzySearchModels(searchScope, config.query).map((entry) => ({
			provider: entry.provider,
			providerName: entry.providerName,
			model: entry.model,
		}));
	}

	results = filterModelResults(results, opts);

	const sort = opts.sort ?? config.defaultSort;
	if (sort) {
		results = sortModelResults(results, sort);
	}

	if (opts.limit !== undefined) {
		results = results.slice(0, opts.limit);
	}

	return results;
}

export function renderModelResults(
	results: ModelResult[],
	opts: ModelQueryOptions,
): void {
	const fieldList = parseFieldList(opts.fields);

	if (opts.json) {
		console.log(
			JSON.stringify(
				results.map((result) =>
					fieldList.length > 0
						? selectModelFields(result, fieldList)
						: serializeModelResult(result),
				),
				null,
				2,
			),
		);
		return;
	}

	if (opts.ndjson) {
		for (const result of results) {
			const payload =
				fieldList.length > 0
					? selectModelFields(result, fieldList)
					: serializeModelResult(result);
			console.log(JSON.stringify(payload));
		}
		return;
	}

	if (opts.idsOnly) {
		for (const result of results) {
			console.log(result.model.id);
		}
		return;
	}

	if (fieldList.length > 0) {
		console.log(fieldList.join("\t"));
		for (const result of results) {
			const selected = selectModelFields(result, fieldList);
			console.log(
				fieldList
					.map((field) => formatFieldValue(selected[field]))
					.join("\t"),
			);
		}
		return;
	}

	if (wantsTableOutput(opts)) {
		if (results.length === 0) {
			console.log(pc.gray("  No models found matching your filters."));
			return;
		}

		console.log(pc.gray(`\n  Showing ${results.length} model(s)\n`));
		console.log(renderModelTable(results, { columns: opts.columns }));
		return;
	}

	if (results.length === 0) {
		console.log(pc.gray("  No models found matching your filters."));
		return;
	}

	console.log(pc.gray(`\n  Showing ${results.length} model(s)\n`));

	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (!result) continue;
		const { provider: providerId, model } = result;
		const isLast = i === results.length - 1;
		const status = formatStatus(model);

		console.log(`  ${treeJoin(pc.white(model.id) + status, isLast)}`);
		console.log(
			`  ${pc.gray(isLast ? "    " : "│   ")}${pc.gray("provider:")} ${pc.white(providerId)}`,
		);
		console.log(
			`  ${pc.gray(isLast ? "    " : "│   ")}${pc.gray("context:")} ${pc.white(formatContext(model))}`,
		);
		console.log(
			`  ${pc.gray(isLast ? "    " : "│   ")}${pc.gray("cost/1M:")} ${formatCost(model)}`,
		);
		console.log(
			`  ${pc.gray(isLast ? "    " : "│   ")}${pc.gray("caps:")} ${formatCapabilities(model) || pc.gray("none")}`,
		);
		if (!isLast) console.log();
	}
}

export const searchCommand = new Command("search")
	.aliases(["s", "query", "find"])
	.description("Search AI models by query")
	.argument("[query]", "search query (fuzzy match on name or ID)")
	.option("-p, --provider <id>", "filter by provider ID")
	.option("-c, --capabilities <list>", "filter by capabilities (tools,reasoning,files,open,structured)")
	.option(
		"--status <status>",
		"filter by status (alpha,beta,deprecated,stable)",
	)
	.addOption(
		new Option("--sort <sort>", "sort results")
			.choices(["relevance", "latest", "name", "context", "cost"] as const),
	)
	.option("--limit <n>", "limit number of results", parsePositiveInteger)
	.option("--fields <list>", "comma-separated field list (supports dot paths)")
	.option("--table", "render results as a compact table")
	.option("--columns <list>", "comma-separated table columns (implies --table)")
	.option("--ids-only", "output only model IDs, one per line")
	.option("--ndjson", "output newline-delimited JSON")
	.option("-s, --sync", "sync the local cache before running the query")
	.option("--refresh", "refresh the local cache from models.dev")
	.option("--plain", "plain ASCII output without banner, color, or spinner")
	.option("-j, --json", "output as JSON")
	.action(async (query: string | undefined, opts: ModelQueryOptions) => {
		if (!hasStructuredOutput(opts) && !consumeBannerPrinted()) {
			printSmallBanner();
		}
		const trimmedQuery = query?.trim();
		if (!trimmedQuery) {
			console.error(pc.gray("\n  `search` requires a query.\n"));
			console.log(
				pc.gray(
					"  Use `mmmodels list --provider anthropic` to list a provider's models.",
				),
			);
			console.log(
				pc.gray(
					"  Example: `mmmodels search claude --provider anthropic`\n",
				),
			);
			process.exit(1);
		}

		const results = await runModelQuery(opts, {
			query: trimmedQuery,
			defaultSort: "relevance",
		});
		renderModelResults(results, opts);
	});
