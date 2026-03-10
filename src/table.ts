import { tokenStr } from "./format.js";
import type { ModelResult } from "./commands/search.js";

export type TableColumnId =
	| "provider"
	| "model"
	| "family"
	| "provider_id"
	| "model_id"
	| "tool_call"
	| "reasoning"
	| "input"
	| "output"
	| "input_cost"
	| "output_cost"
	| "reasoning_cost"
	| "cache_cost"
	| "cache_read"
	| "cache_write"
	| "audio_input_cost"
	| "audio_output_cost"
	| "tokens"
	| "input_limit"
	| "output_limit"
	| "structured_output"
	| "temperature"
	| "weights"
	| "knowledge"
	| "release_date"
	| "last_updated"
	| "status";

type TableAlign = "left" | "right";

interface TableColumnDefinition {
	readonly id: TableColumnId;
	readonly label: string;
	readonly minWidth: number;
	readonly maxWidth: number;
	readonly align: TableAlign;
	readonly value: (result: ModelResult) => string;
}

const DEFAULT_TABLE_COLUMNS: TableColumnId[] = [
	"model_id",
	"provider_id",
	"tokens",
	"input_cost",
	"output_cost",
	"cache_cost",
];

const TABLE_COLUMN_ORDER: TableColumnId[] = [
	"provider",
	"model",
	"family",
	"provider_id",
	"model_id",
	"tool_call",
	"reasoning",
	"input",
	"output",
	"input_cost",
	"output_cost",
	"reasoning_cost",
	"cache_cost",
	"cache_read",
	"cache_write",
	"audio_input_cost",
	"audio_output_cost",
	"tokens",
	"input_limit",
	"output_limit",
	"structured_output",
	"temperature",
	"weights",
	"knowledge",
	"release_date",
	"last_updated",
	"status",
];

const TABLE_COLUMN_ALIASES: Record<string, TableColumnId> = {
	cache: "cache_cost",
	context: "tokens",
	context_limit: "tokens",
	input_modalities: "input",
	modelid: "model_id",
	output_modalities: "output",
	provider_name: "provider",
	providerid: "provider_id",
	tokens: "tokens",
};

function formatCompactNumber(value: number | undefined): string {
	if (value === undefined) return "-";
	if (value === 0) return "0";
	if (Math.abs(value) < 0.0001) return value.toExponential(1);
	return value.toFixed(4).replace(/\.?0+$/, "");
}

function formatBool(value: boolean | undefined): string {
	if (value === undefined) return "-";
	return value ? "yes" : "no";
}

function joinModalities(values: readonly string[]): string {
	return values.join("+");
}

function formatCacheCost(result: ModelResult): string {
	const read = formatCompactNumber(result.model.cost?.cache_read);
	const write = formatCompactNumber(result.model.cost?.cache_write);
	if (read === "-" && write === "-") return "-";
	return `${read}/${write}`;
}

function formatWeights(result: ModelResult): string {
	return result.model.open_weights ? "open" : "closed";
}

