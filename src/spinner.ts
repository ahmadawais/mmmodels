import ora, { Ora } from "ora";
import { isPlainMode, pc } from "./output.js";

export class ConditionalSpinner {
	private spinner: Ora | null;

	constructor(message: string, skipSpinner: boolean = false) {
		this.spinner = skipSpinner || isPlainMode() ? null : ora(message).start();
	}

	stop(): void {
		this.spinner?.stop();
	}

	fail(message: string): void {
		if (this.spinner) {
			this.spinner.fail(pc.gray(message));
		} else {
			console.error(pc.gray(message));
		}
	}
}

export async function withSpinner<T>(
	message: string,
	fn: () => Promise<T>,
	skipSpinner: boolean = false,
): Promise<T> {
	const spinner = new ConditionalSpinner(message, skipSpinner);
	try {
		return await fn();
	} catch (err) {
		spinner.fail(`${message.replace("…", "failed")}`);
		throw err;
	} finally {
		spinner.stop();
	}
}
