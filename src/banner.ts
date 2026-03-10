import { isPlainMode, markBannerPrinted, pc } from "./output.js";

const WIDE_LOGO = "ｍｍｍｏｄｅｌｓ";
const COMPACT_LOGO = "mmmodels";
const ACCENT = "┈┈┈┈";
const RESET = "\x1b[0m";
const SUPPORTS_TRUECOLOR = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);

function mix(start: number, end: number, t: number): number {
	return Math.round(start + (end - start) * t);
}

function gradientText(text: string): string {
	if (!SUPPORTS_TRUECOLOR) return pc.magenta(text);

	const visibleCount = [...text].filter((char) => char.trim() !== "").length;
	if (visibleCount === 0) return text;

	let colorIndex = 0;
	return [...text]
		.map((char) => {
			if (char.trim() === "") return char;

			const t = visibleCount === 1 ? 0 : colorIndex / (visibleCount - 1);
			colorIndex += 1;

			const r = mix(236, 128, t);
			const g = mix(173, 92, t);
			const b = mix(255, 255, t);

			return `\x1b[38;2;${r};${g};${b}m${char}${RESET}`;
		})
		.join("");
}

function renderBanner(): string {
	const width = process.stdout.columns ?? 80;
	if (width < 24) return gradientText(COMPACT_LOGO);
	if (width < 42) return gradientText(WIDE_LOGO);
	return gradientText(`${ACCENT}  ${WIDE_LOGO}  ${ACCENT}`);
}

export function printBanner(): void {
	if (isPlainMode()) return;
	const banner = renderBanner()
		.split("\n")
		.map((line) => pc.white(line))
		.join("\n");
	console.log(banner);
	markBannerPrinted();
}

export function printSmallBanner(): void {
	if (isPlainMode()) return;
	const banner = renderBanner()
		.split("\n")
		.map((line) => pc.white(line))
		.join("\n");
	console.log(banner);
	markBannerPrinted();
}
