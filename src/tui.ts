import { text, select } from "@clack/prompts";
import pc from "picocolors";
import { fetchModels } from "./api.js";
import { fuzzySearchModels } from "./search.js";
import { printSmallBanner } from "./banner.js";
import { printModel } from "./commands/info.js";
import type { Model } from "./types.js";

interface SearchResult {
	provider: string;
	providerName: string;
	model: Model;
}

export async function runTUI(): Promise<void> {
	printSmallBanner();

	const query = await text({
		message: "Search for a model (e.g., claude, gpt-4, llama)",
		placeholder: "opus",
	});

	if (!query || typeof query !== "string" || query.trim() === "") {
		process.exit(0);
	}

	const data = await fetchModels();
	const allModels: SearchResult[] = [];

	for (const [providerId, provider] of Object.entries(data)) {
		for (const [_modelId, model] of Object.entries(provider.models)) {
			allModels.push({ provider: providerId, providerName: provider.name, model });
		}
	}

	const searchResults = fuzzySearchModels(
		allModels.map((r) => ({ id: r.model.id, model: r.model, provider: r.provider, providerName: r.providerName })),
		query,
	);

	if (searchResults.length === 0) {
		console.log(pc.gray("\n  No models found matching your search.\n"));
		process.exit(0);
	}

	const options = searchResults.slice(0, 20).map((r) => ({
		value: `${r.provider}/${r.model.id}`,
		label: `${r.model.name} · ${r.providerName}`,
	}));

	const selected = await select({
		message: "Select a model",
		options,
	});

	if (!selected || typeof selected !== "string") {
		process.exit(0);
	}

	const slashIdx = selected.indexOf("/");
	if (slashIdx === -1) {
		console.log(pc.gray("\n  Invalid model format.\n"));
		process.exit(0);
	}

	const selectedProvider = selected.slice(0, slashIdx);
	const selectedModelId = selected.slice(slashIdx + 1);
	const selectedResult = searchResults.find(
		(r) =>
			r.provider === selectedProvider && r.model.id === selectedModelId,
	);

	if (!selectedResult) {
		console.log(pc.gray("\n  Model not found.\n"));
		process.exit(0);
	}

	const provider = data[selectedResult.provider];
	if (!provider) {
		console.log(pc.gray("\n  Provider data not found.\n"));
		process.exit(0);
	}
	printModel(selectedResult.model, provider);
}
