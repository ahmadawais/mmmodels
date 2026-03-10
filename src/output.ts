import { createColors } from "picocolors";

let plainMode = false;
let bannerPrinted = false;

export let pc: ReturnType<typeof createColors> = createColors();

export function setPlainMode(enabled: boolean): void {
	plainMode = enabled;
	pc = enabled ? createColors(false) : createColors();
}

export function isPlainMode(): boolean {
	return plainMode;
}

export function markBannerPrinted(): void {
	bannerPrinted = true;
}

export function consumeBannerPrinted(): boolean {
	const alreadyPrinted = bannerPrinted;
	bannerPrinted = false;
	return alreadyPrinted;
}

export function treeConnector(isLast: boolean): string {
	if (plainMode) return isLast ? "\\-- " : "|-- ";
	return isLast ? "└── " : "├── ";
}

export function treeBranchPrefix(isLast: boolean): string {
	if (plainMode) return isLast ? "    " : "|   ";
	return isLast ? "    " : "│   ";
}

export function fieldConnector(): string {
	return plainMode ? "- " : "├ ";
}

export function sectionDivider(length: number): string {
	return plainMode ? "-".repeat(length) : "─".repeat(length);
}

export function boolValue(value: boolean): string {
	if (plainMode) return value ? "yes" : "no";
	return value ? pc.white("✓") : pc.gray("✗");
}
