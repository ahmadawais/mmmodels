import { createRequire } from "node:module";
import { Command, Option } from "commander";
import { printBanner } from "./banner.js";
import { infoCommand } from "./commands/info.js";
import { listCommand } from "./commands/list.js";
import { searchCommand } from "./commands/search.js";
import { providersCommand } from "./commands/providers.js";
import { syncCommand } from "./commands/sync.js";
import { setPlainMode } from "./output.js";
import { runTUI } from "./tui.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

// Known commands and their aliases - avoid recreating on every invocation
const KNOWN_COMMANDS = new Set([
	"search", "s", "query", "find",
	"list", "ls", "models",
	"providers", "p", "list-providers", "orgs",
	"sync",
	"info", "details", "show", "model",
]);

const program = new Command();

program
	.name("mmmodels")
	.description("Browse and filter AI models from models.dev")
	.option("--plain", "plain ASCII output without banner, color, or spinner")
	.addOption(new Option("-v, --version").hideHelp())
	.helpOption("-h, --help", "show help");

program.addCommand(searchCommand);
program.addCommand(listCommand);
program.addCommand(providersCommand);
program.addCommand(syncCommand);
program.addCommand(infoCommand);

// Intercept args to handle default TUI behavior
const args = process.argv.slice(2);
const hasPlainFlag = args.includes("--plain");
setPlainMode(hasPlainFlag);

// Check if --json or automation flag is used
const hasJsonFlag = args.includes("--json") || args.includes("-j");

// If no args, run TUI — skip commander entirely to avoid help output + exit conflict
if (args.length === 0 && !hasJsonFlag) {
	runTUI()
		.then(() => process.exit(0))
		.catch((err) => {
			if (err instanceof Error) console.error(err.message);
			process.exit(1);
		});
} else {
	const hasTopLevelHelpOrVersion = args.some((arg) =>
		["-h", "--help", "-v", "--version"].includes(arg),
	);
	const firstArg = args[0];
	if (
		firstArg?.startsWith("-") &&
		!hasTopLevelHelpOrVersion
	) {
		args.unshift("list");
	}

	// Check if first arg looks like a query (not a known command or flag)
	const effectiveFirstArg = args[0];
	const isQuery =
		effectiveFirstArg &&
		!effectiveFirstArg.startsWith("-") &&
		!KNOWN_COMMANDS.has(effectiveFirstArg) &&
		effectiveFirstArg !== "";

	// Prepend "search" if needed and show banner for queries
	if (isQuery) {
		args.unshift("search");
	}

	// Show banner for implicit search queries
	if (isQuery && !hasJsonFlag) {
		printBanner();
	}

	program.parseAsync(["node", "mmmodels", ...args]).catch((err: unknown) => {
		if (err instanceof Error) {
			console.error(err.message);
		}
		process.exit(1);
	});
}