const TABLE_COLUMNS: Record<TableColumnId, TableColumnDefinition> = {
	provider: {
		id: "provider",
		label: "PROVIDER",
		minWidth: 8,
		maxWidth: 18,
		align: "left",
		value: (result) => result.providerName ?? result.provider,
	},
	model: {
		id: "model",
		label: "MODEL",
		minWidth: 10,
		maxWidth: 24,
		align: "left",
		value: (result) => result.model.name,
	},
	family: {
		id: "family",
		label: "FAMILY",
		minWidth: 8,
		maxWidth: 18,
		align: "left",
		value: (result) => result.model.family ?? "-",
	},
	provider_id: {
		id: "provider_id",
		label: "PROVIDER ID",
		minWidth: 10,
		maxWidth: 20,
		align: "left",
		value: (result) => result.provider,
	},
	model_id: {
		id: "model_id",
		label: "MODEL ID",
		minWidth: 12,
		maxWidth: 28,
		align: "left",
		value: (result) => result.model.id,
	},
	tool_call: {
		id: "tool_call",
		label: "TOOLS",
		minWidth: 5,
		maxWidth: 5,
		align: "left",
		value: (result) => formatBool(result.model.tool_call),
	},
	reasoning: {
		id: "reasoning",
		label: "REASON",
		minWidth: 6,
		maxWidth: 6,
		align: "left",
		value: (result) => formatBool(result.model.reasoning),
	},
	input: {
		id: "input",
		label: "INPUT",
		minWidth: 5,
		maxWidth: 16,
		align: "left",
		value: (result) => joinModalities(result.model.modalities.input),
	},
	output: {
		id: "output",
		label: "OUTPUT",
		minWidth: 6,
		maxWidth: 16,
		align: "left",
		value: (result) => joinModalities(result.model.modalities.output),
	},
	input_cost: {
		id: "input_cost",
		label: "IN($)",
		minWidth: 6,
		maxWidth: 10,
		align: "right",
		value: (result) => formatCompactNumber(result.model.cost?.input),
	},
	output_cost: {
		id: "output_cost",
		label: "OUT($)",
		minWidth: 6,
		maxWidth: 10,
		align: "right",
		value: (result) => formatCompactNumber(result.model.cost?.output),
	},
	reasoning_cost: {
		id: "reasoning_cost",
		label: "REASON $",
		minWidth: 8,
		maxWidth: 12,
		align: "right",
		value: (result) => formatCompactNumber(result.model.cost?.reasoning),
	},
	cache_cost: {
		id: "cache_cost",
		label: "CACHE R/W",
		minWidth: 9,
		maxWidth: 17,
		align: "right",
		value: formatCacheCost,
	},
	cache_read: {
		id: "cache_read",
		label: "CACHE R",
		minWidth: 7,
		maxWidth: 10,
		align: "right",
		value: (result) => formatCompactNumber(result.model.cost?.cache_read),
	},
	cache_write: {
		id: "cache_write",
		label: "CACHE W",
		minWidth: 7,
		maxWidth: 10,
		align: "right",
		value: (result) => formatCompactNumber(result.model.cost?.cache_write),
	},
	audio_input_cost: {
		id: "audio_input_cost",
		label: "AUDIO IN",
		minWidth: 8,
		maxWidth: 12,
		align: "right",
		value: (result) => formatCompactNumber(result.model.cost?.input_audio),
	},
	audio_output_cost: {
		id: "audio_output_cost",
		label: "AUDIO OUT",
		minWidth: 9,
		maxWidth: 12,
		align: "right",
		value: (result) => formatCompactNumber(result.model.cost?.output_audio),
	},
	tokens: {
		id: "tokens",
		label: "TOKENS",
		minWidth: 6,
		maxWidth: 8,
		align: "right",
		value: (result) => tokenStr(result.model.limit.context),
	},
	input_limit: {
		id: "input_limit",
		label: "IN LIMIT",
		minWidth: 8,
		maxWidth: 10,
		align: "right",
		value: (result) =>
			result.model.limit.input === undefined
				? "-"
				: tokenStr(result.model.limit.input),
	},
	output_limit: {
		id: "output_limit",
		label: "OUT LIMIT",
		minWidth: 9,
		maxWidth: 10,
		align: "right",
		value: (result) => tokenStr(result.model.limit.output),
	},
	structured_output: {
		id: "structured_output",
		label: "STRUCT",
		minWidth: 6,
		maxWidth: 6,
		align: "left",
		value: (result) => formatBool(result.model.structured_output),
	},
	temperature: {
		id: "temperature",
		label: "TEMP",
		minWidth: 4,
		maxWidth: 4,
		align: "left",
		value: (result) => formatBool(result.model.temperature),
	},
	weights: {
		id: "weights",
		label: "WEIGHTS",
		minWidth: 6,
		maxWidth: 6,
		align: "left",
		value: formatWeights,
	},
	knowledge: {
		id: "knowledge",
		label: "KNOWLEDGE",
		minWidth: 10,
		maxWidth: 16,
		align: "left",
		value: (result) => result.model.knowledge ?? "-",
	},
	release_date: {
		id: "release_date",
		label: "RELEASED",
		minWidth: 10,
		maxWidth: 10,
		align: "left",
		value: (result) => result.model.release_date,
	},
	last_updated: {
		id: "last_updated",
		label: "UPDATED",
		minWidth: 10,
		maxWidth: 10,
		align: "left",
		value: (result) => result.model.last_updated,
	},
	status: {
		id: "status",
		label: "STATUS",
		minWidth: 6,
		maxWidth: 10,
		align: "left",
		value: (result) => result.model.status ?? "stable",
	},
};

