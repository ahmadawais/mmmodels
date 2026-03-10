import { Command } from "commander";
import { fetchModels } from "../api.js";
import { treeJoin, tokenStr } from "../format.js";
import { printSmallBanner } from "../banner.js";
import { boolValue, fieldConnector, pc, sectionDivider } from "../output.js";
import { pickPreferredProviderMatch } from "../provider-preferences.js";
import { ConditionalSpinner } from "../spinner.js";
import type { ApiResponse, Model, Provider } from "../types.js";

interface InfoOptions {
	readonly json?: boolean;
	readonly provider?: string;
	readonly plain?: boolean;
	readonly sync?: boolean;
	readonly refresh?: boolean;
}

function printField(label: string, value: string): void {
	const connector = pc.gray(fieldConnector());
	console.log(`  ${connector}${pc.gray(label.padEnd(16))} ${value}`);
}

function formatCostLine(label: string, value: number | undefined): void {
	if (value === undefined) return;
	const connector = pc.gray(fieldConnector());
	console.log(
		`  ${connector}${pc.gray(label.padEnd(16))} ${pc.white(`$${value.toFixed(4)}/1M tokens`)}`,
	);
}

export function printModel(model: Model, provider: Provider): void {
	console.log(`\n  ${pc.white(model.name)}`);
	console.log(pc.gray(`  ${sectionDivider(50)}`));

	printField("ID:", pc.white(model.id));
	printField("Provider:", pc.white(provider.name));
	if (model.family) printField("Family:", pc.white(model.family));
	printField("Released:", pc.white(model.release_date));
	printField("Updated:", pc.white(model.last_updated));
	if (model.knowledge) printField("Knowledge:", pc.white(model.knowledge));
	if (model.status) printField("Status:", pc.white(model.status));

	console.log(pc.gray("\n  Capabilities"));
	printField("Tool calling:", boolValue(model.tool_call));
	printField("Reasoning:", boolValue(model.reasoning));
	printField("Attachments:", boolValue(model.attachment));
	printField(
		"Open weights:",
		boolValue(model.open_weights),
	);
	if (model.structured_output !== undefined) {
		printField(
			"Structured out:",
			boolValue(model.structured_output),
		);
	}
	if (model.temperature !== undefined) {
		printField(
			"Temperature:",
			boolValue(model.temperature),
		);
	}

	console.log(pc.gray("\n  Modalities"));
	printField("Input:", pc.white(model.modalities.input.join(", ")));
	printField("Output:", pc.white(model.modalities.output.join(", ")));

	console.log(pc.gray("\n  Limits"));
	printField("Context:", pc.white(`${tokenStr(model.limit.context)} tokens`));
	printField("Max output:", pc.white(`${tokenStr(model.limit.output)} tokens`));
	if (model.limit.input !== undefined) {
		printField("Max input:", pc.white(`${tokenStr(model.limit.input)} tokens`));
	}

	if (model.cost) {
		console.log(pc.gray("\n  Pricing (per 1M tokens)"));
		formatCostLine("Input:", model.cost.input);
		formatCostLine("Output:", model.cost.output);
		formatCostLine("Reasoning:", model.cost.reasoning);
		formatCostLine("Cache read:", model.cost.cache_read);
		formatCostLine("Cache write:", model.cost.cache_write);
		formatCostLine("Audio input:", model.cost.input_audio);
		formatCostLine("Audio output:", model.cost.output_audio);
		if (model.cost.context_over_200k) {
			console.log(pc.gray("\n  Pricing >200K context (per 1M tokens)"));
			formatCostLine("Input:", model.cost.context_over_200k.input);
			formatCostLine("Output:", model.cost.context_over_200k.output);
		}
	}

	console.log(pc.gray("\n  Links"));
	printField("Provider docs:", pc.white(provider.doc));
	printField("AI SDK npm:", pc.white(provider.npm));
	console.log();
}

export const infoCommand = new Command("info")
	.aliases(["details", "show", "model"])
	.description("Show detailed info about a model")
	.argument("<model-id>", "model ID (e.g. claude-opus-4-5, gpt-4o)")
	.option("-p, --provider <id>", "filter by provider ID")
	.option("-s, --sync", "sync the local cache before showing model details")
	.option("--refresh", "refresh the local cache from models.dev")
	.option("--plain", "plain ASCII output without banner, color, or spinner")
	.option("-j, --json", "output as JSON")
	.action(async (modelId: string, opts: InfoOptions) => {
		if (!opts.json) printSmallBanner();
		const spinner = new ConditionalSpinner("Fetching model info…", opts.json);
		let data: ApiResponse;
		try {
			data = await fetchModels({ refresh: opts.refresh || opts.sync });
			spinner.stop();
		} catch (err) {
			spinner.fail("Failed to fetch models");
			if (err instanceof Error) console.error(pc.gray(err.message));
			process.exit(1);
		}

		const matches: Array<{ providerId: string; provider: Provider; model: Model }> = [];

		for (const [providerId, provider] of Object.entries(data)) {
			if (opts.provider && providerId !== opts.provider) continue;

			for (const [id, model] of Object.entries(provider.models)) {
				if (id === modelId) {
					matches.push({ providerId, provider, model });
				}
			}
		}

		const match = pickPreferredProviderMatch(matches);
		if (match) {
			if (opts.json) {
				console.log(
					JSON.stringify(
						{
							...match.model,
							provider_id: match.provider.id,
							provider_name: match.provider.name,
						},
						null,
						2,
					),
				);
				return;
			}
			printModel(match.model, match.provider);
			return;
		}

		const providerNote = opts.provider
			? ` from provider "${opts.provider}"`
			: "";
		console.error(pc.gray(`\n  Model "${modelId}"${providerNote} not found.\n`));
		console.log(pc.gray("  Use `mmmodels search` to browse available models.\n"));
		process.exit(1);
	});
