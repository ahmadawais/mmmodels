import { Command } from "commander";
import { fetchModels, getCacheInfo } from "../api.js";
import { printSmallBanner } from "../banner.js";
import { pc } from "../output.js";
import { ConditionalSpinner } from "../spinner.js";

interface SyncOptions {
	readonly json?: boolean;
	readonly plain?: boolean;
}

function countModels(data: Awaited<ReturnType<typeof fetchModels>>): number {
	return Object.values(data).reduce(
		(total, provider) => total + Object.keys(provider.models).length,
		0,
	);
}

export const syncCommand = new Command("sync")
	.description("Refresh the local models.dev cache")
	.option("--plain", "plain ASCII output without banner, color, or spinner")
	.option("-j, --json", "output as JSON")
	.action(async (opts: SyncOptions) => {
		if (!opts.json) printSmallBanner();
		const spinner = new ConditionalSpinner("Syncing model catalog…", opts.json);
		try {
			const data = await fetchModels({ refresh: true });
			spinner.stop();
			const cacheInfo = getCacheInfo();
			const payload = {
				cache_path: cacheInfo.path,
				cached_at: cacheInfo.updated_at,
				provider_count: Object.keys(data).length,
				model_count: countModels(data),
			};

			if (opts.json) {
				console.log(JSON.stringify(payload, null, 2));
				return;
			}

			console.log(pc.gray("\n  Cache updated\n"));
			console.log(`  ${pc.gray("path:")} ${pc.white(payload.cache_path)}`);
			if (payload.cached_at) {
				console.log(`  ${pc.gray("updated:")} ${pc.white(payload.cached_at)}`);
			}
			console.log(
				`  ${pc.gray("providers:")} ${pc.white(String(payload.provider_count))}`,
			);
			console.log(
				`  ${pc.gray("models:")} ${pc.white(String(payload.model_count))}\n`,
			);
		} catch (err) {
			spinner.fail("Failed to sync models");
			if (err instanceof Error) console.error(pc.gray(err.message));
			process.exit(1);
		}
	});
