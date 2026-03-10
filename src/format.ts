import { isPlainMode, pc, treeBranchPrefix, treeConnector } from "./output.js";
import type { Model } from "./types.js";

export function formatCost(model: Model): string {
	if (!model.cost) return pc.gray("free");
	const i = model.cost.input.toFixed(2);
	const o = model.cost.output.toFixed(2);
	return `${pc.gray("in:")}${pc.white(`$${i}`)} ${pc.gray("out:")}${pc.white(`$${o}`)}`;
}

function parseModelDate(value: string): number {
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function getModelLatestDate(model: Model): number {
	return Math.max(
		parseModelDate(model.release_date),
		parseModelDate(model.last_updated),
	);
}

export function getModelBaseCost(model: Model): number {
	if (!model.cost) return Number.NEGATIVE_INFINITY;
	return model.cost.input + model.cost.output;
}

export function compareModelsByLatestDateDesc(a: Model, b: Model): number {
	const aDate = getModelLatestDate(a);
	const bDate = getModelLatestDate(b);

	if (aDate !== bDate) return bDate - aDate;

	const aUpdated = parseModelDate(a.last_updated);
	const bUpdated = parseModelDate(b.last_updated);
	if (aUpdated !== bUpdated) return bUpdated - aUpdated;

	return a.id.localeCompare(b.id);
}

export function compareModelsByNameAsc(a: Model, b: Model): number {
	const byName = a.name.localeCompare(b.name);
	if (byName !== 0) return byName;
	return a.id.localeCompare(b.id);
}

export function compareModelsByContextDesc(a: Model, b: Model): number {
	if (a.limit.context !== b.limit.context) {
		return b.limit.context - a.limit.context;
	}
	return compareModelsByNameAsc(a, b);
}

export function compareModelsByCostDesc(a: Model, b: Model): number {
	const aCost = getModelBaseCost(a);
	const bCost = getModelBaseCost(b);
	if (aCost !== bCost) return bCost - aCost;
	return compareModelsByNameAsc(a, b);
}

export function formatContext(model: Model): string {
	const ctx = model.limit.context;
	if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(0)}M`;
	if (ctx >= 1_000) return `${(ctx / 1_000).toFixed(0)}K`;
	return String(ctx);
}

export function tokenStr(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
	return String(n);
}

export function formatCapabilities(model: Model): string {
	const caps: string[] = [];
	if (model.tool_call) caps.push(pc.white("tools"));
	if (model.reasoning) caps.push(pc.white("reasoning"));
	if (model.attachment) caps.push(pc.white("files"));
	if (model.open_weights) caps.push(pc.white("open"));
	return caps.join(pc.gray("|"));
}

export function formatStatus(model: Model): string {
	if (model.status === "deprecated") return pc.gray(" [deprecated]");
	if (model.status === "alpha") return pc.gray(" [alpha]");
	if (model.status === "beta") return pc.gray(" [beta]");
	return "";
}

export function matchesCapabilityFilter(model: Model, capFilter: string): boolean {
	const caps = capFilter
		.toLowerCase()
		.split(",")
		.map((c) => c.trim());
	for (const cap of caps) {
		if (cap === "tool_call" || cap === "tools") {
			if (!model.tool_call) return false;
		} else if (cap === "reasoning") {
			if (!model.reasoning) return false;
		} else if (cap === "attachment" || cap === "files") {
			if (!model.attachment) return false;
		} else if (cap === "open_weights" || cap === "open") {
			if (!model.open_weights) return false;
		} else if (cap === "structured_output" || cap === "structured") {
			if (!model.structured_output) return false;
		}
	}
	return true;
}

export function treeItem(text: string, isLast: boolean = false, indent: string = ""): string {
	const dimmed = pc.gray(treeConnector(isLast));
	return `${indent}${dimmed}${text}`;
}

export function treeBranch(text: string, isLast: boolean = false): string {
	return pc.gray(treeBranchPrefix(isLast)) + text;
}

export function treeStart(text: string): string {
	return pc.gray(treeConnector(false)) + text;
}

export function treeEnd(text: string): string {
	return pc.gray(treeConnector(true)) + text;
}

export function treeContinue(text: string): string {
	if (isPlainMode()) return pc.gray("|") + "   " + text;
	return pc.gray("│") + "   " + text;
}

export function treeJoin(text: string, isLast: boolean = false): string {
	const connector = pc.gray(treeConnector(isLast));
	return connector + text;
}