export function getAvailableTableColumns(): TableColumnId[] {
	return [...TABLE_COLUMN_ORDER];
}

export function resolveTableColumns(columns?: string): TableColumnId[] {
	if (!columns) return [...DEFAULT_TABLE_COLUMNS];

	const requested = columns
		.split(",")
		.map((column) => column.trim().toLowerCase())
		.filter(Boolean);

	if (requested.length === 0) return [...DEFAULT_TABLE_COLUMNS];
	if (requested.includes("all")) return [...TABLE_COLUMN_ORDER];

	const resolved: TableColumnId[] = [];

	for (const column of requested) {
		const normalized = column.replace(/[^a-z0-9_]+/g, "_");
		const id = TABLE_COLUMN_ALIASES[normalized] ?? normalized;
		if (!(id in TABLE_COLUMNS)) {
			const supported = TABLE_COLUMN_ORDER.join(", ");
			throw new Error(
				`Unknown table column \`${column}\`. Supported columns: ${supported}.`,
			);
		}

		const typedId = id as TableColumnId;
		if (!resolved.includes(typedId)) resolved.push(typedId);
	}

	return resolved;
}

function truncate(value: string, width: number): string {
	if (value.length <= width) return value;
	if (width <= 3) return value.slice(0, width);
	return `${value.slice(0, width - 3)}...`;
}

function pad(value: string, width: number, align: TableAlign): string {
	const truncated = truncate(value, width);
	if (align === "right") return truncated.padStart(width, " ");
	return truncated.padEnd(width, " ");
}

function getTerminalWidth(): number {
	return process.stdout.columns ?? 120;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function fitColumnWidths(
	columnIds: TableColumnId[],
	rows: string[][],
	terminalWidth: number,
): number[] {
	const widths = columnIds.map((id, index) => {
		const column = TABLE_COLUMNS[id];
		const contentWidth = Math.max(
			column.label.length,
			...rows.map((row) => (row[index] ?? "").length),
		);
		return clamp(contentWidth, column.minWidth, column.maxWidth);
	});

	const separatorWidth = columnIds.length > 1 ? (columnIds.length - 1) * 2 : 0;
	const minimumWidth =
		columnIds.reduce((sum, id) => sum + TABLE_COLUMNS[id].minWidth, 0) +
		separatorWidth;
	if (minimumWidth > terminalWidth) {
		throw new Error(
			"Requested table columns do not fit in the current terminal width. Remove some columns or use `--fields`/`--json`.",
		);
	}

	let totalWidth = widths.reduce((sum, width) => sum + width, 0) + separatorWidth;
	while (totalWidth > terminalWidth) {
		let widestIndex = -1;
		let widestWidth = -1;

		for (let i = 0; i < widths.length; i++) {
			const width = widths[i];
			if (width === undefined) continue;
			const columnId = columnIds[i];
			if (!columnId) continue;
			const minWidth = TABLE_COLUMNS[columnId].minWidth;
			if (width > minWidth && width > widestWidth) {
				widestWidth = width;
				widestIndex = i;
			}
		}

		if (widestIndex === -1) break;
		const nextWidth = widths[widestIndex];
		if (nextWidth === undefined) break;
		widths[widestIndex] = nextWidth - 1;
		totalWidth -= 1;
	}

	return widths;
}

export interface RenderTableOptions {
	readonly columns?: string;
	readonly terminalWidth?: number;
}

export function renderModelTable(
	results: ModelResult[],
	options: RenderTableOptions = {},
): string {
	const columnIds = resolveTableColumns(options.columns);
	const rows = results.map((result) =>
		columnIds.map((id) => TABLE_COLUMNS[id].value(result)),
	);
	const widths = fitColumnWidths(
		columnIds,
		rows,
		options.terminalWidth ?? getTerminalWidth(),
	);

	const header = columnIds
		.map((id, index) =>
			pad(TABLE_COLUMNS[id].label, widths[index] ?? 0, TABLE_COLUMNS[id].align),
		)
		.join("  ");
	const divider = widths.map((width) => "-".repeat(width)).join("  ");
	const body = rows.map((row) =>
		row
			.map((value, index) =>
				pad(
					value,
					widths[index] ?? 0,
					TABLE_COLUMNS[columnIds[index] ?? "model_id"].align,
				),
			)
			.join("  "),
	);

	return [header, divider, ...body].join("\n");
}
