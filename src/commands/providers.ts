import { Command } from "commander";
import { fetchModels } from "../api.js";
import { treeJoin } from "../format.js";
import { printSmallBanner } from "../banner.js";
import { pc } from "../output.js";
import { ConditionalSpinner } from "../spinner.js";
import type { ApiResponse } from "../types.js";

interface ProvidersOptions {
	readonly json?: boolean;
	readonly plain?: boolean;
	readonly sync?: boolean;
	readonly refresh?: boolean;
}

export const providersCommand = new Command("providers")
	.aliases(["p", "list-providers", "orgs"])
	.description("List all AI providers")
	.option("-s, --sync", "sync the local cache before listing providers")
	.option("--refresh", "refresh the local cache from models.dev")
	.option("--plain", "plain ASCII output without banner, color, or spinner")
	.option("-j, --json", "output as JSON")
	.action(async (opts: ProvidersOptions) => {
		if (!opts.json) printSmallBanner();
		const spinner = new ConditionalSpinner("Fetching providers…", opts.json);
		let data: ApiResponse;
		try {
			data = await fetchModels({ refresh: opts.refresh || opts.sync });
			spinner.stop();
		} catch (err) {
			spinner.fail("Failed to fetch providers");
			if (err instanceof Error) console.error(pc.gray(err.message));
			process.exit(1);
		}

		if (opts.json) {
			const providers = Object.entries(data).map(([id, p]) => ({
				id,
				name: p.name,
				npm: p.npm,
				doc: p.doc,
				model_count: Object.keys(p.models).length,
			}));
			console.log(JSON.stringify(providers, null, 2));
			return;
		}

		const entries = Object.entries(data).sort(([, a], [, b]) =>
			a.name.localeCompare(b.name),
		);

		console.log(pc.gray(`\n  ${entries.length} providers\n`));

		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			if (!entry) continue;
			const [id, provider] = entry;
			const count = Object.keys(provider.models).length;
			const isLast = i === entries.length - 1;

			console.log(`  ${treeJoin(pc.white(id), isLast)}`);
			console.log(`  ${pc.gray(isLast ? "    " : "│   ")}${pc.gray("name:")} ${pc.white(provider.name)}`);
			console.log(`  ${pc.gray(isLast ? "    " : "│   ")}${pc.gray("models:")} ${pc.white(String(count))}`);
			console.log(`  ${pc.gray(isLast ? "    " : "│   ")}${pc.gray("npm:")} ${pc.white(provider.npm)}`);
			if (!isLast) console.log();
		}
	});
